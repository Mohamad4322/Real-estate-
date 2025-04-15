const amqp = require("amqplib");

async function receiveMessage() {
    try {
        console.log("🔄 Connecting to RabbitMQ...");

        const connection = await amqp.connect("amqp://admin:admin@100.107.33.60");
        const channel = await connection.createChannel();
        const queue = "backend_testing";

        await channel.assertQueue(queue, { durable: true });

        console.log(`📩 Waiting for messages in queue: ${queue}...`);

        channel.consume(queue, (msg) => {
            if (msg !== null) {
                console.log(`📥 Received message: ${msg.content.toString()}`);
                channel.ack(msg);  // Acknowledge message
            }
        });

    } catch (error) {
        console.error("❌ Error receiving message:", error);
        console.log("🔄 Retrying in 5 seconds...");
        setTimeout(receiveMessage, 5000); // Auto-retry on failure
    }
}

receiveMessage();
