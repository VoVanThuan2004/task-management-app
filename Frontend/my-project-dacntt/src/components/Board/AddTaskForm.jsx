import React from "react";
import { Plus, X } from "lucide-react";

const AddTaskForm = React.memo(({ columnId, value, onChange, onAdd }) => {
  return (
    <div className="mt-2">
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(columnId, e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && value?.trim() && onAdd(columnId, value.trim())}
        placeholder="Nhập tiêu đề thẻ..."
        className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {value && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onAdd(columnId, value.trim())}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Thêm thẻ
          </button>
          <button
            onClick={() => onChange(columnId, "")} className="p-2 text-gray-500 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
});
export default AddTaskForm;