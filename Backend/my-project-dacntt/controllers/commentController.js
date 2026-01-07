const Comment = require("../models/comment");
const Task = require("../models/task");
const User = require("../models/user");
const Attachment = require("../models/attachment");
const EmojiReaction = require("../models/emojiReaction");
const { getIO } = require("../config/socket");
const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");

// Function xóa ảnh upload cloudinary
const deleteUploadedFileCloudinary = async (file) => {
  if (file && file.filename) {
    await cloudinary.uploader.destroy(file.filename);
  }
};

const sendMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { taskId, message } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Người dùng không tồn tại",
      });
    }

    const task = await Task.findById(taskId).populate({
      path: "boardId",
      select: "_id title",
    });

    if (!task) {
      await deleteUploadedFileCloudinary(req.file);
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // Tạo comment
    const newComment = await Comment.create({
      taskId,
      userId,
      message: message || "",
      isEdited: false,
    });

    const io = getIO();
    let attachments = [];

    // Xử lý file
    if (req.files && req.files.length > 0) {
      const createdAttachments = await Promise.all(
        req.files.map(async (file) => {
          const attachment = await Attachment.create({
            taskId,
            commentId: newComment._id,
            uploadedBy: userId,
            fileUrl: file.path,
            filePublicId: file.filename,
            fileName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            uploadedAt: new Date(),
          });
          return attachment.toObject(); // ĐẢM BẢO _id
        })
      );
      attachments = createdAttachments;

      // Cập nhật totalAttachments
      const totalAttachments = await Attachment.countDocuments({ taskId });
      io.to(task.boardId.toString()).emit("comment:attachment:new", {
        taskId,
        totalAttachments,
        attachments,
      });
    }

    // Tổng comment
    const totalComments = await Comment.countDocuments({ taskId });

    // === SOCKET EMIT – ĐẦY ĐỦ _id ===
    const payload = {
      taskId,
      comment: {
        _id: newComment._id,
        message: newComment.message,
        createdAt: newComment.createdAt,
        isEdited: false,
        user: {
          _id: userId,
          fullName: user.fullName,
          avatar: user.avatar,
        },
        attachments: attachments.map((att) => ({
          _id: att._id,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileSize: att.fileSize,
          fileType: att.fileType,
        })),
        emojiSummary: [],
      },
      totalComments,
    };

    io.to(task.boardId._id.toString()).emit("comment:new", payload);

    // emit socket thông báo khi có comment mới
    io.to(task.boardId._id.toString()).emit("alert:new-comment", {
      type: "new_comment",
      taskId: taskId,
      taskTitle: task.title,
      boardId: task.boardId._id,
      boardTitle: task.boardId.title,

      message: message?.trim()
        ? `${user.fullName} đã bình luận: "${message.trim()}"`
        : `${user.fullName} đã gửi ${
            attachments.length > 0
              ? attachments.length === 1
                ? "1 tệp đính kèm"
                : `${attachments.length} tệp đính kèm`
              : "một bình luận"
          } trong task "${task.title}"`,

      sender: {
        userId: userId,
        fullName: user.fullName,
        avatar: user.avatar,
      },

      commentId: newComment._id,
      createdAt: new Date(),
    });

    return res.status(201).json({
      status: "success",
      code: 201,
      message: "Gửi bình luận thành công",
      data: {
        userId,
        fullName: user.fullName,
        avatar: user.avatar,
        comment: {
          _id: newComment._id,
          message: newComment.message,
          createdAt: newComment.createdAt,
          isEdited: false,
        },
        attachments: attachments.map((att) => ({
          _id: att._id,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileSize: att.fileSize,
          fileType: att.fileType,
        })),
      },
    });
  } catch (error) {
    console.error("sendMessage error:", error);
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const getAllComments = async (req, res) => {
  try {
    const taskId = req.params.taskId;

    // 1. Phân trang
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    const skip = (page - 1) * limit;

    // Đếm tổng số comment TRƯỚC khi phân trang
    const totalComments = await Comment.countDocuments({
      taskId: new mongoose.Types.ObjectId(taskId),
    });

    const comments = await Comment.aggregate([
      {
        $match: { taskId: new mongoose.Types.ObjectId(taskId) },
      },

      {
        $sort: { createdAt: -1 },
      },

      // Phân trang
      { $skip: skip },
      { $limit: limit },

      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      // Emoji reactions cho mỗi comment
      {
        $lookup: {
          from: "emojireactions",
          localField: "_id",
          foreignField: "commentId",
          as: "reactions",
        },
      },

      // Tổng hợp emoji: trả về danh sách { emoji, count }
      {
        $addFields: {
          emojiSummary: {
            $map: {
              input: { $setUnion: ["$reactions.emoji", []] },
              as: "emoji",
              in: {
                emoji: "$$emoji",
                count: {
                  $size: {
                    $filter: {
                      input: "$reactions",
                      as: "r",
                      cond: { $eq: ["$$r.emoji", "$$emoji"] },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // Lấy attachments liên quan đến comment
      {
        $lookup: {
          from: "attachments",
          let: { commentId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$commentId", "$$commentId"] } } },
            {
              $project: {
                _id: 1,
                fileName: 1,
                fileType: 1,
                fileSize: 1,
                fileUrl: 1,
                filePublicId: 1,
                thumbnailUrl: 1,
                uploadedBy: 1,
                uploadedAt: 1,
              },
            },
          ],
          as: "attachments",
        },
      },

      // Lấy ra các field cần trả về
      {
        $project: {
          _id: 1,
          message: 1,
          isEdited: 1,
          createdAt: 1,
          updatedAt: 1,
          "user._id": 1,
          "user.fullName": 1,
          "user.avatar": 1,
          emojiSummary: 1,
          attachments: 1,
        },
      },
    ]);

    const totalPages = Math.ceil(totalComments / limit);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Danh sách thảo luận trong task",
      page,
      limit,
      totalPages,
      totalComments,
      data: comments,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const deleteComment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const commentId = req.params.commentId;

    // 1. Kiểm tra comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bình luận không tồn tại",
      });
    }

    // 2. Kiểm tra quyền
    if (comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        status: "error",
        code: 403,
        message: "Người dùng không có quyền xóa bình luận này",
      });
    }

    // 3. Kiểm tra task
    const task = await Task.findById(comment.taskId);
    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 4. GỠ LIÊN KẾT attachment khỏi comment (không xóa file)
    const attachments = await Attachment.find({ commentId });

    if (attachments.length > 0) {
      await Attachment.updateMany(
        { _id: { $in: attachments.map((att) => att._id) } },
        { $set: { commentId: null } }
      );
    }

    // Xóa các emoji có trong comment
    await EmojiReaction.deleteMany({ commentId });

    // 5. Xóa comment
    await Comment.deleteOne({ _id: comment._id });

    // Tính lại tổng số comments hiện có
    const totalComments = await Comment.countDocuments({
      taskId: comment.taskId,
    });

    // 6. Gửi realtime qua socket
    const io = getIO();
    io.to(task.boardId.toString()).emit("comment:deleted", {
      taskId: task._id,
      commentId,
      totalComments,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Xóa bình luận thành công",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const updateComment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const commentId = req.params.commentId;
    const { message, deletedFiles } = req.body;

    // 1. Tìm comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bình luận không tồn tại",
      });
    }

    // 2. Kiểm tra quyền
    if (comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        status: "error",
        code: 403,
        message: "Không có quyền chỉnh sửa bình luận này",
      });
    }

    // 3. Cập nhật nội dung
    if (message !== undefined) {
      comment.message = message;
      comment.isEdited = true;
      await comment.save();
    }

    // 4. Xóa file được chỉ định
    if (deletedFiles && deletedFiles.length > 0) {
      const attachmentsToDelete = await Attachment.find({
        commentId,
        filePublicId: { $in: deletedFiles },
      });

      for (const file of attachmentsToDelete) {
        try {
          await cloudinary.uploader.destroy(file.filePublicId);
        } catch (err) {
          console.warn(
            "Không thể xóa file Cloudinary:",
            file.filePublicId,
            err.message
          );
        }
      }

      await Attachment.deleteMany({
        commentId,
        filePublicId: { $in: deletedFiles },
      });
    }

    const task = await Task.findById(comment.taskId);

    // 5. Thêm file mới (nếu có)
    let newAttachments = [];
    if (req.files && req.files.length > 0) {
      const attachmentDocs = req.files.map((file) => ({
        taskId: comment.taskId,
        commentId,
        uploadedBy: userId,
        fileUrl: file.path,
        filePublicId: file.filename,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedAt: new Date(),
      }));

      newAttachments = await Attachment.insertMany(attachmentDocs);
    }

    // 6. Emit socket
    const io = getIO();
    io.to(task.boardId.toString()).emit("comment:updated", {
      commentId,
      taskId: task._id,
      message: comment.message,
      isEdited: true,
      newAttachments,
      deletedFiles: deletedFiles || [],
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Cập nhật bình luận thành công",
      data: {
        comment,
        newAttachments,
        deletedFiles: deletedFiles || [],
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

// Thả emoji tin nhắn
const addOrRemoveReaction = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { commentId, emoji } = req.body;
    if (!commentId || !emoji) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu ID comment, emoji",
      });
    }

    // 1. Kiểm tra comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bình luận không tồn tại",
      });
    }

    const task = await Task.findById(comment.taskId);
    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 2. Kiểm tra emoji có hay chưa
    const existingEmoji = await EmojiReaction.findOne({
      commentId,
      userId,
      emoji,
    });

    let action;
    if (existingEmoji) {
      // Gỡ emoji ra
      await EmojiReaction.deleteOne({ _id: existingEmoji._id });
      action = "removed";
    } else {
      // Thêm emoji vào comment
      await EmojiReaction.create({
        commentId: comment._id,
        userId,
        emoji,
      });
      action = "added";
    }

    // Lấy lại danh sách emoji của comment
    const emojiStats = await EmojiReaction.aggregate([
      { $match: { commentId: comment._id } },
      { $group: { _id: "$emoji", count: { $sum: 1 } } }, // Nhóm theo field emoji
    ]);

    // Gửi lên socket - cập nhật realtime
    const io = getIO();
    io.to(task.boardId.toString()).emit("comment:emojiUpdated", {
      commentId,
      emojiStats,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: `Emoji ${action} thành công`,
      data: { commentId, emojiStats },
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
  sendMessage,
  getAllComments,
  deleteComment,
  updateComment,
  addOrRemoveReaction,
};
