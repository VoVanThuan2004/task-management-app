const mongoose = require("mongoose");

const checklistItemSchema = new mongoose.Schema(
  {
    checklistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Checklist",
      index: true,
      required: true,
    },
    title: { type: String, required: true },
    position: { type: Number },
    isCompleted: { type: Boolean, default: false },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    dueDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ChecklistItem", checklistItemSchema);
