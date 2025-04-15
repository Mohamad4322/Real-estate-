# Stop the monitoring service on both messaging and frontend VMs
sudo systemctl stop failover-monitor

# Stop the ansible worker service on both messaging and frontend VMs
sudo systemctl stop ansible-worker

# Stop the health check service on all VMs
sudo systemctl stop health-check