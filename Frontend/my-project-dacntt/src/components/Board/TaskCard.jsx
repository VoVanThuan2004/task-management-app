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

const TaskCard = React.memo(({ task, index, onClick, onToggleComplete }) => {
  // const getDueDateStatus = (dueDate, isCompleted) => {
  //   if (isCompleted || !dueDate) return null;
  //   const today = new Date();
  //   const due = new Date(dueDate);
  //   const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  //   if (diffDays < 0) return { text: "Quá hạn", color: "bg-red-100 text-red-700" };
  //   if (diffDays <= 1) return { text: "Gần tới hạn", color: "bg-yellow-100 text-yellow-700" };
  //   return null;
  // };

  // const dueStatus = getDueDateStatus(task.dueDate, task.isCompleted);

  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          className={`mb-2 select-none ${snapshot.isDragging ? "rotate-2 shadow-2xl" : "hover:shadow-md"} 
            transition-all duration-200`}
        >
          <div
            className={`bg-white rounded-lg p-3 border border-transparent hover:border-gray-300
              transition-all cursor-pointer ${task.isCompleted ? "opacity-70 bg-gray-50" : ""}`}
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
              <p className={`flex-1 text-sm font-medium ${task.isCompleted ? "line-through text-gray-500" : "text-gray-800"}`}>
                {task.title}
              </p>
            </div>

            {/* Due Date */}
            {task.dueDate && (
              <div className="flex items-center gap-2 mt-2 text-xs">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-600">{format(new Date(task.dueDate), "dd MMM")}</span>
                {task.status === "Gần tới hạn" && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700`}>
                    {task.status}
                  </span>
                )}

                {task.status === "Quá hạn" && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700`}>
                    {task.status}
                  </span>
                )}
              </div>
            )}

            {/* Footer Icons */}
            {(task.totalCheckItems > 0 || task.totalComments > 0 || task.totalAttachments > 0) && (
              <div className="flex gap-3 mt-3 text-xs text-gray-500">
                {task.totalCheckItems > 0 && (
                  <div className="flex items-center gap-1">
                    <CheckSquare className="w-4 h-4" />
                    <span className={task.totalCheckItemsCompleted === task.totalCheckItems ? "text-green-600 font-medium" : ""}>
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
          </div>
        </div>
      )}
    </Draggable>
  );
});

export default TaskCard;