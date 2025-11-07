const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },

    activityLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityLog",
      index: true,
      required: true,
    },
    message: { type: String },
    isRead: { type: Boolean, default: false },
    deliveryMethod: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
