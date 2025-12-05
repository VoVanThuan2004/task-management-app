// router for checklist generation using a Python script
// const express = require("express");
// const { spawn } = require("child_process");

// const router = express.Router();

// router.post("/checklist", async (req, res) => {
//   try {
//     const { title, description } = req.body;
//     if (!title || !description) {
//       return res.status(400).json({ message: "Thiếu tiêu đề hoặc mô tả." });
//     }

//     const py = spawn("python", [
//     "./ai_model/checklist_generator_model/generate_checklist.py",
//     title,
//     description
//     ]);
 
//     let output = "";
//     py.stdout.on("data", (data) => (output += data.toString()));
//     py.stderr.on("data", (err) => console.error("Python Error:", err.toString()));

//     py.on("close", () => {
//       res.json({ checklist: output.trim() });
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Lỗi khi sinh checklist." });
//   }
// });

// module.exports = router;
 
// router for auto-assigning tasks using a Python script
// router for auto-assigning tasks using a Python script
const express = require("express");
const { spawn } = require("child_process");
const path = require("path");

const router = express.Router();

// 🔧 ÉP Node.js DÙNG PYTHON TRONG .venv
const PYTHON_PATH = path.join(__dirname, "../.venv/Scripts/python.exe");

// 🧠 PATH MODEL (checklist + skill)
const checklistModelPath = path.join(__dirname, "../ai_model/checklist_generator_model/generate_checklist.py");
const skillModelPath = path.join(__dirname, "../ai_model/suggest_skill_model/auto_assign.py");

// ================================
//  POST /api/ai/auto-assign
// ================================
router.post("/auto-assign", async (req, res) => {
  try {
    const { title, description, team } = req.body;

    if (!title || !description || !Array.isArray(team) || team.length === 0) {
      return res.status(400).json({ message: "Thiếu thông tin task hoặc danh sách team." });
    }

    // 1️⃣ Gọi Python model T5 để sinh checklist
    const checklistPy = spawn(PYTHON_PATH, [checklistModelPath, title, description]);
    let checklistOutput = "";

    checklistPy.stdout.on("data", (data) => (checklistOutput += data.toString()));
    checklistPy.stderr.on("data", (err) =>
      console.error("Checklist model error:", err.toString())
    );

    checklistPy.on("close", () => {
      // Tách checklist thành từng mục riêng
      const checklistItems = checklistOutput
        .replace(/[\r\n]+/g, ";")
        .split(";")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      if (checklistItems.length === 0) {
        return res.status(500).json({ message: "Không sinh được checklist." });
      }

      console.log("✅ Checklist sinh ra:", checklistItems);

      // 2️⃣ Gọi Python model SBERT để gợi ý skill cho từng checklist
      const skillPy = spawn(PYTHON_PATH, [
        skillModelPath,
        JSON.stringify(checklistItems),
        JSON.stringify(team),
      ]);

      let skillOutput = "";
      skillPy.stdout.on("data", (data) => (skillOutput += data.toString()));
      skillPy.stderr.on("data", (err) =>
        console.error("Skill model error:", err.toString())
      );

      skillPy.on("close", () => {
        try {
          const skillResults = JSON.parse(skillOutput);
          if (!Array.isArray(skillResults) || skillResults.length === 0)
            return res.status(500).json({ message: "Không thể phân tích skill." });

          // 3️⃣ CHIA ĐỀU NGƯỜI LÀM THEO CHECKLIST
          const results = [];
          const totalMembers = team.length;

          checklistItems.forEach((item, index) => {
            const matched = skillResults[index] || {};
            const assignedIndex = index % totalMembers; // xoay vòng theo index
            const assignedMember = team[assignedIndex].name;

            results.push({
              checklist: item,
              skill: matched.skill || "Không rõ",
              assigned_to: assignedMember,
            });
          });

          return res.json(results);
        } catch (err) {
          console.error("❌ Lỗi parse JSON:", err);
          console.error("Raw Python Output:", skillOutput);
          return res.status(500).json({ message: "Lỗi khi xử lý kết quả skill." });
        }
      });
    });
  } catch (error) {
    console.error("❌ Lỗi hệ thống AI:", error);
    res.status(500).json({ message: "Lỗi hệ thống AI." });
  }
});

module.exports = router;

