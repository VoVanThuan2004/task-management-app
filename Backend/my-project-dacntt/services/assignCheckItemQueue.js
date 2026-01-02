const { Queue, Worker } = require("bullmq");
const { Redis } = require("ioredis");
const { getIO } = require("../config/socket");
const createActivityLogTask = require("../utils/createActivityLogTask");
require("dotenv").config();
const User = require("../models/user");

// Kết nối Redis
const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// const connection = new Redis(process.env.REDIS_URL, {
//   maxRetriesPerRequest: null, 
//   enableReadyCheck: false,    
// });


// Queue
const assignCheckItemQueue = new Queue("assignCheckItemQueue", {
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
  "assignCheckItemQueue",
  async (job) => {
    const { checkItem } = job.data;
    const io = getIO();
    try {
      // 1. Xử lý theo loại job
      if (job.name === "assignCheckItemAI") {
        // Lấy thông tin user để emit socket
        const user = await User.findById(checkItem.assignedTo)
          .select("_id fullName avatar")
          .lean();

        if (!user) {
          console.warn(
            `User ${user._id} không tồn tại khi emit socket activity log`
          );
        }

        io.to(checkItem.taskId.toString()).emit("assingedToCheckItem", {
          _id: checkItem._id,
          assignedTo: user._id,
          avatar: user.avatar,
          fullName: user.fullName,
        });
      }
      console.log(`CheckItem log job ${job.id} (${job.name}) thành công`);
    } catch (error) {
      console.error(`CheckItem log job ${job.id} thất bại:`, error.message);
      throw error;
    }
  },
  {
    connection,
  }
);

module.exports = assignCheckItemQueue;
