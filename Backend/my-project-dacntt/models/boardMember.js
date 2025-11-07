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
    required: true,
  },
  role: { type: String },
  status: { type: String, default: "Đang chờ" },
  inviteToken: { type: String, default: null },
  invitedAt: { type: Date },
  acceptedAt: { type: Date, default: null }
});

module.exports = mongoose.model("BoardMember", boardMemberSchema);
