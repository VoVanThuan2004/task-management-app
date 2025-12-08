const express = require("express");
const router = express.Router();
const checklistItemController = require("../controllers/checklistItemController");
const auth = require("../middlewares/auth");

// API thêm checklist-item
router.post("/api/v1/checklist-item/", auth, checklistItemController.addChecklistItem); 

// API cập nhật tiêu đề check-list-item
router.put("/api/v1/checklist-item/title/:id", auth, checklistItemController.updateTitleChecklistItem); 

// API xóa check-list-item
router.delete("/api/v1/checklist-item/:id", auth, checklistItemController.deleteChecklistItem);

// API click hoàn tất - chưa hoàn tất 
router.put("/api/v1/checklist-item/complete/:id", auth, checklistItemController.toggleChecklistItemComplete);

// API di chuyển vị trí
router.put("/api/v1/checklist-item/position/:id", auth, checklistItemController.moveChecklistItem);

module.exports = router;