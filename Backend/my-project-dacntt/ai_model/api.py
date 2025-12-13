# from fastapi import FastAPI
# from pydantic import BaseModel
# from typing import List, Dict, Any

# # file pipeline của bạn (đang là ai-pipeline.py)
# # Python không import được tên có dấu "-" => đổi tên file thành ai_pipeline.py (bước 3)
# from ai_pipeline import run_pipeline

# app = FastAPI()

# class User(BaseModel):
#     id: str
#     name: str
#     skills: List[str]

# class TaskRequest(BaseModel):
#     title: str
#     description: str
#     users: List[User]

# @app.get("/health")
# def health():
#     return {"ok": True}

# @app.post("/run")
# def run_ai(req: TaskRequest):
#     result = run_pipeline(
#         task_title=req.title,
#         task_description=req.description,
#         users=[u.dict() for u in req.users]
#     )
#     return result
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

from ai_pipeline import run_pipeline

app = FastAPI()

# =========================
# SCHEMA
# =========================

class User(BaseModel):
    id: str
    name: str
    skills: List[str] = []   # skills có thể rỗng

class TaskRequest(BaseModel):
    title: str
    description: str
    users: Optional[List[User]] = []   # 🔥 QUAN TRỌNG: users OPTIONAL


# =========================
# ROUTES
# =========================

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/run")
def run_ai(req: TaskRequest):
    users = [u.dict() for u in req.users] if req.users else []

    result = run_pipeline(
        task_title=req.title,
        task_description=req.description,
        users=users
    )

    return result
