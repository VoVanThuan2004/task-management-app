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


const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
initSocket(server); // Khởi tạo socket với server

// Kết nối mongo database
mongoDB();

// Tạo tài khoản mặc định
(async () => {
  try {
    await initAdminAccount();
    // await connectRabbitMQ();
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


server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
