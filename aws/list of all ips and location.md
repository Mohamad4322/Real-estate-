# List of All IPs and Their Locations

This document lists all direct references to specific IP addresses of the primary VMs in the codebase. Use this as a reference when you need to change any VM's IP address.

## Primary VMs and Their IPs

| VM Type | IP Address | Port | Purpose |
|---------|------------|------|---------|
| Frontend | 10.0.8.49 | 7012 | React frontend server |
| RabbitMQ/Messaging | 10.0.0.21 | 5672 | Message queue service |
| Database | 10.0.10.169 | - | MySQL database server |

## Files Containing IP References

### Frontend VM (10.0.8.49)

1. **demo/front_to_back_sender.php**
   ```php
   header("Access-Control-Allow-Origin: http://10.0.8.49:7012");
   ```

2. **demo/FTB.js**
   ```javascript
   const allowedOrigin = "http://10.0.8.49:7012";
   ```

3. **backend/server.js**
   ```javascript
   const allowedOrigins = [
       "http://10.0.8.49:7012",
       "http://localhost:7012"  // Keep for local development
   ];
   ```

4. **demo/nohup.out**
   - Contains references to network IP: `http://192.168.64.9:7012` (local development IP)

### RabbitMQ/Messaging VM (10.0.0.21)

1. **demo/front_to_back_sender.php**
   ```php
   $RABBITMQ_HOST = "10.0.0.21";
   $RABBITMQ_PORT = 5672;
   ```

2. **demo/FTB.js**
   ```javascript
   const RABBITMQ_HOST = "10.0.0.21";
   const RABBITMQ_PORT = 5672;
   ```

3. **backend/db_to_be_receiver.php**
   ```php
   $RABBITMQ_HOST = "10.0.0.21";
   $RABBITMQ_PORT = 5672;
   ```

4. **backend/front_to_back_receiver.php**
   ```php
   $RABBITMQ_HOST = "10.0.0.21";
   $RABBITMQ_PORT = 5672;
   ```

5. **backend/server.js**
   ```javascript
   const RABBITMQ_URL = "amqp://admin:admin@10.0.0.21:5672";
   ```

### Database VM (10.0.10.169)

1. **backend/db_to_be_receiver.php**
   ```php
   $DB_HOST = "10.0.10.169";
   $DB_NAME = "real_estate";
   $DB_USER = "root";
   $DB_PASS = "admin";
   ```

2. **backend/front_to_back_receiver.php**
   ```php
   $DB_HOST = "10.0.10.169";
   $DB_NAME = "real_estate";
   $DB_USER = "root";
   $DB_PASS = "admin";
   ```

## Refactoring Recommendations

When changing IP addresses, make sure to update all references in the files listed above. Consider implementing the following improvements:

1. Use environment variables for all IP addresses to centralize configuration
2. Create a central configuration file that all services reference
3. Consider using DNS names instead of IP addresses for better maintainability
4. Implement service discovery for more dynamic infrastructure
