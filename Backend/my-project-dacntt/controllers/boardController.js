require("dotenv").config();
const mongoose = require("mongoose");
const Board = require("../models/board");
const BoardPosition = require("../models/boardPosition");
const BoardMember = require("../models/boardMember");
const User = require("../models/user");
const ActivityLog = require("../models/activityLog");
const Notification = require("../models/notification");
const { getIO } = require("../config/socket");
const cloudinary = require("../config/cloudinary");
const { sendShareBoardEmail } = require("../config/mailConfig");
const jwt = require("jsonwebtoken");

const createBoard = async (req, res) => {
  const userId = req.user.userId;

  const { title, type, background } = req.body;
  if (!title || !type) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Vui lòng nhập tên bảng, quyền xem",
    });
  }

  try {
    // 1. Tạo board
    const board = await Board.create({
      ownerId: userId,
      title,
      type: type || "private",
      background: background || "#ffff",
    });

    return res.status(201).json({
      status: "success",
      code: 201,
      message: "Tạo bảng thành công",
      data: {
        _id: board._id,
        ownerId: userId,
        title,
        background: board.background,
        type: board.type,
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

const updateBoard = async (req, res) => {
  const userId = req.user.userId;

  const boardId = req.params.boardId;

  const { title, type, background, description } = req.body;
  if (!title || !type) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Vui lòng nhập tên bảng, chọn quyền xem",
    });
  }

  try {
    // 1. Tìm bảng có phải hợp lệ
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng không tồn tại",
      });
    }

    // 2. Kiểm tra xem người chỉnh sửa bảng có phải là owner không
    // if (!board.ownerId.equals(userId)) {
    //   return res.status(400).json({
    //     status: "error",
    //     code: 400,
    //     message: "Người dùng không có quyền chỉnh sửa bảng",
    //   });
    // }

    if (board.backgroundPublicId) {
      await cloudinary.uploader.destroy(board.backgroundPublicId);
      board.backgroundPublicId = null;
    }

    // 3. Cập nhật bảng
    board.title = title;
    board.type = type;
    board.background = background || "#ffff";
    board.description = description || "";
    await board.save();

    // 4. Gửi lên socket
    const io = getIO();
    io.to(boardId).emit("boardUpdated", {
      _id: boardId,
      title,
      type,
      background,
      description,
      updatedAt: board.updatedAt,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Cập nhật bảng thành công",
      data: {
        _id: boardId,
        ownerId: userId,
        title,
        background: board.background,
        position: board.position,
        type,
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

const updateBoardBackground = async (req, res) => {
  try {
    const boardId = req.params.boardId;

    // Kiểm tra có upload file hay không
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng upload ảnh",
      });
    }

    // Kiểm tra định dạng file
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      await deleteUploadedFileCloudinary(req.file);
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)",
      });
    }

    // Kiểm tra kích thước file (tối đa 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      await deleteUploadedFileCloudinary(req.file);
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Kích thước ảnh không được vượt quá 5MB",
      });
    }

    // 1. Kiểm tra board có tồn tại không
    const board = await Board.findById(boardId);
    if (!board) {
      await deleteUploadedFileCloudinary(req.file);
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Board không tồn tại",
      });
    }

    // 3. Nếu có background cũ, xóa trên Cloudinary
    if (board.backgroundPublicId) {
      try {
        await cloudinary.uploader.destroy(board.backgroundPublicId);
      } catch (cloudinaryError) {
        console.error("Lỗi xóa ảnh cũ trên Cloudinary:", cloudinaryError);
      }
    }

    // 5. Cập nhật board với background mới
    board.background = req.file.path;
    board.backgroundPublicId = req.file.filename;
    await board.save();

    // 6. Gửi socket notification
    const io = getIO();
    io.to(board._id.toString()).emit("boardBackgroundUpdated", {
      boardId: boardId,
      background: board.background,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Cập nhật background thành công",
      data: {
        boardId: boardId,
        background: board.background,
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

const deleteBoardBackground = async (req, res) => {
  try {
    const boardId = req.params.boardId;

    // 1. Kiểm tra board
    const board = await Board.findById(boardId);
    if (!board) {
      await deleteUploadedFileCloudinary(req.file);
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Board không tồn tại",
      });
    }

    // 2. Xóa file ảnh background cũ trên cloudinary
    await cloudinary.uploader.destroy(board.backgroundPublicId);

    // 3. Cập nhật lại màu mặc định cho board
    board.background = "#026aa7";
    board.backgroundPublicId = null;
    await board.save();

    // 4. Gửi lên Socket - cập nhật realtime
    const io = getIO();
    io.to(board._id.toString()).emit("boardBackgroundDeleted", {
      boardId: boardId,
      background: board.background,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Xóa background thành công",
      data: {
        boardId: boardId,
        background: board.background,
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

// Function xóa ảnh upload cloudinary
const deleteUploadedFileCloudinary = async (file) => {
  if (file && file.filename) {
    await cloudinary.uploader.destroy(file.filename);
  }
};

const deleteBoard = async (req, res) => {
  const userId = req.user.userId;

  const boardId = req.params.boardId;

  try {
    // 1. Kiểm tra board có tồn tại
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng không tồn tại",
      });
    }

    // 2. Kiểm tra có phải owner không -> nếu owner thì cho xóa
    if (!board.ownerId.equals(userId)) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Người dùng không có quyền xóa bảng này",
      });
    }

    // 3. Xóa mềm board
    board.isArchived = true;
    await board.save();

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Xóa bảng thành công",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const restoreBoard = async (req, res) => {
  const userId = req.user.userId;

  const boardId = req.params.boardId;

  try {
    // 1. Kiểm tra board có tồn tại
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }

    if (!board.isArchived) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Bảng làm việc đang hoạt động",
      });
    }

    // Lấy vị trí lớn nhất hiện có
    const lastPos = await BoardPosition.findOne().sort({ position: -1 });
    const newPosition = lastPos ? lastPos.position + 1 : 1;

    // Khôi phục board
    board.isArchived = false;
    await board.save();

    // Thêm lại vào bảng vị trí
    const newBoardPosition = new BoardPosition({
      userId,
      boardId: board._id,
      position: newPosition,
    });
    await newBoardPosition.save();

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Khôi phục bảng thành công",
      data: {
        _id: boardId,
        ownerId: userId,
        title: board.title,
        background: board.background,
        position: newPosition,
        type: board.type,
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

// Lấy danh sách các bảng
const getAllBoards = async (req, res) => {
  const userId = req.user.userId;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "ID người dùng không hợp lệ",
    });
  }

  const { search, sort = "recent" } = req.query;

  try {
    const filter = {};
    // 1. Nếu có search thêm vào filter
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }
    if (userId) {
      filter.ownerId = userId;
    }

    // 2. Điều kiện sort
    let sortCondition = {};
    switch (sort) {
      case "recent":
        sortCondition = { updatedAt: -1 };
        break;
      case "least_recent":
        sortCondition = { updatedAt: 1 };
        break;
      case "title_asc":
        sortCondition = { title: 1 };
        break;
      case "title_desc":
        sortCondition = { title: -1 };
        break;
      default:
        sortCondition = { updatedAt: -1 };
    }

    // 3. Lấy ra danh sách boards + position
    const boards = await Board.find({
      ...filter,
      isArchived: { $ne: true }, // hoặc isArchived: false
    }).sort(sortCondition);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách bảng của người dùng thành công",
      data: boards,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const getAllBoardsInvited = async (req, res) => {
  try {
    const userId = req.user.userId;

    const boardMember = await BoardMember.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(userId) },
      },
      {
        $lookup: {
          from: "boards",
          localField: "boardId",
          foreignField: "_id",
          as: "board",
        },
      },
      { $unwind: "$board" },

      // Lookup sang bảng users để lấy thông tin owner
      {
        $lookup: {
          from: "users",
          localField: "board.ownerId",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: "$owner" },

      // Lọc các board chưa bị ẩn
      {
        $match: { "board.isArchived": false },
      },

      // Chọn trường cần hiển thị
      {
        $project: {
          _id: "$board._id",
          title: "$board.title",
          background: "$board.background",
          type: "$board.type",
          description: "$board.description",
          ownerId: "$board.ownerId",
          ownerName: "$owner.fullName", // 👈 tên owner
        },
      },
    ]);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách board được mời thành công",
      data: boardMember,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

// Chia sẻ bảng, thêm thành viên vào bảng làm việc
const shareBoard = async (req, res) => {
  try {
    const sharerId = req.user.userId;
    const { boardId, userIds, message } = req.body;

    if (
      !boardId ||
      !userIds ||
      !Array.isArray(userIds) ||
      userIds.length === 0
    ) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu boardId hoặc danh sách userIds hợp lệ",
      });
    }

    // 1️. Tìm bảng
    const existingBoard = await Board.findById(boardId);
    if (!existingBoard) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }

    // 2️. Lặp qua từng userId để thêm vào board nếu chưa có
    const results = [];
    for (const uid of userIds) {
      let member = await BoardMember.findOne({ boardId, userId: uid });
      if (!member) {
        member = await BoardMember.create({
          boardId,
          userId: uid,
          inviterId: sharerId,
          role: "member", // role mặc định
          status: "accepted",
          invitedAt: new Date(),
        });
      }
      results.push(member);
    }

    // 3️. Gửi email mời
    const sharer = await User.findById(sharerId);
    const invitedUsers = await User.find({ _id: { $in: userIds } });

    const frontendUrl = process.env.FE_URL;
    const boardLink = `${frontendUrl}/boards/${boardId}/${existingBoard.title}`;

    for (const user of invitedUsers) {
      // Giả lập gửi mail (chừa sẵn phần này để tích hợp sau)
      console.log(
        `[EMAIL MỜI] Gửi tới ${user.email} từ ${sharer.email} để tham gia bảng "${existingBoard.title}"`
      );

      await sendShareBoardEmail(
        user.email,
        sharer.fullName,
        existingBoard.title,
        message,
        boardLink
      );
    }

    // Gửi lên Socket - thông báo realtime

    // 4️. Ghi thông báo mời vào bảng notifications
    // ===================================================
    // Bạn có thể thêm Notification.create({
    //   userId: uid,
    //   type: "board_invite",
    //   message: `${sharer.name} đã mời bạn tham gia bảng "${existingBoard.title}"`,
    //   createdAt: new Date(),
    // });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Đã chia sẻ bảng và gửi lời mời thành công",
      data: results,
    });
  } catch (error) {
    console.error("shareBoard error:", error);
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

// controllers/boardController.js hoặc tương tự
const getBoardDetail = async (req, res) => {
  try {
    const boardId = req.params.boardId;
    let userId = null;

    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        userId = decoded.userId;
      } catch (err) {
        // Token sai → coi như khách vãng lai
        console.log("Token không hợp lệ:", err.message);
      }
    }

    // 1. Tìm board
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        status: "error",
        message: "Bảng làm việc không tồn tại",
      });
    }

    // 2. Kiểm tra quyền truy cập
    const boardType = board.type || "private"; // mặc định là private nếu không có

    // Kiểm tra người dùng có trong member hay không
    let isMember = false;

    if (userId != null) {
      const boardMember = await BoardMember.findOne({ boardId, userId });
      isMember = boardMember ? true : false;
    }

    // Public → ai cũng xem được
    if (boardType === "public") {
      if (board.ownerId.toString() === userId) {
        isMember = true;
      }
      return res.status(200).json({
        status: "success",
        message: "Lấy chi tiết bảng làm việc thành công",
        data: {
          isMember,
          board,
        },
      });
    }

    // Nếu không phải public → phải đăng nhập
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Bạn cần đăng nhập để xem bảng này",
      });
    }

    // Private → chỉ chủ sở hữu mới được xem
    if (boardType === "private") {
      if (board.ownerId.toString() !== userId.toString()) {
        return res.status(403).json({
          status: "error",
          message: "Bạn không có quyền truy cập bảng riêng tư này",
        });
      }
      // Là owner → cho xem
      return res.status(200).json({
        status: "success",
        code: 200,
        data: { board, isMember: true },
      });
    }

    // Workspace → kiểm tra thành viên (giả sử bạn có model BoardMember)
    if (boardType === "workspace") {
      const member = await BoardMember.findOne({
        boardId,
        userId,
        status: { $in: ["accepted", "owner"] },
      });

      if (!member) {
        return res.status(403).json({
          status: "error",
          message: "Bạn không phải thành viên của bảng nhóm này",
        });
      }
      // Là member → cho xem
      return res.status(200).json({
        status: "success",
        data: { board, isMember: true },
      });
    }
  } catch (error) {
    console.error("Lỗi getBoardDetail:", error);
    return res.status(500).json({
      status: "error",
      message: "Lỗi hệ thống: " + error,
    });
  }
};

module.exports = {
  createBoard,
  updateBoard,
  updateBoardBackground,
  deleteBoardBackground,
  deleteBoard,
  restoreBoard,
  getAllBoards,
  getAllBoardsInvited,
  shareBoard,
  getBoardDetail,
};
