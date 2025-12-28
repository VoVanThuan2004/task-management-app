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

// Tìm kiếm thông tin email user
router.get("/api/v1/users/search", auth, userController.searchEmailUser);

// Lấy trạng thái tài khoản vip hiện tại
router.get("/api/v1/users/vip", auth, userController.getUserVip);


// ===== ADMIN ===== 
// Khóa - mở người dùng
router.put("/api/v1/users/:userId/toggle-lock", auth, userController.toggleLockUser);

// Thêm người dùng
router.post("/api/v1/users/admin", auth, upload.single("avatar"), userController.addUser);

// Cập nhật người dùng
router.put("/api/v1/users/admin/:userId", auth, upload.single("avatar"), userController.updateUserForAdmin);

module.exports = router;