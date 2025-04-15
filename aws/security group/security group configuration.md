1. Frontend Security Group
Name: frontend-sg
Description: Security group for React frontend application
Inbound Rules:
| Type        | Protocol | Port Range | Source             | Description                    |
|-------------|----------|------------|-------------------|--------------------------------|
| Custom TCP  | TCP      | 7012       | 0.0.0.0/0         | Public access to React app     |
| SSH         | TCP      | 22         | Your IP address   | SSH access for management      |

Outbound Rules:
| Type        | Protocol | Port Range | Destination       | Description                    |
|-------------|----------|------------|-------------------|--------------------------------|
| Custom TCP  | TCP      | 8000       | 10.0.13.3/32      | Access to PHP backend          |
| Custom TCP  | TCP      | 8081       | 10.0.13.3/32      | Access to Node.js backend      |
| All traffic | All      | All        | 0.0.0.0/0         | General internet access        |

2. Backend Security Group
Name: backend-sg
Description: Security group for backend services
Inbound Rules:
| Type        | Protocol | Port Range | Source             | Description                    |
|-------------|----------|------------|-------------------|--------------------------------|
| Custom TCP  | TCP      | 8000       | 10.0.8.49/32      | PHP API access from frontend   |
| Custom TCP  | TCP      | 8081       | 10.0.8.49/32      | Node.js API access from frontend |
| SSH         | TCP      | 22         | Your IP address   | SSH access for management      |

Outbound Rules:
| Type        | Protocol | Port Range | Destination       | Description                    |
|-------------|----------|------------|-------------------|--------------------------------|
| Custom TCP  | TCP      | 5672       | 10.0.0.21/32      | RabbitMQ access                |
| Custom TCP  | TCP      | 3306       | 10.0.10.169/32    | MySQL database access          |
| All traffic | All      | All        | 0.0.0.0/0         | General internet access        |

3. Messaging Security Group
Name: messaging-sg
Description: Security group for RabbitMQ messaging service
Inbound Rules:
| Type        | Protocol | Port Range | Source             | Description                    |
|-------------|----------|------------|-------------------|--------------------------------|
| Custom TCP  | TCP      | 5672       | 10.0.13.3/32      | RabbitMQ access from backend   |
| SSH         | TCP      | 22         | Your IP address   | SSH access for management      |

Outbound Rules:
| Type        | Protocol | Port Range | Destination       | Description                    |
|-------------|----------|------------|-------------------|--------------------------------|
| Custom TCP  | TCP      | 3306       | 10.0.10.169/32    | MySQL database access          |
| All traffic | All      | All        | 0.0.0.0/0         | General internet access        |

4. Database Security Group
Name: database-sg
Description: Security group for MySQL database
Inbound Rules:
| Type        | Protocol | Port Range | Source             | Description                    |
|-------------|----------|------------|-------------------|--------------------------------|
| Custom TCP  | TCP      | 3306       | 10.0.13.3/32      | MySQL access from backend      |
| Custom TCP  | TCP      | 3306       | 10.0.0.21/32      | MySQL access from messaging    |
| SSH         | TCP      | 22         | Your IP address   | SSH access for management      |

Outbound Rules:
| Type        | Protocol | Port Range | Destination       | Description                    |
|-------------|----------|------------|-------------------|--------------------------------|
| All traffic | All      | All        | 0.0.0.0/0         | General internet access        |