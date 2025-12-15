// const express = require("express");
// const axios = require("axios");
// const router = express.Router();

// router.post("/generate-checklist", async (req, res) => {
//   try {
//     const response = await axios.post(
//       "http://localhost:8001/run", // vì Node chạy ngoài Docker
//       req.body,
//       { timeout: 60000 }
//     );
//     res.json(response.data);
//   } catch (err) {
//     console.error("AI ERROR:", err.message);
//     res.status(500).json({ error: "AI service failed" });
//   }
// });

// module.exports = router;

// clean text 

// const express = require("express");
// const axios = require("axios");
// const router = express.Router();
// const cleanText = require("../utils/cleanText");

// router.post("/generate-checklist", async (req, res) => {
//   try {
//     const cleanPayload = {
//       title: cleanText(req.body.title),
//       description: cleanText(req.body.description),
//       users: req.body.users
//     };

//     const response = await axios.post(
//       "http://localhost:8001/run",
//       cleanPayload,
//       { timeout: 60000 }
//     );

//     res.json(response.data);
//   } catch (err) {
//     console.error("AI ERROR:", err.response?.data || err.message);
//     res.status(500).json({ error: "AI service failed" });
//   }
// });

// module.exports = router;

const express = require("express");
const axios = require("axios");
const cleanText = require("../utils/cleanText");

const router = express.Router();

router.post("/generate-checklist", async (req, res) => {
  try {
    const cleanPayload = {
      title: cleanText(req.body.title),
      description: cleanText(req.body.description),
      users: req.body.users || []
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
    const CheckItem = require("../models/checkItem");
    const { getIO } = require("../config/socket");

    const { taskId, title, items } = req.body;

    if (!taskId) {
      return res.status(400).json({ error: "taskId is required" });
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
