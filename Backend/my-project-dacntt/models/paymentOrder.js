const mongoose = require("mongoose");

const paymentOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: new mongoose.Schema.ObjectId(),
      ref: "User",
      required: true,
    },
    orderCode: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    paymentMethod: {
      type: String
    },
    expirationDate: { type: Date },
    status: {
      type: String,
    },
    vnpTxnRef: {
      type: String,
      index: true,
    },
    vnpBankTranNo: {
      type: String,
    },
    vnpTransactionNo: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PaymentOrder", paymentOrderSchema);
