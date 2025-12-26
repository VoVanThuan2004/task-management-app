import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from ai_pipeline import run_pipeline

app = FastAPI()

# Add CORS Middleware to allow requests from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# PRIORITY MODEL LOADING
# =========================
current_dir = os.path.dirname(os.path.abspath(__file__))
# Navigate into task_priority_model folder
priority_model_path = os.path.join(current_dir, "priority_model", "task_priority_model.pkl")
priority_model = None

try:
    if os.path.exists(priority_model_path):
        priority_model = joblib.load(priority_model_path)
        print(f"✅ Loaded Priority Model from {priority_model_path}")
    else:
        print(f"⚠️ Priority Model not found at {priority_model_path}")
        # Try finding in root just in case
        alt_path = os.path.join(current_dir, "task_priority_model.pkl")
        if os.path.exists(alt_path):
             priority_model = joblib.load(alt_path)
             print(f"✅ Loaded Priority Model from {alt_path}")
except Exception as e:
    print(f"❌ Error loading Priority Model: {e}")


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

# Schema cho Priority
class TaskItem(BaseModel):
    taskId: str
    dueDate: Optional[str] = None
    isCompleted: bool
    totalCheckItems: int
    completedCheckItems: int

class PriorityRequest(BaseModel):
    tasks: List[TaskItem]

# =========================
# ROUTES
# =========================

@app.get("/health")
def health():
    return {"status": "ok", "priority_model": "loaded" if priority_model else "not_loaded"}

@app.post("/run")
def run_ai(req: TaskRequest):
    users = [u.dict() for u in req.users] if req.users else []

    try:
        result = run_pipeline(
            task_title=req.title,
            task_description=req.description,
            users=users
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-priority")
async def predict_priority(request: PriorityRequest):
    if not priority_model:
        raise HTTPException(status_code=503, detail="Priority Model not loaded")

    try:
        task_data = []
        for task in request.tasks:
            # 1. Tính days_until_due
            days_until_due = 30 # Mặc định 30 ngày (Low)
            if task.dueDate:
                 try:
                    # Xử lý format ngày tháng ISO 8601
                    due_str = task.dueDate.replace("Z", "+00:00")
                    due = datetime.fromisoformat(due_str)
                    
                    # Xử lý timezone
                    if due.tzinfo:
                        now = datetime.now(due.tzinfo)
                    else:
                        now = datetime.now()
                    
                    days_until_due = (due - now).days
                 except Exception as e:
                    print(f"Date error: {e}")
                    pass
            
            # 2. Tính tỷ lệ checklist
            ratio = 0.0
            if task.totalCheckItems > 0:
                ratio = task.completedCheckItems / task.totalCheckItems
            
            task_data.append({
                "days_until_due": days_until_due,
                "total_checkitems": task.totalCheckItems,
                "completed_checkitems": task.completedCheckItems,
                "checklist_ratio": ratio,
                "is_completed": int(task.isCompleted)
            })
    
        # Convert to DataFrame
        df = pd.DataFrame(task_data)
        
        # Đảm bảo đúng thứ tự cột như lúc train (QUAN TRỌNG)
        features = ['days_until_due', 'total_checkitems', 'completed_checkitems', 'checklist_ratio', 'is_completed']
        
        # Check fallback
        for col in features:
            if col not in df.columns:
                df[col] = 0

        X = df[features]
        
        # Dự đoán
        scores = priority_model.predict(X)
        
        results = []
        for i, score in enumerate(scores):
            # Logic gán nhãn
            if not request.tasks[i].dueDate:
                 label = "Low"
                 final_score = 10.0 # Force Low score
            elif request.tasks[i].totalCheckItems > 0 and request.tasks[i].completedCheckItems == request.tasks[i].totalCheckItems:
                 label = "Low"
                 final_score = 5.0 # Checkitem xong hết -> Low
            else:
                label = "Low"
                # Thang điểm 0-100? Hay 0-1?
                # Random Forest Regressor thường ra value theo label train.
                # Nếu train data priority_score là 0-100:
                final_score = float(score)
                
                if final_score >= 80: label = "Critical"
                elif final_score >= 50: label = "High"
                elif final_score >= 20: label = "Medium"
            
            results.append({
                "taskId": request.tasks[i].taskId,
                "priorityScore": round(final_score, 2),
                "priorityLabel": label
            })
            
        return {"status": "success", "data": results}
        
    except Exception as e:
        print(f"Prediction Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")
