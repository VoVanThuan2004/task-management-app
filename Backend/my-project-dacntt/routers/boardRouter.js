const auth = require("../middlewares/auth");
const express = require("express");
const router = express.Router();
const boardController = require("../controllers/boardController");
const storage = require("../config/storage");
const multer = require("multer");
const upload = multer({ storage });

// Tạo bảng
router.post("/api/v1/boards", auth, boardController.createBoard);

// Cập nhật thông tin bảng
router.put("/api/v1/boards/:boardId", auth, boardController.updateBoard);

// Cập nhật background bảng (cập nhật ảnh background)
router.put("/api/v1/boards-background/:boardId", auth, upload.single("background"), boardController.updateBoardBackground);

// Xóa background bảng
router.delete("/api/v1/boards-background/:boardId", auth, boardController.deleteBoardBackground);

// Xóa bảng
router.delete("/api/v1/boards/:boardId", auth, boardController.deleteBoard);

// Khôi phục lại bảng sau khi xóa
router.put("/api/v1/boards/:boardId/restore", auth, boardController.restoreBoard);

// Lấy danh sách bảng của người dùng
router.get("/api/v1/boards", auth, boardController.getAllBoards);

// Lấy danh sách bảng được mời vào
router.get("/api/v1/boards-invited", auth, boardController.getAllBoardsInvited);

// Chia sẻ thành viên khác vào bảng làm việc
router.post("/api/v1/boards/share", auth, boardController.shareBoard);

// Lấy chi tiết bảng làm việc
router.get("/api/v1/boards-detail/:boardId", auth, boardController.getBoardDetail);


module.exports = router;
