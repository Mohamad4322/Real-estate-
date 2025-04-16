// backend/api/maps-controller.js
const express = require('express');
const router = express.Router();
const amqp = require('amqplib');
const crypto = require('crypto');

// Maps API RabbitMQ configuration - hardcoded as requested
const RABBITMQ_HOST = "100.107.33.60";  // RabbitMQ server
const RABBITMQ_PORT = 5672;
const RABBITMQ_USER = "admin";
const RABBITMQ_PASS = "admin";
const RABBITMQ_URL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
const MAPS_REQUEST_QUEUE = 'maps_requests';
const MAPS_RESPONSE_QUEUE = 'maps_responses';

// Map of pending requests by correlationId
const pendingRequests = new Map();
let rabbitMQChannel;

// Connect to RabbitMQ and set up response listener
async function setupRabbitMQ() {
    try {
        console.log(`🔄 Maps Controller: Connecting to RabbitMQ at ${RABBITMQ_URL}...`);
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        // Set up queues
        await channel.assertQueue(MAPS_REQUEST_QUEUE, { durable: true });
        await channel.assertQueue(MAPS_RESPONSE_QUEUE, { durable: true });
        
        console.log(`✅ Maps Controller: Connected to RabbitMQ. Setting up message handlers...`);
        
        // Set up consumer for map responses
        channel.consume(MAPS_RESPONSE_QUEUE, (msg) => {
            if (!msg) return;
            
            try {
                const response = JSON.parse(msg.content.toString());
                const { correlationId } = response;
                
                if (pendingRequests.has(correlationId)) {
                    const { resolve } = pendingRequests.get(correlationId);
                    resolve(response);
                    pendingRequests.delete(correlationId);
                    console.log(`📤 Maps Controller: Resolved request for correlationId: ${correlationId}`);
                } else {
                    console.warn(`⚠️ Maps Controller: Received response for unknown correlationId: ${correlationId}`);
                }
                
                channel.ack(msg);
            } catch (error) {
                console.error(`❌ Maps Controller: Error processing map response:`, error);
                channel.nack(msg, false, false);
            }
        });
        
        return channel;
    } catch (error) {
        console.error(`❌ Maps Controller: RabbitMQ connection error:`, error);
        throw error;
    }
}

// Send a request to the Maps service via RabbitMQ and wait for response
async function sendMapRequest(action, params) {
    if (!rabbitMQChannel) {
        throw new Error('RabbitMQ channel not available');
    }
    
    return new Promise((resolve, reject) => {
        try {
            const correlationId = crypto.randomUUID();
            
            // Store the promise handlers
            pendingRequests.set(correlationId, { resolve, reject });
            
            // Set a timeout to clean up if no response received
            setTimeout(() => {
                if (pendingRequests.has(correlationId)) {
                    const { reject } = pendingRequests.get(correlationId);
                    reject(new Error('Request timed out'));
                    pendingRequests.delete(correlationId);
                }
            }, 10000); // 10 second timeout
            
            // Send the request
            const request = { action, params, correlationId };
            rabbitMQChannel.sendToQueue(
                MAPS_REQUEST_QUEUE,
                Buffer.from(JSON.stringify(request)),
                { persistent: true }
            );
            
            console.log(`📩 Maps Controller: Sent map request for action ${action} with correlationId: ${correlationId}`);
        } catch (error) {
            reject(error);
        }
    });
}

// Initialize RabbitMQ connection
(async function initRabbitMQ() {
    try {
        rabbitMQChannel = await setupRabbitMQ();
        console.log('✅ Maps Controller: RabbitMQ initialized successfully');
    } catch (error) {
        console.error('❌ Maps Controller: Failed to initialize RabbitMQ:', error);
        setTimeout(initRabbitMQ, 5000); // Retry after 5 seconds
    }
})();

// Geocoding endpoint
router.post("/geocode", async (req, res) => {
    if (!rabbitMQChannel) {
        return res.status(503).json({ error: "RabbitMQ connection not available" });
    }
    
    try {
        const { address } = req.body;
        if (!address) {
            return res.status(400).json({ error: "Address is required" });
        }
        
        const response = await sendMapRequest('geocode', { address });
        res.json(response);
    } catch (error) {
        console.error("Geocoding Error:", error);
        res.status(500).json({ error: error.message || "Failed to process geocoding request" });
    }
});

// Street View endpoint
router.post("/streetview", async (req, res) => {
    if (!rabbitMQChannel) {
        return res.status(503).json({ error: "RabbitMQ connection not available" });
    }
    
    try {
        const { latitude, longitude, size, fov } = req.body;
        if (!latitude || !longitude) {
            return res.status(400).json({ error: "Latitude and longitude are required" });
        }
        
        const response = await sendMapRequest('streetView', { latitude, longitude, size, fov });
        res.json(response);
    } catch (error) {
        console.error("Street View Error:", error);
        res.status(500).json({ error: error.message || "Failed to process street view request" });
    }
});

// Places search endpoint
router.post("/places", async (req, res) => {
    if (!rabbitMQChannel) {
        return res.status(503).json({ error: "RabbitMQ connection not available" });
    }
    
    try {
        const { query, location, radius } = req.body;
        if (!query) {
            return res.status(400).json({ error: "Search query is required" });
        }
        
        const response = await sendMapRequest('places', { query, location, radius });
        res.json(response);
    } catch (error) {
        console.error("Places Search Error:", error);
        res.status(500).json({ error: error.message || "Failed to process places search request" });
    }
});

// Directions endpoint
router.post("/directions", async (req, res) => {
    if (!rabbitMQChannel) {
        return res.status(503).json({ error: "RabbitMQ connection not available" });
    }
    
    try {
        const { origin, destination, mode } = req.body;
        if (!origin || !destination) {
            return res.status(400).json({ error: "Origin and destination are required" });
        }
        
        const response = await sendMapRequest('directions', { origin, destination, mode });
        res.json(response);
    } catch (error) {
        console.error("Directions Error:", error);
        res.status(500).json({ error: error.message || "Failed to process directions request" });
    }
});

module.exports = router;