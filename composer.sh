#!/bin/bash

ssh leo@100.82.47.115

#Start MySQL database
echo "Starting MySQL database..."
cd database || { echo "Backend directory not found!"; exit 1; }
sudo systemctl start mysql

# Start RabbitMQ 
echo "Starting RabbitMQ service..."
cd ../messaging || { echo "Messaging directory not found!"; exit 1; }
sudo systemctl start rabbitmq-server

# Start backend
echo "Starting backend server..."
cd ../backend || { echo "Backend directory not found!"; exit 1; }
node server.js &

# Start frontend
echo "Starting frontend (demo) server..."
cd ../demo || { echo "Frontend (demo) directory not found!"; exit 1; }
nohup npm start & #Nohup stops the default code from overtaking the terminal
#this allows us to see the other processes successfully started
echo "Frontend started in background."

echo "All services started."
