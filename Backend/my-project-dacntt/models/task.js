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
    startDate: { type: Date, default: null }, // Ngày bắt đầu
    dueDate: { type: Date, default: null }, // Ngày kết thúc
    reminderEnabled: { type: Boolean, default: false }, // Bật/tắt nhắc nhở
    reminderTime: { type: Number, default: 30 }, // Số phút trước khi nhắc
    reminderSent: { type: Boolean, default: false }, // Đã gửi nhắc nhở chưa
    position: { type: Number, required: true },
    isArchived: { type: Boolean, default: false },  // Xóa mềm (đưa vào thùng rác)
    isCompleted: { type: Boolean, default: false },
    status: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Task", taskSchema);
