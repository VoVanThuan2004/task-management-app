// listReminderJobs.js
const { Queue } = require("bullmq");
const { Redis } = require("ioredis");
require("dotenv").config();

// 🔌 Kết nối Redis
const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const reminderQueue = new Queue("checkItemReminderQueue", { connection });

async function listJobs() {
  try {
    const statuses = ["waiting", "delayed", "active", "completed", "failed"];

    for (const status of statuses) {
      const jobs = await reminderQueue.getJobs([status]);

      console.log(`\n🟢 Jobs trạng thái [${status}] (${jobs.length}):`);
      for (const job of jobs) {
        const delayMs =
          job.timestamp + (job.opts.delay || 0) - Date.now();
        console.log(
          `- JobId: ${job.id}, checkItemId: ${job.data.checkItemId}, taskId: ${job.data.taskId}, Delay còn: ${Math.max(delayMs, 0)} ms`
        );
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi khi lấy job:", err);
    process.exit(1);
  }
}

listJobs();
