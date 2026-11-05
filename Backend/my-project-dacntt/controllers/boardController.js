const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const boardService = require("../services/boardService");

const getOptionalUserId = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    return decoded.userId;
  } catch (error) {
    console.log("Token không hợp lệ:", error.message);
    return null;
  }
};

const createBoard = catchAsync(async (req, res) => {
  const { title, type, background } = req.body;
  const data = await boardService.createBoard({
    userId: req.user.userId,
    title,
    type,
    background,
  });

  return res.status(201).json({
    status: "success",
    code: 201,
    message: "Tạo bảng thành công",
    data,
  });
});

const updateBoard = catchAsync(async (req, res) => {
  const { title, type, background, description } = req.body;
  const data = await boardService.updateBoard({
    userId: req.user.userId,
    boardId: req.params.boardId,
    title,
    type,
    background,
    description,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Cập nhật bảng thành công",
    data,
  });
});

const updateBoardBackground = catchAsync(async (req, res) => {
  const data = await boardService.updateBoardBackground({
    boardId: req.params.boardId,
    file: req.file,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Cập nhật background thành công",
    data,
  });
});

const deleteBoardBackground = catchAsync(async (req, res) => {
  const data = await boardService.deleteBoardBackground({
    boardId: req.params.boardId,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Xóa background thành công",
    data,
  });
});

const deleteBoard = catchAsync(async (req, res) => {
  const data = await boardService.deleteBoard({
    userId: req.user.userId,
    boardId: req.params.boardId,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Xóa bảng thành công",
    data,
  });
});

const restoreBoard = catchAsync(async (req, res) => {
  const data = await boardService.restoreBoard({
    userId: req.user.userId,
    boardId: req.params.boardId,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Khôi phục bảng thành công",
    data,
  });
});

const getAllBoards = catchAsync(async (req, res) => {
  const data = await boardService.getAllBoards({
    userId: req.user.userId,
    search: req.query.search,
    sort: req.query.sort,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Lấy danh sách bảng của người dùng thành công",
    data,
  });
});

const getAllBoardsInvited = catchAsync(async (req, res) => {
  const data = await boardService.getAllBoardsInvited({
    userId: req.user.userId,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Lấy danh sách board được mời thành công",
    data,
  });
});

const shareBoard = catchAsync(async (req, res) => {
  const { boardId, userIds, message } = req.body;
  const data = await boardService.shareBoard({
    sharerId: req.user.userId,
    sharerName: req.user.fullName,
    boardId,
    userIds,
    message,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Đã chia sẻ bảng và gửi lời mời thành công",
    data,
  });
});

const getBoardDetail = catchAsync(async (req, res) => {
  const data = await boardService.getBoardDetail({
    boardId: req.params.boardId,
    userId: getOptionalUserId(req),
  });

  return res.status(200).json({
    status: "success",
    data,
  });
});

const getAllBoardMembers = catchAsync(async (req, res) => {
  const data = await boardService.getAllBoardMembers({
    boardId: req.params.boardId,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Lấy danh sách thành viên trong bảng làm việc",
    data,
  });
});

const getAllBoardMembersForAI = catchAsync(async (req, res) => {
  const data = await boardService.getAllBoardMembersForAI({
    boardId: req.params.boardId,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Lấy danh sách thành viên trong bảng làm việc",
    data,
  });
});

const deleteBoardMember = catchAsync(async (req, res) => {
  const data = await boardService.deleteBoardMember({
    ownerId: req.user.userId,
    boardId: req.params.boardId,
    userId: req.params.userId,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Xóa thành viên ra khỏi bảng làm việc thành công",
    data,
  });
});

const changeBoardVisibility = catchAsync(async (req, res) => {
  const data = await boardService.changeBoardVisibility({
    userId: req.user.userId,
    boardId: req.params.boardId,
    type: req.body.type,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Thay đổi khả năng xem của bảng thành công",
    data,
  });
});

const getBoardVisibility = catchAsync(async (req, res) => {
  const data = await boardService.getBoardVisibility({
    userId: req.user.userId,
    boardId: req.params.boardId,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Khả năng xem của bảng làm việc",
    data,
  });
});

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
