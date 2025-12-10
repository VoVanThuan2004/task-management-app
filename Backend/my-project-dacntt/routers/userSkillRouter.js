const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const userSkillController = require("../controllers/userSkillController");

// API thêm skill cho user
router.post("/api/v1/user-skill", auth, userSkillController.addSkillBoard);

// API lấy danh sách skill của user
router.get("/api/v1/user-skill", auth, userSkillController.getAllSkillsUser);

// API xóa skill
router.delete("/api/v1/user-skill/:id", auth, userSkillController.deleteSkillUser);
module.exports = router;
