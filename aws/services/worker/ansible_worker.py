#!/usr/bin/env python3
import pika
import json
import subprocess
import logging
import os
import socket

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("/var/log/ansible-worker.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("AnsibleWorker")

# Configuration
PRIMARY_RABBITMQ_HOST = "10.0.0.21"  # Primary RabbitMQ server IP
BACKUP_RABBITMQ_HOST = "10.0.8.49"   # Frontend VM IP (backup RabbitMQ)
RABBITMQ_PORT = 5672
RABBITMQ_USER = "admin"
RABBITMQ_PASS = "admin"
COMMAND_QUEUE = "failover_commands"
ANSIBLE_PATH = "/home/ubuntu/Capstone-Group-01/aws/ansible"

def execute_ansible_playbook(instance_type, instance_id, is_failback=False):
    """Execute Ansible playbook for failover or failback"""
    try:
        if is_failback:
            playbook = f"{ANSIBLE_PATH}/playbooks/deactivate_{instance_type}.yml"
            param_name = "recovered_instance"
        else:
            playbook = f"{ANSIBLE_PATH}/playbooks/activate_{instance_type}.yml"
            param_name = "failed_instance"
            
        if not os.path.exists(playbook):
            logger.error(f"Playbook not found: {playbook}")
            return
            
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

def process_command(ch, method, properties, body):
    """Process failover/failback command from RabbitMQ"""
    try:
        message = json.loads(body)
        command_type = message.get("command_type", "failover")  # Default to failover for backward compatibility
        
        if command_type == "failover":
            instance_id = message["failed_instance"]
            instance_type = message["instance_type"]
            logger.info(f"Received failover command for {instance_type} instance {instance_id}")
            execute_ansible_playbook(instance_type, instance_id, is_failback=False)
        elif command_type == "failback":
            instance_id = message["recovered_instance"]
            instance_type = message["instance_type"]
            logger.info(f"Received failback command for {instance_type} instance {instance_id}")
            execute_ansible_playbook(instance_type, instance_id, is_failback=True)
        else:
            logger.warning(f"Unknown command type: {command_type}")
        
        # Acknowledge message
        ch.basic_ack(delivery_tag=method.delivery_tag)
        
    except Exception as e:
        logger.error(f"Error processing command: {str(e)}")
        # Reject message
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def connect_to_rabbitmq():
    """Connect to RabbitMQ with fallback"""
    # Try primary RabbitMQ first, then fallback to backup
    rabbitmq_hosts = [PRIMARY_RABBITMQ_HOST, BACKUP_RABBITMQ_HOST]
    
    # If this is the frontend server, try the backup (local) RabbitMQ first
    if socket.gethostname() == "frontend-server":
        rabbitmq_hosts.reverse()
    
    for host in rabbitmq_hosts:
        try:
            logger.info(f"Attempting to connect to RabbitMQ at {host}")
            credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
            parameters = pika.ConnectionParameters(
                host=host,
                port=RABBITMQ_PORT,
                credentials=credentials,
                socket_timeout=5
            )
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()
            
            # Ensure queue exists
            channel.queue_declare(queue=COMMAND_QUEUE, durable=True)
            
            logger.info(f"Successfully connected to RabbitMQ at {host}")
            return connection, channel
            
        except Exception as e:
            logger.error(f"Error connecting to RabbitMQ at {host}: {str(e)}")
    
    logger.error("Failed to connect to any RabbitMQ host")
    return None, None

def main():
    """Main function to start worker"""
    try:
        connection, channel = connect_to_rabbitmq()
        if not connection or not channel:
            logger.error("Could not connect to RabbitMQ. Exiting.")
            return
        
        # Set up consumer
        channel.basic_consume(
            queue=COMMAND_QUEUE,
            on_message_callback=process_command
        )
        
        logger.info("Starting Ansible worker. Waiting for commands...")
        
        # Start consuming messages
        channel.start_consuming()
        
    except Exception as e:
        logger.error(f"Error in main function: {str(e)}")
        if 'connection' in locals() and connection and connection.is_open:
            connection.close()

if __name__ == "__main__":
    main()
