const jwt = require("jsonwebtoken");
require("dotenv").config();
const redisClient = require("../config/redis");

const SECRET_KEY = process.env.SECRET_KEY;

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      status: "error",
      code: 401,
      message: "Thiếu mã xác thực (Authorization token)",
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "error",
      code: 401,
      message: "Access Denied",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // Gán vào req.user để dùng ở route khác

    // Tích hợp Redis - kiểm tra tài khoản có khóa hay không
    const isBlacklisted = await redisClient.sismember("blacklisted_users", decoded.userId);
    if (isBlacklisted === 1) {
      return res.status(401).json({
        status: "error",
        code: 401,
        message: "Tài khoản người dùng đã bị khóa",
      });
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "error",
        code: 401,
        message: "Token đã hết hạn. Vui lòng đăng nhập lại.",
      });
    }

    return res.status(403).json({
      status: "error",
      code: 403,
      message: "Token không hợp lệ",
      error: error.message,
    });
  }
};