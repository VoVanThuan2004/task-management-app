const { Queue, Worker } = require("bullmq");
const { Redis } = require("ioredis");
const { getIO } = require("../config/socket");
const createActivityLogTask = require("../utils/createActivityLogTask");
require("dotenv").config();
const User = require("../models/user");

// Kết nối Redis
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

connection.on("error", (err) => console.error("Redis Error:", err));

// Queue
const activityLogQueue = new Queue("activityLogQueue", {
  connection,
  defaultJobOptions: {
    attempts: 5, // retry tối đa 5 lần
    backoff: {
      type: "exponential",
      delay: 2000, // bắt đầu từ 2s, tăng gấp đôi mỗi lần
    },
    removeOnComplete: 20, // giữ 50 job thành công gần nhất
    removeOnFail: 30, // giữ 100 job thất bại để debug
  },
});


const worker = new Worker(
  "activityLogQueue",
  async (job) => {
    const { userId, boardId, taskId, action, target } = job.data;
    const io = getIO();
    try {
      // 1. Xử lý theo loại job
      if (job.name === "activityLog") {
        // Tạo activity log
        const activityLog = await createActivityLogTask({
          userId,
          boardId,
          taskId,
          action,
          target,
        });

        if (!activityLog) {
          throw new Error("Tạo activity log thất bại");
        }

        // Lấy thông tin user để emit socket
        const user = await User.findById(userId)
          .select("fullName avatar")
          .lean();

        if (!user) {
          console.warn(
            `User ${userId} không tồn tại khi emit socket activity log`
          );
        }

        io.to(taskId.toString()).emit("activityLogTask", {
          userId,
          fullName: user.fullName,
          avatar: user.avatar,
          taskId: activityLog.taskId,
          boardId: activityLog.boardId,
          action: activityLog.action,
          description: activityLog.description,
          createdAt: activityLog.createdAt,
        });
      } 
      console.log(`Activity log job ${job.id} (${job.name}) thành công`);
    } catch (error) {
      console.error(`Activity log job ${job.id} thất bại:`, error.message);
      throw error; 
    }
  },
  {
    connection,
  }
);

module.exports = activityLogQueue;
