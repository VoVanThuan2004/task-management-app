const Subscription = require("../models/vipSubscription");
const Board = require("../models/board");
const Column = require("../models/column");

const requireVip = async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({ userId: req.user.userId });

    // Nếu không có subscription HOẶC isVip = false HOẶC đã hết hạn
    if (
      !sub ||
      (sub.expirationDate && new Date() > sub.expirationDate) ||
      !sub?.isVip
    ) {
      return res.status(403).json({
        status: "error",
        code: 403,
        message:
          "Tính năng AI gợi ý việc cần làm yêu cầu gói VIP. Vui lòng nâng cấp gói VIP cho tài khoản.",
        error: "VIP_ACCOUNT",
      });
    }

    req.vipSubscription = sub;
    next();
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error,
    });
  }
};

// Giới hạn số lượng bảng làm việc khi tạo
const limitBoards = async (req, res, next) => {
  try {
    // 1. Đếm số lượng board hiện tại
    const boardCount = await Board.countDocuments({ ownerId: req.user.userId });
    const sub = await Subscription.findOne({ userId: req.user.userId });

    if (
      boardCount >= 3 &&
      (!sub ||
        (sub.expirationDate && new Date() > sub.expirationDate) ||
        !sub?.isVip)
    ) {
      return res.status(403).json({
        status: "error",
        code: 403,
        message:
          "Bạn đã đạt giới hạn tạo tối đa 5 bảng. Vui lòng nâng cấp gói VIP để tạo thêm bảng.",
        error: "BOARD_LIMIT_EXCEEDED",
      });
    }

    req.vipSubscription = sub;
    next();
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error,
    });
  }
};

const limitColumnsInBoard = async (req, res, next) => {
  try {
    const boardId = req.body.boardId;
    if (!boardId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "boardId là bắt buộc",
      });
    }

    // 1. Kiểm tra board có tồn tại
    const existingBoard = await Board.findById(boardId).lean();
    if (!existingBoard) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }

    // 2. Giới hạn chỉ được tối đa 10 thẻ (column)
    const columnCount = await Column.countDocuments({ boardId });
    const sub = await Subscription.findOne({ userId: req.user.userId });

    if (
      columnCount >= 3 &&
      (!sub ||
        (sub.expirationDate && new Date() > sub.expirationDate) ||
        !sub?.isVip)
    ) {
      return res.status(403).json({
        status: "error",
        code: 403,
        message:
          "Bạn đã đạt giới hạn tạo tối đa 10 thẻ trong 1 bảng làm việc. Vui lòng nâng cấp gói VIP để tạo thêm thẻ.",
        error: "COLUMN_LIMIT_EXCEEDED",
      });
    }

    req.vipSubscription = sub;
    next();
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error,
    });
  }
};

module.exports = {
  requireVip,
  limitBoards,
  limitColumnsInBoard,
};
