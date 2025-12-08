// components/Board/AddColumnButton.jsx
import React from "react";
import { Plus, X } from "lucide-react";

const AddColumnButton = React.memo(
  ({
    isAdding,
    newTitle,
    onStartAdding, // mới
    onTitleChange, // mới
    onAdd,
    onCancel,
    isMember
  }) => {
    if (isAdding) {
      // AddColumnButton.jsx
      if (!isMember) {
        return (
          <div className="w-72 p-6 bg-gray-50/50 rounded-xl text-center text-gray-500 text-sm italic border border-dashed border-gray-300">
            Bạn đang xem ở chế độ chỉ đọc
          </div>
        );
      }

      return (
        <div className="flex-shrink-0 w-72 bg-white/90 backdrop-blur rounded-xl shadow-lg p-4 border border-gray-200">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Nhập tiêu đề danh sách..."
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTitle.trim()) {
                onAdd();
              }
              if (e.key === "Escape") {
                onCancel();
              }
            }}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={onAdd}
              disabled={!newTitle.trim()}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Thêm danh sách
            </button>
            <button
              onClick={onCancel}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        onClick={onStartAdding}
        className="flex-shrink-0 w-72 p-6 bg-white/20 hover:bg-white/40 backdrop-blur rounded-xl text-gray-700 font-medium transition-all hover:scale-105 shadow-md"
      >
        <Plus size={20} className="inline mr-2" />
        Thêm danh sách khác
      </button>
    );
  }
);

export default AddColumnButton;
