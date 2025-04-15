#!/usr/bin/env python3
import pika
import socket
import time
import os
import subprocess
import json

# Configuration
PRIMARY_RABBITMQ_HOST = "10.0.0.21"  # Primary RabbitMQ server IP
BACKUP_RABBITMQ_HOST = "10.0.8.49"   # Frontend VM IP (backup RabbitMQ)
RABBITMQ_PORT = 5672
RABBITMQ_USER = "admin"
RABBITMQ_PASS = "admin"
EXCHANGE_NAME = "monitoring"
ROUTING_KEY = "heartbeat"
INSTANCE_ID = socket.gethostname()

# Determine instance type based on hostname or IP
if "frontend" in INSTANCE_ID or socket.gethostbyname(socket.gethostname()) == "10.0.8.49":
    INSTANCE_TYPE = "frontend"
elif "backend" in INSTANCE_ID or socket.gethostbyname(socket.gethostname()) == "10.0.0.22":
    INSTANCE_TYPE = "backend"
elif "messaging" in INSTANCE_ID or socket.gethostbyname(socket.gethostname()) == "10.0.0.21":
    INSTANCE_TYPE = "messaging"
elif "database" in INSTANCE_ID or socket.gethostbyname(socket.gethostname()) == "10.0.10.169":
    INSTANCE_TYPE = "database"
else:
    INSTANCE_TYPE = "unknown"

def get_service_status():
    """Get the status of the primary service on this instance"""
    if INSTANCE_TYPE == "frontend":
        cmd = "systemctl is-active nginx"
    elif INSTANCE_TYPE == "backend":
        cmd = "systemctl is-active backend"
    elif INSTANCE_TYPE == "messaging":
        cmd = "systemctl is-active rabbitmq-server"
    elif INSTANCE_TYPE == "database":
        cmd = "systemctl is-active mysql"
    else:
        return "unknown"
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.stdout.strip()
    except Exception as e:
        return f"error: {str(e)}"

def send_heartbeat():
    """Send heartbeat to RabbitMQ"""
    # Try primary RabbitMQ first, then fallback to backup
    rabbitmq_hosts = [PRIMARY_RABBITMQ_HOST, BACKUP_RABBITMQ_HOST]
    
    for host in rabbitmq_hosts:
        try:
            # Connect to RabbitMQ
            credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
            parameters = pika.ConnectionParameters(
                host=host,
                port=RABBITMQ_PORT,
                credentials=credentials,
                socket_timeout=3  # Short timeout to quickly try the next host
            )
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()
            
            # Ensure exchange exists
            channel.exchange_declare(
                exchange=EXCHANGE_NAME,
                exchange_type='direct',
                durable=True
            )
            
            # Get service status
            status = get_service_status()
            
            # Prepare message
            message = {
                "instance_id": INSTANCE_ID,
                "instance_type": INSTANCE_TYPE,
                "status": status,
                "timestamp": time.time()
            }
            
            # Send message
            channel.basic_publish(
                exchange=EXCHANGE_NAME,
                routing_key=ROUTING_KEY,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                )
            )
            
            print(f"Sent heartbeat to {host}: {message}")
            connection.close()
            return  # Successfully sent, no need to try backup
            
        except Exception as e:
            print(f"Error sending heartbeat to {host}: {str(e)}")
            # Continue to try the next host
    
    print("Failed to send heartbeat to any RabbitMQ host")

# Main loop
if __name__ == "__main__":
    while True:
        send_heartbeat()
        time.sleep(30)  # Send heartbeat every 30 seconds