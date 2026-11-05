const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const Board = require("../models/board");
const BoardMember = require("../models/boardMember");
const User = require("../models/user");
const UserSkill = require("../models/userSkill");
const Column = require("../models/column");
const { getIO } = require("../config/socket");
const emailQueue = require("../jobs/emailQueue");
const taskAssigneeDeleteQueue = require("../jobs/taskAssgineeDeleteQueue");
const columnDeleteQueue = require("../jobs/columnDeleteQueue");
const ApiError = require("../errors/ApiError");
const {
  removeCloudinaryFile,
  assertImageFile,
} = require("../utils/cloudinaryFile");

const createBoard = async ({ userId, title, type, background }) => {
  if (!title || !type) {
    throw ApiError.badRequest("Vui lòng nhập tên bảng, quyền xem");
  }

  const board = await Board.create({
    ownerId: userId,
    title,
    type: type || "private",
    background: background || "#ffff",
  });

  await BoardMember.create({
    boardId: board._id,
    userId,
    role: "owner",
    status: "accepted",
  });

  return {
    _id: board._id,
    ownerId: userId,
    title,
    background: board.background,
    type: board.type,
  };
};

const updateBoard = async ({
  userId,
  boardId,
  title,
  type,
  background,
  description,
}) => {
  if (!title || !type) {
    throw ApiError.badRequest("Vui lòng nhập tên bảng, chọn quyền xem");
  }

  const board = await Board.findById(boardId);
  if (!board) {
    throw ApiError.notFound("Bảng không tồn tại");
  }

  if (board.backgroundPublicId) {
    await removeCloudinaryFile(board.backgroundPublicId);
    board.backgroundPublicId = null;
  }

  board.title = title;
  board.type = type;
  board.background = background || "#ffff";
  board.description = description || "";
  await board.save();

  const io = getIO();
  io.to(boardId).emit("boardUpdated", {
    _id: boardId,
    title,
    type,
    background,
    description,
    updatedAt: board.updatedAt,
  });

  return {
    _id: boardId,
    ownerId: userId,
    title,
    background: board.background,
    position: board.position,
    type,
  };
};

const updateBoardBackground = async ({ boardId, file }) => {
  if (!file) {
    throw ApiError.badRequest("Vui lòng upload ảnh");
  }

  try {
    assertImageFile(file);
  } catch (error) {
    await removeCloudinaryFile(file.filename);
    throw error;
  }

  const board = await Board.findById(boardId);
  if (!board) {
    await removeCloudinaryFile(file.filename);
    throw ApiError.notFound("Board không tồn tại");
  }

  if (board.backgroundPublicId) {
    try {
      await removeCloudinaryFile(board.backgroundPublicId);
    } catch (cloudinaryError) {
      console.error("Lỗi xóa ảnh cũ trên Cloudinary:", cloudinaryError);
    }
  }

  board.background = file.path;
  board.backgroundPublicId = file.filename;
  await board.save();

  const io = getIO();
  io.to(board._id.toString()).emit("boardBackgroundUpdated", {
    boardId,
    background: board.background,
  });

  return {
    boardId,
    background: board.background,
  };
};

const deleteBoardBackground = async ({ boardId }) => {
  const board = await Board.findById(boardId);
  if (!board) {
    throw ApiError.notFound("Board không tồn tại");
  }

  await removeCloudinaryFile(board.backgroundPublicId);

  board.background = "#026aa7";
  board.backgroundPublicId = null;
  await board.save();

  const io = getIO();
  io.to(board._id.toString()).emit("boardBackgroundDeleted", {
    boardId,
    background: board.background,
  });

  return {
    boardId,
    background: board.background,
  };
};

const deleteBoard = async ({ userId, boardId }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const board = await Board.findById(boardId).session(session);
    if (!board) {
      await session.abortTransaction();
      throw ApiError.notFound("Bảng không tồn tại");
    }

    if (!board.ownerId.equals(userId)) {
      await session.abortTransaction();
      throw new ApiError(
        404,
        "Người dùng không có quyền xóa bảng này",
        "ISMEMBER"
      );
    }

    const columns = await Column.find({ boardId })
      .select("_id")
      .session(session);
    for (const column of columns) {
      await columnDeleteQueue.add("deleteColumn", {
        columnId: column._id,
      });
    }

    const boardMembers = await BoardMember.find({ boardId }).session(session);
    if (boardMembers.length > 0) {
      await BoardMember.deleteMany({ boardId }).session(session);
      await UserSkill.deleteMany({ boardId }).session(session);
    }

    if (board.backgroundPublicId) {
      try {
        await removeCloudinaryFile(board.backgroundPublicId);
      } catch (cloudinaryError) {
        console.error("Lỗi xóa ảnh cũ trên Cloudinary:", cloudinaryError);
      }
    }

    await Board.deleteOne({ _id: boardId }).session(session);

    await session.commitTransaction();

    const io = getIO();
    io.to(boardId.toString()).emit("deleteBoard", {
      boardId,
    });

    return boardId;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

const restoreBoard = async ({ userId, boardId }) => {
  try {
    const board = await Board.findById(boardId);
    if (!board) {
      throw ApiError.notFound("Bảng làm việc không tồn tại");
    }

    if (!board.isArchived) {
      throw ApiError.badRequest("Bảng làm việc đang hoạt động");
    }

    const lastPos = await BoardPosition.findOne().sort({ position: -1 });
    const newPosition = lastPos ? lastPos.position + 1 : 1;

    board.isArchived = false;
    await board.save();

    const newBoardPosition = new BoardPosition({
      userId,
      boardId: board._id,
      position: newPosition,
    });
    await newBoardPosition.save();

    return {
      _id: boardId,
      ownerId: userId,
      title: board.title,
      background: board.background,
      position: newPosition,
      type: board.type,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.internal("Lỗi hệ thống: " + error.message);
  }
};

const getAllBoards = async ({ userId, search, sort = "recent" }) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw ApiError.badRequest("ID người dùng không hợp lệ");
  }

  const filter = {};
  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }
  if (userId) {
    filter.ownerId = userId;
  }

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

  return Board.find({
    ...filter,
    isArchived: { $ne: true },
  }).sort(sortCondition);
};

const getAllBoardsInvited = async ({ userId }) => {
  return BoardMember.aggregate([
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
    {
      $lookup: {
        from: "users",
        localField: "board.ownerId",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: "$owner" },
    {
      $match: { "board.isArchived": false },
    },
    {
      $project: {
        _id: "$board._id",
        title: "$board.title",
        background: "$board.background",
        type: "$board.type",
        description: "$board.description",
        ownerId: "$board.ownerId",
        ownerName: "$owner.fullName",
      },
    },
  ]);
};

const shareBoard = async ({
  sharerId,
  sharerName,
  boardId,
  userIds,
  message,
}) => {
  if (!boardId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw ApiError.badRequest("Thiếu boardId hoặc danh sách userIds hợp lệ");
  }

  const existingBoard = await Board.findById(boardId);
  if (!existingBoard) {
    throw ApiError.notFound("Bảng làm việc không tồn tại");
  }

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
        role: "member",
        status: "accepted",
        invitedAt: new Date(),
      });

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

  const frontendUrl = process.env.FE_URL;
  const boardLink = `${frontendUrl}/boards/${boardId}/${existingBoard.title}`;

  await emailQueue.add("shareBoardEmail", {
    inviterName: sharerName,
    userIds,
    boardLink,
    boardTitle: existingBoard.title,
    message,
  });

  return results;
};

const getBoardDetail = async ({ boardId, userId }) => {
  const board = await Board.findById(boardId);
  if (!board) {
    throw ApiError.notFound("Bảng làm việc không tồn tại");
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

  if (boardType === "public") {
    return {
      board,
      isMember: isOwner || isMember,
    };
  }

  if (!userId) {
    throw ApiError.unauthorized("Bạn cần đăng nhập để xem bảng này");
  }

  if (boardType === "private") {
    if (!isOwner && !isMember) {
      throw ApiError.forbidden("Bạn không có quyền truy cập bảng riêng tư này");
    }

    return { board, isMember: true };
  }

  if (boardType === "workspace") {
    if (!isOwner && !isMember) {
      throw ApiError.forbidden("Bạn không phải thành viên của bảng nhóm này");
    }

    return { board, isMember: true };
  }

  return { board, isMember: isOwner || isMember };
};

const getAllBoardMembers = async ({ boardId }) => {
  if (!boardId) {
    throw ApiError.badRequest("boardId đang trống");
  }

  const board = await Board.findById(boardId);
  if (!board) {
    throw ApiError.notFound("Bảng làm việc không tồn tại");
  }

  return BoardMember.aggregate([
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
};

const getAllBoardMembersForAI = async ({ boardId }) => {
  if (!boardId) {
    throw ApiError.badRequest("Thiếu boardId");
  }

  return BoardMember.aggregate([
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
};

const deleteBoardMember = async ({ ownerId, boardId, userId }) => {
  if (!boardId || !userId) {
    throw ApiError.badRequest("params id đang bị trống");
  }

  const [board, user] = await Promise.all([
    Board.findById(boardId).lean(),
    User.findById(userId).lean(),
  ]);

  if (!board) {
    throw ApiError.notFound("Bảng làm việc không tồn tại");
  }

  if (!user) {
    throw ApiError.notFound("Thành viên không tồn tại");
  }

  if (!board.ownerId.equals(new mongoose.Types.ObjectId(ownerId))) {
    throw ApiError.forbidden("Người dùng không có quyền xóa thành viên");
  }

  const boardMember = await BoardMember.findOne({ userId, boardId });
  if (!boardMember) {
    throw ApiError.notFound("Thành viên trong bảng làm việc không tồn tại");
  }

  await BoardMember.deleteOne({ _id: boardMember._id });
  await UserSkill.deleteMany({ userId, boardId });

  const io = getIO();
  io.to(board._id.toString()).emit("memberRemoved", {
    boardId,
    userId,
  });

  await emailQueue.add("removeMemberFromBoardEmail", {
    email: user.email,
    title: board.title,
  });

  await taskAssigneeDeleteQueue.add("removeMember", {
    boardId,
    userId,
  });

  return {
    userId: boardMember.userId,
  };
};

const changeBoardVisibility = async ({ userId, boardId, type }) => {
  if (!boardId) {
    throw ApiError.badRequest("Thiếu boardId");
  }

  if (!type) {
    throw ApiError.badRequest("Vui lòng nhập khả năng xem cần thay đổi");
  }

  const board = await Board.findById(boardId);
  if (!board) {
    throw ApiError.notFound("Bảng làm việc không tồn tại");
  }

  if (type !== "private" && type !== "public" && type !== "workspace") {
    throw ApiError.badRequest("Chế độ xem bảng không tồn tại");
  }

  board.type = type;
  await board.save();

  return {
    owner: userId === board.ownerId.toString(),
    type,
  };
};

const getBoardVisibility = async ({ userId, boardId }) => {
  if (!boardId) {
    throw ApiError.badRequest("Thiếu boardId");
  }

  const board = await Board.findById(boardId).lean();
  if (!board) {
    throw ApiError.notFound("Bảng làm việc không tồn tại");
  }

  return {
    owner: userId === board.ownerId.toString(),
    type: board.type,
  };
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
  getAllBoardMembers,
  getAllBoardMembersForAI,
  deleteBoardMember,
  changeBoardVisibility,
  getBoardVisibility,
};
