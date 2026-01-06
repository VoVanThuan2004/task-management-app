const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
      index: true,
    },
    email: { type: String, required: true, index: true },
    fullName: { type: String },
    password: { type: String, default: null },
    avatar: { type: String, default: null },
    avatarId: { type: String },
    isActive: { type: Boolean },
    resetOtp: { type: String },
    resetOtpExpired: { type: Date },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
