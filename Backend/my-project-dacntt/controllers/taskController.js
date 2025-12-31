const Task = require("../models/task");
const axios = require("axios");
const Column = require("../models/column");
const Label = require("../models/label");
const TaskLabel = require("../models/taskLabel");
const Attachment = require("../models/attachment");
const Comment = require("../models/comment");
const Checklist = require("../models/checklist");
const CheckItem = require("../models/checkItem");
const { getIO } = require("../config/socket");
const cloudinary = require("../config/cloudinary");
const { ObjectId } = require("mongodb");
const reminderQueue = require("../services/reminderQueue");
const createActivityLogTask = require("../utils/createActivityLogTask");
const User = require("../models/user");
const activityLogQueue = require("../services/activityLogQueue");
const TaskAssignee = require("../models/taskAssignee");
const EmojiReaction = require("../models/emojiReaction");
const ActivityLog = require("../models/activityLog");
const mongoose = require("mongoose");

const addTask = async (req, res) => {
  try {
    const columnId = req.params.columnId;
    const userId = req.user.userId;

    const { title } = req.body;
    if (!title) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập tên tiêu đề",
      });
    }

    // 1. Kiểm tra column, user
    const [column, user] = await Promise.all([
      Column.findById(columnId),
      User.findById(userId).select("fullName avatar").lean(),
    ]);

    if (!column) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Column không tồn tại",
      });
    }

    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Người dùng không hợp lệ",
      });
    }

    // 2. Lấy ra board id
    const boardId = column.boardId;

    // 3. Lấy danh sách tasks trong column
    const tasks = await Task.find({ columnId }).sort({
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
    await activityLogQueue.add("activityLog", {
      userId,
      boardId: task.boardId,
      taskId: task._id,
      action: "TASK_CREATE",
      target: task.title,
    });

    return res.status(201).json({
      status: "success",
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
    const userId = req.user.userId;

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

    // 4. Gửi qua Redis queue - tạo activity log, socket
    await activityLogQueue.add("activityLog", {
      userId,
      boardId: task.boardId,
      taskId: task._id,
      action: "TASK_UPDATE_TITLE",
      target: task.title,
    });

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

const getFullTaskWithTotals = async (taskId) => {
  const task = await Task.findById(taskId);
  if (!task) return null;

  // Lấy checklists + items
  const checklists = await Checklist.aggregate([
    { $match: { taskId: new ObjectId(taskId) } },
    {
      $lookup: {
        from: "checklistitems",
        localField: "_id",
        foreignField: "checklistId",
        as: "checklistitems",
      },
    },
    {
      $addFields: {
        totalItems: { $size: "$checklistitems" },
        completedItems: {
          $size: {
            $filter: {
              input: "$checklistitems",
              as: "item",
              cond: { $eq: ["$$item.isCompleted", true] },
            },
          },
        },
      },
    },
  ]);

  // Lấy comments
  const comments = await Comment.find({ taskId: new ObjectId(taskId) });

  // Lấy attachments
  const attachments = await Attachment.find({ taskId: new ObjectId(taskId) });

  // Lấy labels
  const taskLabels = await TaskLabel.aggregate([
    { $match: { taskId: new ObjectId(taskId) } },
    {
      $lookup: {
        from: "labels",
        localField: "labelId",
        foreignField: "_id",
        as: "labelDetails",
      },
    },
    { $unwind: "$labelDetails" },
    {
      $project: {
        _id: 0,
        labelId: "$labelId",
        title: "$labelDetails.title",
        color: "$labelDetails.color",
      },
    },
  ]);

  // Logic mới dùng CheckItem model
  const totalItems = await CheckItem.countDocuments({
    taskId: new ObjectId(taskId),
  });
  const completedItems = await CheckItem.countDocuments({
    taskId: new ObjectId(taskId),
    isCompleted: true,
  });

  return {
    _id: task._id,
    title: task.title,
    position: task.position,
    isCompleted: task.isCompleted,
    dueDate: task.dueDate,
    totalChecklists: 1, // Dummy or legacy
    totalCheckItems: totalItems,
    totalCheckItemsCompleted: completedItems, // Add this field
    totalComments: comments.length,
    totalAttachments: attachments.length,
    taskLabels,
  };
};

const moveTask = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    let { destinationColumnId, destinationIndex } = req.body;

    destinationIndex = Number(destinationIndex);
    if (Number.isNaN(destinationIndex)) destinationIndex = undefined;

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

    const allTasks = tasksInDestCol.filter(
      (t) => t._id.toString() !== taskId.toString()
    );

    if (destinationIndex === undefined) {
      destinationIndex = allTasks.length;
    }
    if (destinationIndex < 0) destinationIndex = 0;
    if (destinationIndex > allTasks.length) destinationIndex = allTasks.length;

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

    const oldColumnId = task.columnId;
    task.columnId = destinationColumnId;
    task.position = newPosition;
    task.isArchived = false;
    await task.save();

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

    if (needReindex) {
      console.log("Re-index column:", destinationColumnId);
      const spacing = 1000;
      const bulkOps = updatedTasks.map((t, i) => ({
        updateOne: {
          filter: { _id: t._id },
          update: { $set: { position: (i + 1) * spacing } },
        },
      }));
      await Task.bulkWrite(bulkOps);

      updatedTasks = await Task.find({
        columnId: destinationColumnId,
        isArchived: false,
      }).sort({ position: 1 });
    }

    // LẤY FULL DATA CHO TẤT CẢ TASK TRONG CỘT ĐÍCH
    const fullTasksInDestination = await Promise.all(
      updatedTasks.map((t) => getFullTaskWithTotals(t._id))
    );

    const fullMovedTask = fullTasksInDestination.find(
      (t) => t._id.toString() === taskId
    );

    // EMIT SOCKET
    const io = getIO();
    io.to(task.boardId.toString()).emit("taskMoved", {
      boardId: task.boardId.toString(),
      sourceColumnId: oldColumnId.toString(),
      destinationColumnId: destinationColumnId,
      movedTaskId: task._id.toString(),
      destinationIndex,
      reindexed: needReindex,
      tasksInDestination: fullTasksInDestination,
      movedTask: fullMovedTask,
    });

    return res.status(200).json({
      status: "success",
      message: "Di chuyển task thành công",
      data: {
        taskId: task._id,
        newPosition: task.position,
        destinationColumnId,
        reindexed: needReindex,
        tasks: fullTasksInDestination.map((t) => ({
          _id: t._id,
          title: t.title,
          position: t.position,
          isCompleted: t.isCompleted,
          dueDate: t.dueDate,
          totalComments: t.totalComments,
          totalAttachments: t.totalAttachments,
          totalChecklists: t.totalChecklists,
          totalChecklistItems: t.totalChecklistItems,
          taskLabels: t.taskLabels,
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
    const userId = req.user.userId;
    const { startDate, dueDate, reminderEnabled, reminderTime } = req.body;

    if (!taskId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Task ID là bắt buộc",
      });
    }

    // Parse ngày nếu có
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedDueDate = dueDate ? new Date(dueDate) : undefined;

    if (parsedStartDate && parsedDueDate && parsedStartDate > parsedDueDate) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Ngày bắt đầu không thể sau ngày kết thúc",
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // Cập nhật task
    if (parsedStartDate !== undefined) task.startDate = parsedStartDate;
    if (parsedDueDate !== undefined) {
      task.dueDate = parsedDueDate;
      task.reminderSent = false; // reset reminder nếu thay đổi dueDate
    }
    if (reminderEnabled !== undefined) task.reminderEnabled = reminderEnabled;
    if (reminderTime !== undefined) task.reminderTime = reminderTime;

    task.status = null;
    await task.save();

    // Xóa job cũ nếu có
    const jobIds = [
      `${task._id}-reminder`,
      `${task._id}-nearDeadline`,
      `${task._id}-overdue`,
    ];
    for (const id of jobIds) {
      const oldJob = await reminderQueue.getJob(id);
      if (oldJob) {
        await oldJob.remove();
        console.log(`Đã xóa job cũ: ${id}`);
      }
    }

    // Thêm job nhắc nhở mới nếu bật reminder và có dueDate
    if (task.reminderEnabled && task.dueDate) {
      const now = Date.now(); // giờ UTC hiện tại server
      const dueTime = task.dueDate.getTime();
      const reminderMs = (task.reminderTime || 0) * 60 * 1000;

      let delay = dueTime - now - reminderMs;
      if (delay < 0) delay = 0; // reminder quá hạn → chạy ngay

      await reminderQueue.add(
        "sendReminder",
        { taskId: task._id, boardId: task.boardId },
        { delay, jobId: `${task._id}-reminder` }
      );

      console.log(`✅ Job nhắc task ${task._id} đã được thêm vào queue`);
    }

    // ===== Thêm job cập nhật trạng thái task (gần tới hạn, quá hạn) =====
    if (task.dueDate) {
      const now = Date.now(); // giờ UTC hiện tại server
      const dueTime = task.dueDate.getTime();

      // --- Job "Gần tới hạn" ---
      const nearDeadlineDelay = dueTime - now - 10 * 60 * 1000;
      await reminderQueue.add(
        "markNearDeadline",
        { taskId: task._id, boardId: task.boardId },
        { delay: nearDeadlineDelay, jobId: `${task._id}-nearDeadline` }
      );
      console.log(
        `⏳ [markNearDeadline] Task ${task.title} (ID: ${
          task._id
        }), dueDate: ${task.dueDate.toISOString()}, now: ${new Date(
          now
        ).toISOString()}, delay: ${nearDeadlineDelay} ms`
      );

      // --- Job "Quá hạn" ---
      const overdueDelay = Math.max(dueTime - now, 0);
      await reminderQueue.add(
        "markOverdue",
        { taskId: task._id, boardId: task.boardId },
        { delay: overdueDelay, jobId: `${task._id}-overdue` }
      );
      console.log(
        `⏳ [markOverdue] Task ${task.title} (ID: ${
          task._id
        }), dueDate: ${task.dueDate.toISOString()}, now: ${new Date(
          now
        ).toISOString()}, delay: ${overdueDelay} ms`
      );
    }

    // Emit socket cập nhật
    const io = getIO();
    io.to(task.boardId.toString()).emit("deadlineTaskUpdated", {
      _id: task._id,
      columnId: task.columnId,
      boardId: task.boardId,
      title: task.title,
      position: task.position,
      startDate: task.startDate,
      dueDate: task.dueDate,
      status: task.status,
      reminderEnabled: task.reminderEnabled,
      reminderTime: task.reminderTime,
    });

    // Gửi lên Redis queue - cập nhật activity log
    await activityLogQueue.add("activityLog", {
      userId,
      boardId: task.boardId,
      taskId: task._id,
      action: "DEADLINE_SET",
      target: task.title,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Cập nhật thời hạn task thành công",
      data: {
        _id: task._id,
        title: task.title,
        startDate: task.startDate,
        dueDate: task.dueDate,
        reminderEnabled: task.reminderEnabled,
        reminderTime: task.reminderTime,
      },
    });
  } catch (error) {
    console.error("Lỗi updateDeadlineTask:", error);
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const updateTaskDescription = async (req, res) => {
  try {
    const userId = req.user.userId;
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

    // Gửi lên Redis queue - cập nhật activity log
    await activityLogQueue.add("activityLog", {
      userId,
      boardId: existingTask.boardId,
      taskId: existingTask._id,
      action: "TASK_UPDATE_DESCRIPTION",
      target: existingTask.title,
    });

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
      Task.findById(taskId).lean(),
      Label.findById(labelId).lean(),
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
      title: label.title,
      color: label.color,
      action,
    });

    return res.status(200).json({
      status: "success",
      message: `Label ${
        action === "added" ? "được gắn vào" : "bị gỡ khỏi"
      } task thành công`,
      data: { taskId, labelId, title: label.title, color: label.color, action },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const getAllTaskLabels = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    if (!taskId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu boardId",
      });
    }

    // 1. Kiểm tra task
    const task = await Task.findById(taskId)
      .populate({
        path: "columnId",
        select: "boardId",
      })
      .lean();
    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 2. Lấy danh sách labels
    const labels = await Label.aggregate([
      {
        $match: {
          boardId: new ObjectId(task.columnId.boardId), // hoặc new ObjectId(task.columnId.boardId)
        },
      },
      {
        $lookup: {
          from: "tasklabels", // tên collection TaskLabel (thường là lowercase + s)
          let: { labelId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$labelId", "$$labelId"] },
                taskId: new ObjectId(taskId), // <-- task cụ thể bạn đang xem
              },
            },
            { $limit: 1 }, // chỉ cần biết có tồn tại hay không
          ],
          as: "taskLabels",
        },
      },
      {
        $addFields: {
          status: { $gt: [{ $size: "$taskLabels" }, 0] }, // true nếu có gắn, false nếu không
        },
      },
      {
        $project: {
          taskLabels: 0, // ẩn field phụ không cần thiết
        },
      },
      {
        $sort: { createdAt: -1 }, // hoặc sort theo ý bạn
      },

      {
        $project: {
          _id: 1,
          boardId: 1,
          title: 1,
          color: 1,
          status: 1,
        },
      },
    ]);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách task-labels",
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
    const task = await Task.findById(taskId).lean();
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

    // 4. Đếm tổng số attachment hiện có trong task
    const totalAttachments = await Attachment.countDocuments({ taskId });

    // 4. Gửi lên Socket
    const io = getIO();
    io.to(task.boardId.toString()).emit("attachment:new", {
      taskId,
      attachment,
      totalAttachments,
      message: "File mới được tải lên trong task",
    });

    // 5. Gửi lên Redis queue - cập nhật activity log
    await activityLogQueue.add("activityLog", {
      userId,
      boardId: task.boardId,
      taskId: task._id,
      action: "ATTACHMENT_UPLOAD",
      target: attachment.fileName,
    });

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
    const userId = req.user.userId;
    const attachmentId = req.params.attachmentId;

    // 1️. Kiểm tra attachment tồn tại
    const [attachment, user] = await Promise.all([
      Attachment.findById(attachmentId).populate({
        path: "taskId",
        select: "_id boardId", // populate để có boardId
      }),
      User.findById(userId).select("fullName avatar"),
    ]);

    if (!attachment) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "File đính kèm không tồn tại",
      });
    }

    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Người dùng không hợp lệ",
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

    const totalAttachments = await Attachment.countDocuments({
      taskId: task._id,
    });

    // 4️. Phát socket event đến tất cả người trong cùng board
    const io = getIO();
    io.to(task.boardId.toString()).emit("attachment:deleted", {
      taskId: task._id,
      attachmentId: attachment._id,
      totalAttachments,
    });

    // Cập nhật thông báo socket
    const activityLog = await createActivityLogTask({
      userId,
      boardId: task.boardId,
      taskId: task._id,
      action: "ATTACHMENT_DELETE",
      target: attachment.fileName,
    });

    io.to(task._id.toString()).emit("activityLogTask", {
      userId,
      fullName: user.fullName,
      avatar: user.avatar,
      taskId: activityLog.taskId,
      boardId: activityLog.boardId,
      action: activityLog.action,
      description: activityLog.description,
      createdAt: activityLog.createdAt,
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

    // 1️. Kiểm tra task tồn tại
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 2. Lấy chi tiết Task kèm CheckItems
    const [taskDetail] = await Task.aggregate([
      { $match: { _id: new ObjectId(taskId) } },

      // Task Assignee
      {
        $lookup: {
          from: "taskassignees",
          localField: "_id",
          foreignField: "taskId",
          as: "taskassignees",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userDetails",
              },
            },
            {
              $unwind: {
                path: "$userDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 0,
                userId: "$userDetails._id",
                avatar: "$userDetails.avatar",
                fullName: "$userDetails.fullName",
              },
            },
          ],
        },
      },

      // Labels
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

      // CheckItems (mới – thay thế hoàn toàn checklists)
      {
        $lookup: {
          from: "checkitems", // tên collection (mongoose tự lowercase + thêm s)
          localField: "_id",
          foreignField: "taskId",
          as: "checkItems",
          pipeline: [
            // Lấy thông tin người được giao
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

            // Sắp xếp theo position
            { $sort: { position: 1 } },

            // Project fields cần thiết
            {
              $project: {
                _id: 1,
                title: 1,
                isCompleted: 1,
                position: 1,
                dueDate: 1,
                assignedTo: {
                  $cond: {
                    if: { $ne: ["$assignedUser", []] },
                    then: {
                      _id: "$assignedUser._id",
                      fullName: "$assignedUser.fullName",
                      avatar: "$assignedUser.avatar",
                    },
                    else: null,
                  },
                },
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
        },
      },

      // Tính tổng và số hoàn thành
      {
        $addFields: {
          totalCheckItems: { $size: "$checkItems" },
          completedCheckItems: {
            $size: {
              $filter: {
                input: "$checkItems",
                as: "item",
                cond: { $eq: ["$$item.isCompleted", true] },
              },
            },
          },
        },
      },

      // Attachments
      {
        $lookup: {
          from: "attachments",
          localField: "_id",
          foreignField: "taskId",
          as: "attachments",
        },
      },

      // Final projection
      {
        $project: {
          boardId: 1,
          title: 1,
          description: 1,
          startDate: 1,
          dueDate: 1,
          isCompleted: 1,
          status: 1,
          position: 1,
          labels: 1,
          checkItems: 1, // danh sách check-items
          totalCheckItems: 1, // Tổng số
          completedCheckItems: 1, // Tổng số check-item đã hoàn thành
          attachments: 1,
          taskAssignees: "$taskassignees",
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

const toggleTask = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.user.userId;
    if (!taskId) {
      await deleteUploadedFileCloudinary(req.file);
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập id task",
      });
    }

    // 1. Kiểm tra task, user
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 2. Cập nhật trạng thái
    task.isCompleted = !task.isCompleted;
    await task.save();

    // 3. Gửi lên socket cập nhật trạng thái
    const io = getIO();
    io.to(task.boardId.toString()).emit("toggleTask", {
      taskId,
      isCompleted: task.isCompleted,
    });

    // 4. Gửi lên Redis queue - cập nhật activity log
    await activityLogQueue.add("activityLog", {
      userId,
      boardId: task.boardId,
      taskId,
      action: task.isCompleted ? "TASK_COMPLETE" : "TASK_UNCOMPLETE",
      target: task.title,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: task.isCompleted ? "Đã hoàn thành task" : "Chưa hoàn thành task",
      data: {
        _id: task._id,
        isCompleted: task.isCompleted,
        boardId: task.boardId,
        columnId: task.columnId,
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

const getPrioritySuggestion = async (req, res) => {
  try {
    const taskId = req.params.taskId;

    // 1. Lấy Full info của task
    const fullTask = await getFullTaskWithTotals(taskId);

    if (!fullTask) {
      return res
        .status(404)
        .json({ status: "error", message: "Task không tồn tại" });
    }

    // 2. Tính toán số liệu checklist (Dùng CheckItem model)
    const totalItems = fullTask.totalCheckItems;
    const completedItems = fullTask.totalCheckItemsCompleted;

    // 3. Chuẩn bị payload gửi sang AI Service
    const payload = {
      tasks: [
        {
          taskId: fullTask._id.toString(),
          dueDate: fullTask.dueDate ? fullTask.dueDate.toISOString() : null,
          isCompleted: fullTask.isCompleted,
          totalCheckItems: totalItems,
          completedCheckItems: completedItems,
        },
      ],
    };

    // 4. Gọi AI Service
    // URL AI Service: Lấy từ biến môi trường hoặc mặc định
    const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8001";

    // Lưu ý: Nếu chạy trong Docker Network thì dùng http://ai-service:8001, nhưng nodejs chạy ngoài thì localhost là đúng.
    const aiResponse = await axios.post(`${aiUrl}/predict-priority`, payload);

    if (
      aiResponse.data.status === "success" &&
      aiResponse.data.data.length > 0
    ) {
      const result = aiResponse.data.data[0];

      return res.status(200).json({
        status: "success",
        data: {
          taskId: result.taskId,
          priorityScore: result.priorityScore,
          priorityLabel:
            result.priorityScore >= 80
              ? "Critical"
              : result.priorityScore >= 50
              ? "High"
              : result.priorityScore >= 20
              ? "Medium"
              : "Low",
        },
      });
    } else {
      return res
        .status(500)
        .json({ status: "error", message: "AI Service không trả về kết quả" });
    }
  } catch (error) {
    console.error("AI Priority Error:", error.message);
    return res
      .status(500)
      .json({ status: "error", message: "Lỗi khi gọi AI: " + error.message });
  }
};

const deleteTask = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const taskId = req.params.taskId;
    if (!taskId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu taskId",
      });
    }

    // 1. Kiểm tra task có tồn tại
    const task = await Task.findById(taskId).session(session);
    if (!task) {
      await session.abortTransaction();
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 2. TaskAssignee
    await TaskAssignee.deleteMany({ taskId }).session(session);

    // 3. Attachment
    const attachments = await Attachment.find({ taskId }).session(session);
    if (attachments.length > 0) {
      for (const a of attachments) {
        if (a.filePublicId) {
          await cloudinary.uploader.destroy(a.filePublicId);
          await Attachment.deleteOne({ _id: a._id }).session(session);
        }
      }
    }

    // 4. Comments
    const comments = await Comment.find({ taskId }).session(session);
    if (comments.length > 0) {
      const commentIds = comments.map((c) => c._id);
      await EmojiReaction.deleteMany({
        commentId: { $in: commentIds },
      }).session(session);
      await Comment.deleteMany({ taskId }).session(session);
    }

    // 5. ActivityLog
    await ActivityLog.deleteMany({ taskId }).session(session);

    // 6. Task Label
    await TaskLabel.deleteMany({ taskId }).session(session);

    // 7. Check Item
    await CheckItem.deleteMany({ taskId }).session(session);

    // 8. Xóa task chính
    await Task.deleteOne({ _id: taskId });

    await session.commitTransaction();

    // Emit socket
    const io = getIO();
    io.to(task.boardId.toString()).emit("deleteTask", {
      taskId,
    });

    // Xóa jobId queue redis chạy nền (task, checkItem)
    const jobIds = [
      `${task._id}-reminder`,
      `${task._id}-nearDeadline`,
      `${task._id}-overdue`,
    ];
    for (const id of jobIds) {
      const oldJob = await reminderQueue.getJob(id);
      if (oldJob) {
        await oldJob.remove();
        console.log(`Đã xóa job cũ: ${id}`);
      }
    }

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Xóa task thành công",
      data: {
        taskId,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error,
    });
  } finally {
    await session.endSession();
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
  toggleTask,
  getAllTaskLabels,
  getPrioritySuggestion,
};
