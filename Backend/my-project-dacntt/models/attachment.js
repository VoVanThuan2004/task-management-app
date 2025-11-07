const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    index: true,
    default: null,
  },
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    index: true,
    default: null,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
    required: true,
  },
  fileName: { type: String },
  fileType: { type: String },
  fileSize: { type: String },
  fileUrl: { type: String },
  filePublicId: { type: String },  // dùng để xóa trên cloudinary
  thumbnailUrl: { type: String, default: null },
  duration: { type: Number, default: null },
  uploadedAt: { type: Date },
});

module.exports = mongoose.model("Attachment", attachmentSchema);
