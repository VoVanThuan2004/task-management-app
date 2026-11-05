const Board = require("../models/board");
const Label = require("../models/label");
const TaskLabel = require("../models/taskLabel");
const ApiError = require("../errors/ApiError");

const addLabel = async ({ boardId, title, color }) => {
  if (!boardId || !title || !color) {
    throw ApiError.badRequest(
      "Vui lòng nhập đầy đủ thông tin bảng làm việc, tiêu đề, màu sắc cho nhãn dán"
    );
  }

  const board = await Board.findById(boardId).lean();
  if (!board) {
    throw ApiError.notFound("Bảng làm việc không tồn tại");
  }

  const label = await Label.create({
    boardId,
    title,
    color,
  });

  return {
    _id: label._id,
    boardId,
    title,
    color,
  };
};

const updateLabel = async ({ labelId, title, color }) => {
  if (!title || !color) {
    throw ApiError.badRequest("Vui lòng nhập thông tin tiêu đề, màu sắc");
  }

  const label = await Label.findById(labelId);
  if (!label) {
    throw ApiError.notFound("Nhãn dán không tồn tại");
  }

  label.title = title;
  label.color = color;
  await label.save();

  return {
    _id: label._id,
    boardId: label.boardId,
    title,
    color,
  };
};

const deleteLabel = async ({ labelId }) => {
  const label = await Label.findById(labelId);
  if (!label) {
    throw ApiError.notFound("Nhãn dán không tồn tại");
  }

  await Label.deleteOne({ _id: labelId });
  await TaskLabel.deleteMany({ labelId });

  return {
    _id: labelId,
  };
};

const getAllLabels = async ({ boardId }) => {
  const board = await Board.findById(boardId).lean();
  if (!board) {
    throw ApiError.notFound("Bảng làm việc không tồn tại");
  }

  return Label.find({ boardId })
    .sort({ createdAt: -1 })
    .select("_id boardId title color")
    .lean();
};

module.exports = {
  addLabel,
  updateLabel,
  deleteLabel,
  getAllLabels,
};
