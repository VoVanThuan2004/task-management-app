const mongoose = require("mongoose");
const Role = require("../models/role");
const User = require("../models/user");
const cloudinary = require("../config/cloudinary");

const getAllUsers = async (req, res) => {
  const roleName = req.user.roleName;
  if (roleName !== "ADMIN") {
    return res.status(403).json({
      status: "error",
      code: 403,
      message: "Không có quyền truy cập tài nguyên này",
    });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const role = await Role.findOne({ roleName: "ADMIN" });
    if (!role) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Vai trò không hợp lệ",
      });
    }

    const [totalUsers, users] = await Promise.all([
      User.countDocuments({ roleId: { $ne: role._id } }),
      User.find({ roleId: { $ne: role._id } })
        .select("_id email fullName avatar isActive createdAt updatedAt")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách người dùng thành công",
      data: users,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const getProfile = async (req, res) => {
  const userId = req.user.userId;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "ID người dùng không hợp lệ",
    });
  }

  try {
    const user = await User.findById(userId).select(
      "_id email fullName avatar"
    );
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Người dùng không tồn tại",
      });
    }

    return res.status(200).json({
      status: "error",
      code: 200,
      message: "Lấy thông tin người dùng thành công",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  const userId = req.user.userId;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    await deleteUploadedFile(req.file);
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "ID người dùng không hợp lệ",
    });
  }

  const { fullName } = req.body;
  if (!fullName) {
    await deleteUploadedFile(req.file);
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Vui lòng nhập họ tên",
    });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      await deleteUploadedFile(req.file);
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Người dùng không tồn tại",
      });
    }

    // Cập nhật thông tin
    user.fullName = fullName;
    if (req.file) {
      user.avatar = req.file.path;
      user.avatarId = req.file.filename;
    }
    await user.save();

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Cập nhật thông tin thành công",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

// Function xóa ảnh upload cloudinary
const deleteUploadedFile = async (file) => {
  if (file && file.filename) {
    await cloudinary.uploader.destroy(file.filename);
  }
};

module.exports = {
  getAllUsers,
  getProfile,
  updateProfile,
};
