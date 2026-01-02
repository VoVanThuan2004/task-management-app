require("dotenv").config();
const { Queue, Worker } = require("bullmq");
const { Redis } = require("ioredis");
const {
  sendVipReminderEmail,
  sendVipExpiredEmail,
} = require("../config/mailConfig");
const User = require("../models/user");
const VipSubscription = require("../models/vipSubscription");

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


// Queue
const vipSubscriptionQueue = new Queue("vipSubscriptionQueue", {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 10,
    removeOnFail: 20,
  },
});

const worker = new Worker(
  "vipSubscriptionQueue",
  async (job) => {
    try {
      if (job.name === "vipExpirationReminder") {
        const { userId, expirationDate } = job.data;
        if (!userId || !expirationDate) {
          throw new Error("Thiếu tham số userId, expirationDate");
        }

        // 1. Kiểm tra user
        const user = await User.findById(userId).select("_id email").lean();
        if (!user) {
          console.warn(`User ${user._id} không tồn tại`);
        }

        // await sendVipReminderEmail(user.email, expirationDate);
        console.log("vipExpirationReminder queue đã gửi thông báo email gần đến hạn")
      }

      if (job.name === "expireVip") {
        const { userId, expirationDate } = job.data;
        if (!userId || !expirationDate) {
          throw new Error("Thiếu tham số userId, expirationDate");
        }

        // 1. Kiểm tra user
        const user = await User.findById(userId).select("_id email").lean();
        if (!user) {
          console.warn(`User ${user._id} không tồn tại`);
        }

        const vipSubscription = await VipSubscription.findOne({ userId: user._id });
        if (!vipSubscription) {
          console.warn("Đăng ký gói vip của người dùng không tồn tại");
        }

        // await sendVipExpiredEmail(user.email, expirationDate);

        // Cập nhật lại trạng thái Vip subscription
        vipSubscription.isVip = false;
        await vipSubscription.save();

        console.log("vipExpirationReminder queue đã gửi thông báo email hết hạn")
      }
    } catch (error) {
      console.log("Vip subscription queue thất bại: " + error);
      throw error;
    }
  },
  { connection }
);
module.exports = vipSubscriptionQueue;
