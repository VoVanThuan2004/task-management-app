const Task = require("../models/task");
const TaskAssignee = require("../models/taskAssignee");
const User = require("../models/user");
const {
  sendAssignTaskEmail,
  sendRemoveMemberEmail,
} = require("../config/mailConfig");
const { getIO } = require("../config/socket");
const mongoose = require("mongoose");
const BoardMember = require("../models/boardMember");
const activityLogQueue = require("../services/activityLogQueue");
require("dotenv").config();

const assignMember = async (req, res) => {
  try {
    const inviterName = req.user.fullName;
    const inviterId = req.user.userId;
    const { taskId, userId } = req.body;
    if (!taskId || !userId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng chọn task, thành viên cần chỉ định",
      });
    }

    // 1. Kiểm tra task, user
    const [task, user] = await Promise.all([
      await Task.findById(taskId).populate("boardId").lean(),
      await User.findById(userId).lean(),
    ]);

    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Thành viên mời không tồn tại",
      });
    }

    // 2. Tạo Task Assignee
    const taskAssignee = await TaskAssignee.create({
      taskId,
      userId,
      assignedAt: new Date(),
    });

    // 3. Gửi thông báo email
    const link = `${process.env.FE_URL}/boards/${task.boardId._id}/${task.boardId.title}/${taskId}/${task.title}`
    await sendAssignTaskEmail(
      user.email,
      task,
      task.boardId.title,
      inviterName,
      link
    );

    // 4. Gửi socket - cập nhật realtime thông tin thành viên
    const io = getIO();
    io.to(task.boardId._id.toString()).emit("assignMember", {
      taskId,
      userId,
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar,
    });

    // 5. Gửi qua queue Redis - tạo activity-log
    await activityLogQueue.add("activityLog", {
      userId: inviterId,
      boardId: task.boardId._id,
      taskId,
      action: "MEMBER_ASSIGN_TASK",
      target: user.fullName,
    });

    return res.status(201).json({
      status: "success",
      code: 201,
      message: "Mời thành viên vào task thành công",
      data: {
        taskId,
        userId,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const removeMember = async (req, res) => {
  try {
    const inviterId = req.user.userId;
    const { userId, taskId } = req.params;
    const inviterName = req.user.fullName;

    // 1. Kiểm tra task, user
    const [task, user] = await Promise.all([
      Task.findById(taskId).populate("boardId"),
      User.findById(userId).lean(),
    ]);
    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task Assignee không tồn tại",
      });
    }

    // Kiểm tra Task Assignee
    const taskAssignee = await TaskAssignee.findOne({ taskId, userId });
    if (!taskAssignee) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task assignee không tồn tại",
      });
    }

    // 2. Xóa Task Assignee
    await TaskAssignee.deleteOne({ _id: taskAssignee._id });

    // 3. Gửi email thông báo
    // - Nếu người dùng đang nhập và loại bỏ chính mình, không gửi email
    if (req.user.userId.toString() !== taskAssignee.userId.toString()) {
      await sendRemoveMemberEmail(
        user.email,
        task,
        task.boardId.title,
        inviterName
      );
    }

    // 4. Gửi socket - cập nhật realtime
    const io = getIO();
    io.to(task.boardId._id.toString()).emit("removeMember", {
      taskId: taskAssignee.taskId,
      userId: taskAssignee.userId,
    });

    // 5. Gửi qua queue Redis - tạo activity-log
    await activityLogQueue.add("activityLog", {
      userId: inviterId,
      boardId: task.boardId._id,
      taskId,
      action: "MEMBER_UNASSIGN_TASK",
      target: user.fullName,
    });


    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Loại bỏ thành viên khỏi task thành công",
      data: {
        _id: taskAssignee._id,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const getTaskMembers = async (req, res) => {
  const { boardId, taskId } = req.params;

  try {
    // 1. Lấy tất cả member của board đã chấp nhận
    const boardMembers = await BoardMember.find({
      boardId,
      status: "accepted",
    }).populate("userId", "fullName avatar email");

    // 2. Lấy danh sách assignees của task
    const taskAssignees = await TaskAssignee.find({
      taskId,
    }).populate("userId", "fullName avatar email");

    // 3. Tách ra 2 nhóm
    const assignedUserIds = taskAssignees.map((a) => a.userId._id.toString());

    const assigned = taskAssignees.map((a) => a.userId);
    const available = boardMembers
      .map((b) => b.userId)
      .filter((u) => !assignedUserIds.includes(u._id.toString()));

    return res.status(200).json({
      status: "success",
      code: 200,
      data: {
        assigned,
        available,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const getAllTaskAssignees = async (req, res) => {
  try {
    const taskId = req.params.taskId;

    // 1. Kiểm tra task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 2. Lấy danh sách user có trong taskAssignee
    const taskAssignees = await TaskAssignee.aggregate([
      {
        $match: { taskId: new mongoose.Types.ObjectId(taskId) },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $addFields: {
          fullName: "$user.fullName",
          avatar: "$user.avatar",
          userId: "$user._id",
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          fullName: 1,
          avatar: 1,
        },
      },
    ]);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách thành viên được giao trong task: " + task.title,
      data: taskAssignees,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

module.exports = {
  assignMember,
  removeMember,
  getAllTaskAssignees,
  getTaskMembers,
};
