const mongoose = require("mongoose");

const columnSchema = new mongoose.Schema({
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Board",
    index: true,
    required: true,
  },
  title: { type: String },
  position: { type: Number },
  isArchived: { type: Boolean, default: false },
}, {
    timestamps: true
});

module.exports = mongoose.model("Column", columnSchema);
