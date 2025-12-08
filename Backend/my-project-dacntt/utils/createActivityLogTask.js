const ActivityLog = require("../models/activityLog");
const actionMessage = require("../constants/actionMessage");

const createActivityLogTask = async ({
  userId,
  boardId,
  taskId,
  action,
  target,
}) => {
  try {
    if (!(action in actionMessage)) {
      console.warn("Action không tồn tại:", action);
      return null;
    }

    const description = target
      ? `${actionMessage[action]}: ${target}`
      : actionMessage[action];

    const activityLog = await ActivityLog.create({
      userId,
      boardId,
      taskId,
      action,
      description,
    });

    return activityLog;
  } catch (error) {
    console.error("Lỗi khi tạo activity log:", error);
    return null;
  }
};

module.exports = createActivityLogTask;
