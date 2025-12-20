const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const taskAssigneeController = require("../controllers/taskAssigneeController");

// Chỉ định thành viên cho task
router.post("/api/v1/task-assignee", auth, taskAssigneeController.assignMember)

// Loại thành viên chỉ định cho task
router.delete("/api/v1/task-assignee/:userId/:taskId", auth, taskAssigneeController.removeMember);

// Lấy danh sách thành viên được giao
router.get("/api/v1/task-assignee/:taskId", auth, taskAssigneeController.getAllTaskAssignees);

router.get("/api/v1/task-assignee/:boardId/:taskId/members", auth, taskAssigneeController.getTaskMembers)


module.exports = router;