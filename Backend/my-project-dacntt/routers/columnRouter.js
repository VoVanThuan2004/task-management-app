const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const columnController = require("../controllers/columnController");

// Lấy danh sách columns tăng dần theo position
router.get("/api/v1/columns/:boardId", auth, columnController.getAllColumns);

router.get("/api/v2/columns/:boardId", auth, columnController.getAllColumnsAndFilter);

// Thêm column của 1 board 
router.post("/api/v1/columns", auth, columnController.addColumn);

// Cập nhật tên title cho column
router.put("/api/v1/columns/:columnId", auth, columnController.updateTitleColumn);

// Cập nhật - kéo thả column sang vị trí khác trong bảng làm việc (board)
router.put("/api/v1/columns/:columnId/position", auth, columnController.moveColumn);

// Cập nhật - Chọn bảng làm việc khác + vị trí nằm trong bảng làm việc
router.put("/api/v1/columns/:columnId/move-to-board", auth, columnController.moveToBoard);

// Xóa column - ẩn đi
router.delete("/api/v1/columns/:columnId", auth, columnController.deleteColumn);

module.exports = router;