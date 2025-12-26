const auth = require("../middlewares/auth");
const express = require("express");
const router = express.Router();
const boardController = require("../controllers/boardController");
const storage = require("../config/storage");
const multer = require("multer");
const upload = multer({ storage });
const { limitBoards } = require("../middlewares/vipMiddleware");

// Tạo bảng
router.post("/api/v1/boards", auth, limitBoards, boardController.createBoard);

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
router.get("/api/v1/boards-detail/:boardId", boardController.getBoardDetail);

// Lấy danh sách thành viên member trong bảng làm việc
router.get("/api/v1/boards-member/:boardId", auth, boardController.getAllBoardMembers);

// Lấy danh sách thành viên member cho AI gán thành viên
router.get("/api/v1/boards-member/:boardId/AI", auth, boardController.getAllBoardMembersForAI);

// Xóa thành viên ra khỏi bảng làm việc
router.delete("/api/v1/boards-member/:boardId/:userId", auth, boardController.deleteBoardMember);

// Thay đổi khả năng xem bảng làm việc
router.put("/api/v1/boards-visibility/:boardId", auth, boardController.changeBoardVisibility);

// Lấy ra khả năng xem bảng làm việc hiện tại
router.get("/api/v1/boards-visibility/:boardId", auth, boardController.getBoardVisibility);


module.exports = router;
