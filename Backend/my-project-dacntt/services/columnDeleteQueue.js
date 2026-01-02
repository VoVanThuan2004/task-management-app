const { Queue, Worker } = require("bullmq");
const { Redis } = require("ioredis");
const Task = require("../models/task");
require("dotenv").config();
const deleteTaskUtil = require("../utils/deleteTaskUtil");

// const connection = new Redis({
//   host: process.env.REDIS_HOST,
//   port: process.env.REDIS_PORT,
//   maxRetriesPerRequest: null,
//   enableReadyCheck: false,
// });

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // ← DÒNG QUAN TRỌNG NHẤT - BẮT BUỘC
  enableReadyCheck: false,    // Tùy chọn, nhưng tốt nên thêm
});

const columnDeleteQueue = new Queue("columnDeleteQueue", {
  connection,
});

// Worker xử lý job
const worker = new Worker(
  "columnDeleteQueue",
  async (job) => {
    switch (job.name) {
      case "deleteColumn":
        const { columnId } = job.data;
        if (!columnId) {
          console.log(`Thiếu columnId`);
          break;
        }

        // 1. Lấy tất cả task trong column
        const tasks = await Task.find({ columnId }).select("_id title").lean();

        if (tasks.length === 0) {
          console.log(`Column ${columnId} không có task nào để xóa`);
          return;
        }

        console.log(`Tìm thấy ${tasks.length} task cần xóa`);

        // 2. Duyệt từng task và xóa toàn bộ dữ liệu liên quan
        for (const task of tasks) {
          try {
            await deleteTaskUtil(task._id); // task._id là ObjectId
            console.log(`Đã xóa task: ${task.title}`);
          } catch (err) {
            console.error(`Lỗi xóa task ${task._id}:`, err.message);
          }
        }

        console.log(`Hoàn tất xóa dữ liệu column: ${columnId}`);
        break;

      default:
        console.log(`Job không xác định: ${job.name}`);
    }
  },
  { connection }
);

module.exports = columnDeleteQueue;
