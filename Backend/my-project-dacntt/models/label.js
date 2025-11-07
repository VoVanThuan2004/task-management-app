const mongoose = require("mongoose");

const labelSchema = new mongoose.Schema(
  {
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      index: true,
      required: true,
    },
    title: { type: String },
    color: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Label", labelSchema);
