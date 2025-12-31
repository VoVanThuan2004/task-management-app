require("dotenv").config();
const express = require("express");
const app = express();
const mongoDB = require("./config/mongoDB");
const initAdminAccount = require("./init");
const authRouter = require("./routers/authRouter");
const userRouter = require("./routers/userRouter");
const boardRouter = require("./routers/boardRouter");
const columnRouter = require("./routers/columnRouter");
const taskRouter = require("./routers/taskRouter");
const labelRouter = require("./routers/labelRouter");
const commentRouter = require("./routers/commentRouter");
const taskAssigneeRouter = require("./routers/taskAssigneeRouter");
const checklistRouter = require("./routers/checklistRouter");
const checklistItemRouter = require("./routers/checklistItemRouter");
const { initSocket } = require("./config/socket");
const cors = require("cors");
const http = require("http");
const aiRouter = require("./routers/aiRouter.js");
const checkItemRouter = require("./routers/checkItemRouter");
const activityLogRouter = require("./routers/activityLogRouter.js");
const userSkillRouter = require("./routers/userSkillRouter.js");
const paymentOrderRouter = require("./routers/paymentOrderRouter.js");
const dashboardRouter = require("./routers/dashboardRouter.js");
const path = require("path");
const webpush = require("web-push");
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

// ============================
// Serve static files cho PWA
// ============================
app.use(express.static(path.join(__dirname, "../my-project-dacntt/dist")));

const server = http.createServer(app);
initSocket(server); // Khởi tạo socket với server

// Kết nối mongo database
mongoDB();

// Tạo tài khoản mặc định
(async () => {
  try {
    await initAdminAccount();
  } catch (error) {
    console.error("Error during role/admin init:", error);
  }
})();

// Router
app.use(authRouter);
app.use(userRouter);
app.use(boardRouter);
app.use(columnRouter);
app.use(taskRouter);
app.use(labelRouter);
app.use(commentRouter);
app.use("/api/ai", aiRouter);
app.use(taskAssigneeRouter);
app.use(checklistRouter);
app.use(checklistItemRouter);
app.use(checkItemRouter);
app.use(activityLogRouter);
app.use(userSkillRouter);
app.use(paymentOrderRouter);
app.use(dashboardRouter);

// ===== PHẦN MỚI: PUSH NOTIFICATION =====
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Mảng tạm (test nhanh)
let subscriptions = [];

// Lưu subscription từ frontend
app.post("/api/subscribe", (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  console.log("Subscribed:", subscription.endpoint);
  res.status(201).json({ message: "Subscribed" });
});

// Test gửi thông báo
app.post("/api/send-test-notification", (req, res) => {
  const payload = JSON.stringify({
    title: "Test Thành Công! 🚀",
    body: "Push notification đang hoạt động hoàn hảo.",
    icon: "./dist/pwa-192x192.png",
  });

  Promise.all(
    subscriptions.map((sub) =>
      webpush.sendNotification(sub, payload).catch((err) => {
        if (err.statusCode === 410) {
          subscriptions = subscriptions.filter((s) => s !== sub);
        }
      })
    )
  )
    .then(() => res.json({ message: "Test notification sent!" }))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.get("/*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "../my-project-dacntt/dist/index.html"));
});

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
