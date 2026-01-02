require("dotenv").config();
const { Queue, Worker } = require("bullmq");
const { Redis } = require("ioredis");
const {
  sendShareBoardEmail,
  sendCreateAccount,
  sendRecoveryPassword,
  sendRemoveFromBoardEmail,
  sendRegisterVipEmail,
} = require("../config/mailConfig");
const User = require("../models/user");
const bcrypt = require("bcrypt");

const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Queue
const emailQueue = new Queue("emailQueue", {
  connection,
  defaultJobOptions: {
    attempts: 2, // retry tối đa 5 lần
    backoff: {
      type: "exponential",
      delay: 2000, // bắt đầu từ 2s, tăng gấp đôi mỗi lần
    },
    removeOnComplete: 10, // giữ 50 job thành công gần nhất
    removeOnFail: 20, // giữ 100 job thất bại để debug
  },
});

const worker = new Worker(
  "emailQueue",
  async (job) => {
    try {
      if (job.name === "shareBoardEmail") {
        const { inviterName, userIds, boardLink, boardTitle, message } =
          job.data;

        // Lấy danh sách người dùng đã được mời
        const invitedUsers = await User.find({ _id: { $in: userIds } });

        for (const user of invitedUsers) {
          await sendShareBoardEmail(
            user.email,
            inviterName,
            boardTitle,
            message,
            boardLink
          );
        }
      } else if (job.name === "createAccountEmail") {
        const { email } = job.data;

        // Tạo mã otp
        const OTP = Math.floor(100000 + Math.random() * 900000).toString();
        const OTPHashed = await bcrypt.hash(OTP, 10);

        await User.create({
          roleId: role._id,
          email: email,
          fullName: "",
          password: null,
          isActive: false,
          resetOtp: OTPHashed,
          resetOtpExpired: new Date(Date.now() + 5 * 60 * 1000), // 5 phút
        });

        // Gửi email
        await sendCreateAccount(email, OTP);
      } else if (job.name === "recoveryPasswordEmail") {
        const { email, OTP } = job.data;
        if (!email || !OTP) {
          throw new Error("Email or OTP is null");
        }

        await sendRecoveryPassword(email, OTP);
      } else if (job.name === "removeMemberFromBoardEmail") {
        const { email, title } = job.data;
        if (!email || !title) {
          throw new Error("Email or board's title is null");
        }
        await sendRemoveFromBoardEmail(email, title);
      } else if (job.name === "sendVipSuccessEmail") {
        const { userId, orderCode, amount, expirationDate, paymentMethod } = job.data;
        if (!orderCode || !amount || !expirationDate) {
          throw new Error("orderCode or amount or expirationDate is null");
        }

        // 1. Kiểm tra user - lấy thông tin
        const user = await User.findById(userId).select("_id email").lean();
        if (!user) {
          console.warn(`User ${user._id} không tồn tại`);
        }
        await sendRegisterVipEmail(user.email, orderCode, amount, expirationDate, paymentMethod);
      }
    } catch (error) {
      console.log("Email queue thất bại: " + error);
      throw error;
    }
  },
  { connection }
);

module.exports = emailQueue;
