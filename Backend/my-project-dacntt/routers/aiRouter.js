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
        const { title, description, date_phrase, time } = action;
        console.log("📅 CREATE_TASK Action Data:", { title, description, date_phrase, time });
        // Find first column of the board
        const column = await Column.findOne({ boardId, isArchived: false }).sort({ position: 1 });

        if (!column) {
          finalReply = "Board này chưa có cột nào để tạo task!";
        } else {
          // Calculate position (number of existing tasks in column + 1)
          const existingTasksCount = await Task.countDocuments({ columnId: column._id });

          // Parse dueDate from date_phrase and time
          let startDate = null;
          let dueDate = null;
          if (date_phrase || time) {
            let baseDate = moment();

            // Parse date phrase
            if (date_phrase) {
              const normalized = date_phrase.toLowerCase().replace(/\s+/g, '');
              if (normalized.includes('homnay') || normalized === 'hom nay') {
                baseDate = moment();
              } else if (normalized.includes('ngaymai') || normalized === 'ngay mai') {
                baseDate = moment().add(1, 'day');
              } else if (normalized.includes('tuannay') || normalized === 'tuan nay') {
                baseDate = moment();
              } else if (normalized.includes('tuansau') || normalized === 'tuan sau') {
                baseDate = moment().add(7, 'days');
              }
            }

            // Parse time if exists, default to 8 AM
            if (time) {
              const [hours, minutes] = time.split(':').map(Number);
              baseDate.hours(hours).minutes(minutes || 0).seconds(0);
            } else {
              // Default to 8 AM if only date provided
              baseDate.hours(8).minutes(0).seconds(0);
            }

            startDate = baseDate.toDate();
            dueDate = moment(startDate).add(30, 'minutes').toDate();
          }

          const newTask = new Task({
            title: title || "New Task",
            description: description || null,
            columnId: column._id,
            boardId,
            userId,
            position: existingTasksCount,
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

          finalReply = `Đã tạo task "${title}" vào cột ${column.title}!`;

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
