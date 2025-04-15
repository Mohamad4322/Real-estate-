# Failover-Ready Security Group Configuration

For a robust failover system where any VM can take over any service, we need a more flexible security group configuration. This document outlines a configuration that enables any VM in your private subnet to run any service while maintaining security.

## Private Subnet Information

- Private Subnet CIDR: 10.0.0.0/16 (Adjust this to your actual subnet)
- VMs in subnet:
  - Frontend: 10.0.8.49
  - Backend: 10.0.0.22
  - Messaging: 10.0.0.21
  - Database: 10.0.10.169

## Unified Security Group Configuration

### 1. Application Security Group (unified-app-sg)

This security group should be applied to all VMs to allow internal communication while limiting external access.

**Name**: unified-app-sg  
**Description**: Security group for all VMs in the failover system

#### Inbound Rules:

| Type        | Protocol | Port Range | Source             | Description                            |
|-------------|----------|------------|-------------------|----------------------------------------|
| Custom TCP  | TCP      | 7012       | 0.0.0.0/0         | Public access to React frontend        |
| Custom TCP  | TCP      | 8000       | 10.0.0.0/16       | PHP API access from within subnet      |
| Custom TCP  | TCP      | 8081       | 10.0.0.0/16       | Node.js API access from within subnet  |
| Custom TCP  | TCP      | 5672       | 10.0.0.0/16       | RabbitMQ access from within subnet     |
| Custom TCP  | TCP      | 15672      | 10.0.0.0/16       | RabbitMQ management from within subnet |
| Custom TCP  | TCP      | 3306       | 10.0.0.0/16       | MySQL access from within subnet        |
| Custom TCP  | TCP      | 6379       | 10.0.0.0/16       | Redis access from within subnet        |
| Custom TCP  | TCP      | 8080       | 10.0.0.0/16       | Monitor service API                    |
| Custom TCP  | TCP      | 80         | 10.0.0.0/16       | HTTP access from within subnet         |
| Custom TCP  | TCP      | 443        | 10.0.0.0/16       | HTTPS access from within subnet        |
| SSH         | TCP      | 22         | Your IP address   | SSH access for management              |
| All ICMP    | ICMP     | All        | 10.0.0.0/16       | Ping/health checks within subnet       |

#### Outbound Rules:

| Type        | Protocol | Port Range | Destination       | Description                            |
|-------------|----------|------------|-------------------|----------------------------------------|
| All traffic | All      | All        | 0.0.0.0/0         | General internet access                |

## Implementation Steps

1. **Create the unified security group**:

```bash
aws ec2 create-security-group \
    --group-name unified-app-sg \
    --description "Security group for all VMs in the failover system" \
    --vpc-id YOUR_VPC_ID
```

2. **Add inbound rules**:

```bash
# Store the security group ID
SG_ID=$(aws ec2 describe-security-groups --group-names unified-app-sg --query 'SecurityGroups[0].GroupId' --output text)

# Add inbound rules
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 7012 \
    --cidr 0.0.0.0/0 \
    --description "Public access to React frontend"

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 8000 \
    --cidr 10.0.0.0/16 \
    --description "PHP API access from within subnet"

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 8081 \
    --cidr 10.0.0.0/16 \
    --description "Node.js API access from within subnet"

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 5672 \
    --cidr 10.0.0.0/16 \
    --description "RabbitMQ access from within subnet"

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 15672 \
    --cidr 10.0.0.0/16 \
    --description "RabbitMQ management from within subnet"

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 3306 \
    --cidr 10.0.0.0/16 \
    --description "MySQL access from within subnet"

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 6379 \
    --cidr 10.0.0.0/16 \
    --description "Redis access from within subnet"

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 8080 \
    --cidr 10.0.0.0/16 \
    --description "Monitor service API"

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 10.0.0.0/16 \
    --description "HTTP access from within subnet"

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 10.0.0.0/16 \
    --description "HTTPS access from within subnet"

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr YOUR_IP_ADDRESS/32 \
    --description "SSH access for management"

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol icmp \
    --port -1 \
    --cidr 10.0.0.0/16 \
    --description "Ping/health checks within subnet"
```

3. **Apply the security group to all VMs**:

```bash
aws ec2 modify-instance-attribute \
    --instance-id FRONTEND_INSTANCE_ID \
    --groups $SG_ID

aws ec2 modify-instance-attribute \
    --instance-id BACKEND_INSTANCE_ID \
    --groups $SG_ID

aws ec2 modify-instance-attribute \
    --instance-id MESSAGING_INSTANCE_ID \
    --groups $SG_ID

aws ec2 modify-instance-attribute \
    --instance-id DATABASE_INSTANCE_ID \
    --groups $SG_ID
```

## Alternative: Using the AWS Console

If you prefer using the AWS Console:

1. Navigate to EC2 > Security Groups
2. Click "Create Security Group"
3. Enter name "unified-app-sg" and description
4. Select your VPC
5. Add all the inbound rules as specified in the table above
6. Add an outbound rule allowing all traffic
7. Click "Create Security Group"
8. Select each instance and modify its security groups to use the new unified security group

## Verification

After applying the security group, verify connectivity between the VMs:

```bash
# SSH into each VM and test connectivity to other services
# For example, from the frontend VM:
ssh ubuntu@10.0.8.49
telnet 10.0.0.22 8081  # Test Node.js backend connectivity
telnet 10.0.0.21 5672  # Test RabbitMQ connectivity
telnet 10.0.10.169 3306  # Test MySQL connectivity
```

## Security Considerations

1. This configuration allows any VM in the subnet to access any service, which is necessary for complete failover capability.
2. External access is limited to only the frontend port (7012) and SSH.
3. For additional security, consider:
   - Using a VPN for administrative access
   - Implementing network ACLs at the subnet level
   - Setting up host-based firewalls on each VM
   - Using TLS certificates for service-to-service communication

## When Additional Security is Required

If you need to implement a more secure configuration while still allowing for failover:

1. Create service-specific security groups
2. Apply all relevant security groups to each VM
3. Use Security Group references instead of CIDR ranges for service-to-service communication

This approach provides finer control but requires more maintenance when adding or changing VMs.
