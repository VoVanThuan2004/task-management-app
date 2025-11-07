const mongoose = require("mongoose");

const taskAssigneeSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    index: true,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
    required: true,
  },
  assignedAt: { type: Date }
});

module.exports = mongoose.model("TaskAssignee", taskAssigneeSchema);
