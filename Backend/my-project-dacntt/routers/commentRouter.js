const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const commentController = require("../controllers/commentController");
const storage = require("../config/storage");
const multer = require("multer");
const upload = multer({ storage });

// Gửi tin nhắn
router.post("/api/v1/comments", auth, upload.array("files"), commentController.sendMessage);

// Xóa tin nhắn
router.delete("/api/v1/comments/:commentId", auth, commentController.deleteComment);

// Cập nhật tin nhắn
router.put("/api/v1/comments/:commentId", auth, upload.array("files"), commentController.updateComment);

// Lấy danh sách tin nhắn trong 1 task
router.get("/api/v1/comments/:taskId", auth, commentController.getAllComments);

// Thả emoji tin nhắn
router.post("/api/v1/comments-emoji", auth, commentController.addOrRemoveReaction)

module.exports = router;