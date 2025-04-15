#!/usr/bin/env python3
import pika
import time
import json
import subprocess
import logging
import threading
import socket
import requests
import redis
from flask import Flask, request

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("/var/log/failover-monitor.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("FailoverMonitor")

# Configuration
PRIMARY_RABBITMQ_HOST = "10.0.0.21"  # Primary RabbitMQ server IP
BACKUP_RABBITMQ_HOST = "10.0.8.49"   # Frontend VM IP (backup RabbitMQ)
RABBITMQ_PORT = 5672
RABBITMQ_USER = "admin"
RABBITMQ_PASS = "admin"
HEARTBEAT_QUEUE = "heartbeats"
COMMAND_EXCHANGE = "commands"
ANSIBLE_PATH = "/home/ubuntu/Capstone-Group-01/aws/ansible"
REDIS_HOST = "localhost"
REDIS_PORT = 6379
MONITOR_PORT = 8080  # Port for the Flask app

# Determine if this is the primary or backup monitor
IS_PRIMARY = socket.gethostname() == "messaging-server" or socket.gethostbyname(socket.gethostname()) == "10.0.0.21"
OTHER_MONITOR = BACKUP_RABBITMQ_HOST if IS_PRIMARY else PRIMARY_RABBITMQ_HOST

# Track instance heartbeats
instance_heartbeats = {}
# Track failed instances to avoid repeated triggers
failed_instances = set()
# Active/passive state
is_active = IS_PRIMARY  # Primary starts as active, backup as passive
# Last heartbeat from primary monitor
last_primary_heartbeat = time.time()

# Flask app for heartbeat exchange between monitors
app = Flask(__name__)

@app.route('/monitor-heartbeat', methods=['GET'])
def receive_monitor_heartbeat():
    monitor_id = request.args.get('monitor_id')
    logger.info(f"Received heartbeat from monitor: {monitor_id}")
    if monitor_id == "primary":
        global last_primary_heartbeat
        last_primary_heartbeat = time.time()
    return "OK"

def send_monitor_heartbeat():
    """Send heartbeat to the other monitor"""
    try:
        monitor_id = "primary" if IS_PRIMARY else "backup"
        requests.get(f"http://{OTHER_MONITOR}:{MONITOR_PORT}/monitor-heartbeat", 
                    params={"monitor_id": monitor_id}, timeout=5)
    except Exception as e:
        logger.error(f"Failed to send heartbeat to other monitor: {str(e)}")

def check_other_monitor():
    """Check if the other monitor is alive"""
    global is_active, last_primary_heartbeat
    
    if IS_PRIMARY:
        # Primary doesn't need to check the backup
        return
    
    # Backup checks if primary is alive
    try:
        # Try direct HTTP check
        response = requests.get(f"http://{PRIMARY_RABBITMQ_HOST}:{MONITOR_PORT}/health", timeout=5)
        if response.status_code == 200:
            logger.debug("Primary monitor is healthy via HTTP")
            return True
    except Exception:
        pass
    
    # Try checking RabbitMQ directly
    try:
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=PRIMARY_RABBITMQ_HOST,
                port=RABBITMQ_PORT,
                credentials=pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS),
                socket_timeout=5
            )
        )
        connection.close()
        logger.debug("Primary RabbitMQ is healthy")
        return True
    except Exception:
        pass
    
    # If we reach here, primary appears to be down
    if not is_active:
        logger.warning("Primary monitor appears to be down. Initiating takeover.")
        initiate_takeover()
    
    return False

def acquire_leader_lock():
    """Try to acquire the leader lock in Redis"""
    try:
        redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT)
        
        # Try to acquire lock with expiration
        acquired = redis_client.set(
            "monitor_leader_lock",
            socket.gethostname(),
            ex=30,  # 30 second expiration
            nx=True  # Only set if not exists
        )
        
        if acquired:
            # Schedule renewal of the lock
            threading.Timer(10, renew_leader_lock).start()
        
        return acquired
    except Exception as e:
        logger.error(f"Error acquiring leader lock: {str(e)}")
        return False

def renew_leader_lock():
    """Renew the leader lock in Redis"""
    try:
        redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT)
        
        # Only renew if we still own the lock
        current_owner = redis_client.get("monitor_leader_lock")
        if current_owner and current_owner.decode() == socket.gethostname():
            redis_client.expire("monitor_leader_lock", 30)
            threading.Timer(10, renew_leader_lock).start()
    except Exception as e:
        logger.error(f"Error renewing leader lock: {str(e)}")

def release_leader_lock():
    """Release the leader lock in Redis"""
    try:
        redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT)
        
        # Only release if we own the lock
        current_owner = redis_client.get("monitor_leader_lock")
        if current_owner and current_owner.decode() == socket.gethostname():
            redis_client.delete("monitor_leader_lock")
    except Exception as e:
        logger.error(f"Error releasing leader lock: {str(e)}")

def initiate_takeover():
    """Initiate takeover as the active monitoring service"""
    global is_active
    
    logger.info("Initiating takeover as primary monitoring service")
    
    # Try to acquire the leader lock
    if not acquire_leader_lock():
        logger.info("Another monitor has already taken over")
        return
    
    # Activate RabbitMQ backup if needed
    if socket.gethostname() != "messaging-server":
        try:
            # Execute Ansible playbook to activate RabbitMQ backup
            subprocess.run([
                "ansible-playbook",
                f"{ANSIBLE_PATH}/playbooks/activate_messaging.yml",
                "-e", "failed_instance=messaging-server"
            ], check=True)
            
            logger.info("Activated RabbitMQ backup")
        except Exception as e:
            logger.error(f"Failed to activate RabbitMQ backup: {str(e)}")
            release_leader_lock()
            return
    
    # Update state to active
    is_active = True
    
    # Start consuming from heartbeat queue
    start_heartbeat_monitoring()
    
    logger.info("Successfully took over as primary monitoring service")

def check_missing_heartbeats():
    """Check for missing heartbeats and trigger failover if needed"""
    if not is_active:
        return  # Only the active monitor should check heartbeats
        
    current_time = time.time()
    for instance_id, data in list(instance_heartbeats.items()):
        # If no heartbeat for 2 minutes (4 missed heartbeats), trigger failover
        if current_time - data["timestamp"] > 120:
            instance_type = data["instance_type"]
            if instance_id not in failed_instances:
                logger.warning(f"Instance {instance_id} ({instance_type}) has missed heartbeats. Triggering failover.")
                trigger_failover(instance_id, instance_type)
                failed_instances.add(instance_id)
            # Remove from tracking to avoid repeated checks
            del instance_heartbeats[instance_id]

def trigger_failover(instance_id, instance_type):
    """Trigger failover for a failed instance"""
    if not is_active:
        return  # Only the active monitor should trigger failover
        
    try:
        # Determine which RabbitMQ to use
        rabbitmq_host = BACKUP_RABBITMQ_HOST if socket.gethostname() == "frontend-server" else PRIMARY_RABBITMQ_HOST
        
        # Send failover command to RabbitMQ
        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
        parameters = pika.ConnectionParameters(
            host=rabbitmq_host,
            port=RABBITMQ_PORT,
            credentials=credentials
        )
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        
        # Ensure exchange exists
        channel.exchange_declare(
            exchange=COMMAND_EXCHANGE,
            exchange_type='topic',
            durable=True
        )
        
        # Prepare message
        message = {
            "failed_instance": instance_id,
            "instance_type": instance_type,
            "timestamp": time.time()
        }
        
        # Send message
        routing_key = f"failover.{instance_type}"
        channel.basic_publish(
            exchange=COMMAND_EXCHANGE,
            routing_key=routing_key,
            body=json.dumps(message),
            properties=pika.BasicProperties(
                delivery_mode=2,  # Make message persistent
            )
        )
        
        logger.info(f"Sent failover command: {message}")
        connection.close()
        
        # Also directly execute Ansible playbook for immediate action
        execute_ansible_playbook(instance_type, instance_id)
        
    except Exception as e:
        logger.error(f"Error triggering failover: {str(e)}")

def execute_ansible_playbook(instance_type, instance_id, is_failback=False):
    """Execute Ansible playbook for failover or failback"""
    if not is_active:
        return  # Only the active monitor should execute playbooks
        
    try:
        if is_failback:
            playbook = f"{ANSIBLE_PATH}/playbooks/deactivate_{instance_type}.yml"
            param_name = "recovered_instance"
        else:
            playbook = f"{ANSIBLE_PATH}/playbooks/activate_{instance_type}.yml"
            param_name = "failed_instance"
            
        cmd = [
            "ansible-playbook",
            playbook,
            "-e", f"{param_name}={instance_id}"
        ]
        
        logger.info(f"Executing Ansible playbook: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info(f"Ansible playbook executed successfully: {result.stdout}")
        else:
            logger.error(f"Ansible playbook failed: {result.stderr}")
            
    except Exception as e:
        logger.error(f"Error executing Ansible playbook: {str(e)}")

def execute_delayed_failback(instance_id, instance_type):
    """Execute failback after grace period"""
    if not is_active:
        return  # Only the active monitor should execute failback
    
    # Check if the instance is still healthy after the grace period
    if (instance_id in instance_heartbeats and 
            instance_heartbeats[instance_id]["status"] == "active"):
        
        logger.info(f"Primary {instance_type} instance still healthy after grace period. Executing failback.")
        trigger_failback(instance_id, instance_type)
    else:
        logger.warning(f"Primary {instance_type} instance no longer healthy after grace period. Aborting failback.")

def trigger_failback(instance_id, instance_type):
    """Trigger failback when a primary instance recovers"""
    if not is_active:
        return  # Only the active monitor should trigger failback
        
    try:
        # Determine which RabbitMQ to use
        rabbitmq_host = BACKUP_RABBITMQ_HOST if socket.gethostname() == "frontend-server" else PRIMARY_RABBITMQ_HOST
        
        # Send failback command to RabbitMQ
        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
        parameters = pika.ConnectionParameters(
            host=rabbitmq_host,
            port=RABBITMQ_PORT,
            credentials=credentials
        )
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        
        # Ensure queue exists
        channel.queue_declare(queue="failover_commands", durable=True)
        
        # Prepare message - include a command_type field to distinguish failback
        message = {
            "command_type": "failback",
            "recovered_instance": instance_id,
            "instance_type": instance_type,
            "timestamp": time.time()
        }
        
        # Send message
        channel.basic_publish(
            exchange="",
            routing_key="failover_commands",
            body=json.dumps(message),
            properties=pika.BasicProperties(
                delivery_mode=2,  # Make message persistent
            )
        )
        
        logger.info(f"Sent failback command: {message}")
        connection.close()
        
        # Also directly execute Ansible playbook for immediate action
        execute_ansible_playbook(instance_type, instance_id, is_failback=True)
        
    except Exception as e:
        logger.error(f"Error triggering failback: {str(e)}")

def is_primary_instance(instance_id, instance_type):
    """Check if this is a primary instance that should trigger failback"""
    primary_instances = {
        "messaging": "messaging-server",
        "database": "database-server",
        "frontend": "frontend-server",
        "backend": "backend-server"
    }
    return instance_id == primary_instances.get(instance_type)

def process_heartbeat(ch, method, properties, body):
    """Process heartbeat message from RabbitMQ"""
    try:
        message = json.loads(body)
        instance_id = message["instance_id"]
        instance_type = message["instance_type"]
        status = message["status"]
        timestamp = message["timestamp"]
        
        # Update heartbeat tracking
        instance_heartbeats[instance_id] = {
            "instance_type": instance_type,
            "status": status,
            "timestamp": timestamp
        }
        
        # If instance was previously failed but is now back, trigger failback if it's a primary
        if instance_id in failed_instances and status == "active":
            logger.info(f"Instance {instance_id} ({instance_type}) has recovered.")
            failed_instances.remove(instance_id)
            
            # Check if this is a primary instance that should trigger failback
            if is_primary_instance(instance_id, instance_type):
                logger.info(f"Primary {instance_type} instance recovered. Waiting 60 seconds before failback...")
                threading.Timer(60, lambda: execute_delayed_failback(instance_id, instance_type)).start()
        
        # Acknowledge message
        ch.basic_ack(delivery_tag=method.delivery_tag)
        
    except Exception as e:
        logger.error(f"Error processing heartbeat: {str(e)}")
        # Reject message
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def start_heartbeat_monitoring():
    """Start consuming heartbeats from RabbitMQ"""
    if not is_active:
        return  # Only the active monitor should consume heartbeats
    
    try:
        # Determine which RabbitMQ to use
        rabbitmq_host = BACKUP_RABBITMQ_HOST if socket.gethostname() == "frontend-server" else PRIMARY_RABBITMQ_HOST
        
        # Connect to RabbitMQ
        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
        parameters = pika.ConnectionParameters(
            host=rabbitmq_host,
            port=RABBITMQ_PORT,
            credentials=credentials
        )
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        
        # Ensure queue exists
        channel.queue_declare(queue=HEARTBEAT_QUEUE, durable=True)
        
        # Set up consumer
        channel.basic_consume(
            queue=HEARTBEAT_QUEUE,
            on_message_callback=process_heartbeat
        )
        
        logger.info(f"Starting heartbeat monitoring on {rabbitmq_host}. Waiting for messages...")
        
        # Start consuming in a separate thread
        def consume_messages():
            channel.start_consuming()
            
        consumer_thread = threading.Thread(target=consume_messages)
        consumer_thread.daemon = True
        consumer_thread.start()
        
    except Exception as e:
        logger.error(f"Error starting heartbeat monitoring: {str(e)}")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return "OK"

def startup_procedure():
    """Procedure to run at startup"""
    global is_active
    
    # If this is the primary monitor, try to become active
    if IS_PRIMARY:
        if acquire_leader_lock():
            logger.info("Starting as active monitoring service")
            is_active = True
            start_heartbeat_monitoring()
        else:
            logger.info("Could not acquire leader lock. Starting in passive mode.")
            is_active = False
    else:
        # This is the backup monitor, check if primary is alive
        if check_other_monitor():
            logger.info("Primary monitor is alive. Starting in passive mode.")
            is_active = False
        else:
            logger.info("Primary monitor appears to be down. Attempting to take over.")
            initiate_takeover()

def main():
    """Main function"""
    # Start the Flask app in a separate thread
    flask_thread = threading.Thread(target=lambda: app.run(host='0.0.0.0', port=MONITOR_PORT))
    flask_thread.daemon = True
    flask_thread.start()
    
    # Run startup procedure
    startup_procedure()
    
    # Start monitor heartbeat exchange
    def send_heartbeats_periodically():
        while True:
            send_monitor_heartbeat()
            time.sleep(15)  # Send every 15 seconds
            
    heartbeat_thread = threading.Thread(target=send_heartbeats_periodically)
    heartbeat_thread.daemon = True
    heartbeat_thread.start()
    
    # Start checking the other monitor
    def check_other_monitor_periodically():
        while True:
            check_other_monitor()
            time.sleep(30)  # Check every 30 seconds
            
    check_thread = threading.Thread(target=check_other_monitor_periodically)
    check_thread.daemon = True
    check_thread.start()
    
    # Start checking for missing heartbeats
    def check_heartbeats_periodically():
        while True:
            if is_active:
                check_missing_heartbeats()
            time.sleep(30)  # Check every 30 seconds
            
    missing_thread = threading.Thread(target=check_heartbeats_periodically)
    missing_thread.daemon = True
    missing_thread.start()
    
    # Keep the main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        if is_active:
            release_leader_lock()

if __name__ == "__main__":
    main()
