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

module.exports = router;
