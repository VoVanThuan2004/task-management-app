const { Queue, Worker } = require("bullmq");
const { Redis } = require("ioredis");
const CheckItem = require("../models/checkItem");
require("dotenv").config();
const { getIO } = require("../config/socket");

// const connection = new Redis({
//   host: process.env.REDIS_HOST,
//   port: process.env.REDIS_PORT,
//   maxRetriesPerRequest: null,
//   enableReadyCheck: false,
// });

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, 
  enableReadyCheck: false,    
});


const checkItemReminderQueue = new Queue("checkItemReminderQueue", {
  connection,
});

// Worker xử lý job
const worker = new Worker(
  "checkItemReminderQueue",
  async (job) => {
    const { checkItemId, taskId } = job.data;
    const checkItem = await CheckItem.findById(checkItemId);
    const io = getIO();

    if (!checkItem) return console.log(`CheckItem ${checkItemId} không tồn tại.`);

    switch (job.name) {
      // === 2️. ĐÁNH DẤU GẦN TỚI HẠN ===
      case "markNearDeadline":
        console.log(`[markNearDeadline] CheckItem ${checkItem.title} gần tới hạn`);
        if (!checkItem.isCompleted && new Date() < checkItem.dueDate) {
          checkItem.status = "Gần tới hạn";
          await checkItem.save();
          io.to(checkItem.taskId.toString()).emit("checkItemNearDeadline", {
            _id: checkItem._id,
            status: "Gần tới hạn",
          });
        }
        break;

      // === 3️. ĐÁNH DẤU QUÁ HẠN ===
      case "markOverdue":
        console.log(`⏰ [markOverdue] CheckItem ${checkItem.title} đã quá hạn`);
        if (!checkItem.isCompleted && new Date() >= checkItem.dueDate) {
          checkItem.status = "Quá hạn";
          await checkItem.save();
          io.to(checkItem.taskId.toString()).emit("checkItemOverdue", {
            _id: checkItem._id,
            status: "Quá hạn",
          });
        }
        break;

      default:
        console.log(`Job không xác định: ${job.name}`);
    }
  },
  { connection }
);

module.exports = checkItemReminderQueue;
