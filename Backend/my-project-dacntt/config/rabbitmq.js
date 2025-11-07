const amqp = require("amqplib");
require("dotenv").config();

let channel = null;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log("✅ Connected to RabbitMQ");
  } catch (error) {
    console.error("❌ RabbitMQ connection failed:", error);
  }
}

function getChannel() {
  if (!channel) throw new Error("RabbitMQ channel not initialized!");
  return channel;
}

module.exports = { connectRabbitMQ, getChannel };
