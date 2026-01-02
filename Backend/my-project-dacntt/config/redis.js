const Redis = require("ioredis");
require("dotenv").config();

// const redisClient = new Redis({
//   host: process.env.REDIS_HOST,
//   port: process.env.REDIS_PORT,
// });

const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on("error", (err) => console.error("Redis Error:", err));

module.exports = redisClient;