require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");
const Board = require("../models/board");
const BoardPosition = require("../models/boardPosition");
const BoardMember = require("../models/boardMember");
const ActivityLog = require("../models/activityLog");
const Notification = require("../models/notification");
const { getIO } = require("../config/socket");
// const { getChannel } = require("../config/rabbitmq");

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
    if (!board.ownerId.equals(userId)) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Người dùng không có quyền chỉnh sửa bảng",
      });
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

    // 4. Xoá vị trí khỏi danh sách BoardPosition của user
    const deletedPosition = await BoardPosition.findOneAndDelete({
      boardId: boardId,
      userId: userId,
    });

    // 5. Cập nhật lại position các board phía sau
    if (deletedPosition) {
      await BoardPosition.updateMany(
        {
          userId: userId,
          position: { $gt: deletedPosition.position },
        },
        { $inc: { position: -1 } } // Giảm 1
      );
    }

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
    if (!boardId || !userIds || userIds.length === 0) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu boardId hoặc userIds",
      });
    }

    // 1. Tìm board có tồn tại
    const existingBoard = await Board.findById(boardId);
    if (!existingBoard) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }

    // 2. Thêm BoardMember mới hoặc update nếu đã có
    const boardMembers = await Promise.all(
      userIds.map(async (uid) => {
        const existing = await BoardMember.findOne({ boardId, userId: uid });
        if (existing) return existing; // đã là member
        return BoardMember.create({
          boardId,
          userId: uid,
          invitedBy: sharerId,
          role,
          status: "accepted",
          invitedAt: new Date(),
        });
      })
    );
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const getBoardDetail = async (req, res) => {
  try {
    const boardId = req.params.boardId;

    // 1. Kiểm tra board
    const existingBoard = await Board.findById(boardId);
    if (!existingBoard) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy chi tiết bảng làm việc",
      data: existingBoard,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

module.exports = {
  createBoard,
  updateBoard,
  deleteBoard,
  restoreBoard,
  getAllBoards,
  getAllBoardsInvited,
  shareBoard,
  getBoardDetail,
};
