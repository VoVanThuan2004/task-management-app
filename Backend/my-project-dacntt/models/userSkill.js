const mongoose = require("mongoose");

const userSkillSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
      index: true,
    },
    skill: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSkillSchema.index({ userId: 1, boardId: 1 });
userSkillSchema.index({ userId: 1, boardId: 1, skill: 1 }, { unique: true });

module.exports = mongoose.model("UserSkill", userSkillSchema);
