const amqp = require('amqplib');

const RABBITMQ_URL = "amqp://admin:admin@100.107.33.60";

async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        return connection;
    } catch (error) {
        console.error("❌ RabbitMQ Connection Error:", error);
        throw new Error("RabbitMQ Connection Failed");
    }
}

async function sendToQueue(queue, data) {
    try {
        const connection = await connectRabbitMQ();
        const channel = await connection.createChannel();
        await channel.assertQueue(queue, { durable: true });

        channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { persistent: true });

        setTimeout(() => {
            connection.close();
        }, 500);
    } catch (error) {
        console.error("❌ RabbitMQ Send Error:", error);
    }
}

module.exports = { sendToQueue };
