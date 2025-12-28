const mongoose = require("mongoose");
const Role = require("../models/role");
const User = require("../models/user");
const cloudinary = require("../config/cloudinary");
const redisClient = require("../config/redis");
const bcrypt = require("bcrypt");
const VipSubscription = require("../models/vipSubscription");

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
                createdAt: 1,
              },
            },
          ],
          metadata: [{ $count: "totalUsers" }],
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

const addUser = async (req, res) => {
  try {
    if (req.user.roleName !== "ADMIN") {
      await deleteUploadedFile(req.file);
      return res.status(403).json({
        status: "error",
        code: 403,
        message: "Không có quyền truy cập tài nguyên này",
      });
    }

    const { email, fullName, password } = req.body;
    if (!email || !fullName || !password) {
      await deleteUploadedFile(req.file);
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập đầy đủ thông tin: email, fullName, password",
      });
    }

    // 1. Xác thực email có tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await deleteUploadedFile(req.file);
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Email này đã tồn tại",
      });
    }

    // 2. Kiểm tra password
    if (password.length < 8) {
      await deleteUploadedFile(req.file);
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Mật khẩu phải có ít nhất 8 ký tự",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 12);

    const role = await Role.findOne({ roleName: "USER" }).select("_id").lean();
    if (!role) {
      await deleteUploadedFile(req.file);
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Vai trò không tồn tại",
      });
    }

    // 3. Nếu có upload ảnh avatar
    let avatar = null;
    let avatarId = null;
    if (req.file) {
      avatar = req.file.path;
      avatarId = req.file.filename;
    }

    // 4. Tạo người dùng
    const newUser = await User.create({
      roleId: role._id,
      email,
      fullName,
      password: hashedPassword,
      avatar,
      avatarId,
      isActive: true,
    });

    return res.status(201).json({
      status: "success",
      code: 201,
      message: "Tạo tài khoản thành công",
      data: {
        _id: newUser._id,
        email,
        fullName,
        avatar,
        totalBoards: 0,
        createdAt: newUser.createdAt,
        isActive: newUser.isActive,
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

const updateUserForAdmin = async (req, res) => {
  try {
    if (req.user.roleName !== "ADMIN") {
      await deleteUploadedFile(req.file);
      return res.status(403).json({
        status: "error",
        code: 403,
        message: "Không có quyền truy cập tài nguyên này",
      });
    }

    const userId = req.params.userId;
    if (!userId) {
      await deleteUploadedFile(req.file);
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu tham số userId",
      });
    }

    const { fullName } = req.body;
    if (!fullName) {
      await deleteUploadedFile(req.file);
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập thông tin fullName",
      });
    }

    // 1. Xác thực người dùng có tồn tại
    const existingUser = await User.findOne({ _id: userId });
    if (!existingUser) {
      await deleteUploadedFile(req.file);
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Người dùng không tồn tại",
      });
    }

    // 2. Kiểm tra có upload ảnh avatar
    if (req.file) {
      if (existingUser.avatarId) {
        await cloudinary.uploader.destroy(existingUser.avatarId);
      }
      existingUser.avatar = req.file.path;
      existingUser.avatarId = req.file.filename;
    }

    // 3. Cập nhật người dùng
    existingUser.fullName = fullName;
    await existingUser.save();

    return res.status(201).json({
      status: "success",
      code: 201,
      message: "Cập nhật tài khoản thành công",
      data: {
        _id: existingUser._id,
        fullName,
        avatar: existingUser.avatar,
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

async function getUserVip(req, res) {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu userId",
      });
    }

    // 1. Xác thực user có tồn tại
    const [user, vipSubscription] = await Promise.all([
      User.findById(userId).lean(),
      VipSubscription.findOne({ userId }).lean(),
    ]);
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Người dùng không tồn tại",
      });
    }

    // 2. Kiểm tra trạng thái vip subscription
    if (
      !vipSubscription ||
      !vipSubscription?.isVip ||
      new Date() > vipSubscription?.expirationDate
    ) {
      return res.status(200).json({
        status: "success",
        code: 200,
        message: "Trạng thái gói vip hiện tại của người dùng",
        data: {
          isVip: false,
        },
      });
    }

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Trạng thái gói vip hiện tại của người dùng",
      data: {
        isVip: true,
        expirationDate: vipSubscription.expirationDate,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
}

module.exports = {
  getAllUsers,
  getProfile,
  updateProfile,
  searchEmailUser,
  toggleLockUser,
  addUser,
  updateUserForAdmin,
  getUserVip,
};
