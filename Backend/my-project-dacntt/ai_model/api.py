import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Optional
import random
import re

# MongoDB & Async
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from ai_pipeline import run_pipeline
from chatbot_utils import parse_create_task, date_phrase_to_date
from model_downloader import get_priority_model_path, get_chatbot_model_path

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
# LOAD MODELS FROM HF CACHE
# =========================
print("Loading models from Hugging Face...")

# 1. PRIORITY MODEL
priority_model = None
try:
    path = get_priority_model_path()
    if path and os.path.exists(path):
        priority_model = joblib.load(path)
        print(f"Loaded Priority Model from {path}")
    else:
        print("Failed to resolve Priority Model path")
except Exception as e:
    print(f"Error loading Priority Model: {e}")

# =========================
# DATABASE CONNECTION
# =========================
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo:27017")
client = AsyncIOMotorClient(MONGO_URL)
try:
    db = client.get_default_database()
except:
    db = client.test

# 2. CHATBOT MODEL
chatbot_model = None
try:
    path = get_chatbot_model_path()
    if path and os.path.exists(path):
        payload = joblib.load(path)
        chatbot_model = payload["model"] if isinstance(payload, dict) and "model" in payload else payload
        print(f"Loaded Chatbot Model from {path}")
    else:
        print("Failed to resolve Chatbot Model path")
except Exception as e:
    print(f"Error loading Chatbot Model: {e}")


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

class ChatRequest(BaseModel):
    message: str
    userId: Optional[str] = None
    boardId: Optional[str] = None  # Add boardId

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

# =========================
# CHATBOT ENDPOINT
# =========================
@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    if not chatbot_model:
        return {"status": "error", "message": "Chatbot Model not loaded"}
    
    try:
        text = request.message
        intent = chatbot_model.predict([text])[0]
        
        reply_text = "OK"
        action_data = None
        
        if intent == "greeting":
            reply_text = "Xin chào! Mình có thể giúp gì cho bạn?"
            
        elif intent == "goodbye":
            reply_text = "Tạm biệt! Hẹn gặp lại."
            
        elif intent == "help":
            reply_text = "Bạn có thể hỏi: 'Tạo task đi họp', 'Hôm nay có gì gấp?'..."
            
        elif intent == "count_tasks":
            query = {"isCompleted": False}
            if request.boardId:
                from bson import ObjectId
                query["boardId"] = ObjectId(request.boardId)
            count = await db.tasks.count_documents(query)
            reply_text = f"Hiện tại có {count} công việc chưa hoàn thành."
            
        elif intent == "check_priority":
            query = {"isCompleted": False}
            if request.boardId:
                from bson import ObjectId
                query["boardId"] = ObjectId(request.boardId)
            
            # Fetch all tasks first
            cursor = db.tasks.find(query).sort("position", 1).limit(10)
            all_tasks = await cursor.to_list(length=10)
            
            if not all_tasks:
                reply_text = "Không có task nào cần làm."
            else:
                # Call Priority Model API for each task
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    tasks_with_priority = []
                    for task in all_tasks:
                        try:
                            # Prepare task data for API (same format as Frontend)
                            task_data = {
                                "taskId": str(task["_id"]),
                                "dueDate": task.get("dueDate").isoformat() if task.get("dueDate") else None,
                                "isCompleted": task.get("isCompleted", False),
                                "totalCheckItems": task.get("totalCheckItems", 0),
                                "completedCheckItems": task.get("completedCheckItems", 0)
                            }
                            
                            # Call Priority Model API directly
                            async with session.post("http://localhost:8001/predict-priority", 
                                                   json={"tasks": [task_data]}) as resp:
                                if resp.status == 200:
                                    result = await resp.json()
                                    if result.get("status") == "success" and result.get("data"):
                                        priority_label = result["data"][0].get("priorityLabel", "Medium")
                                        task["priorityLabel"] = priority_label
                                        tasks_with_priority.append(task)
                                else:
                                    # Fallback: no priority
                                    task["priorityLabel"] = "Medium"
                                    tasks_with_priority.append(task)
                        except Exception as e:
                            # Fallback on error
                            print(f"Priority API error for task {task.get('title')}: {e}")
                            task["priorityLabel"] = "Medium"
                            tasks_with_priority.append(task)
                
                # Filter based on message - detect negation
                message_lower = request.message.lower()
                import re
                # Check for "không/ko/khong" followed by anything then "gấp"
                if re.search(r'(không|ko|khong|k)\s+(có\s+)?(việc|gì|task)?\s*(nào)?\s*gấp', message_lower):
                    # NOT urgent: Medium, Low
                    filtered_tasks = [t for t in tasks_with_priority if t.get("priorityLabel") in ["Medium", "Low"]]
                    label_filter = "không gấp"
                else:
                    # Urgent: Critical, High
                    filtered_tasks = [t for t in tasks_with_priority if t.get("priorityLabel") in ["Critical", "High"]]
                    label_filter = "gấp"
                
                # Limit to 5
                filtered_tasks = filtered_tasks[:5]
                
                if not filtered_tasks:
                    reply_text = f"Không có task {label_filter} nào cần làm."
                else:
                    task_list = []
                    for t in filtered_tasks:
                        title = t.get('title', 'No Title')
                        priority_label = t.get('priorityLabel', '')
                        if priority_label:
                            task_list.append(f"- [{priority_label}] {title}")
                        else:
                            task_list.append(f"- {title}")
                    reply_text = f"Danh sách task {label_filter}:\n" + "\n".join(task_list)

        elif intent == "check_deadline":
             reply_text = "Đang tra cứu deadline..."
        
        elif intent == "create_task":
             slots = parse_create_task(text)
             title = slots.get("title")
             if title:
                 reply_text = f"Đang tạo task: '{title}'..."
                 action_data = {
                     "action": "create_task",
                     "title": title,
                     "description": slots.get("description"),
                     "date_phrase": slots.get("date_phrase"),
                     "time": slots.get("time"),
                     "priority": slots.get("priority"),
                     "list": slots.get("list")
                 }
             else:
                 reply_text = "Bạn muốn tạo task tên gì?"
                 
        else:
             reply_text = "Mình chưa hiểu ý bạn lắm. Thử lại nhé?"

        return {
            "status": "success",
            "data": {
                "intent": intent,
                "reply_text": reply_text,
                "action": action_data
            }
        }
    except Exception as e:
         print(f"Chat Error: {e}")
         return {"status": "error", "message": str(e)}
