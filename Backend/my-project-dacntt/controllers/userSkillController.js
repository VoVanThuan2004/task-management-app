const UserSkill = require("../models/userSkill");
const Board = require("../models/board");

const getAllSkillsUser = async (req, res) => {
  try {
    const { boardId } = req.query;
    const userId = req.user.userId;

    if (!boardId) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu boardId",
      });
    }

    // 1. Kiểm tra board
    const board = await Board.findById(boardId).lean();
    if (!board) {
      return res.status(404).json({
        status: "error",
        message: "Board không tồn tại",
      });
    }

    // 2. Lấy ra danh sách skill của người dùng
    const userSkills = await UserSkill.find({ userId, boardId })
      .sort({ createdAt: -1 })
      .select("_id skill createdAt");

    return res.status(200).json({
      status: "success",
      code: 200,
      data: {
        boardId,
        userId,
        skills: userSkills,
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

const addSkillBoard = async (req, res) => {
  try {
    const { boardId, skill } = req.body;
    const userId = req.user.userId;
    if (!boardId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu boardId",
      });
    }
    if (!skill) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập kỹ năng",
      });
    }

    // 1. Kiểm tra board
    const board = await Board.findById(boardId).lean();
    if (!board) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Board không tồn tại",
      });
    }

    // 2. Kiểm tra user-skill có tồn tại chưa
    const existingUserSkill = await UserSkill.findOne({
      userId,
      boardId,
      skill,
    });
    if (existingUserSkill) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Kỹ năng hiện tại của người dùng đang tồn tại",
      });
    }

    // 3. Thêm user-skill
    const userSkill = await UserSkill.create({
      userId,
      boardId,
      skill: skill.trim(),
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Thêm kỹ năng của người dùng thành công",
      data: userSkill,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const deleteSkillUser = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu user-skill-id",
      });
    }

    // 1. Kiểm tra user-skill
    const existingUserSkill = await UserSkill.findById(id);
    if (!existingUserSkill) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Kỹ năng của người dùng không tồn tại",
      });
    }

    // 2. Xóa user-skill
    await UserSkill.deleteOne({ _id: existingUserSkill._id });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Xóa kỹ năng thành công",
      data: {
        _id: existingUserSkill._id,
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

module.exports = {
  getAllSkillsUser,
  addSkillBoard,
  deleteSkillUser,
};
