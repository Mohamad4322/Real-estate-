# Stop the monitoring service on both messaging and frontend VMs
sudo systemctl start failover-monitor

# Stop the ansible worker service on both messaging and frontend VMs
sudo systemctl start ansible-worker

# Stop the health check service on all VMs
sudo systemctl start health-check