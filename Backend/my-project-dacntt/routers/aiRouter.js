const express = require("express");
const axios = require("axios");
const cleanText = require("../utils/cleanText");
const CheckItem = require("../models/checkItem");
const { getIO } = require("../config/socket");
const Task = require("../models/task");
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

module.exports = router;
