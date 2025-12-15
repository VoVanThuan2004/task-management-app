const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const taskController = require("../controllers/taskController");
const storage = require("../config/storage");
const multer = require("multer");
const upload = multer({ storage });

// Thêm task mới vào 1 column
router.post("/api/v1/tasks/:columnId", auth, taskController.addTask);

// Cập nhật task - tên title
router.put("/api/v1/tasks/:taskId/title", auth, taskController.updateTaskTitle);

// Cập nhật thời gian deadline cho task
router.put("/api/v1/tasks/:taskId/deadline", auth, taskController.updateDeadlineTask);

// Cập nhật task - mô tả (description)
router.put("/api/v1/tasks/:taskId/description", auth, taskController.updateTaskDescription);

// Cập nhật vị trí task
router.put("/api/v1/tasks/:taskId/position", auth, taskController.moveTask);

// Xóa task
router.delete("/api/v1/tasks/:taskId", auth, taskController.deleteTask);

// Gán label (nhãn dán) cho task
router.post("/api/v1/tasks-label", auth, taskController.toggleLabelOnTask);

// Lấy danh sách task-label
router.get("/api/v1/tasks-label/:taskId", auth, taskController.getAllTaskLabels);

// Upload file đính kèm cho task
router.post("/api/v1/tasks-attachment", auth, upload.single("file"), taskController.uploadFile);

// Xóa file đính kèm cho task
router.delete("/api/v1/tasks-attachment/:attachmentId", auth, taskController.deleteFile);

// Lấy thông tin chi tiết task
router.get("/api/v1/tasks/:taskId", auth, taskController.getTaskDetail);

// Đánh dấu hoàn thành - chưa hoàn thành task
router.put("/api/v1/tasks/:taskId/toggle", auth, taskController.toggleTask);

module.exports = router;