const mongoose = require("mongoose");

const emojiReactionSchema = new mongoose.Schema(
  {
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      index: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    emoji: String,
  },
  { timestamps: true }
);

// Một user chỉ được 1 emoji reaction cho cùng comment + emoji
emojiReactionSchema.index({ commentId: 1, userId: 1, emoji: 1 }, { unique: true });

module.exports = mongoose.model("EmojiReaction", emojiReactionSchema);
