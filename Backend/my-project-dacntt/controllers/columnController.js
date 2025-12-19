const Column = require("../models/column");
const Board = require("../models/board");
const Task = require("../models/task");
const TaskAssignee = require("../models/taskAssignee");
const BoardMember = require("../models/boardMember");
const { ObjectId } = require("mongodb");
const ActivityLog = require("../models/activityLog");
const { getIO } = require("../config/socket");

const addColumn = async (req, res) => {
  const { boardId, title } = req.body;
  if (!boardId || !title) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Vui lòng nhập thông tin mã bảng làm việc, tiêu đề",
    });
  }

  try {
    // 1. Kiểm tra board có tồn tại
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }

    // 2. Lấy danh sách columns đang làm việc
    const columns = await Column.find({ boardId, isArchived: false }).sort({
      position: 1,
    });

    // 3. Thêm vào vị trí cuối cùng -> lấy vị trí cuối cùng hiện tại + 1000
    let position;
    if (columns.length === 0) {
      // thêm vào vị trí đầu
      position = 1000;
    } else {
      position = columns[columns.length - 1].position + 1000;
    }

    // 4. Tạo column
    const column = await Column.create({
      boardId,
      title,
      position,
    });

    // 4. Gửi lên Socket
    const io = getIO();
    io.to(boardId).emit("columnAdded", {
      _id: column._id,
      boardId,
      title,
      position: column.position,
      createdAt: column.createdAt,
    });

    // 5. Gửi thông báo qua Socket

    return res.status(201).json({
      status: "success",
      code: 201,
      message: "Tạo column thành công",
      data: {
        _id: column._id,
        boardId: column.boardId,
        title,
        position: column.position,
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

const updateTitleColumn = async (req, res) => {
  const columnId = req.params.columnId;
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Vui lòng nhập thông tin tiêu đề",
    });
  }

  try {
    // 1. Kiểm tra column có tồn tại
    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Column không tồn tại",
      });
    }

    // 2. Cập nhật title
    column.title = title;
    await column.save();

    // 3. Gửi lên Socket
    const io = getIO();
    io.to(column.boardId.toString()).emit("columnUpdated", {
      _id: column._id,
      boardId: column.boardId,
      title,
      position: column.position,
      createdAt: column.createdAt,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Cập nhật tiêu đề cho column thành công",
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

const moveColumn = async (req, res) => {
  try {
    const { destinationIndex } = req.body;
    const columnId = req.params.columnId;

    const column = await Column.findById(columnId);
    if (!column)
      return res.status(404).json({
        status: "error",
        message: "Column không tồn tại",
      });

    const boardId = column.boardId;

    // Lấy tất cả column trong board hiện tại, sắp xếp theo position
    let allColumns = await Column.find({ boardId, isArchived: false }).sort({
      position: 1,
    });

    // Loại bỏ column đang di chuyển ra khỏi mảng
    allColumns = allColumns.filter((c) => c._id.toString() !== columnId);

    if (destinationIndex < 0 || destinationIndex > allColumns.length)
      return res.status(400).json({
        status: "error",
        message: "destinationIndex không hợp lệ",
      });

    let newPosition;

    // Nếu board trống (không có column nào)
    if (allColumns.length === 0) {
      newPosition = 1000;
    }
    // Nếu kéo lên đầu danh sách
    else if (destinationIndex === 0) {
      newPosition = allColumns[0].position / 2;
    }
    // Nếu kéo xuống cuối danh sách
    else if (destinationIndex === allColumns.length) {
      newPosition = allColumns[allColumns.length - 1].position + 1000;
    } else {
      // Kéo vào giữa
      const prev = allColumns[destinationIndex - 1];
      const next = allColumns[destinationIndex];
      newPosition = (prev.position + next.position) / 2;
    }

    column.position = newPosition;
    await column.save();

    // Kiểm tra spacing nhỏ quá
    const minSpacing = 1; // nếu hai cột gần nhau < 1 đơn vị thì coi là quá nhỏ
    let needReindex = false;

    for (let i = 1; i < allColumns.length; i++) {
      const diff = allColumns[i].position - allColumns[i - 1].position;
      if (diff < minSpacing) {
        needReindex = true;
        break;
      }
    }

    // Reset lại position nếu spacing quá nhỏ
    if (needReindex) {
      let spacing = 1000;
      for (let i = 0; i < allColumns.length; i++) {
        allColumns[i].position = (i + 1) * spacing;
        await allColumns[i].save();
      }
      console.log("Re-index lại position cho columns trong board:", boardId);
    }

    // Trả về dữ liệu chi tiết
    const updatedColumns = await Column.find({
      boardId,
      isArchived: false,
    }).sort({ position: 1 });

    // Gửi lên Socket
    const io = getIO();
    io.to(column.boardId.toString()).emit("columnMoved", {
      boardId: column.boardId,
      movedColumn: {
        _id: column._id,
        title: column.title,
        newPosition: column.position,
      },
      columns: updatedColumns.map((c) => ({
        id: c._id,
        title: c.title,
        position: c.position,
      })),
      reindexed: needReindex,
    });

    return res.status(200).json({
      status: "success",
      message: "Cập nhật vị trí column thành công",
      data: {
        columnId: column._id,
        newPosition: column.position,
        boardId,
        totalColumns: updatedColumns.length,
        columns: updatedColumns.map((c) => ({
          id: c._id,
          title: c.title,
          position: c.position,
        })),
        reindexed: needReindex,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

// Lấy danh sách columns
const getAllColumns = async (req, res) => {
  try {
    const boardId = req.params.boardId;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }

    // 1. Query lấy danh sách columns -> task thuộc column -> comment thuộc column -> checklist thuộc column
    const columns = await Column.aggregate([
      {
        $match: {
          boardId: new ObjectId(boardId),
          isArchived: false,
        },
      },

      // ──────────────────────────────
      // LẤY TẤT CẢ TASK TRONG COLUMN
      // ──────────────────────────────
      {
        $lookup: {
          from: "tasks",
          localField: "_id",
          foreignField: "columnId",
          as: "tasks",
          pipeline: [
            // 1. CHECKITEMS
            {
              $lookup: {
                from: "checkitems", // collection name (mongoose tự thêm s)
                localField: "_id",
                foreignField: "taskId",
                as: "checkItems",
              },
            },

            // 2. TÍNH TỔNG VÀ HOÀN THÀNH
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

            // 3. COMMENTS
            {
              $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "taskId",
                as: "comments",
              },
            },

            // 4. ATTACHMENTS
            {
              $lookup: {
                from: "attachments",
                localField: "_id",
                foreignField: "taskId",
                as: "attachments",
              },
            },

            // 5. LABELS
            {
              $lookup: {
                from: "tasklabels",
                localField: "_id",
                foreignField: "taskId",
                as: "tasklabels",
                pipeline: [
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
                ],
              },
            },

            // Task-assignee
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
                      as: "users",
                    },
                  },
                  { $unwind: "$users" },
                  {
                    $project: {
                      _id: 0,
                      userId: "$users._id",
                      avatar: "$users.avatar",
                      fullName: "$user.fullName",
                    },
                  },
                ],
              },
            },

            // 6. TỔNG HỢP FIELD ĐỂ FRONTEND KHÔNG PHẢI SỬA GÌ CẢ
            {
              $addFields: {
                totalCheckItems: "$totalCheckItems",
                totalCheckItemsCompleted: "$completedCheckItems",
                totalComments: { $size: "$comments" },
                totalAttachments: { $size: "$attachments" },
              },
            },

            // 7. CHỈ TRẢ VỀ CÁC FIELD CẦN THIẾT
            {
              $project: {
                _id: 1,
                title: 1,
                position: 1,
                isCompleted: 1,
                startDate: 1,
                dueDate: 1,
                status: 1,

                // Checklist fields (tương thích 100% với code cũ)
                totalCheckItems: 1,
                totalCheckItemsCompleted: 1,

                totalComments: 1,
                totalAttachments: 1,
                taskLabels: "$tasklabels",
                taskAssignees: "$taskassignees",
              },
            },

            { $sort: { position: 1 } },
          ],
        },
      },

      { $sort: { position: 1 } },
    ]);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách columns trong bảng làm việc thành công",
      data: columns,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const getAllColumnsAndFilter = async (req, res) => {
  try {
    const boardId = req.params.boardId;
    if (!boardId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu boardId",
      });
    }
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }

    const {
      search,
      assignees,
      minTask,
      taskStatus,
      deadline,
      labels,
      activityLog,
    } = req.query;

    const taskFilterConditions = [];

    // 1. Lọc theo tiêu chí search
    let columnTitleMatch = {};
    let taskTitleMatch = {};
    if (search) {
      const regex = { $regex: search, $options: "i" }; // Không phân biệt chữ hoa - thường

      columnTitleMatch = { title: regex };

      // taskFilterConditions.push({
      //   title: regex,
      // });
    }

    // 2. Lọc theo assignees
    let assigneesCondition = {};
    if (assignees) {
      const assigneeIds = assignees
        .split(",")
        .map((id) => new ObjectId(id.trim()));

      if (assignees === "none") {
        assigneesCondition = {
          $or: [{ "taskassignees.userId": null }],
        };
      } else {
        assigneesCondition = {
          "taskassignees.userId": { $in: assigneeIds },
        };
      }

      taskFilterConditions.push(assigneesCondition);
    }

    // 3. Lọc theo deadline
    let deadlineCondition = {};
    if (deadline) {
      const now = new Date();
      switch (deadline) {
        case "overdue":
          deadlineCondition = { status: "Quá hạn" };
          break;
        case "near":
          deadlineCondition = { status: "Gần tới hạn" };
          break;
        case "tommorow":
          const tommorow = new Date(now);
          tommorow.setDate(now.getDate() + 1);
          deadlineCondition = {
            dueDate: { $gte: now, $lt: tommorow },
          };
          break;
        case "nextWeek":
          const nextWeek = new Date(now);
          nextWeek.setDate(now.getDate() + 7);
          deadlineCondition = {
            dueDate: { $gte: now, $lt: nextWeek },
          };
          break;
        case "nextMonth":
          const nextMonth = new Date(now);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          deadlineCondition = {
            dueDate: { $gte: now, $lt: nextMonth },
          };
          break;
        case "noDeadline":
          deadlineCondition = {
            dueDate: null,
          };
      }
      taskFilterConditions.push(deadlineCondition);
    }

    // 4. Lọc theo labels
    let labelsCondition = {};
    if (labels) {
      if (labels === "none") {
        labelsCondition = {
          $or: [{ tasklabels: { $size: 0 } }],
        };
      } else {
        const labelIds = labels.split(",").map((id) => new ObjectId(id.trim()));
        labelsCondition = {
          "tasklabels.labelId": { $in: labelIds },
        };
      }
      taskFilterConditions.push(labelsCondition);
    }

    // 5. Lọc theo trạng thái task
    let taskStatusCondition = {};
    if (taskStatus) {
      taskStatusCondition = {
        isCompleted: taskStatus === "completed",
      };

      taskFilterConditions.push(taskStatusCondition);
    }

    // 6. Lọc theo activityLog
    let activityLogCondition = {};
    if (activityLog) {
      const now = new Date();
      let fromDate = new Date();

      switch (activityLog) {
        case "lastWeek":
          fromDate.setDate(now.getDate() - 7);
          break;
        case "last2Week":
          fromDate.setDate(now.getDate() - 14);
          break;
        case "last3Week":
          fromDate.setDate(now.getDate() - 21);
          break;
        case "thisMonth":
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "noActivity":
          activityLogCondition = {
            activitylogs: { $size: 0 },
          };
          taskFilterConditions.push(activityLogCondition);
          break;
        default:
          break;
      }

      if (activityLog !== "noActivity") {
        activityLogCondition = {
          "activitylogs.createdAt": { $gte: fromDate },
        };
      }
    }

    const taskMatchStage =
      taskFilterConditions.length > 0
        ? [
            {
              $match: {
                $and: taskFilterConditions,
              },
            },
          ]
        : [];

    const columns = await Column.aggregate([
      {
        $match: {
          boardId: new ObjectId(boardId),
          isArchived: false,
          ...columnTitleMatch,
        },
      },

      // ──────────────────────────────
      // LẤY TẤT CẢ TASK TRONG COLUMN
      // ──────────────────────────────
      {
        $lookup: {
          from: "tasks",
          localField: "_id",
          foreignField: "columnId",
          as: "tasks",
          pipeline: [
            // Labels
            {
              $lookup: {
                from: "tasklabels",
                localField: "_id",
                foreignField: "taskId",
                as: "tasklabels",
                pipeline: [
                  {
                    $lookup: {
                      from: "labels",
                      localField: "labelId",
                      foreignField: "_id",
                      as: "labelDetails",
                    },
                  },
                  {
                    $unwind: {
                      path: "$labelDetails",
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      labelId: "$labelId",
                      title: "$labelDetails.title",
                      color: "$labelDetails.color",
                    },
                  },
                ],
              },
            },

            // Task-assignee
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

            // Activity Log
            {
              $lookup: {
                from: "activitylogs",
                localField: "_id",
                foreignField: "taskId",
                as: "activitylogs",
              },
            },

            // ==== Filter theo điều kiện nếu có ====
            ...taskMatchStage,

            // 1. CHECKITEMS
            {
              $lookup: {
                from: "checkitems", // collection name (mongoose tự thêm s)
                localField: "_id",
                foreignField: "taskId",
                as: "checkItems",
              },
            },

            // 2. TÍNH TỔNG VÀ HOÀN THÀNH
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

            // 3. COMMENTS
            {
              $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "taskId",
                as: "comments",
              },
            },

            // 4. ATTACHMENTS
            {
              $lookup: {
                from: "attachments",
                localField: "_id",
                foreignField: "taskId",
                as: "attachments",
              },
            },

            // 6. TỔNG HỢP FIELD ĐỂ FRONTEND KHÔNG PHẢI SỬA GÌ CẢ
            {
              $addFields: {
                totalCheckItems: "$totalCheckItems",
                totalCheckItemsCompleted: "$completedCheckItems",
                totalComments: { $size: "$comments" },
                totalAttachments: { $size: "$attachments" },
              },
            },

            // 7. CHỈ TRẢ VỀ CÁC FIELD CẦN THIẾT
            {
              $project: {
                _id: 1,
                title: 1,
                position: 1,
                isCompleted: 1,
                startDate: 1,
                dueDate: 1,
                status: 1,

                // Checklist fields (tương thích 100% với code cũ)
                totalCheckItems: 1,
                totalCheckItemsCompleted: 1,

                totalComments: 1,
                totalAttachments: 1,
                taskLabels: "$tasklabels",
                taskAssignees: "$taskassignees",
              },
            },

            { $sort: { position: 1 } },
          ],
        },
      },

      ...(minTask
        ? [
            {
              $match: {
                $expr: {
                  $gte: [{ $size: "$tasks" }, parseInt(minTask)],
                },
              },
            },
          ]
        : []),

      { $sort: { position: 1 } },
    ]);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Lấy danh sách các columns trong bảng làm việc",
      data: columns,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error,
    });
  }
};

// Di chuyển đến board khác
const moveToBoard = async (req, res) => {
  try {
    const columnId = req.params.columnId;
    const { boardId, destinationIndex } = req.body;
    if (!boardId || !destinationIndex) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng chọn bảng làm việc, vị trí trong bảng làm việc",
      });
    }

    // 1. Kiểm tra column có tồn tại
    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Column không tồn tại",
      });
    }

    // 2. Kiểm tra board mới và board cũ phải khác nhau
    const oldBoardId = column.boardId;
    const newBoardId = boardId;
    if (oldBoardId === newBoardId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Column đã thuộc bảng làm việc hiện tại",
      });
    }

    // Kiểm tra board cũ và board mới có hợp lệ
    const [oldBoard, newBoard] = await Promise.all([
      Board.findById(oldBoardId),
      Board.findById(newBoardId),
    ]);

    if (!oldBoard || !newBoard) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Bảng làm việc không tồn tại",
      });
    }

    // 3. Chọn vị trí trong board mới
    const allColumns = await Column.find({ boardId: newBoardId }).sort({
      position: 1,
    });

    let newPosition;

    if (allColumns.length === 0) {
      newPosition = 1000;
    } else if (destinationIndex === 1) {
      // đầu danh sách
      newPosition = allColumns[0].position / 2;
    } else if (destinationIndex > allColumns.length) {
      // cuối danh sách
      newPosition = allColumns[allColumns.length - 1].position + 1000;
    } else {
      // giữa
      const prev = allColumns[destinationIndex - 1];
      const next = allColumns[destinationIndex];
      newPosition = (prev.position + next.position) / 2;
    }

    // 4. Cập nhật Column với vị trí mới + boardId mới
    column.boardId = newBoardId;
    column.position = newPosition;
    await column.save();

    // 5️. Lấy toàn bộ task trong column
    const tasks = await Task.find({ columnId: column._id });
    const taskIds = tasks.map((t) => t._id);

    // 6️. Cập nhật boardId của tất cả task sang board mới
    await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: { boardId: newBoardId } }
    );

    // 7. Lấy danh sách member hợp lệ trong board mới
    const boardMembers = await BoardMember.find({ boardId: newBoardId });
    const validUserIds = boardMembers.map((m) => m.userId.toString());

    // 8. Xóa task_assignees không còn thuộc board mới
    await TaskAssignee.deleteMany({
      taskId: { $in: taskIds },
      userId: { $nin: validUserIds },
    });

    // 9. Ghi log gửi thông báo
    await ActivityLog.create({
      userId: req.user.userId,
      boardId: newBoardId,
      action: "move_column_to_board",
      description: `Column "${column.title}" được di chuyển từ board ${oldBoard.title} sang ${newBoard.title}`,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Di chuyển column sang board khác thành công",
      data: {
        column: {
          id: column._id,
          title: column.title,
          position: column.position,
          boardId: column.boardId,
        },
        oldBoardId,
        newBoardId,
        taskCount: tasks.length,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const deleteColumn = async (req, res) => {
  try {
    const columnId = req.params.columnId;

    // 1. Kiểm tra Column
    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Column không tồn tại",
      });
    }

    // 2. Xóa column - chuyển isArchived (true)
    column.isArchived = true;
    await column.save();

    // 3. Gửi socket cập nhật data
    const io = getIO();
    io.to(column.boardId.toString()).emit("columnDeleted", {
      _id: column._id,
      boardId: column.boardId,
      title: column.title,
      position: column.position,
      createdAt: column.createdAt,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Xóa column thành công",
      data: {
        boardId: column.boardId,
        columnId: columnId,
        title: column.title,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

module.exports = {
  addColumn,
  updateTitleColumn,
  moveColumn,
  getAllColumns,
  moveToBoard,
  deleteColumn,
  getAllColumnsAndFilter,
};
