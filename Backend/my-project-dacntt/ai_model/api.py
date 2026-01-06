import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
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
from chatbot_utils import parse_create_task, date_phrase_to_date, find_date_phrase, find_days_offset, detect_date_intent
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
                final_score = float(score)
                
                # THRESHOLD - 84/74/40 (điều chỉnh cho phù hợp ML model)
                if final_score >= 84:
                    label = "Critical"
                elif final_score >= 74:
                    label = "High"
                elif final_score >= 40:
                    label = "Medium"
                else:
                    label = "Low"
            
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
        
        # PRE-PROCESS: Check if message is a short deadline response
        # (e.g., "đúng 10 ngày", "trong 10 ngày") - Force intent to check_deadline
        text_norm = text.lower().strip()
        is_deadline_followup = False
        
        # Pattern: (đúng|trong|khoảng|vòng) + số + ngày
        deadline_pattern = r'^(đúng|dung|trong|khoảng|vòng|vong|tới)\s+\d+\s*(ngay|ngày)$'
        
        # Pattern: chưa xong, chưa làm
        unfinished_pattern = r'(chưa|chua)\s*(xong|làm|lam|hoàn thành)'
        
        if re.match(deadline_pattern, text_norm):
            is_deadline_followup = True
            intent = "check_deadline"
        elif re.search(unfinished_pattern, text_norm) and "đếm" not in text_norm and "bao nhiêu" not in text_norm:
            # Nếu hỏi "nào chưa xong" -> check_priority (list)
            # Nếu hỏi "bao nhiêu", "đếm" -> count_tasks (giữ nguyên AI predict)
            intent = "check_priority"
        else:
            # Normal ML prediction
            intent = chatbot_model.predict([text])[0]
        
        reply_text = "OK"
        action_data = None
        
        if intent == "greeting" or intent == "help":
            reply_text = (
                "Xin chào! Mình là trợ lý AI. Bạn có thể hỏi mình:\n"
                "- Tạo task: 'Tạo task đi họp sáng mai'\n"
                "- Kiểm tra: 'Task nào đang gấp?', 'Việc nào chưa xong?'\n"
                "- Deadline: 'Hạn chót hôm nay là gì?'\n"
                "- Thống kê: 'Còn bao nhiêu việc phải làm?'"
            )
            

        elif intent == "count_tasks":
            # 1. Match Filter
            match_filter = {"isCompleted": False}
            if request.boardId:
                from bson import ObjectId
                match_filter["boardId"] = ObjectId(request.boardId)

            # 2. Aggregation Pipeline
            pipeline = [
                {"$match": match_filter},
                # Lookup Checklists
                {
                    "$lookup": {
                        "from": "checklists",
                        "localField": "_id",
                        "foreignField": "taskId",
                        "as": "checklists"
                    }
                },
                # Lookup Items from Checklist IDs
                {
                    "$lookup": {
                        "from": "checklistitems",
                        "localField": "checklists._id",
                        "foreignField": "checklistId",
                        "as": "items"
                    }
                },
                # Calculate Stats
                {
                    "$addFields": {
                        "totalCheckItems": {"$size": "$items"},
                        "completedCheckItems": {
                            "$size": {
                                "$filter": {
                                    "input": "$items",
                                    "as": "item",
                                    "cond": {"$eq": ["$$item.isCompleted", True]}
                                }
                            }
                        }
                    }
                }
            ]
            
            cursor = db.tasks.aggregate(pipeline)
            all_tasks = await cursor.to_list(length=1000)
            
            real_count = 0
            checklist_done_count = 0
            
            for t in all_tasks:
                 real_count += 1
                 total = t.get("totalCheckItems", 0)
                 completed = t.get("completedCheckItems", 0)
                 # Đếm số task đã xong checklist nhưng chưa xong task
                 if total > 0 and completed >= total:
                     checklist_done_count += 1
                 
            reply_text = f"Hiện tại có {real_count} công việc chưa hoàn thành (chưa tick Done)."
            if checklist_done_count > 0:
                reply_text += f"\n💡 Lưu ý: Có {checklist_done_count} task đã xong hết checklist nhưng chưa tick Hoàn thành task!"
            
        elif intent == "check_priority":
            # 1. Match Filter
            match_filter = {"isCompleted": False}
            if request.boardId:
                from bson import ObjectId
                match_filter["boardId"] = ObjectId(request.boardId)
            
            # 2. Aggregation Pipeline
            pipeline = [
                {"$match": match_filter},
                {
                    "$lookup": {
                        "from": "checklists",
                        "localField": "_id",
                        "foreignField": "taskId",
                        "as": "checklists"
                    }
                },
                {
                    "$lookup": {
                        "from": "checklistitems",
                        "localField": "checklists._id",
                        "foreignField": "checklistId",
                        "as": "items"
                    }
                },
                {
                    "$addFields": {
                        "totalCheckItems": {"$size": "$items"},
                        "completedCheckItems": {
                            "$size": {
                                "$filter": {
                                    "input": "$items",
                                    "as": "item",
                                    "cond": {"$eq": ["$$item.isCompleted", True]}
                                }
                            }
                        }
                    }
                },
                {"$sort": {"position": 1}},
                {"$limit": 50}
            ]
            
            # Run Aggregation
            cursor = db.tasks.aggregate(pipeline)
            all_tasks = await cursor.to_list(length=50)
            
            # Không filter nữa, mà giữ lại để hiển thị kèm nhắc nhở
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
                
                # Filter based on message
                message_lower = request.message.lower()
                
                # 3 cases: "Unfinished" (All), "Not Urgent", "Urgent"
                if re.search(r'(chưa|chua)\s*(xong|làm|lam|hoàn thành)', message_lower) and "gấp" not in message_lower:
                     # Case 1: All Unfinished
                     filtered_tasks = tasks_with_priority
                     label_filter = "chưa hoàn thành"
                     priority_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
                elif re.search(r'(không|ko|khong)\s+.*gấp', message_lower):
                     # Case 2: Not urgent
                     filtered_tasks = [t for t in tasks_with_priority if t.get("priorityLabel") in ["Medium", "Low"]]
                     label_filter = "không gấp"
                     priority_order = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
                else:
                     # Case 3: Urgent (Default for "gấp" or vague queries like "cần làm gì")
                     filtered_tasks = [t for t in tasks_with_priority if t.get("priorityLabel") in ["Critical", "High"]]
                     label_filter = "gấp"
                     priority_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
                
                filtered_tasks.sort(key=lambda t: priority_order.get(t.get("priorityLabel", "Low"), 999))
                
                # Count total and limit to 5
                total_count = len(filtered_tasks)
                remaining_count = 0
                if total_count > 5:
                    remaining_count = total_count - 5
                    filtered_tasks = filtered_tasks[:5]
                
                if not filtered_tasks:
                    reply_text = f"Không có task {label_filter} nào cần làm."
                else:
                    task_list = []
                    for t in filtered_tasks:
                        title = t.get('title', 'No Title')
                        priority_label = t.get('priorityLabel', '')
                        
                        # Checklist Status
                        total_chk = t.get("totalCheckItems", 0)
                        comp_chk = t.get("completedCheckItems", 0)
                        
                        # Warning String
                        warning_str = ""
                        if total_chk > 0 and comp_chk >= total_chk:
                            warning_str = " ✅ (Xong checklist - chưa tick hoàn thành task)"
                        elif total_chk > 0:
                            warning_str = f" ({comp_chk}/{total_chk})"
                            
                        # 1. Get Column Name
                        col_name = "Unknown"
                        if t.get("columnId"):
                            try:
                                col = await db.columns.find_one({"_id": t["columnId"]})
                                if col: col_name = col.get("title", "Unknown")
                            except: pass
                        
                        # 2. Calculate Days Remaining
                        time_str = ""
                        if t.get("dueDate"):
                            try:
                                # Ensure datetime conversion
                                due_date = t.get("dueDate")
                                if isinstance(due_date, str):
                                    due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
                                
                                # Make 'now' timezone-aware if due_date is
                                now = datetime.now(due_date.tzinfo) if due_date.tzinfo else datetime.now()
                                
                                diff = (due_date - now).days
                                
                                if diff < 0:
                                    time_str = f", Trễ {abs(diff)} ngày"
                                elif diff == 0:
                                    time_str = ", Hạn hôm nay"
                                else:
                                    time_str = f", Còn {diff} ngày"
                            except:
                                pass

                        if priority_label:
                            task_list.append(f"- [{priority_label}] {title}{warning_str} (Cột: {col_name}{time_str})")
                        else:
                            task_list.append(f"- {title}{warning_str} (Cột: {col_name}{time_str})")
                    
                    reply_text = f"Danh sách task {label_filter}:\n" + "\n".join(task_list)
                    
                    if remaining_count > 0:
                        reply_text += f"\n... và {remaining_count} task khác."

        elif intent == "check_deadline":
             message_norm = request.message.lower()
             
             date_phrase = find_date_phrase(message_norm)
             target_date = date_phrase_to_date(date_phrase)
             
             # Logic xử lý số ngày (X ngày)
             is_range_query = False
             should_skip_query = False
             
             if not target_date:
                 days_offset = find_days_offset(message_norm)
                 if days_offset is not None:
                     # Detect Intent: Range vs Exact vs Ambiguous
                     date_intent = detect_date_intent(message_norm)
                     
                     if date_intent == "ambiguous":
                         reply_text = f"Bạn muốn kiểm tra các task có hạn **đúng {days_offset} ngày** nữa, hay **trong vòng {days_offset} ngày** tới?\n(Vui lòng chat lại: 'trong {days_offset} ngày' hoặc 'đúng {days_offset} ngày')"
                         should_skip_query = True
                     else:
                         target_date = datetime.now().date() + timedelta(days=days_offset)
                         if date_intent == "range":
                             is_range_query = True
                             date_phrase = f"trong vòng {days_offset} ngày tới"
                         else:
                             date_phrase = f"đúng {days_offset} ngày nữa"
             
             if not should_skip_query:
                 # 1. Match Filter
                 match_filter = {"isCompleted": False}
                 if request.boardId:
                     from bson import ObjectId
                     match_filter["boardId"] = ObjectId(request.boardId)
                     
                 date_str = ""
                 
                 if target_date:
                     if is_range_query:
                         # Range Query: Từ now -> target_date (cuối ngày)
                         end_of_range = datetime.combine(target_date, datetime.max.time())
                         match_filter["dueDate"] = {"$lte": end_of_range}
                         date_str = f"{date_phrase}"
                     else:
                         # Exact Date Query: Trong ngày target_date
                         start_of_day = datetime.combine(target_date, datetime.min.time())
                         end_of_day = datetime.combine(target_date, datetime.max.time())
                         match_filter["dueDate"] = {"$gte": start_of_day, "$lte": end_of_day}
                         date_str = f"vào {date_phrase}"
                 else:
                     # Default: Look for Overdue and Upcoming (next 3 days)
                     now = datetime.now()
                     three_days_later = now + timedelta(days=3)
                     # dueDate < 3 days later (includes overdue)
                     match_filter["dueDate"] = {"$lte": three_days_later}
                     date_str = "sắp tới (hoặc đã trễ)"
                 
                 # 2. Aggregation Pipeline
                 pipeline = [
                    {"$match": match_filter},
                    {
                        "$lookup": {
                            "from": "checklists",
                            "localField": "_id",
                            "foreignField": "taskId",
                            "as": "checklists"
                        }
                    },
                    {
                        "$lookup": {
                            "from": "checklistitems",
                            "localField": "checklists._id",
                            "foreignField": "checklistId",
                            "as": "items"
                        }
                    },
                    {
                        "$addFields": {
                            "totalCheckItems": {"$size": "$items"},
                            "completedCheckItems": {
                                "$size": {
                                    "$filter": {
                                        "input": "$items",
                                        "as": "item",
                                        "cond": {"$eq": ["$$item.isCompleted", True]}
                                    }
                                }
                            }
                        }
                    },
                    {"$sort": {"dueDate": 1}},
                    {"$limit": 50}
                 ]
                 
                 # Fetch tasks
                 cursor = db.tasks.aggregate(pipeline) 
                 tasks_all = await cursor.to_list(length=50)
                 
                 # (Removed Python Filter to display all pending tasks with warning)
                 
                 if not tasks_all:
                     reply_text = f"Không có task nào đến hạn {date_str}."
                 else:
                     # Limit to 5 for display
                     tasks_display = tasks_all[:5]
                     remaining_count = len(tasks_all) - 5 if len(tasks_all) > 5 else 0
                     
                     task_list = []
                     for t in tasks_display:
                         title = t.get('title', 'No Title')
                         
                         # Checklist Warning
                         total = t.get("totalCheckItems", 0)
                         completed = t.get("completedCheckItems", 0)
                         warning_str = ""
                         if total > 0 and completed >= total:
                             warning_str = " ✅ (Xong checklist - chưa tick hoàn thành task)"
                         
                         # Get Column Name
                         col_name = "Unknown"
                         if t.get("columnId"):
                            try:
                                col = await db.columns.find_one({"_id": t["columnId"]})
                                if col: col_name = col.get("title", "Unknown")
                            except: pass
                         
                         # Format Date
                         time_str = ""
                         if t.get("dueDate"):
                             d = t.get("dueDate")
                             if isinstance(d, str): d = datetime.fromisoformat(d.replace("Z", "+00:00"))
                             
                             # Convert UTC to GMT+7
                             vn_time = d + timedelta(hours=7)
                             
                             now_aware = datetime.now(d.tzinfo) if d.tzinfo else datetime.now()
                             diff = (d - now_aware).days
                             
                             # Format HH:MM
                             hour_str = vn_time.strftime("%H:%M")
                             
                             if diff < 0:
                                 time_str = f" (Trễ {abs(diff)} ngày, lúc {hour_str})"
                             elif diff == 0:
                                 time_str = f" (Hôm nay lúc {hour_str})"
                             elif diff == 1:
                                 time_str = f" (Ngày mai lúc {hour_str})"
                             else:
                                 day_str = vn_time.strftime("%d/%m")
                                 time_str = f" ({day_str} lúc {hour_str})"
                                 
                         task_list.append(f"- {title}{warning_str} (Cột: {col_name}){time_str}")
                     
                     reply_text = f"Các task deadline {date_str}:\n" + "\n".join(task_list)
                     
                     if remaining_count > 0:
                         reply_text += f"\n...và {remaining_count} task khác."
        
        elif intent == "create_task":
             # Validation: Chặn các câu quá ngắn không có từ khóa lệnh (ví dụ: "a", "alo")
             msg_lower = text.lower()
             command_keywords = ["tạo", "tao", "thêm", "them", "nhắc", "nhac", "add", "new"]
             has_command = any(k in msg_lower for k in command_keywords)
             
             # Nếu không có từ khóa lệnh VÀ quá ngắn (< 4 ký tự hoặc < 2 từ) -> Coi là không hiểu
             is_too_short = len(text.strip()) < 4 or len(text.split()) < 2
             
             if not has_command and is_too_short:
                 # Fallback xuống else
                 slots = {} # Empty slots to trigger fallback below
             else:
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
                     "list": slots.get("list"),
                     "column_name": slots.get("column_name")
                 }
             else:
                 reply_text = (
                     "Bạn muốn tạo task gì? Hãy nói rõ hơn, ví dụ:\n"
                     "- 'Tạo task gửi email khách hàng'\n"
                     "- 'Thêm việc đi siêu thị'"
                 )
                 
        else:
             reply_text = (
                 "Mình chưa hiểu. Bạn hãy thử:\n"
                 "- 'Task nào gấp?'\n"
                 "- 'Hạn chót hôm nay?'\n"
                 "- 'Tạo task [tên công việc]'"
             )

        return {
            "status": "success",
            "data": {
                "intent": intent,
                "reply_text": reply_text,
                "action": action_data
            }
        }
    except Exception as e:
        print(f"Error: {e}")
        return {"status": "error", "message": str(e)}
