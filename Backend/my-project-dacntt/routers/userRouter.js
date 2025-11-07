const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const userController = require("../controllers/userController");
const storage = require("../config/storage");
const multer = require("multer");
const upload = multer({ storage });

// Lấy danh sách người dùng
router.get("/api/v1/users", auth, userController.getAllUsers);

// Lấy thông tin profile người dùng
router.get("/api/v1/users/profile", auth, userController.getProfile);

// Cập nhật thông tin profile
router.put("/api/v1/users", upload.single("avatar"), auth, userController.updateProfile);

module.exports = router;