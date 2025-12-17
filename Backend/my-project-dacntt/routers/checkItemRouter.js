const auth = require("../middlewares/auth");
const checkItemController = require("../controllers/checkItemController");
const express = require("express");
const router = express.Router();

// API thêm checkItem
router.post("/api/v1/check-item/", auth, checkItemController.addCheckItem);

// API cập nhật tiêu đề checkItem
router.put("/api/v1/check-item/title/:id", auth, checkItemController.updateTitleCheckItem);

// API xóa checkItem
router.delete("/api/v1/check-item/:id", auth, checkItemController.deleteCheckItem);

// API di chuyển vị trí checkItem
router.put("/api/v1/check-item/position/:id", auth, checkItemController.moveCheckItem);

// API click hoàn tất - chưa hoàn tất 
router.put("/api/v1/check-item/complete/:id", auth, checkItemController.toggleCheckItemComplete);

// API lấy danh sách checkItems
router.get("/api/v1/check-item/:taskId", auth, checkItemController.getAllCheckItems);

// API thêm thời gian deadline cho checkItem
router.put("/api/v1/check-item/deadline/:id", auth, checkItemController.updateDeadlineCheckItem);

// API gán người dùng cho checkItem
router.put("/api/v1/check-item/assigned/:id", auth, checkItemController.assignCheckItem);

// API lấy danh sách members trong board
router.get("/api/v1/check-item/members/:checkItemId/:boardId", auth, checkItemController.getMembersForAssign);

// API xóa thành viên ra khỏi checkItem
router.delete("/api/v1/check-item/:checkItemId/members/:memberId", auth, checkItemController.removeMember);

module.exports = router;