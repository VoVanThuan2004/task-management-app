const mongoose = require("mongoose");

const userSkillSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Board",
    required: true,
    index: true
  },
  skill: {
    type: String,
  },
});

module.exports = mongoose.model("UserSkill", userSkillSchema);
