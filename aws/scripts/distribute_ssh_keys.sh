#!/bin/bash
# Script to distribute SSH keys to all VMs

# Server IPs
FRONTEND_IP="10.0.8.49"
BACKEND_IP="10.0.0.22"
MESSAGING_IP="10.0.0.21"
DATABASE_IP="10.0.10.169"

# Check if SSH key exists, if not create it
if [ ! -f ~/.ssh/id_rsa ]; then
    ssh-keygen -t rsa -b 4096 -N "" -f ~/.ssh/id_rsa
    echo "SSH key pair generated."
else
    echo "SSH key already exists."
fi

# Check if sshpass is installed, install if not
check_sshpass() {
    if ! command -v sshpass &> /dev/null; then
        echo "sshpass is not installed. Installing now..."
        sudo apt-get update
        sudo apt-get install -y sshpass
        if [ $? -ne 0 ]; then
            echo "Failed to install sshpass. Please install it manually and run the script again."
            exit 1
        fi
        echo "sshpass installed successfully."
    fi
}

# Function to copy SSH key to remote host
copy_key_to_host() {
    local host=$1
    local user=$2
    echo "Copying SSH key to ${user}@${host}..."
    
    # First try to connect without password (in case key is already set up)
    ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=no ${user}@${host} exit &>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "Already have SSH access to ${host}, copying key anyway..."
        ssh-copy-id -o StrictHostKeyChecking=no ${user}@${host}
    else
        # Using sshpass for password authentication
        check_sshpass
        read -sp "Enter password for ${user}@${host}: " PASSWORD
        echo
        sshpass -p "$PASSWORD" ssh-copy-id -o StrictHostKeyChecking=no ${user}@${host}
    fi
    
    if [ $? -eq 0 ]; then
        echo "Key successfully copied to ${host}"
    else
        echo "Failed to copy key to ${host}"
    fi
}

# Distribution to all VMs
echo "Starting SSH key distribution..."

# Get current IP to avoid copying to self
CURRENT_IP=$(hostname -I | awk '{print $1}')

# Only copy to other VMs, not to self
if [ "$CURRENT_IP" != "$FRONTEND_IP" ]; then
    copy_key_to_host $FRONTEND_IP "ubuntu"
fi

if [ "$CURRENT_IP" != "$BACKEND_IP" ]; then
    copy_key_to_host $BACKEND_IP "ubuntu"
fi

if [ "$CURRENT_IP" != "$MESSAGING_IP" ]; then
    copy_key_to_host $MESSAGING_IP "ubuntu"
fi

if [ "$CURRENT_IP" != "$DATABASE_IP" ]; then
    copy_key_to_host $DATABASE_IP "ubuntu"
fi

echo "SSH key distribution complete."
