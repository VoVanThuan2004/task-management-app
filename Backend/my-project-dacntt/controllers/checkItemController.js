const CheckItem = require("../models/checkItem");
const Task = require("../models/task");
const BoardMember = require("../models/boardMember");
const { getIO } = require("../config/socket");
const createActivityLogTask = require("../utils/createActivityLogTask");
const User = require("../models/user");
const checkItemReminderQueue = require("../services/checkItemReminderQueue");
const { sendAssignCheckItemEmail } = require("../config/mailConfig");
const { ObjectId } = require("mongodb");
const Board = require("../models/board");

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
      Task.findById(taskId),
      User.findById(userId),
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
      CheckItem.findById(checkItemId).populate({
        path: "taskId",
        select: "boardId",
      }),

      User.findById(userId).select("fullName avatar"),
    ]);
    if (!checkItem) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "CheckItem không tồn tại",
      });
    }

    // 2. Kiểm tra trạng thái hiện tại checklist-item
    // const currentStatus = checkItem.isCompleted;

    // 3. Cập nhật lại checklist-item
    checkItem.isCompleted = !checkItem.isCompleted;
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

    // 2. Aggregate duy nhất: lấy danh sách + đếm hoàn thành
    const result = await CheckItem.aggregate([
      // Lọc theo taskId
      {
        $match: {
          taskId: new ObjectId(taskId),
        },
      },

      // Join với users để lấy thông tin người được gán (chỉ 1 user)
      {
        $lookup: {
          from: "users",
          localField: "assignedTo",
          foreignField: "_id",
          as: "userInfo",
        },
      },

      // Giữ lại check-item không có assignedTo (preserveNullAndEmptyArrays: true)
      {
        $unwind: {
          path: "$userInfo",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Sắp xếp theo position tăng dần
      { $sort: { position: 1 } },

      // Nhóm để tính tổng và đẩy danh sách
      {
        $group: {
          _id: null,
          totalCheckItemsCompleted: {
            $sum: { $cond: [{ $eq: ["$isCompleted", true] }, 1, 0] },
          },
          totalCheckItems: { $sum: 1 },
          checkItems: {
            $push: {
              _id: "$_id",
              taskId: "$taskId",
              title: "$title",
              position: "$position",
              isCompleted: "$isCompleted",
              assignedTo: "$assignedTo",
              fullName: { $ifNull: ["$userInfo.fullName", null] },
              avatar: { $ifNull: ["$userInfo.avatar", null] },
              startDate: "$startDate",
              dueDate: "$dueDate",
              status: "$status",
            },
          },
        },
      },

      // Format output cuối cùng
      {
        $project: {
          _id: 0,
          totalCheckItemsCompleted: 1,
          totalCheckItems: 1,
          checkItems: 1,
        },
      },
    ]);

    // Nếu không có check-item nào → result = []
    const data =
      result.length > 0
        ? result[0]
        : {
            totalCheckItemsCompleted: 0,
            totalCheckItems: 0,
            checkItems: [],
          };

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách check-items thành công",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error,
    });
  }
};

const updateDeadlineCheckItem = async (req, res) => {
  try {
    const checkItemId = req.params.id;
    if (!checkItemId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu check-item id",
      });
    }

    const { startDate, dueDate } = req.body;

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

    // 1. Kiểm tra check-item
    const checkItem = await CheckItem.findById(checkItemId);
    if (!checkItem) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Việc cần làm không tồn tại",
      });
    }

    // 2. Cập nhật check-item
    if (parsedStartDate !== undefined) {
      checkItem.startDate = parsedStartDate;
    }
    if (parsedDueDate !== undefined) {
      checkItem.dueDate = parsedDueDate;
    }

    if (parsedStartDate === undefined) {
      checkItem.startDate = null;
    }

    checkItem.status = null;
    await checkItem.save();

    // 3. Tạo job remindQueue
    // Xóa job cũ nếu có
    const jobIds = [
      `${checkItem._id}-reminder`,
      `${checkItem._id}-nearDeadline`,
      `${checkItem._id}-overdue`,
    ];
    for (const id of jobIds) {
      const oldJob = await checkItemReminderQueue.getJob(id);
      if (oldJob) {
        await oldJob.remove();
        console.log(`Đã xóa job cũ: ${id}`);
      }
    }

    // 3.1 Thông báo trạng thái gần tới hạn
    // Job: Gần tới hạn (10 phút trước)
    const now = Date.now();
    const dueTime = checkItem.dueDate.getTime();

    const nearDeadlineDelay = dueTime - now - 5 * 60 * 1000; // nhắc nhở thông báo trước 5 phút
    if (nearDeadlineDelay > 30000) {
      // chỉ add nếu còn > 30 giây
      await checkItemReminderQueue.add(
        "markNearDeadline",
        { checkItemId: checkItem._id, taskId: checkItem.taskId },
        {
          delay: nearDeadlineDelay,
          jobId: `${checkItem._id}-nearDeadline`,
        }
      );
      console.log(`⏳ Đã lên lịch markNearDeadline sau ${nearDeadlineDelay}ms`);
    }

    // Job: Quá hạn
    const overdueDelay = Math.max(dueTime - now, 0);
    await checkItemReminderQueue.add(
      "markOverdue",
      { checkItemId: checkItem._id, taskId: checkItem.taskId },
      {
        delay: overdueDelay,
        jobId: `${checkItem._id}-overdue`,
      }
    );

    // 4. Cập nhật socket
    const io = getIO();
    io.to(checkItem.taskId.toString()).emit("deadlineCheckItem", {
      checkItem,
    });
    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Cập nhật deadline cho việc cần làm thành công",
      data: checkItem,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error,
    });
  }
};

const assignCheckItem = async (req, res) => {
  try {
    const checkItemId = req.params.id;
    if (!checkItemId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu check-item id",
      });
    }

    const { userId } = req.body;

    // 1. Kiểm tra checkItem, user
    const [checkItem, user] = await Promise.all([
      CheckItem.findById(checkItemId),
      User.findById(userId).lean(),
    ]);
    if (!checkItem) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "CheckItem không tồn tại",
      });
    }
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Người dùng không tồn tại",
      });
    }

    const task = await Task.findById(checkItem.taskId)
      .populate({
        path: "boardId",
        select: "title",
      })
      .lean();

    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 2. Gán người dùng
    checkItem.assignedTo = userId;
    await checkItem.save();

    // 3. Cập nhật socket
    const io = getIO();
    io.to(checkItem.taskId.toString()).emit("assingedToCheckItem", {
      checkItem,
      userId: userId,
      avatar: user.avatar,
      fullName: user.fullName,
    });

    // 4. Gửi email thông báo
    const fullName = req.user.fullName;
    await sendAssignCheckItemEmail(
      user.email,
      fullName,
      task.boardId.title,
      task.title,
      checkItem.title
    );

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Gán người dùng cho việc cần làm thành công",
      data: {
        checkItem,
        userId: userId,
        avatar: user.avatar,
        fullName: user.fullName,
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

const getMembersForAssign = async (req, res) => {
  try {
    const { boardId, checkItemId } = req.params;

    if (!boardId || !checkItemId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "boardId và checkItemId là bắt buộc",
      });
    }

    // Kiểm tra tồn tại board và checkItem (tùy chọn, nhưng nên giữ để bảo mật)
    const [board, checkItem] = await Promise.all([
      Board.findById(boardId),
      CheckItem.findById(checkItemId).lean(), // .lean() để lấy plain object nhanh hơn
    ]);

    if (!board) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }

    if (!checkItem) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "CheckItem không tồn tại",
      });
    }

    // Lấy userId hiện đang được giao (nếu có)
    const assignedUserId = checkItem.assignedTo?._id
      ? checkItem.assignedTo.toString()
      : null;

    // Aggregate lấy thành viên board + skills + đánh dấu assignStatus
    const boardMembers = await BoardMember.aggregate([
      {
        $match: { boardId: new ObjectId(boardId) },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      // Lấy skills của user trong board này
      {
        $lookup: {
          from: "userskills",
          let: { userId: "$userId", boardId: new ObjectId(boardId) },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$userId"] },
                    { $eq: ["$boardId", "$$boardId"] },
                  ],
                },
              },
            },
            { $project: { _id: 1, skill: 1 } },
          ],
          as: "userSkills",
        },
      },

      // Project dữ liệu trả về
      {
        $project: {
          _id: "$user._id",
          email: "$user.email",
          fullName: "$user.fullName",
          avatar: "$user.avatar",
          skills: {
            $map: {
              input: "$userSkills",
              as: "us",
              in: { _id: "$$us._id", skill: "$$us.skill" },
            },
          },
          assignStatus: {
            $cond: {
              if: { $eq: [{ $toString: "$user._id" }, assignedUserId] },
              then: true,
              else: false,
            },
          },
        },
      },

      // Sắp xếp: người đang được giao lên đầu
      {
        $sort: { assignStatus: -1, fullName: 1 },
      },
    ]);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách thành viên để giao nhiệm vụ thành công",
      data: boardMembers,
    });
  } catch (error) {
    console.error("Lỗi getMembersForAssign:", error);
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống",
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
  updateDeadlineCheckItem,
  assignCheckItem,
  getMembersForAssign,
};
