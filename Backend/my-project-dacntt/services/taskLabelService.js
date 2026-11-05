const { ObjectId } = require("mongodb");
const Task = require("../models/task");
const Label = require("../models/label");
const TaskLabel = require("../models/taskLabel");
const { getIO } = require("../config/socket");
const ApiError = require("../errors/ApiError");

const toggleTaskLabel = async ({ taskId, labelId }) => {
  if (!taskId || !labelId) {
    throw ApiError.badRequest("Vui lòng nhập taskId, labelId");
  }

  const [task, label] = await Promise.all([
    Task.findById(taskId).lean(),
    Label.findById(labelId).lean(),
  ]);

  if (!task || !label) {
    throw ApiError.notFound("Task hoặc Label không tồn tại");
  }

  const existing = await TaskLabel.findOne({ taskId, labelId });

  let action;
  if (existing) {
    await TaskLabel.deleteOne({ _id: existing._id });
    action = "removed";
  } else {
    await TaskLabel.create({ taskId, labelId });
    action = "added";
  }

  const io = getIO();
  io.to(task.boardId.toString()).emit("taskLabelUpdated", {
    taskId,
    labelId,
    title: label.title,
    color: label.color,
    action,
  });

  return {
    taskId,
    labelId,
    title: label.title,
    color: label.color,
    action,
  };
};

const getTaskLabels = async ({ taskId }) => {
  if (!taskId) {
    throw ApiError.badRequest("Thiếu taskId");
  }

  const task = await Task.findById(taskId)
    .populate({
      path: "columnId",
      select: "boardId",
    })
    .lean();

  if (!task) {
    throw ApiError.notFound("Task không tồn tại");
  }

  if (!task.columnId || !task.columnId.boardId) {
    throw ApiError.notFound("Task không thuộc bảng làm việc");
  }

  return Label.aggregate([
    {
      $match: {
        boardId: new ObjectId(task.columnId.boardId),
      },
    },
    {
      $lookup: {
        from: "tasklabels",
        let: { labelId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$labelId", "$$labelId"] },
              taskId: new ObjectId(taskId),
            },
          },
          { $limit: 1 },
        ],
        as: "taskLabels",
      },
    },
    {
      $addFields: {
        status: { $gt: [{ $size: "$taskLabels" }, 0] },
      },
    },
    {
      $project: {
        taskLabels: 0,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $project: {
        _id: 1,
        boardId: 1,
        title: 1,
        color: 1,
        status: 1,
      },
    },
  ]);
};

module.exports = {
  toggleTaskLabel,
  getTaskLabels,
};
