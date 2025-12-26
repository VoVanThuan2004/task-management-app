const mongoose = require("mongoose");

const vipSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    isVip: { type: Boolean, default: false },
    currentPlan: {
      type: String,
      default: "monthly",
    },
    expirationDate: { type: Date, default: null },
    lastPaymentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentOrder",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VipSubscription", vipSubscriptionSchema);
