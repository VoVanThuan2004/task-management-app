
import sys
import json
import os
import re
import math
import numpy as np
import torch

from typing import List, Dict, Any, Tuple
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    AutoModel,
    T5Tokenizer,
    T5ForConditionalGeneration
)

# Set stdout encoding to utf-8 for Windows compatibility when printing JSON
sys.stdout.reconfigure(encoding='utf-8')

# ============================================================
# 0) DEVICE & PATHS
# ============================================================
device = "cuda" if torch.cuda.is_available() else "cpu"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Map local directories to the models
# bert_path = os.path.join(BASE_DIR, "suggest_skill_model")
# t5_path   = os.path.join(BASE_DIR, "checklist_generator_model")
bert_path = "kerodat2004/suggest-skill-bert"
t5_path   = "kerodat2004/checklist-generator-t5"


# ============================================================
# 1) SKILLS THEO CATEGORY
# ============================================================
SKILLS = {
    "Lập trình": [
        "Backend Development", "REST API", "Microservices", "Database Design",
        "SQL Optimization", "Redis Caching", "Message Queue", "Unit Testing",
        "Integration Testing", "Logging & Monitoring", "Docker", "Kubernetes",
        "CI/CD", "API Documentation", "Authentication & Authorization",
        "Performance Optimization", "Refactoring", "Error Handling",
        "Version Control", "Cloud Deployment"
    ],
    "AI": [
        "Deep Learning", "Computer Vision", "Natural Language Processing", "OCR",
        "Transformer Models", "CNN Architecture", "RNN/LSTM",
        "Dataset Preprocessing", "Data Augmentation", "Feature Engineering",
        "Hyperparameter Tuning", "Model Evaluation", "Fine-tuning",
        "Vector Embedding", "Model Deployment", "MLOps",
        "Prompt Engineering", "Text Classification",
        "Machine Translation", "Model Optimization"
    ],
    "Thiết kế": [
        "UI/UX Design", "Wireframing", "Prototyping", "Figma",
        "Adobe Illustrator", "Photoshop", "Typography", "Color Theory",
        "Layout Composition", "Branding", "Icon Design", "User Flow",
        "Visual Hierarchy", "Design System", "Responsive Design",
        "Prototype Testing", "Interaction Design", "Creative Concept",
        "Presentation Design", "Layout Optimization"
    ],
    "Marketing": [
        "Content Strategy", "Copywriting", "SEO Writing", "Keyword Research",
        "Google Analytics", "Meta Ads", "TikTok Ads", "Social Media Planning",
        "Content Calendar", "Market Research", "Email Marketing",
        "Funnel Optimization", "A/B Testing", "Performance Reporting",
        "Insight Analysis", "Brand Positioning", "Campaign Management",
        "Creative Direction", "Audience Targeting", "Content Optimization"
    ],
    "Kế toán": [
        "Báo cáo tài chính", "Đối chiếu công nợ", "Xử lý hóa đơn",
        "Kế toán thuế", "Báo cáo thuế GTGT", "Kiểm tra sổ sách",
        "Lập bảng cân đối kế toán", "Quản lý thu chi",
        "Kiểm toán nội bộ", "Phân tích chi phí",
        "Dự toán ngân sách", "Báo cáo dòng tiền",
        "Kiểm tra chứng từ", "Hạch toán kế toán",
        "Đối soát ngân hàng", "Theo dõi công nợ phải thu",
        "Theo dõi công nợ phải trả", "Kiểm tra sai lệch dữ liệu",
        "Tối ưu quy trình kế toán", "Báo cáo quản trị"
    ],
    "Quản lý dự án": [
        "Agile Practices", "Scrum", "Sprint Planning", "Backlog Management",
        "Risk Assessment", "Stakeholder Communication",
        "Requirement Analysis", "Burndown Chart Tracking",
        "Documentation", "Release Planning", "Retrospective",
        "Team Coordination", "Project Scheduling", "Resource Allocation",
        "Milestone Tracking", "Conflict Resolution", "Workflow Optimization",
        "OKR Planning", "Roadmap Management", "Task Prioritization"
    ],
    "Học tập": [
        "Kỹ năng ghi chú", "Tóm tắt nội dung", "Luyện thuyết trình",
        "Lập kế hoạch học tập", "Ôn thi", "Tư duy phản biện",
        "Mind Mapping", "Quản lý thời gian", "Tìm kiếm tài liệu",
        "Làm bài tập nhóm", "Kỹ năng đọc hiểu", "Tư duy logic",
        "Viết luận", "Tự học", "Luyện đề", "Ghi chú công thức",
        "Phân tích câu hỏi", "Lập dàn ý", "Đánh giá kết quả học",
        "Ghi chép khoa học"
    ],
    "Đời sống": [
        "Lập kế hoạch chi tiêu", "Quản lý tài chính cá nhân", "Chuẩn bị bữa ăn",
        "Sắp xếp nhà cửa", "Dọn dẹp định kỳ", "Quản lý thời gian",
        "Theo dõi sức khỏe", "Lập lịch sinh hoạt", "Kế hoạch chuyển nhà",
        "Kế hoạch du lịch", "Tổ chức sự kiện nhỏ", "Mua sắm hợp lý",
        "Quản lý đồ dùng", "Kiểm tra an toàn nhà cửa", "Lập thực đơn",
        "Vệ sinh không gian sống", "Ghi chép hóa đơn", "Thanh lý đồ cũ",
        "Sửa chữa nhẹ", "Chăm sóc bản thân"
    ]
}

# ============================================================
# 2) LOAD MODELS
# ============================================================
try:
    bert_tokenizer = AutoTokenizer.from_pretrained(bert_path)
    bert_model = AutoModelForSequenceClassification.from_pretrained(bert_path).to(device).eval()

    t5_tokenizer = T5Tokenizer.from_pretrained(t5_path)
    t5_model = T5ForConditionalGeneration.from_pretrained(t5_path).to(device).eval()
except Exception as e:
    print(json.dumps({"error": f"Failed to load models: {str(e)}"}, ensure_ascii=False))
    sys.exit(1)



# ============================================================
# 3) EMBEDDING MODEL
# ============================================================
embed_name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
emb_tokenizer = AutoTokenizer.from_pretrained(embed_name)
emb_model = AutoModel.from_pretrained(embed_name).to(device).eval()

def mean_pooling(last_hidden_state, attention_mask):
    mask = attention_mask.unsqueeze(-1).expand(last_hidden_state.size()).float()
    summed = torch.sum(last_hidden_state * mask, dim=1)
    counts = torch.clamp(mask.sum(dim=1), min=1e-9)
    return summed / counts

@torch.no_grad()
def embed_texts(texts: List[str], max_length=64) -> np.ndarray:
    enc = emb_tokenizer(
        texts,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=max_length
    ).to(device)
    out = emb_model(**enc)
    emb = mean_pooling(out.last_hidden_state, enc["attention_mask"])
    emb = torch.nn.functional.normalize(emb, dim=1)
    return emb.detach().cpu().numpy()

_skill_cache: Dict[str, Dict[str, Any]] = {}

def get_skill_bank(category: str) -> List[str]:
    return SKILLS.get(category, [])

def get_skill_embeds(category: str) -> Tuple[List[str], np.ndarray]:
    if category in _skill_cache:
        return _skill_cache[category]["skills"], _skill_cache[category]["emb"]
    skills = get_skill_bank(category)
    if not skills:
        skills = []
        emb = np.zeros((0, 384), dtype=np.float32)
    else:
        emb = embed_texts(skills, max_length=16)
    _skill_cache[category] = {"skills": skills, "emb": emb}
    return skills, emb

# ============================================================
# 4) PREDICT CATEGORY
# ============================================================
@torch.no_grad()
def predict_category(task_title: str, task_description: str) -> str:
    text = f"{task_title}. {task_description}".strip()
    inputs = bert_tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128).to(device)
    logits = bert_model(**inputs).logits
    pred_id = int(torch.argmax(logits, dim=1).item())
    return bert_model.config.id2label[pred_id]

# ============================================================
# 5) GENERATE CHECKLIST
# ============================================================
@torch.no_grad()
def generate_checklist(task_title: str, task_description: str, category: str, max_length=200) -> str:
    prompt = (
        f"Category: {category}\n"
        f"Task: {task_title}\n"
        f"Description: {task_description}\n"
        f"Sinh checklist chi tiết, KHÔNG LẶP MỤC."
    )
    input_ids = t5_tokenizer.encode(prompt, return_tensors="pt", truncation=True, max_length=128).to(device)
    out_ids = t5_model.generate(
        input_ids,
        max_length=max_length,
        num_beams=5,
        no_repeat_ngram_size=3,
        early_stopping=True
    )
    return t5_tokenizer.decode(out_ids[0], skip_special_tokens=True).strip()

def parse_checklist(checklist_text: str) -> List[str]:
    parts = re.split(r"[;\n•\-]+", checklist_text)
    items = []
    for p in parts:
        x = p.strip()
        x = re.sub(r"\s+", " ", x)
        if len(x) >= 3:
            items.append(x)
    seen = set()
    uniq = []
    for it in items:
        key = it.lower()
        if key not in seen:
            seen.add(key)
            uniq.append(it)
    return uniq

# ============================================================
# 6) ASSIGN & WEIGHT
# ============================================================
HEAVY_KEYWORDS = [
    "triển khai", "tối ưu", "refactor", "thiết kế", "xây dựng", "huấn luyện",
    "đánh giá", "phân tích", "tích hợp", "deploy", "migration"
]
MED_KEYWORDS = [
    "kiểm tra", "test", "cập nhật", "soạn", "chuẩn bị", "theo dõi",
    "tổng hợp", "đối chiếu", "lưu trữ", "ghi nhận"
]

def auto_weight(item: str) -> int:
    t = item.lower()
    if any(k in t for k in HEAVY_KEYWORDS):
        return 3
    if any(k in t for k in MED_KEYWORDS):
        return 2
    if len(t) > 70:
        return 2
    return 1

def match_skill(item: str, category: str) -> Tuple[str, float]:
    skills, skill_emb = get_skill_embeds(category)
    if len(skills) == 0:
        return ("(no-skill)", 0.0)
    item_emb = embed_texts([item], max_length=64)[0]
    sims = skill_emb @ item_emb
    idx = int(np.argmax(sims))
    return skills[idx], float(sims[idx])

def assign_items_to_users(items, category, users, weights, sim_threshold=0.35, load_penalty=0.05):
    if not users:
        return [], {}
    load = {u["id"]: 0 for u in users}
    assigned = []
    
    for item, w in zip(items, weights):
        best_skill, sim = match_skill(item, category)
        
        # Level 1: skill match
        level1 = []
        for u in users:
            # Check safely if u has 'skills'
            u_skills = u.get("skills", [])
            if best_skill in u_skills:
                score = sim - load_penalty * load[u["id"]]
                level1.append((score, u))
        
        if level1 and sim >= sim_threshold:
            chosen = max(level1, key=lambda x: x[0])[1]
            reason = f"skill-match ({best_skill}, sim={sim:.2f})"
        else:
            # Level 2: category match
            cat_skills = set(SKILLS.get(category, []))
            level2 = []
            for u in users:
                u_skills = set(u.get("skills", []))
                if cat_skills.intersection(u_skills):
                    score = -load_penalty * load[u["id"]]
                    level2.append((score, u))
            if level2:
                chosen = max(level2, key=lambda x: x[0])[1]
                reason = f"category-match ({category})"
            else:
                # Level 3: fallback (min load)
                chosen = min(users, key=lambda u: load[u["id"]])
                reason = "fallback (no match)"
        
        load[chosen["id"]] += w
        assigned.append({
            "item": item,
            "weight": w,
            "skill": best_skill,
            "similarity": round(sim, 3),
            "assigned_to": {"id": chosen["id"], "name": chosen["name"]},
            "reason": reason
        })
    
    return assigned, load




# ============================================================
# 7) PIPELINE API ENTRY (FOR FASTAPI)
# ============================================================
# def run_pipeline(task_title: str, task_description: str, users: List[Dict[str, Any]]) -> Dict[str, Any]:
#     cat = predict_category(task_title, task_description)
#     checklist_text = generate_checklist(task_title, task_description, cat)
#     items = parse_checklist(checklist_text)
#     weights = [auto_weight(x) for x in items]

#     assigned, final_load = assign_items_to_users(
#         items, cat, users, weights
#     )

#     return {
#         "task": {"title": task_title, "description": task_description},
#         "category": cat,
#         "checklist_text": checklist_text,
#         "checklist_items": items,
#         "weights": weights,
#         "assignments": assigned,
#         "final_load": final_load
#     }

def run_pipeline(task_title: str, task_description: str, users: List[Dict[str, Any]]) -> Dict[str, Any]:
    cat = predict_category(task_title, task_description)
    checklist_text = generate_checklist(task_title, task_description, cat)
    items = parse_checklist(checklist_text)
    weights = [auto_weight(x) for x in items]

    # ✅ TRƯỜNG HỢP CHƯA CÓ USER
    if not users:
        return {
            "task": {"title": task_title, "description": task_description},
            "category": cat,
            "checklist_text": checklist_text,
            "checklist_items": items,
            "weights": weights,
            "assignments": [],
            "final_load": {}
        }

    # ✅ CÓ USER → ASSIGN
    assigned, final_load = assign_items_to_users(
        items, cat, users, weights
    )

    return {
        "task": {"title": task_title, "description": task_description},
        "category": cat,
        "checklist_text": checklist_text,
        "checklist_items": items,
        "weights": weights,
        "assignments": assigned,
        "final_load": final_load
    }
