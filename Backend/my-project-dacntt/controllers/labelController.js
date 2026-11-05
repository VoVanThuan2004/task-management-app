const catchAsync = require("../utils/catchAsync");
const labelService = require("../services/labelService");

const addLabel = catchAsync(async (req, res) => {
  const { boardId, title, color } = req.body;
  const data = await labelService.addLabel({ boardId, title, color });

  return res.status(201).json({
    status: "success",
    code: 201,
    message: "Tạo nhãn dán thành công",
    data,
  });
});

const updateLabel = catchAsync(async (req, res) => {
  const labelId = req.params.labelId;
  const { title, color } = req.body;
  const data = await labelService.updateLabel({ labelId, title, color });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Cập nhật nhãn dán thành công",
    data,
  });
});

const deleteLabel = catchAsync(async (req, res) => {
  const labelId = req.params.labelId;
  const data = await labelService.deleteLabel({ labelId });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Xóa nhãn dán thành công",
    data,
  });
});

const getAllLabels = catchAsync(async (req, res) => {
  const boardId = req.params.boardId;
  const data = await labelService.getAllLabels({ boardId });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Lấy danh sách nhãn dán của bảng làm việc",
    data,
  });
});

module.exports = {
  addLabel,
  updateLabel,
  deleteLabel,
  getAllLabels,
};
