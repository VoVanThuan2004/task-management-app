const express = require("express");
const router = express.Router();
const checklistController = require("../controllers/checklistController");
const auth = require("../middlewares/auth");

// API thêm check-list
router.post("/api/v1/checklist/", auth, checklistController.addChecklist);

// API cập nhât tiêu đề
router.put("/api/v1/checklist/title/:id", auth, checklistController.updateTitleChecklist);

// API cập nhật vị trí
router.put("/api/v1/checklist/position/:id", auth, checklistController.moveChecklist);

// API xóa check-list
router.delete("/api/v1/checklist/:id", auth, checklistController.deleteChecklist);

module.exports = router;
