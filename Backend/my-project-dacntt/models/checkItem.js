const mongoose = require("mongoose");

const checkItemSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    index: true,
    required: true,
  },
  title: {
    type: String,
  },
  position: { type: Number },
  isCompleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
    default: null,
  },
  startDate: { type: Date, default: null },
  dueDate: { type: Date, default: null },
  status: { type: String, default: null },
});

checkItemSchema.index({ taskId: 1, isCompleted: 1 });

module.exports = mongoose.model("CheckItem", checkItemSchema);
