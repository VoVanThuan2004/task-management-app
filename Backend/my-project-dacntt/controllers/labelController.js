const Label = require("../models/label");
const Board = require("../models/board");
const TaskLabel = require("../models/taskLabel");

const addLabel = async (req, res) => {
  try {
    const { boardId, title, color } = req.body;
    if (!boardId || !title || !color) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message:
          "Vui lòng nhập đầy đủ thông tin bảng làm việc, tiêu đề, màu sắc cho nhãn dán",
      });
    }

    // 1. Kiểm tra board có tồn tại
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }

    // 2. Tạo label
    const label = await Label.create({
      boardId,
      title,
      color,
    });

    return res.status(201).json({
      status: "success",
      code: 201,
      message: "Tạo nhãn dán thành công",
      data: {
        _id: label._id,
        boardId,
        title,
        color,
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

const updateLabel = async (req, res) => {
  try {
    const labelId = req.params.labelId;
    const { title, color } = req.body;
    if (!title || !color) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập thông tin tiêu đề, màu sắc",
      });
    }

    // 1. Kiểm tra label
    const label = await Label.findById(labelId);
    if (!label) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Nhãn dán không tồn tại",
      });
    }

    // 2. Cập nhật label
    label.title = title;
    label.color = color;
    await label.save();

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Cập nhật nhãn dán thành công",
      data: {
        _id: label._id,
        boardId: label.boardId,
        title,
        color,
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

const deleteLabel = async (req, res) => {
  try {
    const labelId = req.params.labelId;

    // 1. Kiểm tra label
    const label = await Label.findById(labelId);
    if (!label) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Nhãn dán không tồn tại",
      });
    }

    // 2. Xóa Label
    await Label.deleteOne({ _id: labelId });

    // 3. Xóa task label
    await TaskLabel.deleteMany({ labelId });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Xóa nhãn dán thành công",
      data: {
        _id: labelId,
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

const getAllLabels = async (req, res) => {
  try {
    const boardId = req.params.boardId;

    // 1. Kiểm tra board
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }

    // 2. Lấy danh sách label - giảm dần theo createdAt
    const labels = await Label.find({ boardId })
      .sort({ createdAt: -1 })
      .select("_id boardId title color");

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách nhãn dán của bảng làm việc",
      data: labels,
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
  addLabel,
  updateLabel,
  deleteLabel,
  getAllLabels,
};
