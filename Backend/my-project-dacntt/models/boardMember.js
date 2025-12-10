const mongoose = require("mongoose");

const boardMemberSchema = new mongoose.Schema({
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Board",
    index: true,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
    required: true,
  },
  inviterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
    default: null
  },
  role: { type: String },
  status: { type: String, default: "pending" },
  invitedAt: { type: Date },
  acceptedAt: { type: Date, default: null },
});

// Tạo index
boardMemberSchema.index({ userId: 1, boardId: 1 }, { unique: true });

module.exports = mongoose.model("BoardMember", boardMemberSchema);
