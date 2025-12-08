const Checklist = require("../models/checklist");
const ChecklistItem = require("../models/checklistItem");
const BoardMember = require("../models/boardMember");
const { getIO } = require("../config/socket");

const addChecklistItem = async (req, res) => {
  try {
    const { checklistId, title, assignedTo, dueDate } = req.body;

    // 1. Validate input
    if (!checklistId || !title?.trim()) {
      return res.status(400).json({
        status: "error",
        message: "checklistId và title là bắt buộc",
      });
    }

    // 2. Kiểm tra checklist
    const checklist = await Checklist.findById(checklistId).populate({
      path: "taskId",
      select: "boardId", // chỉ lấy trường boardId từ Task
    });

    // 2. Nếu có assignedTo (thành viên cần làm nhiệm vụ này)
    if (assignedTo) {
      // 2.1 Kiểm thành viên có tồn tại trong bảng làm việc này không
      const boardMember = await BoardMember.findOne({
        boardId: checklist.taskId.boardId,
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

    // 3. Lấy vị trí cuối cùng để thêm vào
    const checklistItems = await ChecklistItem.find({ checklistId }).sort({
      position: 1,
    });

    const position =
      checklistItems.length == 0
        ? 1000
        : checklistItems[checklistItems.length - 1].position + 1000;

    // 4. Tạo checklist-item
    const checklistItem = await ChecklistItem.create({
      checklistId,
      title,
      assignedTo: assignedTo ? assignedTo : null,
      dueDate: dueDate ? dueDate : null,
      position,
    });

    // 5. Cập nhật socket realtime
    const io = getIO();
    io.to(checklist.taskId.toString()).emit("checklistItemAdded", {
      checklistId,
      _id: checklistItem._id,
      title: checklistItem.title,
      position: checklistItem.position,
      isCompleted: checklistItem.isCompleted,
      assignedTo: checklistItem.assignedTo,
      dueDate: checklistItem.dueDate,
    });

    return res.status(201).json({
      status: "success",
      code: 201,
      message: "Thêm checklist-item thành công",
      data: {
        checklistId,
        _id: checklistItem._id,
        title: checklistItem.title,
        position: checklistItem.position,
        isCompleted: checklistItem.isCompleted,
        assignedTo: checklistItem.assignedTo,
        dueDate: checklistItem.dueDate,
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

const updateTitleChecklistItem = async (req, res) => {
  try {
    const checklistItemId = req.params.id;
    if (!checklistItemId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu checklist-item id",
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
    const checklistItem = await ChecklistItem.findById(
      checklistItemId
    ).populate({
      path: "checklistId",
      select: "taskId",
    });
    if (!checklistItem) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Checklist-item không tồn tại",
      });
    }

    // 2. Cập nhật tiêu đề
    checklistItem.title = title;
    await checklistItem.save();

    // 3. Gửi lên socket
    const io = getIO();
    io.to(checklistItem.checklistId.taskId.toString()).emit(
      "checklistItemUpdated",
      {
        _id: checklistItem._id,
        title: checklistItem.title,
        position: checklistItem.position,
        isCompleted: checklistItem.isCompleted,
        assignedTo: checklistItem.assignedTo,
        dueDate: checklistItem.dueDate,
      }
    );

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Cập nhật tiêu đề checklist-item thành công",
      data: {
        _id: checklistItem._id,
        title: checklistItem.title,
        position: checklistItem.position,
        isCompleted: checklistItem.isCompleted,
        assignedTo: checklistItem.assignedTo,
        dueDate: checklistItem.dueDate,
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

const deleteChecklistItem = async (req, res) => {
  try {
    const checklistItemId = req.params.id;
    if (!checklistItemId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu checklist-item id",
      });
    }

    // 1. Kiểm tra checklist-item
    const checklistItem = await ChecklistItem.findById(
      checklistItemId
    ).populate({
      path: "checklistId",
      select: "taskId",
    });
    if (!checklistItem) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Checklist-item không tồn tại",
      });
    }

    // 2. Xóa checklist-item
    await ChecklistItem.deleteOne({ _id: checklistItemId });

    // 3. Gửi lên socket
    const io = getIO();
    io.to(checklistItem.checklistId.taskId.toString()).emit(
      "checklistItemDeleted",
      {
        _id: checklistItem._id,
      }
    );

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Xóa checklist-item thành công",
      data: {
        _id: checklistItem._id,
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

const toggleChecklistItemComplete = async (req, res) => {
  try {
    const checklistItemId = req.params.id;
    if (!checklistItemId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu checklist-item id",
      });
    }

    // 1. Kiểm tra checklist-item
    const checklistItem = await ChecklistItem.findById(
      checklistItemId
    ).populate({
      path: "checklistId",
      select: "taskId",
    });
    if (!checklistItem) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Checklist-item không tồn tại",
      });
    }

    // 2. Kiểm tra trạng thái hiện tại checklist-item
    const currentStatus = checklistItem.isCompleted;

    // 3. Cập nhật lại checklist-item
    checklistItem.isCompleted = !currentStatus;
    await checklistItem.save();

    // 4. Gửi lên socket realtime
    const io = getIO();
    io.to(checklistItem.checklistId.taskId.toString()).emit(
      "checklistItemCompleted",
      {
        _id: checklistItem._id,
        title: checklistItem.title,
        position: checklistItem.position,
        isCompleted: checklistItem.isCompleted,
        assignedTo: checklistItem.assignedTo,
        dueDate: checklistItem.dueDate,
      }
    );

    return res.status(200).json({
      status: "success",
      code: 200,
      message:
        checklistItem.isCompleted === true
          ? "Đã hoàn thành checklist-item"
          : "Chưa hoàn thành checklist-item",
      data: {
        _id: checklistItem._id,
        title: checklistItem.title,
        position: checklistItem.position,
        isCompleted: checklistItem.isCompleted,
        assignedTo: checklistItem.assignedTo,
        dueDate: checklistItem.dueDate,
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

const moveChecklistItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { destinationChecklist, destinationIndex } = req.body;

    // Validate input
    if (!destinationChecklist || destinationIndex === undefined) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu thông tin destinationChecklist hoặc destinationIndex",
      });
    }

    // Lấy checklist item hiện tại
    const item = await ChecklistItem.findById(id).populate({
      path: "checklistId",
      select: "taskId",
    });
    
    if (!item) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Checklist-item không tồn tại",
      });
    }

    const taskId = item.checklistId.taskId.toString();
    const oldChecklistId = item.checklistId._id.toString();
    const isSameChecklist = oldChecklistId === destinationChecklist;

    // Lấy danh sách items trong checklist đích
    let destItems = await ChecklistItem.find({
      checklistId: destinationChecklist,
    }).sort({ position: 1 });

    // Nếu di chuyển sang checklist khác, kiểm tra checklist tồn tại
    if (!isSameChecklist) {
      const targetChecklist = await Checklist.findById(destinationChecklist);
      if (!targetChecklist) {
        return res.status(404).json({
          status: "error",
          code: 404,
          message: "Checklist đích không tồn tại",
        });
      }
    }

    // Xóa item khỏi checklist cũ nếu di chuyển sang checklist khác
    if (!isSameChecklist) {
      // Cập nhật checklistId trước để item không xuất hiện trong cả 2 checklist
      item.checklistId = destinationChecklist;
      await item.save();
      
      // Lấy lại danh sách items sau khi đã cập nhật checklistId
      destItems = await ChecklistItem.find({
        checklistId: destinationChecklist,
      }).sort({ position: 1 });
      
      // Tìm index mới của item trong danh sách đích
      const currentIndexInDest = destItems.findIndex(
        (i) => i._id.toString() === id
      );
      
      // Nếu item đã có trong destItems (do đã save), xóa nó ra để sắp xếp lại
      if (currentIndexInDest > -1) {
        destItems.splice(currentIndexInDest, 1);
      }
    } else {
      // Nếu cùng checklist, xóa item ra khỏi mảng để sắp xếp lại
      const currentIndex = destItems.findIndex(
        (i) => i._id.toString() === id
      );
      if (currentIndex > -1) {
        destItems.splice(currentIndex, 1);
      }
    }

    // Chèn item vào vị trí mới
    const insertIndex = Math.min(destinationIndex, destItems.length);
    destItems.splice(insertIndex, 0, item);

    // Tính toán position mới
    let newPosition;
    
    if (destItems.length === 1) {
      // Nếu là item duy nhất
      newPosition = 1000;
    } else if (insertIndex === 0) {
      // Nếu chèn vào đầu
      newPosition = destItems[1].position / 2;
    } else if (insertIndex === destItems.length - 1) {
      // Nếu chèn vào cuối
      newPosition = destItems[destItems.length - 2].position + 1000;
    } else {
      // Nếu chèn vào giữa
      const prev = destItems[insertIndex - 1].position;
      const next = destItems[insertIndex + 1].position;
      newPosition = (prev + next) / 2;
    }

    // Cập nhật position cho item
    item.position = newPosition;
    await item.save();

    // Kiểm tra và reindex nếu cần
    let needReindex = false;
    const MIN_GAP = 0.001;

    for (let i = 1; i < destItems.length; i++) {
      if (destItems[i].position - destItems[i - 1].position < MIN_GAP) {
        needReindex = true;
        break;
      }
    }

    if (needReindex) {
      // Reindex tất cả items trong checklist
      const reindexPromises = destItems.map((item, index) => {
        item.position = (index + 1) * 1024;
        return item.save();
      });
      await Promise.all(reindexPromises);
    }

    // Cập nhật checklist cũ nếu di chuyển sang checklist khác
    if (!isSameChecklist) {
      // Lấy danh sách items trong checklist cũ để gửi socket update
      const oldChecklistItems = await ChecklistItem.find({
        checklistId: oldChecklistId,
      }).sort({ position: 1 });

      const io = getIO();
      io.to(taskId).emit("checklistItemsUpdated", {
        checklistId: oldChecklistId,
        items: oldChecklistItems.map((i) => ({
          id: i._id,
          title: i.title,
          position: i.position,
          isCompleted: i.isCompleted,
        })),
        action: "itemMovedOut",
        movedItemId: id,
      });
    }

    // Gửi socket update cho checklist đích
    const io = getIO();
    io.to(taskId).emit("checklistItemsUpdated", {
      checklistId: destinationChecklist,
      items: destItems.map((i) => ({
        id: i._id,
        title: i.title,
        position: i.position,
        isCompleted: i.isCompleted,
      })),
      action: "itemMovedIn",
      movedItemId: id,
      reindexed: needReindex,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Di chuyển checklist-item thành công",
      data: {
        checklistId: destinationChecklist,
        items: destItems.map((i) => ({
          id: i._id,
          title: i.title,
          position: i.position,
          isCompleted: i.isCompleted,
        })),
        reindexed: needReindex,
        movedFrom: isSameChecklist ? null : oldChecklistId,
      },
    });
  } catch (error) {
    console.error("Error moving checklist item:", error);
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

module.exports = {
  addChecklistItem,
  updateTitleChecklistItem,
  deleteChecklistItem,
  toggleChecklistItemComplete,
  moveChecklistItem,
};
