#!/bin/bash
# Failover System Setup Script

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOSTNAME=$(hostname)

echo "Setting up failover system on $(hostname)..."

# Determine VM type based on hostname or IP
IP_ADDRESS=$(hostname -I | cut -d' ' -f1)
if [[ "$HOSTNAME" == *"frontend"* ]] || [[ "$IP_ADDRESS" == "10.0.8.49" ]]; then
  VM_TYPE="frontend"
elif [[ "$HOSTNAME" == *"backend"* ]] || [[ "$IP_ADDRESS" == "10.0.0.22" ]] || [[ "$IP_ADDRESS" == "10.0.13.3" ]]; then
  VM_TYPE="backend"
elif [[ "$HOSTNAME" == *"messaging"* ]] || [[ "$IP_ADDRESS" == "10.0.0.21" ]]; then
  VM_TYPE="messaging"
elif [[ "$HOSTNAME" == *"database"* ]] || [[ "$IP_ADDRESS" == "10.0.10.169" ]]; then
  VM_TYPE="database"
else
  echo "Unknown VM type, cannot continue"
  exit 1
fi

echo "Detected VM type: $VM_TYPE"

# Create user if it doesn't exist
if ! id ubuntu &>/dev/null; then
  echo "Creating ubuntu user..."
  sudo useradd -m -s /bin/bash ubuntu
  echo "ubuntu ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/ubuntu
fi

# Copy service files to system directories
install_service() {
  SERVICE_NAME=$1
  SERVICE_PATH=$2
  SYSTEMD_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
  
  echo "Installing $SERVICE_NAME service..."
  sudo cp "$SERVICE_PATH" "$SYSTEMD_PATH"
  sudo systemctl daemon-reload
}

# Install health check service (all VMs)
echo "Setting up health check service..."
sudo mkdir -p /opt/monitoring
sudo cp "$PROJECT_ROOT/services/health/health_check.py" /opt/monitoring/
sudo chmod +x /opt/monitoring/health_check.py
install_service "health-check" "$PROJECT_ROOT/services/health/health-check.service"

# Install monitoring service (messaging and frontend VMs only)
if [[ "$VM_TYPE" == "messaging" ]] || [[ "$VM_TYPE" == "frontend" ]]; then
  echo "Setting up monitoring service..."
  sudo cp "$PROJECT_ROOT/services/monitor/monitor.py" /opt/monitoring/
  sudo chmod +x /opt/monitoring/monitor.py
  install_service "failover-monitor" "$PROJECT_ROOT/services/monitor/failover-monitor.service"
  
  echo "Setting up Ansible worker service..."
  sudo cp "$PROJECT_ROOT/services/worker/ansible_worker.py" /opt/monitoring/
  sudo chmod +x /opt/monitoring/ansible_worker.py
  install_service "ansible-worker" "$PROJECT_ROOT/services/worker/ansible-worker.service"
fi

# Create a script to sync playbooks (for messaging VM)
if [[ "$VM_TYPE" == "messaging" ]]; then
  echo "Creating playbook sync script..."
  cat > "$PROJECT_ROOT/ansible/sync-playbooks.sh" << 'EOF'
#!/bin/bash
# Sync Ansible playbooks to backup VM
rsync -avz /home/ubuntu/Capstone-Group-01/aws/ansible/ ubuntu@10.0.8.49:/home/ubuntu/Capstone-Group-01/aws/ansible/
EOF

  chmod +x "$PROJECT_ROOT/ansible/sync-playbooks.sh"
  
  # Create a cron job to sync every hour
  (crontab -l 2>/dev/null || echo "") | grep -v "sync-playbooks.sh" | { cat; echo "0 * * * * $PROJECT_ROOT/ansible/sync-playbooks.sh"; } | crontab -
  
  echo "Cron job for syncing playbooks has been created"
fi

# Start services
echo "Starting services..."
sudo systemctl enable health-check
sudo systemctl start health-check

if [[ "$VM_TYPE" == "messaging" ]] || [[ "$VM_TYPE" == "frontend" ]]; then
  sudo systemctl enable redis-server
  sudo systemctl start redis-server
  
  sudo systemctl enable failover-monitor
  sudo systemctl start failover-monitor
  
  sudo systemctl enable ansible-worker
  sudo systemctl start ansible-worker
fi

echo "Setup completed successfully!"
