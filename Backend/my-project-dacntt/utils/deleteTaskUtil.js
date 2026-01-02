const TaskAssignee = require("../models/taskAssignee");
const EmojiReaction = require("../models/emojiReaction");
const ActivityLog = require("../models/activityLog");
const Task = require("../models/task");
const TaskLabel = require("../models/taskLabel");
const Attachment = require("../models/attachment");
const Comment = require("../models/comment");
const CheckItem = require("../models/checkItem");
const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const reminderQueue = require("../services/reminderQueue");

async function deleteTaskUtil(taskId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!taskId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu taskId",
      });
    }

    // 1. Kiểm tra task có tồn tại
    const task = await Task.findById(taskId).session(session);
    if (!task) {
      await session.abortTransaction();
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 2. TaskAssignee
    await TaskAssignee.deleteMany({ taskId }).session(session);

    // 3. Attachment
    const attachments = await Attachment.find({ taskId }).session(session);
    if (attachments.length > 0) {
      for (const a of attachments) {
        if (a.filePublicId) {
          await cloudinary.uploader.destroy(a.filePublicId);
          await Attachment.deleteOne({ _id: a._id }).session(session);
        }
      }
    }

    // 4. Comments
    const comments = await Comment.find({ taskId }).session(session);
    if (comments.length > 0) {
      const commentIds = comments.map((c) => c._id);
      await EmojiReaction.deleteMany({
        commentId: { $in: commentIds },
      }).session(session);
      await Comment.deleteMany({ taskId }).session(session);
    }

    // 5. ActivityLog
    await ActivityLog.deleteMany({ taskId }).session(session);

    // 6. Task Label
    await TaskLabel.deleteMany({ taskId }).session(session);

    // 7. Check Item
    await CheckItem.deleteMany({ taskId }).session(session);

    // 8. Xóa task chính
    await Task.deleteOne({ _id: taskId });

    await session.commitTransaction();

    // Xóa jobId queue redis chạy nền (task, checkItem)
    const jobIds = [
      `${task._id}-reminder`,
      `${task._id}-nearDeadline`,
      `${task._id}-overdue`,
    ];
    for (const id of jobIds) {
      const oldJob = await reminderQueue.getJob(id);
      if (oldJob) {
        await oldJob.remove();
        console.log(`Đã xóa job cũ: ${id}`);
      }
    }

    console.log(`Đã xóa task: ${task.title} thuộc boardId: ${task.boardId}`)
  } catch (error) {
    await session.abortTransaction();
    console.log("Lỗi hệ thống: " + error.message);
  } finally {
    await session.endSession();
  }
}

module.exports = deleteTaskUtil;
