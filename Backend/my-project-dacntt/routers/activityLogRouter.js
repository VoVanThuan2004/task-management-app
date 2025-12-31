const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const activityLogController = require("../controllers/activityLogController");

// API lấy ra danh sách hoạt động logs trong task
router.get("/api/v1/activity-log/:taskId/task", auth, activityLogController.getAllActivityLogsTask);

// API lấy tổng số lượng hoạt động logs hiện tại trong 1 task]
router.get("/api/v1/activity-log/:taskId/count", auth, activityLogController.getTotalActivityLogs);

module.exports = router;