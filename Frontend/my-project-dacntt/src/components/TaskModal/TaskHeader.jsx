import { CheckIcon, Signal } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";

const TaskHeader = ({
  title,
  taskId,
  isCompleted,
  dueDate,
  isEditingTitle,
  onTitleChange,
  onSaveTitle,
  onEditTitle,
  onClose,
  totalCheckItems,
  completedCheckItems
}) => {
  const [aiPriority, setAiPriority] = useState(null);

  useEffect(() => {
    if (!taskId || isCompleted) {
      setAiPriority(null);
      return;
    }

    const fetchPriority = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/v1/tasks/${taskId}/priority`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.data.status === "success") {
          setAiPriority(res.data.data);
        }
      } catch (e) {
        console.error("TaskHeader AI Priority error:", e);
      }
    };
    fetchPriority();
  }, [taskId, isCompleted, dueDate, totalCheckItems, completedCheckItems]);

  const getPriorityColor = (label) => {
    if (label === "Critical" || label === "High") return "bg-red-500";
    if (label === "Medium") return "bg-yellow-500";
    return "bg-green-500";
  };

  const isChecklistComplete = totalCheckItems > 0 && totalCheckItems === completedCheckItems;

  return (
    <div className="flex justify-between items-start p-6 border-b border-gray-200">
      <div className="flex-1 flex items-start gap-4">
        {/* Icon check */}
        <div className="mt-1 p-1 bg-gray-100 rounded">
          <CheckIcon className="w-6 h-6 text-gray-500" />
        </div>

        <div className="flex-1">
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={onTitleChange}
              className="text-xl font-bold w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
              autoFocus
              onBlur={onSaveTitle}
              onKeyDown={(e) => e.key === "Enter" && onSaveTitle()}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="text-2xl font-bold text-gray-800 cursor-pointer hover:bg-gray-50 px-2 py-1 -ml-2 rounded transition-colors break-words"
                onClick={onEditTitle}
              >
                {title}
              </h2>

              {/* AI Priority Badge - Hide if task completed OR checklist 100% completed */}
              {aiPriority && !isCompleted && !isChecklistComplete && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-1 cursor-help ${getPriorityColor(aiPriority.priorityLabel)}`}
                  title={`Điểm ưu tiên AI: ${aiPriority.priorityScore}/100`}
                >
                  <Signal className="w-3 h-3" />
                  AI: {aiPriority.priorityLabel}
                </span>
              )}
            </div>
          )}
          <p className="text-sm text-gray-500 mt-1 pl-1">
            Trong danh sách <span className="underline decoration-dotted">Việc cần làm</span>
          </p>
        </div>
      </div>

      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
        ✕
      </button>
    </div>
  );
};

export default TaskHeader;
