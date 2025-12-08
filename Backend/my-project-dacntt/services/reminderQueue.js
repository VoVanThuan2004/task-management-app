// reminderQueue.js
const { Queue, Worker } = require("bullmq");
const { Redis } = require("ioredis");
const Task = require("../models/task");
const TaskAssignee = require("../models/taskAssignee");
const { getIO } = require("../config/socket");
require("dotenv").config();
const { sendTaskDeadlineEmail } = require("../config/mailConfig");

// 🔌 Kết nối Redis
// const connection = new Redis({
//   host: process.env.REDIS_HOST,
//   port: process.env.REDIS_PORT,
//   maxRetriesPerRequest: null,
//   enableReadyCheck: false,
// });

const connection = new Redis(process.env.REDIS_URL || "", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});


// Queue để thêm job
const reminderQueue = new Queue("taskReminderQueue", { connection });

// Worker xử lý job
const worker = new Worker(
  "taskReminderQueue",
  async (job) => {
    const { taskId, boardId } = job.data;
    const task = await Task.findById(taskId).populate("boardId");
    const io = getIO();

    if (!task) return console.log(`⚠️ Task ${taskId} không tồn tại.`);

    switch (job.name) {
      // === 1️⃣ GỬI NHẮC NHỞ ===
      case "sendReminder":
        console.log(`📩 [sendReminder] Gửi nhắc nhở cho task ${task.title}`);
        if (task.isCompleted) return;

        const assignees = await TaskAssignee.find({ taskId }).populate(
          "userId"
        );
        for (const a of assignees) {
          if (a.userId?.email) {
            await sendTaskDeadlineEmail(a.userId.email, task);
          }
          io.to(a.userId._id.toString()).emit("taskReminder", {
            taskId: task._id,
            boardTitle: task.boardId?.title,
            reminderTime: task.reminderTime,
          });
        }
        task.reminderSent = true;
        await task.save();
        break;

      // === 2️⃣ ĐÁNH DẤU GẦN TỚI HẠN ===
      case "markNearDeadline":
        console.log(`⏳ [markNearDeadline] Task ${task.title} gần tới hạn`);
        if (!task.isCompleted && new Date() < task.dueDate) {
          task.status = "Gần tới hạn";
          await task.save();
          io.to(task.boardId.toString()).emit("taskNearDeadline", {
            taskId: task._id,
            status: "Gần tới hạn",
          });
        }
        break;

      // === 3️⃣ ĐÁNH DẤU QUÁ HẠN ===
      case "markOverdue":
        console.log(`⏰ [markOverdue] Task ${task.title} đã quá hạn`);
        if (!task.isCompleted && new Date() >= task.dueDate) {
          task.status = "Quá hạn";
          await task.save();
          io.to(task.boardId.toString()).emit("taskOverdue", {
            taskId: task._id,
            status: "Quá hạn",
          });
        }
        break;

      default:
        console.log(`⚠️ Job không xác định: ${job.name}`);
    }
  },
  { connection }
);

// 📋 Ghi log sự kiện queue & worker
reminderQueue.on("waiting", (jobId) =>
  console.log(`⏳ Job ${jobId} đang chờ thực thi...`)
);
reminderQueue.on("active", (job) =>
  console.log(`⚙️ Job ${job.id} đang chạy...`)
);
reminderQueue.on("completed", (job) =>
  console.log(`✅ Job ${job.id} hoàn thành.`)
);
reminderQueue.on("failed", (job, err) =>
  console.error(`💥 Job ${job.id} thất bại:`, err.message)
);

worker.on("error", (err) => console.error("💣 Worker bị lỗi:", err));
worker.on("failed", (job, err) =>
  console.error(`❌ Job ${job.id} failed: ${err.message}`)
);

console.log("🟢 Reminder queue & worker đã khởi động thành công.");

module.exports = reminderQueue;
