const createRedisConnection = require("./redisConnection");

const redisClient = createRedisConnection();

redisClient.on("error", (err) => console.error("Redis Error:", err));

module.exports = redisClient;