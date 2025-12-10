// components/Board/AddColumnButton.jsx
import React from "react";
import { Plus, X, Loader2 } from "lucide-react";

const AddColumnButton = React.memo(
  ({
    isAdding,
    newTitle,
    onStartAdding,
    onTitleChange,
    onAdd,
    onCancel,
    isMember,
    loading = false, // thêm prop loading
  }) => {
    // Hiệu ứng loading cho nút "Thêm danh sách"
    const isSubmitting = loading;

    if (isAdding) {
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
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            autoFocus
            disabled={isSubmitting} // không cho nhập khi đang loading
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTitle.trim() && !isSubmitting) {
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
              disabled={!newTitle.trim() || isSubmitting}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang thêm...
                </>
              ) : (
                "Thêm danh sách"
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      );
    }

    // Nút "Thêm danh sách khác" cũng nên bị disable khi đang loading (tránh spam)
    return (
      <button
        onClick={onStartAdding}
        disabled={loading}
        className="flex-shrink-0 w-72 p-6 bg-white/20 hover:bg-white/40 backdrop-blur rounded-xl text-gray-700 font-medium transition-all hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            <span>Đang xử lý...</span>
          </>
        ) : (
          <>
            <Plus size={20} className="inline" />
            Thêm danh sách khác
          </>
        )}
      </button>
    );
  }
);

export default AddColumnButton;