require("dotenv").config();
const mongoose = require("mongoose");
const Board = require("../models/board");
const BoardMember = require("../models/boardMember");
const User = require("../models/user");
const { getIO } = require("../config/socket");
const cloudinary = require("../config/cloudinary");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const emailQueue = require("../services/emailQueue");
const UserSkill = require("../models/userSkill");
const taskAssigneeDeleteQueue = require("../services/taskAssgineeDeleteQueue");
const columnDeleteQueue = require("../services/columnDeleteQueue");
const Column = require("../models/column");

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

    // 2. Tạo board-member
    await BoardMember.create({
      boardId: board._id,
      userId,
      role: "owner",
      status: "accepted",
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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Kiểm tra board có tồn tại
    const board = await Board.findById(boardId).session(session);
    if (!board) {
      await session.abortTransaction();
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng không tồn tại",
      });
    }

    // 2. Kiểm tra có phải owner không -> nếu owner thì cho xóa
    if (!board.ownerId.equals(userId)) {
      await session.abortTransaction();
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Người dùng không có quyền xóa bảng này",
        error: "ISMEMBER",
      });
    }

    // 3. Lấy danh sách columns có trong board
    const columns = await Column.find({ boardId })
      .select("_id")
      .session(session);
    for (const column of columns) {
      await columnDeleteQueue.add("deleteColumn", {
        columnId: column._id,
      });
    }

    // 4. Lấy danh sách boardMembers hiện tại nếu có
    const boardMembers = await BoardMember.find({ boardId }).session(session);
    if (boardMembers.length > 0) {
      await BoardMember.deleteMany({ boardId }).session(session);
      await UserSkill.deleteMany({ boardId }).session(session);
    }

    // 5. Xóa thông tin board
    // Nếu có background cũ, xóa trên Cloudinary
    if (board.backgroundPublicId) {
      try {
        await cloudinary.uploader.destroy(board.backgroundPublicId);
      } catch (cloudinaryError) {
        console.error("Lỗi xóa ảnh cũ trên Cloudinary:", cloudinaryError);
      }
    }
    await Board.deleteOne({ _id: boardId }).session(session);

    await session.commitTransaction();

    // 4. Gửi socket xóa board
    const io = getIO();
    io.to(boardId.toString()).emit("deleteBoard", {
      boardId,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Xóa bảng thành công",
      data: boardId,
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  } finally {
    await session.endSession();
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
        $match: { userId: new mongoose.Types.ObjectId(userId), role: "member" },
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
    const io = getIO();
    for (const uid of userIds) {
      let member = await BoardMember.findOne({ boardId, userId: uid }).lean();
      const user = await User.findOne({ _id: uid }).lean();
      if (!member) {
        member = await BoardMember.create({
          boardId,
          userId: uid,
          inviterId: sharerId,
          role: "member", // role mặc định
          status: "accepted",
          invitedAt: new Date(),
        });

        // Gửi socket
        io.to(boardId.toString()).emit("addMember", {
          boardId,
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          avatar: user.avatar,
          skills: [],
        });
      }
      results.push(member);
    }

    // 3️. Gửi email mời
    const inviterName = req.user.fullName;

    const frontendUrl = process.env.FE_URL;
    const boardLink = `${frontendUrl}/boards/${boardId}/${existingBoard.title}`;

    await emailQueue.add("shareBoardEmail", {
      inviterName,
      userIds,
      boardLink,
      boardTitle: existingBoard.title,
      message,
    });

    // Gửi lên Socket - thông báo realtime

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

const getBoardDetail = async (req, res) => {
  try {
    const { boardId } = req.params;
    let userId = null;

    // ===== Decode token (optional login) =====
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        userId = decoded.userId;
      } catch (err) {
        console.log("Token không hợp lệ:", err.message);
      }
    }

    // ===== 1. Tìm board =====
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        status: "error",
        message: "Bảng làm việc không tồn tại",
      });
    }

    const boardType = board.type || "private";
    const isOwner = userId && board.ownerId.equals(userId);

    let isMember = false;

    if (userId) {
      const member = await BoardMember.findOne({
        boardId,
        userId,
        status: { $in: ["accepted", "owner"] },
      });
      isMember = !!member;
    }

    // ===== 2. PUBLIC =====
    if (boardType === "public") {
      return res.status(200).json({
        status: "success",
        data: {
          board,
          isMember: isOwner || isMember,
        },
      });
    }

    // ===== 3. PRIVATE / WORKSPACE cần login =====
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Bạn cần đăng nhập để xem bảng này",
      });
    }

    // ===== 4. PRIVATE =====
    if (boardType === "private") {
      if (!isOwner && !isMember) {
        return res.status(403).json({
          status: "error",
          message: "Bạn không có quyền truy cập bảng riêng tư này",
        });
      }

      return res.status(200).json({
        status: "success",
        data: { board, isMember: true },
      });
    }

    // ===== 5. WORKSPACE =====
    if (boardType === "workspace") {
      if (!isOwner && !isMember) {
        return res.status(403).json({
          status: "error",
          message: "Bạn không phải thành viên của bảng nhóm này",
        });
      }

      return res.status(200).json({
        status: "success",
        data: { board, isMember: true },
      });
    }

  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};


const getAllBoardMembers = async (req, res) => {
  try {
    const boardId = req.params.boardId;
    if (!boardId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "boardId đang trống",
      });
    }

    // 1. Kiểm tra board
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }

    const boardMembers = await BoardMember.aggregate([
      {
        $match: { boardId: new ObjectId(boardId) },
      },

      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },

      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "userskills",
          let: { userId: "$userId", boardId: "$boardId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$userId"] },
                    { $eq: ["$boardId", "$$boardId"] },
                  ],
                },
              },
            },
          ],
          as: "userSkills",
        },
      },

      {
        $project: {
          _id: "$user._id",
          email: "$user.email",
          fullName: "$user.fullName",
          avatar: "$user.avatar",
          role: 1,
          skills: {
            $map: {
              input: "$userSkills",
              as: "userSkill",
              in: {
                _id: "$$userSkill._id",
                skill: "$$userSkill.skill",
              },
            },
          },
        },
      },
    ]);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách thành viên trong bảng làm việc",
      data: boardMembers,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error,
    });
  }
};

const getAllBoardMembersForAI = async (req, res) => {
  try {
    const boardId = req.params.boardId;
    if (!boardId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu boardId",
      });
    }

    // 1. Query lấy ra danh sách users + skill
    const boardMembers = await BoardMember.aggregate([
      {
        $match: {
          boardId: new ObjectId(boardId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "userskills",
          let: {
            userId: "$userId",
            boardId: "$boardId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$userId"] },
                    { $eq: ["$boardId", "$$boardId"] },
                  ],
                },
              },
            },
          ],
          as: "userskill",
        },
      },
      {
        $project: {
          _id: 0,
          id: "$user._id",
          name: "$user.fullName",
          skills: "$userskill.skill",
        },
      },
    ]);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách thành viên trong bảng làm việc",
      data: boardMembers,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error,
    });
  }
};

const deleteBoardMember = async (req, res) => {
  try {
    const { boardId, userId } = req.params;
    const ownerId = req.user.userId;
    if (!boardId || !userId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "params id đang bị trống",
      });
    }

    // 1. Kiểm tra quyền xóa, chỉ có owner mới xóa được
    const [board, user] = await Promise.all([
      Board.findById(boardId).lean(),
      User.findById(userId).lean(),
    ]);
    if (!board) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Thành viên không tồn tại",
      });
    }

    if (!board.ownerId.equals(new mongoose.Types.ObjectId(ownerId))) {
      return res.status(403).json({
        status: "error",
        code: 403,
        message: "Người dùng không có quyền xóa thành viên",
      });
    }

    // 2. Kiểm tra board-member có tồn tại
    const boardMember = await BoardMember.findOne({ userId, boardId });
    if (!boardMember) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Thành viên trong bảng làm việc không tồn tại",
      });
    }

    // 3. Xóa thành viên
    await BoardMember.deleteOne({ _id: boardMember._id });

    // Xóa kỹ năng làm việc trong bảng
    await UserSkill.deleteMany({ userId, boardId });

    // 4. Emit socket
    const io = getIO();
    io.to(board._id.toString()).emit("memberRemoved", {
      boardId,
      userId,
    });

    // 5. Gửi email thông báo đến thành viên đã xóa
    await emailQueue.add("removeMemberFromBoardEmail", {
      email: user.email,
      title: board.title,
    });

    // 6. Xóa TaskAssginee nếu có user này tham gia
    await taskAssigneeDeleteQueue.add("removeMember", {
      boardId,
      userId,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Xóa thành viên ra khỏi bảng làm việc thành công",
      data: {
        userId: boardMember.userId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error,
    });
  }
};

const changeBoardVisibility = async (req, res) => {
  try {
    const userId = req.user.userId;
    const boardId = req.params.boardId;
    if (!boardId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu boardId",
      });
    }

    const { type } = req.body;
    if (!type) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập khả năng xem cần thay đổi",
      });
    }

    // 1. Kiểm tra bảng làm việc
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }

    // 2. Kiểm tra type có hợp lệ
    if (type !== "private" && type !== "public" && type !== "workspace") {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Chế độ xem bảng không tồn tại",
      });
    }

    // 3. Cập nhật type
    board.type = type;
    await board.save();

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Thay đổi khả năng xem của bảng thành công",
      data: {
        owner: userId === board.ownerId.toString(),
        type,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi hệ thống: " + error,
    });
  }
};

async function getBoardVisibility(req, res) {
  try {
    const userId = req.user.userId;
    const boardId = req.params.boardId;
    if (!boardId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu boardId",
      });
    }

    // 1. Kiểm tra bảng làm việc
    const board = await Board.findById(boardId).lean();
    if (!board) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Khả năng xem của bảng làm việc",
      data: {
        owner: userId === board.ownerId.toString(),
        type: board.type,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi hệ thống: " + error,
    });
  }
}

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
  getAllBoardMembers,
  getAllBoardMembersForAI,
  deleteBoardMember,
  changeBoardVisibility,
  getBoardVisibility,
};
