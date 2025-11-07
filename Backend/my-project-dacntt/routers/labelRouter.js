const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const labelController = require("../controllers/labelController");

// Tạo label cho 1 bảng làm việc (board)
router.post("/api/v1/labels", auth, labelController.addLabel);

// Lấy danh sách label trong 1 bảng làm việc (board)
router.get("/api/v1/labels/:boardId", auth, labelController.getAllLabels);

// Cập nhật label
router.put("/api/v1/labels/:labelId", auth, labelController.updateLabel);

// Xóa label
router.delete("/api/v1/labels/:labelId", auth, labelController.deleteLabel);

module.exports = router;
