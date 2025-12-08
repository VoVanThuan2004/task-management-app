const Checklist = require("../models/checklist");
const ChecklistItem = require("../models/checklistItem");
const { getIO } = require("../config/socket");
const Task = require("../models/task");

const addChecklist = async (req, res) => {
  try {
    // 1. Xác định dữ liệu đầu vào
    const { taskId, title } = req.body;
    if (!title || !taskId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập tiêu đề, taskId",
      });
    }

    // Kiểm tra task có tồn tại
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // 2. Chọn vị trí thêm checklist
    const checklists = await Checklist.find({ taskId }).sort({
      position: 1,
    });

    let position;
    // Thêm vào vị trí đầu tiên -> nếu danh sách rỗng
    if (checklists.length === 0) {
      position = 1000;
    } else {
      // Thêm vào vị trí cuối cùng -> nếu đã có dữ liệu
      position = checklists[checklists.length - 1].position + 1000;
    }

    // 3. Thêm checklist vào DB
    const newChecklist = await Checklist.create({
      taskId,
      title,
      position,
    });

    // 4. Gửi lên Socket - cập nhật realtime
    const io = getIO();
    io.to(newChecklist.taskId.toString()).emit("checklistAdded", {
      taskId,
      _id: newChecklist._id,
      title,
      position,
    });

    return res.status(201).json({
      status: "success",
      code: 201,
      message: "Tạo check-list việc cần làm thành công",
      data: {
        taskId,
        _id: newChecklist._id,
        title,
        position,
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

const updateTitleChecklist = async (req, res) => {
  try {
    const checklistId = req.params.id;
    if (!checklistId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu tham số checklistId",
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

    // 1. Kiểm tra check-list
    const checklist = await Checklist.findById(checklistId);
    if (!checklist) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Checklist không tồn tại",
      });
    }

    // 2. Cập nhật tiêu đề
    checklist.title = title;
    await checklist.save();

    // 3. Cập nhật socket realtime
    const io = getIO();
    io.to(checklist.taskId.toString()).emit("checklistUpdated", {
      taskId: checklist.taskId,
      _id: checklist._id,
      title: checklist.title,
      position: checklist.position,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Cập nhật tiêu đề thành công",
      data: {
        taskId: checklist.taskId,
        _id: checklist._id,
        title: checklist.title,
        position: checklist.position,
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

const moveChecklist = async (req, res) => {
  try {
    const checklist = await Checklist.findById(req.params.id);
    if (!checklist) {
      return res.status(404).json({
        status: "error",
        message: "Checklist không tồn tại",
      });
    }

    const { destinationIndex } = req.body;
    if (destinationIndex == null || destinationIndex < 0) {
      return res.status(400).json({
        status: "error",
        message: "destinationIndex không hợp lệ",
      });
    }

    const taskId = checklist.taskId;

    // Lấy tất cả checklist của task (bao gồm cả cái đang move), sắp xếp đúng thứ tự hiện tại
    let siblings = await Checklist.find({ taskId }).sort({ position: 1 });

    // Tìm index hiện tại của checklist đang move
    const currentIndex = siblings.findIndex(
      (c) => c._id.toString() === checklist._id.toString()
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
    siblings.splice(destinationIndex, 0, checklist);

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
    checklist.position = newPosition;
    await checklist.save();

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
      finalList = await Checklist.find({ taskId }).sort({ position: 1 });
    }

    // Emit socket – frontend chỉ cần cập nhật lại danh sách
    const io = getIO();
    io.to(taskId.toString()).emit("checklistsReordered", {
      taskId,
      checklists: finalList.map((c) => ({
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
        movedChecklistId: checklist._id,
        newPosition: checklist.position,
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

const deleteChecklist = async (req, res) => {
  try {
    const checklistId = req.params.id;
    if (!checklistId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Thiếu tham số checklistId",
      });
    }

    // 1. Kiểm tra check-list
    const checklist = await Checklist.findById(checklistId);
    if (!checklist) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Checklist không tồn tại",
      });
    }

    // 2. Xóa check-list
    await Checklist.deleteOne({ _id: checklist._id });
    await ChecklistItem.deleteMany({ checklistId: checklistId });

    // 3. Cập nhật socket realtime
    const io = getIO();
    io.to(checklist.taskId.toString()).emit("checklistDeleted", {
      _id: checklist._id,
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Xóa check-list thành công",
      data: {
        _id: checklist._id,
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
  addChecklist,
  updateTitleChecklist,
  moveChecklist,
  deleteChecklist,
};
