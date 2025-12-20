// src/components/board/TaskCard.jsx
import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { format } from "date-fns";
import {
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  Paperclip,
  CheckSquare,
} from "lucide-react";
import Avatar from "../Avatar";

const TaskCard = React.memo(({ task, index, onClick, onToggleComplete }) => {
  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          className={`mb-2 select-none ${
            snapshot.isDragging ? "rotate-2 shadow-2xl" : "hover:shadow-md"
          } 
            transition-all duration-200`}
        >
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

            {/* Due Date + Trạng thái (chỉ hiển thị badge nếu chưa hoàn thành) */}
            {task.dueDate && (
              <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
                <Clock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="text-gray-600">
                  {format(new Date(task.dueDate), "dd MMMM yyyy")}
                </span>

                {/* Chỉ hiển thị badge nếu task CHƯA hoàn thành */}
                {!task.isCompleted && task.status && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      task.status === "Quá hạn"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {task.status}
                  </span>
                )}
              </div>
            )}

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

            {/* Thành viên gán cho task - hiển thị tối đa 3 + dấu +N nếu nhiều hơn */}
            {task.taskAssignees && task.taskAssignees.length > 0 && (
              <div className="flex items-center -space-x-2 mt-3">
                {/* Hiển thị tối đa 3 avatar đầu */}
                {task.taskAssignees.slice(0, 3).map((assignee, idx) => (
                  <div
                    key={assignee.userId}
                    className="relative group"
                    style={{ zIndex: 3 - idx }} // avatar đầu tiên z-index cao nhất
                  >
                    <Avatar
                      user={{
                        _id: assignee.userId,
                        fullName: assignee.fullName,
                        avatar: assignee.avatar,
                      }}
                      size="w-7 h-7"
                      className="ring-2 ring-white shadow-sm transition-all hover:scale-110 hover:z-10 hover:ring-blue-400"
                    />

                    {/* Tooltip tên khi hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                      {assignee.fullName}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                ))}

                {/* Nếu có nhiều hơn 3 người → hiện +N */}
                {task.taskAssignees.length > 3 && (
                  <div className="relative group">
                    <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 text-xs font-bold flex items-center justify-center ring-2 ring-white shadow-sm">
                      +{task.taskAssignees.length - 3}
                    </div>

                    {/* Tooltip chi tiết khi hover +N */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 max-w-xs">
                      <p className="font-medium mb-1">
                        Và {task.taskAssignees.length - 3} thành viên khác:
                      </p>
                      <div className="text-left">
                        {task.taskAssignees.slice(3).map((assignee) => (
                          <p key={assignee.userId} className="truncate">
                            {assignee.fullName}
                          </p>
                        ))}
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
});

export default TaskCard;
