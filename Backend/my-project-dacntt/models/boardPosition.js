const mongoose = require("mongoose");

const boardPositionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
        required: true
    },
    boardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Board",
        index: true,
        required: true
    },
    position: { type: Number, index: true },
}, {
    timestamps: true
});

module.exports = mongoose.model("BoardPosition", boardPositionSchema);