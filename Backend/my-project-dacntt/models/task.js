const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    columnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Column",
      index: true,
      required: true,
    },
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      index: true,
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      index: true,
      default: null,
    },
    title: { type: String, required: true },
    background: { type: String, default: null },
    description: { type: String, default: null },
    dueDate: { type: Date },
    position: { type: Number, required: true },
    isArchived: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Task", taskSchema);
