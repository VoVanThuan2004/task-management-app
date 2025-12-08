const CheckItem = require("../models/checkItem");
const Task = require("../models/task");
const BoardMember = require("../models/boardMember");
const { getIO } = require("../config/socket");
const createActivityLogTask = require("../utils/createActivityLogTask");
const User = require("../models/user");

const addCheckItem = async (req, res) => {
  try {
    const { taskId, title, assignedTo, dueDate } = req.body;
    const userId = req.user.userId;

    // 1. Validate dữ liệu
    if (!taskId || !title?.trim()) {
      return res.status(400).json({
        status: "error",
        message: "taskId và title là bắt buộc",
      });
    }

    // 2. Kiểm tra task
    const [task, user] = await Promise.all([
      await Task.findById(taskId),
      await User.findById(userId),
    ]);
    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 3. Nếu có assignedTo (thành viên cần làm nhiệm vụ này)
    if (assignedTo) {
      // 3.1 Kiểm thành viên có tồn tại trong bảng làm việc này không
      const boardMember = await BoardMember.findOne({
        boardId: task.boardId,
        userId: assignedTo,
        status: "accepted",
      });

      if (!boardMember) {
        return res.status(404).json({
          status: "error",
          code: 404,
          message: "Thành viên chỉ định không hợp lệ",
        });
      }
    }

    // 4. Lấy vị trí cuối cùng của CheckItem
    const checkItems = await CheckItem.find().sort({ position: 1 });

    const position =
      checkItems.length === 0
        ? 1000
        : checkItems[checkItems.length - 1].position + 1000;

    // 5. Thêm CheckItem
    const checkItem = await CheckItem.create({
      taskId,
      title,
      position,
      assignedTo: assignedTo ? assignedTo : null,
      dueDate: dueDate ? dueDate : null,
    });

    // 5. Gửi lên socket
    const io = getIO();
    io.to(checkItem.taskId.toString()).emit("checkItemAdded", {
      taskId,
      _id: checkItem._id,
      title: checkItem.title,
      position: checkItem.position,
      isCompleted: checkItem.isCompleted,
      assignedTo: checkItem.assignedTo,
      dueDate: checkItem.dueDate,
    });

    // Cập nhật lại số lượng check-item khi thêm vào
    io.to(task.boardId.toString()).emit("totalCheckItem", {
      taskId,
    });

    // === ActivityLogs === (thông báo)
    const activityLog = await createActivityLogTask({
      userId,
      boardId: task.boardId,
      taskId: checkItem.taskId,
      action: "CHECKITEM_CREATE",
      target: checkItem.title,
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

    return res.status(201).json({
      status: "success",
      code: 201,
      message: "Thêm check-item thành công",
      data: {
        taskId,
        _id: checkItem._id,
        title: checkItem.title,
        position: checkItem.position,
        isCompleted: checkItem.isCompleted,
        assignedTo: checkItem.assignedTo,
        dueDate: checkItem.dueDate,
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

const updateTitleCheckItem = async (req, res) => {
  try {
    const checkItemId = req.params.id;
    if (!checkItemId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu check-item id",
      });
    }

    const { title } = req.body;
    if (!title) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập tiêu đề",
      });
    }

    // 1. Kiểm tra checklist-item
    const checkItem = await CheckItem.findById(checkItemId);
    if (!checkItem) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Check-item không tồn tại",
      });
    }

    // 2. Cập nhật tiêu đề
    checkItem.title = title;
    await checkItem.save();

    // 3. Gửi lên socket
    const io = getIO();
    io.to(checkItem.taskId.toString()).emit("checkItemTitleUpdated", {
      _id: checkItem._id,
      title: checkItem.title,
      position: checkItem.position,
      isCompleted: checkItem.isCompleted,
      assignedTo: checkItem.assignedTo,
      dueDate: checkItem.dueDate,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Cập nhật tiêu đề check-item thành công",
      data: {
        _id: checkItem._id,
        title: checkItem.title,
        position: checkItem.position,
        isCompleted: checkItem.isCompleted,
        assignedTo: checkItem.assignedTo,
        dueDate: checkItem.dueDate,
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

const deleteCheckItem = async (req, res) => {
  try {
    const checkItemId = req.params.id;
    if (!checkItemId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "checkItemId là bắt buộc",
      });
    }

    // 1. Kiểm tra checkItem
    const checkItem = await CheckItem.findById(checkItemId);
    if (!checkItem) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Check-item không tồn tại",
      });
    }

    // 2. Xóa check-item
    await CheckItem.deleteOne({ _id: checkItemId });

    // === ActivityLogs (Gửi thông báo) ===

    // 3. Gửi lên socket
    const io = getIO();
    io.to(checkItem.taskId.toString()).emit("checkItemDeleted", {
      _id: checkItem._id,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Xóa check-item thành công",
      data: {
        _id: checkItem._id,
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

const moveCheckItem = async (req, res) => {
  try {
    const checkItem = await CheckItem.findById(req.params.id);
    if (!checkItem) {
      return res.status(404).json({
        status: "error",
        message: "CheckItem không tồn tại",
      });
    }

    const { destinationIndex } = req.body;
    if (destinationIndex == null || destinationIndex < 0) {
      return res.status(400).json({
        status: "error",
        message: "destinationIndex không hợp lệ",
      });
    }

    const taskId = checkItem.taskId;

    // Lấy tất cả checklist của task (bao gồm cả cái đang move), sắp xếp đúng thứ tự hiện tại
    let siblings = await CheckItem.find({ taskId }).sort({ position: 1 });

    // Tìm index hiện tại của checklist đang move
    const currentIndex = siblings.findIndex(
      (c) => c._id.toString() === checkItem._id.toString()
    );

    // Nếu kéo về đúng vị trí cũ → không làm gì
    if (currentIndex === destinationIndex) {
      return res.status(200).json({
        status: "success",
        message: "Không thay đổi vị trí",
      });
    }

    // Xóa khỏi vị trí cũ
    siblings.splice(currentIndex, 1);

    // Chèn vào vị trí mới
    siblings.splice(destinationIndex, 0, checkItem);

    // Tính position mới theo đúng thuật toán Trello (rất thông minh)
    let newPosition;

    if (siblings.length === 1) {
      newPosition = 1000;
    } else if (destinationIndex === 0) {
      // Đầu danh sách
      newPosition = siblings[1].position / 2;
    } else if (destinationIndex === siblings.length - 1) {
      // Cuối danh sách
      newPosition = siblings[siblings.length - 2].position + 1000;
    } else {
      // Giữa hai phần tử
      const prev = siblings[destinationIndex - 1].position;
      const next = siblings[destinationIndex + 1].position;
      newPosition = (prev + next) / 2;
    }

    // Gán position mới
    checkItem.position = newPosition;
    await checkItem.save();

    // Kiểm tra xem có cần re-index toàn bộ không (Trello cũng làm y hệt)
    let needReindex = false;
    const MIN_GAP = 0.001; // Trello dùng khoảng 0.001 đến 0.0001

    for (let i = 1; i < siblings.length; i++) {
      if (siblings[i].position - siblings[i - 1].position < MIN_GAP) {
        needReindex = true;
        break;
      }
    }

    let finalList;
    if (needReindex) {
      // Re-index lại toàn bộ theo thứ tự hiện tại (giữ nguyên thứ tự UI)
      for (let i = 0; i < siblings.length; i++) {
        siblings[i].position = (i + 1) * 1024; // 1024 thay vì 1000 để dư space hơn
        await siblings[i].save();
      }
      console.log(`Re-indexed ${siblings.length} checklists in task ${taskId}`);

      finalList = siblings.sort((a, b) => a.position - b.position);
    } else {
      finalList = await CheckItem.find({ taskId }).sort({ position: 1 });
    }

    // Emit socket – frontend chỉ cần cập nhật lại danh sách
    const io = getIO();
    io.to(taskId.toString()).emit("checkItemReordered", {
      taskId,
      checkItems: finalList.map((c) => ({
        id: c._id,
        title: c.title,
        position: c.position,
      })),
      reindexed: needReindex,
    });

    return res.status(200).json({
      status: "success",
      message: "Di chuyển checklist thành công",
      data: {
        movedChecklistId: checkItem._id,
        newPosition: checkItem.position,
        reindexed: needReindex,
        checklists: finalList,
      },
    });
  } catch (error) {
    console.error("moveChecklist error:", error);
    return res.status(500).json({
      status: "error",
      message: "Lỗi hệ thống",
    });
  }
};

const toggleCheckItemComplete = async (req, res) => {
  try {
    const userId = req.user.userId;
    const checkItemId = req.params.id;
    if (!checkItemId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu check-item id",
      });
    }

    // 1. Kiểm tra checklist-item
    const [checkItem, user] = await Promise.all([
      await CheckItem.findById(checkItemId).populate({
        path: "taskId",
        select: "boardId",
      }),

      await User.findById(userId),
    ]);
    if (!checkItem) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "CheckItem không tồn tại",
      });
    }

    // 2. Kiểm tra trạng thái hiện tại checklist-item
    const currentStatus = checkItem.isCompleted;

    // 3. Cập nhật lại checklist-item
    checkItem.isCompleted = !currentStatus;
    await checkItem.save();

    // 4. Gửi lên socket realtime
    const io = getIO();
    io.to(checkItem.taskId.toString()).emit("checkItemCompleted", {
      _id: checkItem._id,
      title: checkItem.title,
      position: checkItem.position,
      isCompleted: checkItem.isCompleted,
      assignedTo: checkItem.assignedTo,
      dueDate: checkItem.dueDate,
    });


    // === ActivityLogs (Gửi thông báo) ===
    const activityLog = await createActivityLogTask({
      userId,
      boardId: checkItem.taskId.boardId,
      taskId: checkItem.taskId,
      action: checkItem.isCompleted
        ? "CHECKITEM_COMPLETE"
        : "CHECKITEM_UNCOMPLETE",
      target: checkItem.title,
    });
    io.to(checkItem.taskId._id.toString()).emit("activityLogTask", {
      userId,
      fullName: user.fullName,
      avatar: user.avatar,
      taskId: activityLog.taskId,
      boardId: activityLog.boardId,
      action: activityLog.action,
      description: activityLog.description,
      createdAt: activityLog.createdAt,
    });


    // 5. Gửi lên socket - cập nhật lại tổng số check-item hoàn thành
    // === Lấy tổng số check-item hoàn thành - Tổng số check-item hiện có ===
    const totalCheckItemsCompleted = await CheckItem.countDocuments({
      taskId: checkItem.taskId,
      isCompleted: true,
    });

    io.to(checkItem.taskId.boardId.toString()).emit("toggle:check-item", {
      taskId: checkItem.taskId._id,
      totalCheckItemsCompleted,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message:
        checkItem.isCompleted === true
          ? "Đã hoàn thành checklist-item"
          : "Chưa hoàn thành checklist-item",
      data: {
        _id: checkItem._id,
        title: checkItem.title,
        position: checkItem.position,
        isCompleted: checkItem.isCompleted,
        assignedTo: checkItem.assignedTo,
        dueDate: checkItem.dueDate,
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

const getAllCheckItems = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    if (!taskId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập taskId",
      });
    }

    // 1. Kiểm tra task
    const task = await Task.findOne({ _id: taskId });
    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 2. Lấy danh sách số lượng checkItems hoàn thành có positon tăng dần
    const [totalCheckItemsCompleted, checkItems] = await Promise.all([
      await CheckItem.countDocuments({ isCompleted: true }),
      await CheckItem.find({ taskId }).sort({ position: 1 }),
    ]);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách check-items thành công",
      data: {
        totalCheckItemsCompleted,
        totalCheckItems: checkItems.length,
        checkItems,
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

module.exports = {
  addCheckItem,
  updateTitleCheckItem,
  deleteCheckItem,
  moveCheckItem,
  toggleCheckItemComplete,
  getAllCheckItems,
};
