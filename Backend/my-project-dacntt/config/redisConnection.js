const { Redis } = require("ioredis");
require("dotenv").config();

const createRedisConnection = (options = {}) => {
  if (process.env.REDIS_HOST) {
    return new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT) || 6379,
      ...options,
    });
  }

  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, options);
  }

  return new Redis({
    host: "127.0.0.1",
    port: 6379,
    ...options,
  });
};

module.exports = createRedisConnection;
