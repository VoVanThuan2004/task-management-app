import os, sys, json, torch, numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# === 1️⃣ LOAD MODEL ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = BASE_DIR
model = SentenceTransformer(model_path, device="cuda" if torch.cuda.is_available() else "cpu")

# === 2️⃣ DỮ LIỆU TỪ NODE ===
checklist_items = json.loads(sys.argv[1])
team = json.loads(sys.argv[2])

# Lấy danh sách kỹ năng toàn team
team_skills = list(set(sum([m["skills"] for m in team], [])))
results = []

# Đếm số task của từng người (để chia đều dần)
task_count = {m["name"]: 0 for m in team}

# === 3️⃣ GỢI Ý SKILL + NGƯỜI ===
for checklist in checklist_items:
    task_emb = model.encode([checklist], convert_to_numpy=True)

    # So sánh checklist với chỉ kỹ năng có trong team
    skill_embs = model.encode(team_skills, convert_to_numpy=True)
    scores = cosine_similarity(task_emb, skill_embs)[0]
    best_idx = int(np.argmax(scores))
    best_skill = team_skills[best_idx]

    # Danh sách người có skill này
    candidates = [m for m in team if best_skill in m["skills"]]

    # Nếu có người phù hợp => chọn người ít task nhất
    if candidates:
        chosen = min(candidates, key=lambda x: task_count[x["name"]])
        assigned_to = chosen["name"]
        task_count[assigned_to] += 1
    else:
        assigned_to = "Chưa có người phù hợp"

    results.append({
        "checklist": checklist,
        "skill": best_skill,
        "assigned_to": assigned_to
    })

# === 4️⃣ XUẤT KẾT QUẢ ===
print(json.dumps(results, ensure_ascii=False))
