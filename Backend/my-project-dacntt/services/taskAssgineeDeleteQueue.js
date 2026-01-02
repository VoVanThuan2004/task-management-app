const { Queue, Worker } = require("bullmq");
const { Redis } = require("ioredis");
const TaskAssginee = require("../models/taskAssignee");
const Task = require("../models/task");
require("dotenv").config();
const { getIO } = require("../config/socket");

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

const taskAssigneeDeleteQueue = new Queue("taskAssigneeDeleteQueue", {
  connection,
});

// Worker xử lý job
const worker = new Worker(
  "taskAssigneeDeleteQueue",
  async (job) => {
    const io = getIO();

    switch (job.name) {
      case "removeMember":
        const { boardId, userId } = job.data;
        if (!boardId || !userId) {
          console.log("Thiếu boardId, userId");
          break;
        }

        // 1. Lấy danh sách taskIds
        const taskIds = await Task.find({ boardId }).select("_id");

        // 2. Duyệt qua kiểm tra có taskAssignee nào không
        for (const taskId of taskIds) {
          const taskAssignee = await TaskAssginee.findOne({ taskId, userId });
          if (!taskAssignee) {
            continue;
          } else {
            await TaskAssginee.deleteOne({ _id: taskAssignee._id });
            io.to(boardId.toString()).emit("removeMember", {
              taskId: taskAssignee.taskId,
              userId: taskAssignee.userId,
            });
          }
        }
        break;

      default:
        console.log(`Job không xác định: ${job.name}`);
    }
  },
  { connection }
);

module.exports = taskAssigneeDeleteQueue;
