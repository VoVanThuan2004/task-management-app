const mongoose = require("mongoose");

const checklistSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    index: true,
    required: true,
  },
  title: { type: String, required: true },
  position: { type: Number }
}, {
    timestamps: true
});

module.exports = mongoose.model("Checklist", checklistSchema);
