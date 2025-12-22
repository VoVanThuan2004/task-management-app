const mongoose = require("mongoose");
const Role = require("../models/role");
const User = require("../models/user");
const cloudinary = require("../config/cloudinary");
const redisClient = require("../config/redis");

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
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Tham số search
  let searchCondition = {};
  if (req.query.search) {
    searchCondition = {
      fullName: { $regex: req.query.search.trim(), $options: "i" },
    };
  }

  try {
    const role = await Role.findOne({ roleName: "ADMIN" }).select("_id").lean();
    if (!role) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Vai trò không hợp lệ",
      });
    }

    // Điều kiện lọc ra các users
    const matchStage = {
      roleId: { $ne: role._id },
      ...searchCondition,
    };

    

    const users = await User.aggregate([
      {
        $match: matchStage,
      },

      {
        $lookup: {
          from: "boardmembers",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$userId", "$$userId"],
                },
              },
            },
            {
              $count: "totalBoards",
            },
          ],
          as: "boardStats",
        },
      },

      {
        $addFields: {
          totalBoards: {
            $ifNull: [
              {
                $arrayElemAt: ["$boardStats.totalBoards", 0],
              },
              0,
            ],
          },
        },
      },

      { $project: { boardStats: 0 } },

      {
        $facet: {
          data: [
            {
              $sort: {
                createdAt: -1,
              },
            },
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },

            {
              $project: {
                _id: 1,
                email: 1,
                fullName: 1,
                avatar: 1,
                isActive: 1,
                totalBoards: 1,
              },
            },
          ],
          metadata: [
            { $count: "totalUsers" },
          ],
        },
      },
    ]);

    const totalUsers = users[0].metadata[0]?.totalUsers || 0;
    const totalPages = Math.ceil(totalUsers / limit);
    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách người dùng thành công",
      data: users[0].data,
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
      status: "success",
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

const searchEmailUser = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập địa chỉ email hoặc tên",
      });
    }

    // 1. Lấy ra role admin
    const roleAdmin = await Role.findOne({ roleName: "ADMIN" });

    // 2. Query lấy dữ liệu
    const users = await User.find({
      $or: [
        { email: { $regex: query, $options: "i" } },
        { fullName: { $regex: query, $options: "i" } },
      ],
      roleId: { $ne: roleAdmin._id },
    })
      .select("_id fullName email avatar")
      .limit(10);

    return res.status(200).json({
      status: "success",
      code: 200,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const toggleLockUser = async (req, res) => {
  try {
    const roleName = req.user.roleName;
    if (roleName !== "ADMIN") {
      return res.status(403).json({
        status: "error",
        code: 403,
        message: "Không có quyền truy cập tài nguyên này",
      });
    }
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "ID user is null",
      });
    }

    // 1. Kiểm tra user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Người dùng không tồn tại",
      });
    }

    // 2. Kiểm tra trạng thái hiện tại
    user.isActive = !user.isActive;
    await user.save();

    // 3. Mở khóa tài khoản - xóa ra khỏi blacklist
    if (user.isActive) {
      await redisClient.srem("blacklisted_users", user._id.toString());
    } else {
      await redisClient.sadd("blacklisted_users", user._id.toString());
    }

    return res.status(200).json({
      status: "success",
      code: 200,
      message: user.isActive
        ? "Mở khóa tài khoản người dùng"
        : "Khóa tài khoản người dùng",
      data: user.isActive,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  getProfile,
  updateProfile,
  searchEmailUser,
  toggleLockUser,
};
