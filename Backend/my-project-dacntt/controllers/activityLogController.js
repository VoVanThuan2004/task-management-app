const ActivityLog = require("../models/activityLog");
const Task = require("../models/task");
const { ObjectId } = require("mongodb");

const getAllActivityLogsTask = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    if (!taskId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "taskId is null",
      });
    }

    // 1. Kiểm tra task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    const skip = (page - 1) * limit;

    const totalActivityLogs = await ActivityLog.countDocuments({
      taskId
    });

    const totalPages = Math.ceil(totalActivityLogs / limit);


    // 2. Lấy ra danh sách logs
    const activityLogs = await ActivityLog.aggregate([
      {
        $match: { taskId: new ObjectId(taskId) },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                _id: 0,
                fullName: 1,
                avatar: 1,
              },
            },
          ],
        },
      },

      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $sort: {
          createdAt: -1
        }
      },

      {
        $skip: skip
      },

      {
        $limit: limit
      },

      

      {
        $project: {
          _id: 1,
          userId: 1,
          fullName: "$user.fullName",
          avatar: "$user.avatar",
          taskId: 1,
          boardId: 1,
          action: 1,
          description: 1,
          createdAt: 1,
        },
      },
    ]);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách hoạt động thông báo thành công",
      pagination: {
        page,
        limit,
        totalActivityLogs,
        totalPages,
      },
      data: activityLogs,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error,
    });
  }
};

const getTotalActivityLogs = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    if (!taskId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu taskId"
      })
    }

    const totalActivityLogs = await ActivityLog.countDocuments({ taskId });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy tổng số hoạt động của task",
      data: totalActivityLogs
    })
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error,
    })
  }
}

module.exports = {
  getAllActivityLogsTask,
  getTotalActivityLogs,
};
