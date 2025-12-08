import React, { useRef, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";

const TaskDescription = ({
  description,
  isEditingDescription,
  onEditDescription,
  onSaveDescription,
  onCancelDescription,
  loading,
  tinyApiKey,
  descriptionEditorConfig,
  isReadOnly = false,
}) => {
  const editorRef = useRef(null);

  // Reset editor khi chuyển từ edit mode sang view mode
  useEffect(() => {
    if (!isEditingDescription && editorRef.current) {
      editorRef.current.setContent(description || "");
    }
  }, [isEditingDescription, description]);

  const handleSave = () => {
    if (editorRef.current) {
      const content = editorRef.current.getContent();
      onSaveDescription(content);
    }
  };

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-gray-700 mb-2">Mô tả</h3>

      {isEditingDescription ? (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <Editor
            apiKey={tinyApiKey}
            onInit={(evt, editor) => (editorRef.current = editor)}
            initialValue={description}
            init={{
              ...descriptionEditorConfig,
              readonly: isReadOnly, // ← Tắt hoàn toàn editor nếu chỉ đọc
            }}
            disabled={isReadOnly} // ← Thêm dòng này để khóa UI
          />
          <div className="flex gap-2 mt-2 p-3 bg-gray-50 border-t">
            <button
              onClick={handleSave}
              disabled={loading || isReadOnly}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              onClick={onCancelDescription}
              disabled={isReadOnly}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`min-h-12 p-4 bg-gray-50 rounded-lg transition-all ${
            isReadOnly
              ? "cursor-default opacity-80"
              : "cursor-pointer hover:bg-gray-100 hover:shadow-sm"
          } border ${
            isReadOnly
              ? "border-transparent"
              : "border-gray-200 hover:border-gray-300"
          }`}
          // Chỉ cho click nếu được phép sửa
          onClick={() => !isReadOnly && onEditDescription(true)}
        >
          {description ? (
            <div
              className="text-gray-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : (
            <p
              className={`italic ${
                isReadOnly ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {isReadOnly
                ? "Không có mô tả"
                : "Nhấp để thêm mô tả chi tiết hơn..."}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskDescription;
