const express = require("express");
const axios = require("axios");
const moment = require("moment");
const cleanText = require("../utils/cleanText");
const CheckItem = require("../models/checkItem");
const { getIO } = require("../config/socket");
const Task = require("../models/task");
const Column = require("../models/column");
const assignCheckItemQueue = require("../services/assignCheckItemQueue");
const router = express.Router();
const { requireVip } = require("../middlewares/vipMiddleware");
const auth = require("../middlewares/auth");

router.post("/generate-checklist", auth, requireVip, async (req, res) => {
  try {
    const cleanPayload = {
      title: cleanText(req.body.title),
      description: cleanText(req.body.description),
      users: req.body.users || [],
    };

    const response = await axios.post(
      "http://localhost:8001/run",
      cleanPayload,
      { timeout: 60000 }
    );

    res.json(response.data);
  } catch (err) {
    console.error("AI ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "AI service failed" });
  }
});

// Endpoint to save generated items to CheckItem when user accepts
router.post("/save-checklist", async (req, res) => {
  try {
    const { taskId, title, items } = req.body;

    if (!taskId) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "taskId is required",
      });
    }

    // Kiểm tra task
    const task = await Task.findById(taskId).lean();
    if (!task) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Task không tồn tại",
      });
    }

    // Create check items directly under the task
    let createdItems = [];
    if (Array.isArray(items) && items.length > 0) {
      const itemsToCreate = items.map((it, idx) => ({
        taskId,
        title: it.title || `Item ${idx + 1}`,
        position: typeof it.position === "number" ? it.position : idx,
        assignedTo: it.assignedTo || null,
        dueDate: it.dueDate || null,
      }));

      createdItems = await CheckItem.insertMany(itemsToCreate);

      // Emit socket events so clients in the task room update immediately
      try {
        const io = getIO();
        createdItems.forEach((it) => {
          io.to(taskId.toString()).emit("checkItemAdded", {
            ...it.toObject(),
            taskId,
          });
          io.to(task.boardId.toString()).emit("totalCheckItem", {
            taskId,
          });

          // Kiểm tra item có gán user - nếu có update socket user được gán
          if (it.assignedTo) {
            assignCheckItemQueue.add("assignCheckItemAI", {
              checkItem: it.toObject(),
            });
          }
        });
      } catch (e) {
        console.warn("Socket emit failed:", e.message);
      }
    }

    res.json({ success: true, items: createdItems });
  } catch (err) {
    console.error("SAVE CHECKLIST ERROR:", err);
    res.status(500).json({ error: "Failed to save check items" });
  }
});

// Chatbot Endpoint
router.post("/chat", auth, async (req, res) => {
  try {
    const { message, boardId } = req.body;
    const userId = req.user._id;

    const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8001";
    const aiRes = await axios.post(`${aiUrl}/chat`, {
      message,
      userId,
      boardId
    });

    const responseData = aiRes.data;

    // Check if AI Service returned error or invalid format
    if (!responseData.data) {
      const errorMessage = responseData.message || "Unknown AI Error";
      return res.json({
        data: {
          reply_text: `AI Service Error: ${errorMessage}. (Hãy kiểm tra lại Model)`,
          intent: 'error'
        }
      });
    }

    const { intent, reply_text, action } = responseData.data;
    let finalReply = reply_text;

    // Handle Action (Create Task)
    if (action && action.action === "create_task") {
      if (!boardId) {
        finalReply = "Bạn cần vào một Board cụ thể để tạo task nhé! (Hãy mở Board lên và chat lại)";
      } else {
        const { title, description, date_phrase, time, column_name } = action;
        console.log("📅 CREATE_TASK Action Data:", { title, description, date_phrase, time, column_name });

        // Tìm cột theo tên hoặc lấy cột đầu tiên
        let column;

        if (column_name) {
          // User chỉ định tên cột → tìm theo title (case-insensitive)
          column = await Column.findOne({
            boardId,
            isArchived: false,
            title: new RegExp(`^${column_name}$`, 'i')  // Case-insensitive match
          });

          if (!column) {
            // Không tìm thấy cột với tên đó
            finalReply = `Không tìm thấy cột "${column_name}" trong board này. Vui lòng kiểm tra lại tên cột!`;
            return res.json({ data: { reply_text: finalReply, intent } });
          }
        } else {
          // Không chỉ định → lấy cột đầu tiên
          column = await Column.findOne({ boardId, isArchived: false }).sort({ position: 1 });
        }

        if (!column) {
          finalReply = "Board này chưa có cột nào để tạo task!";
        } else {
          // Calculate position - lấy max position hiện có + 1 để task mới ở cuối
          const tasksInColumn = await Task.find({ columnId: column._id }).sort({ position: -1 }).limit(1);
          const maxPosition = tasksInColumn.length > 0 ? tasksInColumn[0].position : -1;
          const newPosition = maxPosition + 1;

          // Parse dueDate from date_phrase and time
          let startDate = null;
          let dueDate = null;

          if (action.iso_date) {
            // NEW: Prioritize ISO Date from AI (e.g., "2026-01-11")
            let baseDate = moment(action.iso_date, "YYYY-MM-DD");

            if (time) {
              const [hours, minutes] = time.split(':').map(Number);
              baseDate.hours(hours).minutes(minutes || 0).seconds(0);
              startDate = baseDate.toDate();
              dueDate = moment(startDate).add(30, 'minutes').toDate();
            } else {
              // Có ngày nhưng không có giờ -> Set DueDate = cuối ngày
              startDate = null;
              dueDate = baseDate.endOf('day').toDate();
            }

          } else if (date_phrase || time) {
            let baseDate = moment();

            // Parse date phrase (Fallback legacy logic)
            if (date_phrase) {
              const normalized = date_phrase.toLowerCase().replace(/\s+/g, '');
              if (normalized.includes('homnay') || normalized === 'hom nay') {
                baseDate = moment();
              } else if (normalized.includes('ngaymai') || normalized === 'ngay mai') {
                baseDate = moment().add(1, 'day');
              } else if (normalized.includes('ngaykia') || normalized === 'ngay kia' || normalized === 'mot') {
                baseDate = moment().add(2, 'days');
              } else if (normalized.includes('tuannay') || normalized === 'tuan nay') {
                baseDate = moment();
              } else if (normalized.includes('tuansau') || normalized === 'tuan sau') {
                baseDate = moment().add(7, 'days');
              }
            }

            // Parse time if exists
            if (time) {
              const [hours, minutes] = time.split(':').map(Number);
              baseDate.hours(hours).minutes(minutes || 0).seconds(0);
              startDate = baseDate.toDate();
              dueDate = moment(startDate).add(30, 'minutes').toDate();
            } else {
              // Có ngày nhưng không có giờ -> Set DueDate = cuối ngày
              startDate = null;
              dueDate = baseDate.endOf('day').toDate();
            }
          }

          const newTask = new Task({
            title: title || "New Task",
            description: description || null,
            columnId: column._id,
            boardId,
            userId,
            position: newPosition,  // Dùng max position + 1
            startDate: startDate,
            dueDate: dueDate,
            reminderEnabled: startDate ? true : false,
            reminderTime: 5,
          });

          await newTask.save();

          // Update Column taskIds
          await Column.findByIdAndUpdate(column._id, {
            $push: { taskIds: newTask._id }
          });


          finalReply = `Đã tạo task "${title}" vào cột "${column.title}"!` + '\nBạn có muốn chuyển task này sang cột khác không?';

          // Emit Socket
          try {
            const io = getIO();
            io.to(boardId.toString()).emit("taskAdded", newTask);
          } catch (e) {
            console.error("Socket emit error:", e);
          }
        }
      }
    }

    // Handle Action (Move Task)
    if (action && action.action === "move_task") {
      if (!boardId) {
        finalReply = "Bạn cần vào một Board cụ thể để di chuyển task!";
      } else {
        const { task_title, target_column } = action;

        // Tìm task gần nhất của user với title tương ứng
        const recentTask = await Task.findOne({
          boardId,
          userId,
          title: new RegExp(task_title, 'i')
        }).sort({ createdAt: -1 });

        if (!recentTask) {
          finalReply = `Không tìm thấy task "${task_title}"!`;
        } else {
          // Tìm cột đích theo tên
          const targetCol = await Column.findOne({
            boardId,
            isArchived: false,
            title: new RegExp(`^${target_column}$`, 'i')
          });

          if (!targetCol) {
            finalReply = `Không tìm thấy cột "${target_column}" trong board này!`;
          } else if (recentTask.columnId.toString() === targetCol._id.toString()) {
            finalReply = `Task "${task_title}" đã ở trong cột "${target_column}" rồi!`;
          } else {
            // Di chuyển task
            const oldColumnId = recentTask.columnId;

            // Xóa task khỏi cột cũ
            await Column.findByIdAndUpdate(oldColumnId, {
              $pull: { taskIds: recentTask._id }
            });

            // Thêm task vào cột mới
            await Column.findByIdAndUpdate(targetCol._id, {
              $push: { taskIds: recentTask._id }
            });

            // Cập nhật task
            recentTask.columnId = targetCol._id;
            await recentTask.save();

            finalReply = `Đã chuyển task "${task_title}" sang cột "${targetCol.title}"!`;

            // Emit socket events using existing events that Frontend handles
            try {
              const io = getIO();
              // 1. Emit deleteTask (not taskDeleted) to remove from old column UI
              io.to(boardId.toString()).emit("deleteTask", {
                taskId: recentTask._id,
                columnId: oldColumnId
              });

              // 2. Emit taskAdded to add to new column UI
              io.to(boardId.toString()).emit("taskAdded", recentTask);
            } catch (e) {
              console.error("Socket emit error:", e);
            }
          }
        }
      }
    }

    res.json({
      data: {
        reply_text: finalReply,
        intent
      }
    });

  } catch (err) {
    console.error("CHAT ERROR:", err.message);
    res.status(500).json({ error: "Chat processing failed" });
  }
});

module.exports = router;
