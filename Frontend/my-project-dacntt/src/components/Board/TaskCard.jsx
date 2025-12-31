// src/components/board/TaskCard.jsx
import React, { useState, useEffect } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { format } from "date-fns";
import axios from "axios";
import {
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  Paperclip,
  CheckSquare,
  Signal,
  Trash2,
} from "lucide-react";
import Avatar from "../Avatar";

const TaskCard = React.memo(
  ({ task, index, onClick, onToggleComplete, onDeleteTask, isMember }) => {
    const [aiPriority, setAiPriority] = useState(null);

    useEffect(() => {
      if (!task._id || task.isCompleted) {
        setAiPriority(null);
        return;
      }

      const fetchPriority = async () => {
        try {
          const token = localStorage.getItem("accessToken");
          if (!token) return;

          const res = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/v1/tasks/${task._id}/priority`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (res.data.status === "success") {
            setAiPriority(res.data.data);
          }
        } catch (e) {
          console.log(e);
        }
      };
      fetchPriority();
    }, [task._id, task.isCompleted, task.dueDate]);

    const getPriorityColor = (label) => {
      if (label === "Critical" || label === "High") return "bg-red-500";
      if (label === "Medium") return "bg-yellow-500";
      return "bg-green-500";
    };

    const isChecklistComplete =
      task.totalCheckItems > 0 &&
      task.totalCheckItems === task.totalCheckItemsCompleted;

    return (
      <Draggable draggableId={task._id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onClick(task)}
            className={`mb-2 select-none relative group ${
              snapshot.isDragging ? "rotate-2 shadow-2xl" : "hover:shadow-md"
            } transition-all duration-200 rounded-xl`}
          >
            {/* Nút xóa task - chỉ hiện khi hover card */}
            {isMember && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Ngăn không kích hoạt onClick mở task
                  onDeleteTask(task._id, task.title); // Hàm xóa bạn truyền từ parent
                }}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-red-100 backdrop-blur 
               opacity-0 group-hover:opacity-100 transition-all duration-200
               hover:bg-red-200 hover:scale-110 shadow-sm border border-red-300"
                title="Xóa task"
              >
                <Trash2 size={13} className="text-red-600" />
              </button>
            )}

            <div
              className={`bg-white rounded-lg p-3 border border-transparent hover:border-gray-300
              transition-all cursor-pointer ${
                task.isCompleted ? "opacity-70 bg-gray-50" : ""
              }`}
            >
              {/* Labels */}
              {task.taskLabels?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {task.taskLabels.map((label) => (
                    <span
                      key={label._id}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.title}
                    </span>
                  ))}
                </div>
              )}

              {/* Title + Checkbox */}
              <div className="flex items-start gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete(task._id);
                  }}
                  className="mt-0.5 flex-shrink-0"
                >
                  {task.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
                <p
                  className={`flex-1 text-sm font-medium ${
                    task.isCompleted
                      ? "line-through text-gray-500"
                      : "text-gray-800"
                  }`}
                >
                  {task.title}
                </p>
              </div>

              {/* AI Priority + Due Date + Status */}
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                {/* AI Priority Badge - Hide if completed OR checklist complete */}
                {!task.isCompleted && aiPriority && !isChecklistComplete && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1 ${getPriorityColor(
                      aiPriority.priorityLabel
                    )}`}
                    title={`AI Score: ${aiPriority.priorityScore}`}
                  >
                    <Signal className="w-3 h-3" />
                    {aiPriority.priorityLabel}
                  </span>
                )}

                {task.dueDate && (
                  <>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {format(new Date(task.dueDate), "dd/MM/yyyy")}
                      </span>
                    </div>

                    {/* Trạng thái quá hạn */}
                    {!task.isCompleted && task.status && (
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${
                          task.status === "Quá hạn"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {task.status}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Footer Icons */}
              {(task.totalCheckItems > 0 ||
                task.totalComments > 0 ||
                task.totalAttachments > 0) && (
                <div className="flex gap-3 mt-3 text-xs text-gray-500">
                  {task.totalCheckItems > 0 && (
                    <div className="flex items-center gap-1">
                      <CheckSquare className="w-4 h-4" />
                      <span
                        className={
                          task.totalCheckItemsCompleted === task.totalCheckItems
                            ? "text-green-600 font-medium"
                            : ""
                        }
                      >
                        {task.totalCheckItemsCompleted}/{task.totalCheckItems}
                      </span>
                    </div>
                  )}
                  {task.totalComments > 0 && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{task.totalComments}</span>
                    </div>
                  )}
                  {task.totalAttachments > 0 && (
                    <div className="flex items-center gap-1">
                      <Paperclip className="w-4 h-4" />
                      <span>{task.totalAttachments}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Thành viên gán cho task */}
              {task.taskAssignees && task.taskAssignees.length > 0 && (
                <div className="flex items-center -space-x-2 mt-3">
                  {task.taskAssignees.slice(0, 3).map((assignee, idx) => (
                    <div
                      key={assignee.userId}
                      className="relative"
                      style={{ zIndex: 3 - idx }}
                    >
                      {/* Avatar - thêm peer để hover riêng */}
                      <div className="peer">
                        <Avatar
                          user={{
                            _id: assignee.userId,
                            fullName: assignee.fullName,
                            avatar: assignee.avatar,
                          }}
                          size="w-7 h-7"
                          className="ring-2 ring-white shadow-sm transition-all hover:scale-110 hover:z-10 hover:ring-blue-400"
                        />
                      </div>

                      {/* Tooltip - dùng peer-hover thay group-hover */}
                      <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md shadow-lg 
                        opacity-0 peer-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 whitespace-nowrap"
                      >
                        {assignee.fullName}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  ))}

                  {/* +N người còn lại */}
                  {task.taskAssignees.length > 3 && (
                    <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 text-xs font-bold flex items-center justify-center ring-2 ring-white shadow-sm">
                      +{task.taskAssignees.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  }
);

export default TaskCard;
