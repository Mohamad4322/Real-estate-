// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");

// Import controllers
const mapsController = require('./api/maps-controller');
const rentcastController = require('./api/rentcast-controller');

const app = express();
app.use(express.json());

const allowedOrigins = [
    "http://10.0.8.49:7012",
    "http://localhost:7012"  // Keep for local development
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: "GET,POST,PUT,DELETE"
}));

const PORT = process.env.PORT || 8081;
const FRONT_TO_BACK_RECEIVER = path.join(__dirname, "front_to_back_receiver.php");
const DB_TO_BE_RECEIVER = path.join(__dirname, "db_to_be_receiver.php");

// Start PHP background services
function startPHPProcess(script, name) {
    console.log(`🚀 Starting ${name}...`);
    const process = spawn("php", [script], { stdio: "inherit", shell: true });

    process.on("close", (code) => {
        console.error(`❌ ${name} exited with code ${code}`);
    });

    return process;
}

// Start the services
function startServices() {
    console.log('🧩 Starting backend services...');
    
    // Start maps service
    require('./services/maps-service');
    
    // Start rentcast service
    require('./services/rentcast-service');
}

// Use the controllers for API endpoints
app.use('/api/maps', mapsController);
app.use('/api/rentcast', rentcastController);

// Original auth endpoint
app.post("/api/auth/signup", async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        // This would be handled by RabbitMQ in the complete implementation
        res.status(200).json({ message: "Signup request sent successfully!" });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Failed to process signup request." });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    
    // Start the PHP processes
    startPHPProcess(FRONT_TO_BACK_RECEIVER, "front_to_back_receiver.php");
    startPHPProcess(DB_TO_BE_RECEIVER, "db_to_be_receiver.php");
    
    // Start the services
    startServices();
});