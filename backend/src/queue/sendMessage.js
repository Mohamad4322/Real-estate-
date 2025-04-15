const amqp = require("amqplib");

async function sendMessage() {
    try {
        console.log("🔄 Connecting to RabbitMQ...");

        const connection = await amqp.connect("amqp://admin:admin@100.107.33.60");
        const channel = await connection.createChannel();
        const queue = "backend_testing";

        await channel.assertQueue(queue, { durable: true });

        const message = "Hello from sender1!";
        channel.sendToQueue(queue, Buffer.from(message), { persistent: true });

        console.log(`✅ Message sent to queue: ${message}`);

        setTimeout(async () => {
            await channel.close();
            await connection.close();
            console.log("🔌 Connection closed.");
            process.exit(0);
        }, 500);
    } catch (error) {
        console.error("❌ Error sending message:", error);
    }
}

sendMessage();
