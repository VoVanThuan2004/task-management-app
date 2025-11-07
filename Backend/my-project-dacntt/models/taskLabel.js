const mongoose = require("mongoose");

const taskLabelSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      index: true,
      required: true,
    },
    labelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Label",
      index: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TaskLabel", taskLabelSchema);
