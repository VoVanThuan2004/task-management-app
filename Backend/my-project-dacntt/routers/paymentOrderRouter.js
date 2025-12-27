const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const paymentOrderController = require("../controllers/paymentOrderController");

// API thanh toán
router.post("/api/v1/payment/vip", auth, paymentOrderController.createVipPayment);

// Sau khi thanh toán thành công
router.get("api/v1/vnpay/return", paymentOrderController.vnpayReturn);

// API lấy danh sách lịch sử thanh toán của 1 user
router.get("/api/v1/payment-orders", auth, paymentOrderController.getPaymentOrders);

module.exports = router;