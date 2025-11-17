import { CheckIcon } from "lucide-react";

const TaskHeader = ({ title, isEditingTitle, onTitleChange, onSaveTitle, onEditTitle, onClose }) => {
  return (
    <div className="flex justify-between items-start p-6 border-b border-gray-200">
      <div className="flex-1 flex items-center gap-3">
        <CheckIcon />
        <div>
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={onTitleChange}
              className="text-xl font-bold w-full px-2 py-1 border border-blue-500 rounded"
              autoFocus
              onBlur={onSaveTitle}
              onKeyDown={(e) => e.key === "Enter" && onSaveTitle()}
            />
          ) : (
            <div
              className="text-xl font-bold text-gray-800 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
              onClick={onEditTitle}
            >
              {title}
            </div>
          )}
        </div>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
        ✕
      </button>
    </div>
  );
};

export default TaskHeader;
