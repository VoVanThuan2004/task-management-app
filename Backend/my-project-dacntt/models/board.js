const mongoose = require("mongoose");

const boardSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    title: { type: String, required: true },
    background: { type: String },
    backgroundPublicId: { type: String, default: null },  
    type: { type: String }, 
    description: { type: String, default: null },
    isArchived: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Board", boardSchema);
