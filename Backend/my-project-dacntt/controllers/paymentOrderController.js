const PaymentOrder = require("../models/paymentOrder");
const qs = require("qs");
const {
  vnp_TmnCode,
  vnp_HashSecret,
  vnp_Url,
  vnp_ReturnUrl,
} = require("../config/vnpay");
const Subscription = require("../models/vipSubscription");
const moment = require("moment");
require("dotenv").config();
const mongoose = require("mongoose");
const VipSubscription = require("../models/vipSubscription");
const emailQueue = require("../services/emailQueue");
const vipSubscriptionQueue = require("../services/vipSubscriptionQueue");
const User = require("../models/user");
const { ObjectId } = require("mongodb");

const createVnpayPayment = async (vnpTxnRef, orderCode, amount, req) => {
  if (!vnp_TmnCode || !vnp_HashSecret || !vnp_ReturnUrl) {
    return "Vui lòng cấu hình VNPAY trước khi tạo yêu cầu thanh toán.";
  }

  try {
    process.env.TZ = "Asia/Ho_Chi_Minh";
    let date = new Date();
    let createDate = moment(date).format("YYYYMMDDHHmmss");

    let ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress;

    let tmnCode = vnp_TmnCode;
    let secretKey = vnp_HashSecret;
    let vnpUrl = vnp_Url;
    let returnUrl = vnp_ReturnUrl;

    let currCode = "VND";
    let vnp_Params = {};
    vnp_Params["vnp_Version"] = "2.1.0";
    vnp_Params["vnp_Command"] = "pay";
    vnp_Params["vnp_TmnCode"] = tmnCode;
    vnp_Params["vnp_Locale"] = "vn";
    vnp_Params["vnp_CurrCode"] = currCode;
    vnp_Params["vnp_TxnRef"] = vnpTxnRef;
    vnp_Params["vnp_OrderInfo"] = `Thanh toán gói VIP - Mã đơn: ${orderCode}`;
    vnp_Params["vnp_OrderType"] = "other";
    vnp_Params["vnp_Amount"] = amount * 100;
    vnp_Params["vnp_ReturnUrl"] = returnUrl;
    vnp_Params["vnp_IpAddr"] = ipAddr;
    vnp_Params["vnp_CreateDate"] = createDate;

    vnp_Params = sortObject(vnp_Params);

    let querystring = qs;
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let crypto = require("crypto");
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(new Buffer(signData, "utf-8")).digest("hex");
    vnp_Params["vnp_SecureHash"] = signed;
    vnpUrl += "?" + querystring.stringify(vnp_Params, { encode: false });

    return vnpUrl;
  } catch (error) {
    return "Lỗi khi tạo yêu cầu thanh toán: " + error.message;
  }
};

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

// API tạo mã thanh toán vnpay
const createVipPayment = async (req, res) => {
  const session = await mongoose.startSession(); // Bắt đầu transaction
  session.startTransaction();
  try {
    const userId = req.user.userId;

    // 1. Xác thực gói vip có đang là false (chưa có, hết hạn)
    const sub = await Subscription.findOne({ userId: req.user.userId });
    if (sub?.isVip === true && new Date() <= sub?.expirationDate) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Tài khoản người dùng đã có gói vip",
      });
    }
    // 1. Tham số tiền gói vip
    let { amount } = req.body;
    amount = Number(amount);
    if (!amount) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu tham số tiền gói vip",
      });
    }

    // 2. Tạo mã orderCode
    const orderCode = generateOrderCode();
    const vnpTxnRef = `VIP_${userId}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 6)}`;

    // 3. Tạo payment order
    await PaymentOrder.create(
      [
        {
          userId: req.user.userId,
          amount,
          orderCode,
          status: "pending",
          vnpTxnRef,
          paymentMethod: "VNPAY",
        },
      ],
      { session }
    );

    const paymentUrl = await createVnpayPayment(
      vnpTxnRef,
      orderCode,
      amount,
      req
    );
    if (!paymentUrl) {
      await session.abortTransaction();
      return res.status(500).json({
        status: "error",
        code: 500,
        message: "Lỗi khi tạo URL thanh toán VNPAY",
      });
    }

    await session.commitTransaction();
    return res.status(201).json({
      status: "success",
      code: 201,
      message: "Tạo URL thanh toán VNPAY thành công",
      data: paymentUrl,
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error,
    });
  } finally {
    await session.endSession();
  }
};

const generateOrderCode = () => {
  // 1. Ngày hiện tại định dạng DDMMYY hoặc YYYYMMDD
  const today = new Date();
  const dateStr = today.toISOString().slice(2, 10).replace(/-/g, ""); // "251226" (YYMMDD)

  // 2. Random 4-6 ký tự alphanumeric (A-Z, 0-9), không có ký tự dễ nhầm (O, I, L...)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // 3. Ghép lại
  return `VIP-${dateStr}-${randomPart}`;
};

// Sau khi thanh toán thành công
const vnpayReturn = async (req, res) => {
  let vnp_Params = { ...req.query };
  let secureHash = vnp_Params["vnp_SecureHash"];

  // Xóa các field không cần thiết trước khi verify
  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  // Sort params theo key (yêu cầu VNPay)
  vnp_Params = sortObject(vnp_Params);

  const signData = qs.stringify(vnp_Params, { encode: false });
  let crypto = require("crypto");
  const hmac = crypto.createHmac("sha512", vnp_HashSecret);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Kiểm tra chữ ký
    if (secureHash !== signed) {
      console.warn("VNPay Return - Sai chữ ký:", vnp_Params);
      await session.abortTransaction();
      session.endSession();
      await cleanupPendingOrder(vnp_Params["vnp_TxnRef"], session);
      return res.redirect(
        `${process.env.FE_URL}/payment?status=fail&reason=invalid_signature`
      );
    }

    // 2. Kiểm tra mã phản hồi
    if (vnp_Params["vnp_ResponseCode"] !== "00") {
      console.warn(
        "VNPay Return - Thanh toán thất bại:",
        vnp_Params["vnp_ResponseCode"]
      );
      await cleanupPendingOrder(vnp_Params["vnp_TxnRef"], session);
      return res.redirect(
        `${process.env.FE_URL}/payment-history?status=fail&code=${vnp_Params["vnp_ResponseCode"]}`
      );
    }

    // 3. Thanh toán thành công
    const vnpTxnRef = vnp_Params["vnp_TxnRef"];

    const paymentOrder = await PaymentOrder.findOne({ vnpTxnRef }).session(
      session
    );

    if (!paymentOrder) {
      await session.abortTransaction();
      return res.redirect(`${process.env.FE_URL}/payment?status=fail`);
    }

    if (paymentOrder.status !== "pending") {
      // Đã xử lý rồi (có thể do IPN gọi trước)
      await session.endSession();
      return res.redirect(`${process.env.FE_URL}/payment?status=success`);
    }

    // 4. Tính ngày hết hạn: hôm nay + 30 ngày
    const now = new Date();
    const expirationDate = new Date(now.getTime() + 10 * 60 * 1000);

    // 5. Cập nhật PaymentOrder
    paymentOrder.status = "paid";
    paymentOrder.paymentDate = now;
    paymentOrder.expirationDate = expirationDate;
    paymentOrder.vnpBankTranNo = vnp_Params["vnp_BankTranNo"];
    paymentOrder.vnpTransactionNo = vnp_Params["vnp_TransactionNo"];
    await paymentOrder.save({ session });

    // 6. Cập nhật hoặc tạo VipSubscription
    let vipSubscription = await VipSubscription.findOne({
      userId: paymentOrder.userId,
    }).session(session);

    if (!vipSubscription) {
      vipSubscription = await VipSubscription.create(
        [
          {
            userId: paymentOrder.userId,
            isVip: true,
            expirationDate,
            lastPaymentOrderId: paymentOrder._id,
          },
        ],
        { session }
      )[0];
    } else {
      vipSubscription.isVip = true;
      vipSubscription.expirationDate = expirationDate;
      vipSubscription.lastPaymentOrderId = paymentOrder._id;
      await vipSubscription.save({ session });
    }

    // 7. Commit transaction
    await session.commitTransaction();

    // 8. Thêm job vào queue (BullMQ/Redis)
    try {
      // Gửi email xác nhận thanh toán
      emailQueue.add("sendVipSuccessEmail", {
        userId: paymentOrder.userId,
        orderCode: paymentOrder.orderCode,
        amount: paymentOrder.amount,
        expirationDate,
        paymentMethod: paymentOrder.paymentMethod,
      });

      // Schedule job nhắc nhở/gia hạn trước khi hết hạn (trước 1 ngày) - test trước 3 phút
      const reminderDelay =
        expirationDate.getTime() - Date.now() - 3 * 60 * 1000;
      if (reminderDelay > 0) {
        vipSubscriptionQueue.add(
          "vipExpirationReminder",
          {
            userId: paymentOrder.userId,
            expirationDate: paymentOrder.expirationDate,
          },
          { delay: reminderDelay }
        );
      }

      // Schedule job tự động tắt VIP khi hết hạn
      const expireDelay = expirationDate.getTime() - Date.now();
      vipSubscriptionQueue.add(
        "expireVip",
        {
          userId: paymentOrder.userId,
          expirationDate: paymentOrder.expirationDate,
        },
        { delay: expireDelay }
      );
    } catch (queueError) {
      console.warn("Queue job failed (non-critical):", queueError.message);
    }

    // 9. Redirect success với thông tin đẹp
    return res.redirect(`${process.env.FE_URL}/payment-history?status=success`);
  } catch (error) {
    await session.abortTransaction();
    console.error("VNPay Return - Critical Error:", error);
    return res.redirect(`${process.env.FE_URL}/payment-history?status=fail`);
  } finally {
    session.endSession();
  }
};

// Hàm phụ: Dọn dẹp đơn pending khi thất bại
async function cleanupPendingOrder(vnpTxnRef, session) {
  if (!vnpTxnRef) return;
  try {
    await PaymentOrder.deleteOne({ vnpTxnRef, status: "pending" }).session(
      session || null
    );
  } catch (err) {
    console.warn("Cleanup pending order failed:", err.message);
  }
}

async function getPaymentOrders(req, res) {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu userId",
      });
    }

    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const skip = (page - 1) * limit;

    // 1. Xác thực người dùng
    const existingUser = await User.findById(userId).select("_id").lean();
    if (!existingUser) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Người dùng không tồn tại",
      });
    }

    // 2. Lấy danh sách payment orders
    // const paymentOrders = await PaymentOrder.find({ userId }).sort({ createdAt: -1 })

    const paymentOrders = await PaymentOrder.aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          status: "paid"
        },
      },
      {
        $facet: {
          data: [
            {
              $sort: { createdAt: -1 },
            },
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
            {
              $project: {
                orderCode: 1,
                amount: 1,
                paymentDate: 1,
                paymentMethod: 1,
                expirationDate: 1,
              },
            },
          ],
          metadata: [{ $count: "totalPaymentOrders" }],
        },
      },
    ]);

    const totalPaymentOrders =
      paymentOrders[0].metadata[0]?.totalPaymentOrders || 0;
    const totalPages = Math.ceil(totalPaymentOrders / limit);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách thông tin lịch sử thanh toán của người dùng",
      data: paymentOrders[0].data,
      pagination: {
        page,
        limit,
        totalPaymentOrders,
        totalPages,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error,
    });
  }
}

module.exports = {
  createVnpayPayment,
  createVipPayment,
  vnpayReturn,
  getPaymentOrders,
};
