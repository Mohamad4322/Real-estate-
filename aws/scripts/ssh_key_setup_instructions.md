# SSH Key Setup Instructions

This document provides instructions for setting up SSH key authentication between your VMs. The scripts in this directory will help you establish passwordless SSH connections between all your VMs.

## Background

The issue you were experiencing with the `distribute_ssh_keys.sh` script was due to the VMs being configured to only accept public key authentication (rejecting password authentication). The error "Permission denied (publickey)" indicates that SSH is configured to only accept key-based authentication, but the keys weren't yet authorized.

## Solution

We've created four separate scripts, one for each VM. Each script will add the public keys of all other VMs to the VM's `authorized_keys` file, allowing passwordless SSH access between all VMs.

## Instructions

### Using the PowerShell Helper Script

We've created a PowerShell script to make it easier to copy the setup scripts to your clipboard:

1. Open PowerShell on your Windows machine
2. Navigate to the scripts directory
3. Run the script with the VM name as a parameter:

```powershell
# Copy the Database VM script to clipboard
.\copy_script_to_clipboard.ps1 -vm database

# Copy the Frontend VM script to clipboard
.\copy_script_to_clipboard.ps1 -vm frontend

# Copy the Backend VM script to clipboard
.\copy_script_to_clipboard.ps1 -vm backend

# Copy the Messaging VM script to clipboard
.\copy_script_to_clipboard.ps1 -vm messaging
```

### Manual Setup Process

1. **Access each VM through AWS Console**:
   - Go to EC2 Dashboard
   - Select the instance
   - Click "Connect"
   - Choose "EC2 Instance Connect" or "Session Manager"

2. **For each VM, run the appropriate script**:

   - On the **Database VM** (10.0.10.169):
     - Use the PowerShell script to copy the content: `.\copy_script_to_clipboard.ps1 -vm database`
     - Paste it into the terminal and run it

   - On the **Frontend VM** (10.0.8.49):
     - Use the PowerShell script to copy the content: `.\copy_script_to_clipboard.ps1 -vm frontend`
     - Paste it into the terminal and run it

   - On the **Backend VM** (10.0.0.22):
     - Use the PowerShell script to copy the content: `.\copy_script_to_clipboard.ps1 -vm backend`
     - Paste it into the terminal and run it

   - On the **Messaging VM** (10.0.0.21):
     - Use the PowerShell script to copy the content: `.\copy_script_to_clipboard.ps1 -vm messaging`
     - Paste it into the terminal and run it

3. **Test the SSH connections**:
   
   After running the scripts on all VMs, test the SSH connections from your Database VM:
   ```bash
   ssh ubuntu@10.0.8.49    # Connect to Frontend VM
   ssh ubuntu@10.0.0.22    # Connect to Backend VM
   ssh ubuntu@10.0.0.21    # Connect to Messaging VM
   ```

   You should be able to connect without being prompted for a password.

## Troubleshooting

- **"No route to host" error for Backend VM (10.0.0.22)**:
  This indicates a networking issue. Check that:
  - The VM is running
  - Security groups allow SSH traffic (port 22)
  - Network ACLs allow the traffic
  - There are no firewall rules blocking the connection
  - The subnet routing is correctly configured

- **If you still can't connect**:
  - Verify the VM is running
  - Check the SSH service is running: `sudo service ssh status`
  - Check SSH configuration: `cat /etc/ssh/sshd_config`
  - Review security group rules
  - Check system logs: `sudo journalctl -u ssh`

## After Setup

Once SSH key authentication is set up between all VMs, you can use the original `distribute_ssh_keys.sh` script for any future key distribution needs, as the initial authentication barrier has been overcome.
