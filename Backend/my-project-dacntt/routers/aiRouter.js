const express = require("express");
const { spawn } = require("child_process");

const router = express.Router();

router.post("/checklist", async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ message: "Thiếu tiêu đề hoặc mô tả." });
    }

    const py = spawn("C:\\Users\\Lenovo\\AppData\\Local\\Programs\\Python\\Launcher\\py.exe", [
    "./ai_model/checklist_generator_model/generate_checklist.py",
    title,
    description
    ]);

    let output = "";
    py.stdout.on("data", (data) => (output += data.toString()));
    py.stderr.on("data", (err) => console.error("Python Error:", err.toString()));

    py.on("close", () => {
      res.json({ checklist: output.trim() });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi khi sinh checklist." });
  }
});

module.exports = router;
