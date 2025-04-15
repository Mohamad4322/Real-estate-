require("dotenv").config();
const express = require("express");
const cors = require("cors");
const amqp = require("amqplib");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
app.use(express.json());

const allowedOrigins = [
    "http://100.71.100.5:7012",
    "http://localhost:7012"  // Keep for local development
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: "GET,POST,PUT,DELETE"
}));

const PORT = process.env.PORT || 8081;
const RABBITMQ_URL = "amqp://admin:admin@100.107.33.60:5672";

const FRONT_TO_BACK_RECEIVER = path.join(__dirname, "front_to_back_receiver.php");
const DB_TO_BE_RECEIVER = path.join(__dirname, "db_to_be_receiver.php");

function startPHPProcess(script, name) {
    console.log(`🚀 Starting ${name}...`);
    const process = spawn("php", [script], { stdio: "inherit", shell: true });

    process.on("close", (code) => {
        console.error(`❌ ${name} exited with code ${code}`);
    });

    return process;
}

async function sendToQueue(queue, message) {
    try {
        console.log(`🔄 Attempting to connect to RabbitMQ at ${RABBITMQ_URL}...`);

        const connection = await amqp.connect(RABBITMQ_URL);
        console.log("✅ Connected to RabbitMQ!");

        const channel = await connection.createChannel();
        await channel.assertQueue(queue, { durable: true });

        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
        console.log(`📩 Sent to queue "${queue}":`, message);

        setTimeout(() => connection.close(), 500);
    } catch (error) {
        console.error("❌ Error connecting to RabbitMQ:", error.message);
        console.error("⚠️ Check if RabbitMQ is running, the IP is correct, and the firewall allows traffic.");
    }
}

app.post("/api/auth/signup", async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        await sendToQueue("frontend_to_backend", {
            action: "signup",
            name: username,
            email,
            password
        });
        res.status(200).json({ message: "Signup request sent successfully!" });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Failed to process signup request." });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});

startPHPProcess(FRONT_TO_BACK_RECEIVER, "front_to_back_receiver.php");
startPHPProcess(DB_TO_BE_RECEIVER, "db_to_be_receiver.php");
