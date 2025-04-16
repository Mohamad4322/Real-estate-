// backend/api/rentcast-controller.js
const express = require('express');
const router = express.Router();
const amqp = require('amqplib');
const crypto = require('crypto');

// RentCast API RabbitMQ configuration - hardcoded as requested
const RABBITMQ_HOST = "100.107.33.60";  // RabbitMQ server
const RABBITMQ_PORT = 5672;
const RABBITMQ_USER = "admin";
const RABBITMQ_PASS = "admin";
const RABBITMQ_URL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
const RENTCAST_REQUEST_QUEUE = 'rentcast_requests';
const RENTCAST_RESPONSE_QUEUE = 'rentcast_responses';

// Map of pending requests by correlationId
const pendingRequests = new Map();
let rabbitMQChannel;

// Connect to RabbitMQ and set up response listener
async function setupRabbitMQ() {
    try {
        console.log(`🔄 RentCast Controller: Connecting to RabbitMQ at ${RABBITMQ_URL}...`);
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        // Set up queues
        await channel.assertQueue(RENTCAST_REQUEST_QUEUE, { durable: true });
        await channel.assertQueue(RENTCAST_RESPONSE_QUEUE, { durable: true });
        
        console.log(`✅ RentCast Controller: Connected to RabbitMQ. Setting up message handlers...`);
        
        // Set up consumer for rentcast responses
        channel.consume(RENTCAST_RESPONSE_QUEUE, (msg) => {
            if (!msg) return;
            
            try {
                const response = JSON.parse(msg.content.toString());
                const { correlationId } = response;
                
                if (pendingRequests.has(correlationId)) {
                    const { resolve } = pendingRequests.get(correlationId);
                    resolve(response);
                    pendingRequests.delete(correlationId);
                    console.log(`📤 RentCast Controller: Resolved request for correlationId: ${correlationId}`);
                } else {
                    console.warn(`⚠️ RentCast Controller: Received response for unknown correlationId: ${correlationId}`);
                }
                
                channel.ack(msg);
            } catch (error) {
                console.error(`❌ RentCast Controller: Error processing rentcast response:`, error);
                channel.nack(msg, false, false);
            }
        });
        
        return channel;
    } catch (error) {
        console.error(`❌ RentCast Controller: RabbitMQ connection error:`, error);
        throw error;
    }
}

// Send a request to the RentCast service via RabbitMQ and wait for response
async function sendRentcastRequest(action, params) {
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
                RENTCAST_REQUEST_QUEUE,
                Buffer.from(JSON.stringify(request)),
                { persistent: true }
            );
            
            console.log(`📩 RentCast Controller: Sent rentcast request for action ${action} with correlationId: ${correlationId}`);
        } catch (error) {
            reject(error);
        }
    });
}

// Initialize RabbitMQ connection
(async function initRabbitMQ() {
    try {
        rabbitMQChannel = await setupRabbitMQ();
        console.log('✅ RentCast Controller: RabbitMQ initialized successfully');
    } catch (error) {
        console.error('❌ RentCast Controller: Failed to initialize RabbitMQ:', error);
        setTimeout(initRabbitMQ, 5000); // Retry after 5 seconds
    }
})();

// Property search endpoint
router.post("/search", async (req, res) => {
    if (!rabbitMQChannel) {
        return res.status(503).json({ error: "RabbitMQ connection not available" });
    }
    
    try {
        const params = req.body;
        
        const response = await sendRentcastRequest('searchProperties', params);
        res.json(response);
    } catch (error) {
        console.error("Property Search Error:", error);
        res.status(500).json({ error: error.message || "Failed to process property search request" });
    }
});

// Get property details endpoint
router.get("/property/:id", async (req, res) => {
    if (!rabbitMQChannel) {
        return res.status(503).json({ error: "RabbitMQ connection not available" });
    }
    
    try {
        const propertyId = req.params.id;
        if (!propertyId) {
            return res.status(400).json({ error: "Property ID is required" });
        }
        
        const response = await sendRentcastRequest('getPropertyDetails', { propertyId });
        res.json(response);
    } catch (error) {
        console.error("Property Details Error:", error);
        res.status(500).json({ error: error.message || "Failed to process property details request" });
    }
});

// Rental estimate endpoint
router.post("/rental-estimate", async (req, res) => {
    if (!rabbitMQChannel) {
        return res.status(503).json({ error: "RabbitMQ connection not available" });
    }
    
    try {
        const { address, bedrooms, bathrooms, propertyType, squareFootage } = req.body;
        if (!address) {
            return res.status(400).json({ error: "Address is required" });
        }
        
        const response = await sendRentcastRequest('getRentalEstimate', { 
            address, 
            bedrooms, 
            bathrooms, 
            propertyType, 
            squareFootage 
        });
        res.json(response);
    } catch (error) {
        console.error("Rental Estimate Error:", error);
        res.status(500).json({ error: error.message || "Failed to process rental estimate request" });
    }
});

// Market data endpoint
router.get("/market", async (req, res) => {
    if (!rabbitMQChannel) {
        return res.status(503).json({ error: "RabbitMQ connection not available" });
    }
    
    try {
        const { zipCode, city, state } = req.query;
        if (!zipCode && (!city || !state)) {
            return res.status(400).json({ error: "Either zipCode or city and state are required" });
        }
        
        const response = await sendRentcastRequest('getMarketData', { zipCode, city, state });
        res.json(response);
    } catch (error) {
        console.error("Market Data Error:", error);
        res.status(500).json({ error: error.message || "Failed to process market data request" });
    }
});

module.exports = router;