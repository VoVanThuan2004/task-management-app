const Task = require("../models/task");
const Column = require("../models/column");
const Label = require("../models/label");
const TaskLabel = require("../models/taskLabel");
const Attachment = require("../models/attachment");
const { getIO } = require("../config/socket");
const cloudinary = require("../config/cloudinary");

const addTask = async (req, res) => {
  try {
    const columnId = req.params.columnId;

    const { title } = req.body;
    if (!title) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập tên tiêu đề",
      });
    }

    // 1. Kiểm tra column
    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Column không tồn tại",
      });
    }

    // 2. Lấy ra board id
    const boardId = column.boardId;

    // 3. Lấy danh sách tasks trong column
    const tasks = await Task.find({ columnId, isArchived: false }).sort({
      position: 1,
    });

    // 4. Thêm vào vị trí cuối cùng -> lấy vị trí cuối cùng hiện tại + 1000
    let position;
    if (tasks.length === 0) {
      // thêm vào vị trí đầu
      position = 1000;
    } else {
      position = tasks[tasks.length - 1].position + 1000;
    }

    // 5. Thêm task
    const task = await Task.create({
      columnId,
      boardId,
      title,
      position,
    });

    // 6. Gửi lên Socket - update data
    const io = getIO();
    io.to(task.boardId.toString()).emit("taskAdded", {
      _id: task._id,
      columnId,
      boardId: task.boardId,
      title,
      position,
      isCompleted: task.isCompleted
    });

    // 7. Gửi lên Socket - thông báo

    return res.status(201).json({
      status: "error",
      code: 201,
      message: "Task đã được thêm vào",
      data: {
        _id: task._id,
        columnId,
        boardId,
        title,
        position,
        isCompleted: task.isCompleted
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

const updateTaskTitle = async (req, res) => {
  try {
    const taskId = req.params.taskId;

    const { title } = req.body;
    if (!title) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập tên tiêu đề",
      });
    }

    // 1. Tìm task có tồn tại
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 2. Cập nhật tiêu đề (title)
    task.title = title;
    await task.save();

    // 3. Gửi lên Socket - update data
    const io = getIO();
    io.to(task.boardId.toString()).emit("taskTitleUpdated", {
      _id: taskId,
      columnId: task.columnId,
      boardId: task.boardId,
      title,
      position: taskId.position,
    });

    // 4. Gửi lên Socket - thông báo

    return res.status(201).json({
      status: "error",
      code: 201,
      message: "Task đã được cập nhật tiêu đề",
      data: {
        title,
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

const movePosition = async (req, res) => {
  try {
    const taskId = req.params.taskId;

    const { destinationColumnId, destinationIndex } = req.body;
    const destTasks = await Task.find({
      columnId: destinationColumnId,
      isArchived: false,
    }).sort({
      position: 1,
    });
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task không tồn tại" });

    let newPosition;
    if (destTasks.length === 0) {
      newPosition = 1000;
    } else if (destinationIndex === 0) {
      newPosition = destTasks[0].position / 2;
    } else if (destinationIndex > destTasks.length) {
      newPosition = destTasks[destTasks.length - 1].position + 1000;
    } else {
      const prev = destTasks[destinationIndex - 1];
      const next = destTasks[destinationIndex];
      newPosition = (prev.position + next.position) / 2;
    }
    task.columnId = destinationColumnId;
    task.position = newPosition;
    await task.save();
    return res.status(200).json({
      message: "Cập nhật vị trí thành công",
      position: newPosition,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const updateDeadlineTask = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const { dueDate } = req.body;

    // Validate taskId
    if (!taskId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Task ID là bắt buộc",
      });
    }

    // Validate dueDate
    if (!dueDate) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Chọn thời hạn hết hạn là bắt buộc",
      });
    }

    // Validate date format
    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Định dạng ngày không hợp lệ",
      });
    }

    // Kiểm tra due date phải lớn hơn thời gian hiện tại
    const currentDate = new Date();
    if (parsedDueDate <= currentDate) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Ngày hết hạn phải lớn hơn thời điểm hiện tại",
      });
    }

    // 1. Kiểm tra task
    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 2. Cập nhật task
    existingTask.dueDate = parsedDueDate;
    await existingTask.save();

    // 3. Gửi lên Socket
    const io = getIO();
    io.to(existingTask.boardId.toString()).emit("deadlineTaskUpdated", {
      _id: taskId,
      columnId: existingTask.columnId,
      boardId: existingTask.boardId,
      title: existingTask.title,
      position: existingTask.position,
      dueDate: existingTask.dueDate,
    });

    // 4. Gửi lên Socket - thông báo

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Cập nhật thời gian hết hạn của task thành công",
      data: {
        _id: taskId,
        title: existingTask.title,
        dueDate: parsedDueDate,
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

const updateTaskDescription = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập mô tả cho task",
      });
    }

    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    existingTask.description = description;
    await existingTask.save();

    // Gửi lên Socket - update data
    const io = getIO();
    io.to(existingTask.boardId.toString()).emit("deadlineTaskUpdated", {
      _id: taskId,
      columnId: existingTask.columnId,
      boardId: existingTask.boardId,
      title: existingTask.title,
      position: existingTask.position,
      dueDate: existingTask.dueDate,
    });

    // Gửi lên Socket - thông báo

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Cập nhật mô tả của task thành công",
      data: {
        _id: taskId,
        title: existingTask.title,
        description,
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

// Xóa task - chuyển trạng thái isArchived = true
const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.taskId;

    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    existingTask.isArchived = true;
    await existingTask.save();

    // Gửi lên Socket
    const io = getIO();
    io.to(existingTask.boardId.toString()).emit("taskDeleted", {
      _id: existingTask._id,
      columnId: existingTask.columnId,
      boardId: existingTask.boardId,
    });

    // Gửi thông báo socket

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Xóa task thành công",
      data: {
        _id: existingTask._id,
        columnId: existingTask.columnId,
        boardId: existingTask.boardId,
        isArchived: true,
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

const toggleLabelOnTask = async (req, res) => {
  try {
    const { taskId, labelId } = req.body;
    if (!taskId || !labelId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập taskId, labelId",
      });
    }

    // 1. Kiểm tra tồn tại
    const [task, label] = await Promise.all([
      Task.findById(taskId),
      Label.findById(labelId),
    ]);

    if (!task || !label) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task hoặc Label không tồn tại",
      });
    }

    // 2️. Kiểm tra có gắn sẵn chưa
    const existing = await TaskLabel.findOne({ taskId, labelId });

    let action = "";
    if (existing) {
      // Nếu có rồi thì gỡ ra (toggle off)
      await TaskLabel.deleteOne({ _id: existing._id });
      action = "removed";
    } else {
      // Nếu chưa có thì gắn vào (toggle on)
      await TaskLabel.create({ taskId, labelId });
      action = "added";
    }

    // 3️. Phát socket cho mọi người trong board biết
    const io = getIO();
    io.to(task.boardId.toString()).emit("taskLabelUpdated", {
      taskId,
      labelId,
      action,
    });

    return res.status(200).json({
      status: "success",
      message: `Label ${
        action === "added" ? "được gắn vào" : "bị gỡ khỏi"
      } task thành công`,
      data: { taskId, labelId, action },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

// Upload file đính kèm cho task
const uploadFile = async (req, res) => {
  try {
    const userId = req.user.userId;
    // 1. Kiểm tra có upload file
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng upload file đính kèm",
      });
    }

    const { taskId } = req.body;
    if (!taskId) {
      await deleteUploadedFileCloudinary(req.file);
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập id task",
      });
    }

    // 2. Kiểm tra task
    const task = await Task.findById(taskId);
    if (!task) {
      await deleteUploadedFileCloudinary(req.file);
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 3. Tạo Attachment
    const attachment = await Attachment.create({
      taskId,
      uploadedBy: userId,
      fileUrl: req.file.path,
      filePublicId: req.file.filename,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedAt: new Date(),
    });

    // 4. Gửi lên Socket
    const io = getIO();
    io.to(task.boardId.toString()).emit("attachment:new", {
      taskId,
      attachment,
      message: "File mới được tải lên trong task",
    });

    // 5. Gửi lên Socket - thông báo các thành viên khác

    return res.status(200).json({
      status: "success",
      message: "Upload thành công",
      data: attachment,
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

// Xóa file đính kèm
const deleteFile = async (req, res) => {
  try {
    const attachmentId = req.params.attachmentId;

    // 1️. Kiểm tra attachment tồn tại
    const attachment = await Attachment.findById(attachmentId).populate({
      path: "taskId",
      select: "_id boardId", // populate để có boardId
    });

    if (!attachment) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "File đính kèm không tồn tại",
      });
    }

    const task = attachment.taskId;
    if (!task || !task.boardId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Không tìm thấy board chứa task này",
      });
    }

    // 2️. Xóa file trên cloudinary
    if (attachment.filePublicId) {
      await cloudinary.uploader.destroy(attachment.filePublicId);
    }

    // 3️. Xóa bản ghi trong database
    await Attachment.deleteOne({ _id: attachment._id });

    // 4️. Phát socket event đến tất cả người trong cùng board
    const io = getIO();
    io.to(task.boardId.toString()).emit("attachment:deleted", {
      taskId: task._id,
      attachmentId: attachment._id,
    });

    // 5️. Trả về phản hồi cho client
    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Đã xóa file đính kèm thành công",
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
  addTask,
  updateTaskTitle,
  movePosition,
  updateDeadlineTask,
  updateTaskDescription,
  deleteTask,
  toggleLabelOnTask,
  uploadFile,
  deleteFile,
};
