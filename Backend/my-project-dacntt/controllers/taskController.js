const Task = require("../models/task");
const Column = require("../models/column");
const Label = require("../models/label");
const TaskLabel = require("../models/taskLabel");
const Attachment = require("../models/attachment");
const { getIO } = require("../config/socket");
const cloudinary = require("../config/cloudinary");
const { ObjectId } = require("mongodb");

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
      isCompleted: task.isCompleted,
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
        isCompleted: task.isCompleted,
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
      description: task.description,
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

const moveTask = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    let { destinationColumnId, destinationIndex } = req.body;

    destinationIndex = Number(destinationIndex);
    if (Number.isNaN(destinationIndex)) destinationIndex = undefined;

    // 1. Lấy task và tất cả task ở cột ĐÍCH
    // Dùng Promise.all để chạy song song 2 query
    const [task, tasksInDestCol] = await Promise.all([
      Task.findById(taskId),
      Task.find({
        columnId: destinationColumnId,
        isArchived: false,
      }).sort({ position: 1 }),
    ]);

    if (!task) {
      return res.status(404).json({
        status: "error",
        message: "Task không tồn tại",
      });
    }

    // Lọc task đang di chuyển ra khỏi danh sách đích (chỉ có tác dụng nếu di chuyển trong cùng 1 column)
    const allTasks = tasksInDestCol.filter(
      (t) => t._id.toString() !== taskId.toString()
    );

    // 2. Chuẩn hóa destinationIndex
    if (destinationIndex === undefined) {
      destinationIndex = allTasks.length;
    }
    if (destinationIndex < 0) destinationIndex = 0;
    if (destinationIndex > allTasks.length) destinationIndex = allTasks.length;

    // 3. Tính toán vị trí mới (Logic fractional indexing của bạn đã rất chuẩn)
    let newPosition;
    if (allTasks.length === 0) {
      newPosition = 1000;
    } else if (destinationIndex === 0) {
      newPosition = allTasks[0].position / 2;
    } else if (destinationIndex === allTasks.length) {
      newPosition = allTasks[allTasks.length - 1].position + 1000;
    } else {
      const prev = allTasks[destinationIndex - 1];
      const next = allTasks[destinationIndex];
      newPosition = (prev.position + next.position) / 2;
    }

    // 4. Cập nhật task và lưu
    const oldColumnId = task.columnId;

    task.columnId = destinationColumnId;
    task.position = newPosition;
    task.isArchived = false; // Đảm bảo task "sống lại"
    await task.save();

    // 5. Kiểm tra Re-index
    // Thêm task vừa cập nhật vào danh sách (đúng vị trí) để kiểm tra
    let updatedTasks = [...allTasks];
    updatedTasks.splice(destinationIndex, 0, task);

    const minSpacing = 1;
    let needReindex = false;
    for (let i = 1; i < updatedTasks.length; i++) {
      const diff = updatedTasks[i].position - updatedTasks[i - 1].position;
      if (diff < minSpacing) {
        needReindex = true;
        break;
      }
    }

    // 6. XỬ LÝ RE-INDEX (TỐI ƯU HÓA)
    if (needReindex) {
      console.log(
        "⚙️ Re-index lại position cho tasks trong column:",
        destinationColumnId
      );
      const spacing = 1000;

      // Tạo một mảng các thao tác "update"
      const bulkOps = updatedTasks.map((t, i) => ({
        updateOne: {
          filter: { _id: t._id },
          update: { $set: { position: (i + 1) * spacing } },
        },
      }));

      // Chạy 1 lệnh bulkWrite duy nhất
      await Task.bulkWrite(bulkOps);

      // Tải lại danh sách task LẦN CUỐI (vì position đã thay đổi hoàn toàn)
      updatedTasks = await Task.find({
        columnId: destinationColumnId,
        isArchived: false,
      }).sort({ position: 1 });
    }

    // 7. Emit Socket
    const io = getIO();
    io.to(task.boardId.toString()).emit("taskMoved", {
      boardId: task.boardId,
      sourceColumnId: oldColumnId.toString(),
      destinationColumnId: destinationColumnId,
      movedTaskId: task._id,
      reindexed: needReindex,

      // Gửi danh sách tasks đã được re-index của cột ĐÍCH
      tasksInDestination: updatedTasks.map((t) => ({
        id: t._id,
        title: t.title,
        position: t.position,
        columnId: t.columnId,
      })),
    });

    // 8. Trả về Response
    return res.status(200).json({
      status: "success",
      message: "Cập nhật vị trí task thành công",
      data: {
        taskId: task._id,
        newPosition: task.position,
        destinationColumnId,
        reindexed: needReindex,
        tasks: updatedTasks.map((t) => ({
          // Trả về danh sách đã re-index (nếu có)
          id: t._id,
          title: t.title,
          position: t.position,
        })),
      },
    });
  } catch (error) {
    console.error("moveTask error:", error);
    return res.status(500).json({
      status: "error",
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const updateDeadlineTask = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const { startDate, dueDate, reminderEnabled, reminderTime } = req.body;

    // Validate taskId
    if (!taskId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Task ID là bắt buộc",
      });
    }

    // Validate ít nhất phải có startDate hoặc dueDate
    if (!startDate && !dueDate) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Phải có ít nhất ngày bắt đầu hoặc ngày kết thúc",
      });
    }

    // Parse dates
    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedDueDate = dueDate ? new Date(dueDate) : null;

    // Validate date formats
    if (startDate && isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Định dạng ngày bắt đầu không hợp lệ",
      });
    }

    if (dueDate && isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Định dạng ngày kết thúc không hợp lệ",
      });
    }

    // Validate logic: startDate <= dueDate
    if (parsedStartDate && parsedDueDate && parsedStartDate > parsedDueDate) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Ngày bắt đầu không thể sau ngày kết thúc",
      });
    }

    // Validate reminder time
    const validReminderTimes = [5, 15, 30, 60, 120, 1440]; // 5ph, 15ph, 30ph, 1h, 2h, 24h
    if (
      reminderEnabled &&
      reminderTime &&
      !validReminderTimes.includes(reminderTime)
    ) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thời gian nhắc nhở không hợp lệ",
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
    const updateData = {};
    if (startDate !== undefined) updateData.startDate = parsedStartDate;
    if (dueDate !== undefined) updateData.dueDate = parsedDueDate;
    if (reminderEnabled !== undefined)
      updateData.reminderEnabled = reminderEnabled;
    if (reminderTime !== undefined) updateData.reminderTime = reminderTime;

    // Reset reminder sent status if due date changed
    if (dueDate) {
      updateData.reminderSent = false;
    }

    const updatedTask = await Task.findByIdAndUpdate(taskId, updateData, {
      new: true,
    });

    // 3. Gửi socket
    const io = getIO();
    io.to(updatedTask.boardId.toString()).emit("deadlineTaskUpdated", {
      _id: taskId,
      columnId: updatedTask.columnId,
      boardId: updatedTask.boardId,
      title: updatedTask.title,
      position: updatedTask.position,
      startDate: updatedTask.startDate,
      dueDate: updatedTask.dueDate,
      reminderEnabled: updatedTask.reminderEnabled,
      reminderTime: updatedTask.reminderTime,
    });

    // 4. Gửi socket thông báo (nếu cần)
    io.to(updatedTask.boardId.toString()).emit("taskNotification", {
      type: "DEADLINE_UPDATED",
      taskId: taskId,
      taskTitle: updatedTask.title,
      message: `Đã cập nhật thời hạn cho task "${updatedTask.title}"`,
      timestamp: new Date(),
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Cập nhật thời hạn task thành công",
      data: {
        _id: taskId,
        title: updatedTask.title,
        startDate: updatedTask.startDate,
        dueDate: updatedTask.dueDate,
        reminderEnabled: updatedTask.reminderEnabled,
        reminderTime: updatedTask.reminderTime,
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
    // Kiểm tra chỉ khi description === undefined (nghĩa là không gửi field)
    if (description === undefined) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu trường mô tả (description)",
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
    io.to(existingTask.boardId.toString()).emit("descriptionTaskUpdated", {
      _id: taskId,
      columnId: existingTask.columnId,
      boardId: existingTask.boardId,
      title: existingTask.title,
      position: existingTask.position,
      dueDate: existingTask.dueDate,
      description: existingTask.description,
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

const getTaskDetail = async (req, res) => {
  try {
    const { taskId } = req.params;

    // 1️⃣ Kiểm tra task tồn tại
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 2️⃣ Lấy chi tiết Task kèm các thông tin liên quan
    const [taskDetail] = await Task.aggregate([
      { $match: { _id: new ObjectId(taskId) } },

      // 🎨 Labels
      {
        $lookup: {
          from: "tasklabels",
          localField: "_id",
          foreignField: "taskId",
          as: "labels",
          pipeline: [
            {
              $lookup: {
                from: "labels",
                localField: "labelId",
                foreignField: "_id",
                as: "labelInfo",
              },
            },
            { $unwind: "$labelInfo" },
            {
              $project: {
                _id: 0,
                labelId: "$labelId",
                title: "$labelInfo.title",
                color: "$labelInfo.color",
              },
            },
          ],
        },
      },

      // 🧾 Checklists và Items
      {
        $lookup: {
          from: "checklists",
          localField: "_id",
          foreignField: "taskId",
          as: "checklists",
          pipeline: [
            {
              $lookup: {
                from: "checklistitems",
                localField: "_id",
                foreignField: "checklistId",
                as: "items",
                pipeline: [
                  {
                    $lookup: {
                      from: "users",
                      localField: "assignedTo",
                      foreignField: "_id",
                      as: "assignedUser",
                    },
                  },
                  {
                    $unwind: {
                      path: "$assignedUser",
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      _id: 1,
                      title: 1,
                      isCompleted: 1,
                      position: 1,
                      dueDate: 1,
                      assignedTo: {
                        _id: "$assignedUser._id",
                        fullName: "$assignedUser.fullName",
                        avatar: "$assignedUser.avatar",
                      },
                      createdAt: 1,
                      updatedAt: 1,
                    },
                  },
                  { $sort: { position: 1 } }, // Sắp xếp items theo position
                ],
              },
            },
            {
              $addFields: {
                totalItems: { $size: "$items" },
                completedItems: {
                  $size: {
                    $filter: {
                      input: "$items",
                      as: "item",
                      cond: { $eq: ["$$item.isCompleted", true] },
                    },
                  },
                },
              },
            },
            { $sort: { position: 1 } }, // Sắp xếp checklists theo position
          ],
        },
      },

      // 📎 Attachments
      {
        $lookup: {
          from: "attachments",
          localField: "_id",
          foreignField: "taskId",
          as: "attachments",
        },
      },

      // 🎯 Projection cuối cùng
      {
        $project: {
          title: 1,
          description: 1,
          dueDate: 1,
          isCompleted: 1,
          position: 1,
          labels: 1,
          checklists: 1,
          attachments: 1,
          totalChecklistItems: 1,
          completedChecklistItems: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return res.status(200).json({
      status: "success",
      code: 200,
      data: taskDetail,
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
  moveTask,
  updateDeadlineTask,
  updateTaskDescription,
  deleteTask,
  toggleLabelOnTask,
  uploadFile,
  deleteFile,
  getTaskDetail,
};
