const PaymentOrder = require("../models/paymentOrder");
const User = require("../models/user");
const Board = require("../models/board");

const getDashboardBasic = async (req, res) => {
  try {
    const roleName = req.user.roleName;
    if (roleName !== "ADMIN") {
      return res.status(403).json({
        status: "error",
        code: 403,
        message: "Không có quyền truy cập tài nguyên này",
      });
    }

    // 1. Lấy tổng số lượng user
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0); // Optional: chính xác từ đầu ngày

    const [totalUsers, totalNewUsers, totalBoards, totalRevenue] =
      await Promise.all([
        User.countDocuments({ _id: { $ne: req.user.userId } }),
        User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
        Board.countDocuments({}),
        PaymentOrder.aggregate([
          {
            $match: {
              status: "paid",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]).then((result) => result[0]?.total || 0),
      ]);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy dữ liệu dashboard cơ bản thành công",
      data: {
        totalUsers,
        totalNewUsers,
        totalBoards,
        totalRevenue,
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

const getDashboardAdvanced = async (req, res) => {
  try {
    // 1. Check quyền ADMIN
    if (req.user.roleName !== "ADMIN") {
      return res.status(403).json({
        status: "error",
        message: "Không có quyền truy cập tài nguyên này",
      });
    }

    // 2. Validate query params
    const { type, startDate: startStr, endDate: endStr } = req.query;

    if (!type || !startStr || !endStr) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu tham số: type, startDate hoặc endDate",
      });
    }

    if (!["week", "month", "quarter", "year"].includes(type)) {
      return res.status(400).json({
        status: "error",
        message: "Loại thống kê không hợp lệ. Chọn: week, month, quarter, year",
      });
    }

    // Convert string → Date, và validate
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        status: "error",
        message: "Định dạng ngày không hợp lệ (YYYY-MM-DD)",
      });
    }

    // Đặt endDate cuối ngày
    endDate.setHours(23, 59, 59, 999);

    if (startDate > endDate) {
      return res.status(400).json({
        status: "error",
        message: "startDate phải nhỏ hơn hoặc bằng endDate",
      });
    }

    // 3. Pipeline cơ bản
    const pipeline = [
      {
        $match: {
          status: "paid",
          paymentDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
    ];

    // 4. Group theo type
    let groupId = {};
    let projectLabel = "";

    switch (type) {
      case "week":
        groupId = {
          year: { $year: "$paymentDate" },
          week: { $week: "$paymentDate" },
        };
        projectLabel = {
          $concat: [
            "Tuần ",
            { $toString: "$_id.week" },
            " - ",
            { $toString: "$_id.year" },
          ],
        };
        break;

      case "month":
        groupId = {
          year: { $year: "$paymentDate" },
          month: { $month: "$paymentDate" },
        };
        projectLabel = {
          $concat: [
            "Tháng ",
            { $toString: "$_id.month" },
            " - ",
            { $toString: "$_id.year" },
          ],
        };
        break;

      case "quarter":
        groupId = {
          year: { $year: "$paymentDate" },
          quarter: { $ceil: { $divide: [{ $month: "$paymentDate" }, 3] } },
        };
        projectLabel = {
          $concat: [
            "Quý ",
            { $toString: "$_id.quarter" },
            " - ",
            { $toString: "$_id.year" },
          ],
        };
        break;

      case "year":
        groupId = { year: { $year: "$paymentDate" } };
        projectLabel = { $concat: ["Năm ", { $toString: "$_id.year" }] };
        break;
    }

    pipeline.push({
      $group: {
        _id: groupId,
        totalRevenue: { $sum: "$amount" },
        totalOrders: { $sum: 1 }, // Đếm số đơn
      },
    });

    // 5. Sort theo thời gian tăng dần
    pipeline.push({
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
        "_id.week": 1,
        "_id.quarter": 1,
      },
    });

    // 6. Format output đẹp
    pipeline.push({
      $project: {
        _id: 0,
        label: projectLabel,
        totalRevenue: 1,
        totalOrders: 1,
      },
    });

    // 7. Execute
    const statistics = await PaymentOrder.aggregate(pipeline);

    // Nếu không có data → trả mảng rỗng
    if (statistics.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "Không có dữ liệu trong khoảng thời gian này",
        data: [],
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Thống kê doanh thu thành công",
      data: statistics,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi hệ thống: " + error,
    });
  }
};

module.exports = {
  getDashboardBasic,
  getDashboardAdvanced,
};
