// socket.js
let io;

const initSocket = (server) => {
  const { Server } = require("socket.io");

  // 1️⃣ Tạo instance socket.io
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  // 2️⃣ Xử lý khi có client kết nối
  io.on("connection", (socket) => {
    console.log("✅ Client connected:", socket.id);

    // 🧩 Khi client vào một board cụ thể
    socket.on("joinBoard", (boardId) => {
      socket.join(boardId); // Tham gia vào "phòng" theo boardId
      console.log(`User ${socket.id} joined board ${boardId}`);
    });

    // 🧩 Khi client rời board
    socket.on("leaveBoard", (boardId) => {
      socket.leave(boardId);
      console.log(`User ${socket.id} left board ${boardId}`);
    });

    // 🧩 Khi client ngắt kết nối
    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });

    socket.on("login", (userId) => {
      socket.join(userId); // room riêng cho từng user
      console.log(`User ${socket.id} joined personal room ${userId}`);
    });
  });

  console.log("🚀 Socket.io initialized!");
};

// 3️⃣ Hàm lấy io instance để dùng ở controller
const getIO = () => {
  if (!io) {
    throw new Error(
      "Socket.io chưa được khởi tạo! Hãy gọi initSocket(server) trước."
    );
  }
  return io;
};

module.exports = {
  initSocket,
  getIO,
};
