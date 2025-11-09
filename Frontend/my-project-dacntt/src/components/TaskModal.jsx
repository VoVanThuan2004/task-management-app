import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { Editor } from "@tinymce/tinymce-react";
// import { getFileIcon } from "../components/GetFileIcon";

// Biểu tượng (bạn có thể thay thế bằng react-icons)
const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-5 h-5 text-green-600"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
      clipRule="evenodd"
    />
  </svg>
);

const LabelIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-5 h-5"
  >
    <path d="M3.25 4A2.25 2.25 0 0 0 1 6.25v3.5A2.25 2.25 0 0 0 3.25 12h11.5A2.25 2.25 0 0 0 17 9.75v-3.5A2.25 2.25 0 0 0 14.75 4H3.25ZM9 7.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5.5 6A.5.5 0 0 1 6 5.5h1.5a.5.5 0 0 1 0 1H6A.5.5 0 0 1 5.5 6Z" />
    <path d="M18.25 6.25A2.25 2.25 0 0 1 16 8.5v1.25a2.25 2.25 0 0 1 2.25 2.25h.5a.75.75 0 0 0 0-1.5h-.5a.75.75 0 0 0-.75-.75V8.5a.75.75 0 0 0 .75-.75h.5a.75.75 0 0 0 0-1.5h-.5Z" />
  </svg>
);

const TaskModal = ({ task, isOpen, onClose, onTaskUpdate }) => {
  const [editedTask, setEditedTask] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [loading, setLoading] = useState(false);
  // const [comment, setComment] = useState(""); // State cho comment mới

  const editorRef = useRef(null); // Ref cho editor MÔ TẢ
  const commentEditorRef = useRef(null); // Ref cho editor COMMENT

  const httpUrl = import.meta.env.VITE_API_URL;
  const accessToken = localStorage.getItem("accessToken");
  const tinyApiKey = "emhcwa82lifw8ojhx436lj1rojy25bicl8d8ubfgavndvybz"; // API key của bạn

  // Thêm state cho upload
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  // Khi task thay đổi => gọi API lấy chi tiết task
  useEffect(() => {
    const fetchTaskDetail = async () => {
      if (!task?._id || !isOpen) return;

      setLoading(true);
      try {
        const response = await axios.get(
          `${httpUrl}/api/v1/tasks/${task._id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        setEditedTask(response.data.data);
      } catch (error) {
        console.error("Lỗi tải chi tiết task:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskDetail();
  }, [task, isOpen]);

  useEffect(() => {
    if (!isOpen || !task?._id) return;

    const socket = io(httpUrl, {
      transports: ["websocket"],
      auth: { token: accessToken },
    });

    socket.emit("joinBoard", task.boardId);

    socket.on("descriptionTaskUpdated", (data) => {
      console.log("📝 TaskModal received description update:", data);
      if (data._id === task._id) {
        setEditedTask((prev) =>
          prev ? { ...prev, description: data.description } : null
        );
      }
    });

    socket.on("taskTitleUpdated", (data) => {
      console.log("📝 TaskModal received title update:", data);
      if (data._id === task._id) {
        setEditedTask((prev) => (prev ? { ...prev, title: data.title } : null));
      }
    });

    return () => {
      socket.emit("leaveTask", task._id);
      socket.disconnect();
    };
  }, [isOpen, task?._id, accessToken]);

  // ============ API FUNCTIONS ============

  const updateTaskTitle = async (title) => {
    const res = await axios.put(
      `${httpUrl}/api/v1/tasks/${task._id}/title`,
      { title },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return res.data;
  };

  const updateTaskDescription = async (description) => {
    const res = await axios.put(
      `${httpUrl}/api/v1/tasks/${task._id}/description`,
      { description },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return res.data;
  };

  const deleteTask = async () => {
    const res = await axios.delete(`${httpUrl}/api/v1/tasks/${task._id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.data;
  };

  const uploadAttachment = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("taskId", task._id);

    const res = await axios.post(
      `${httpUrl}/api/v1/tasks-attachment`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return res.data;
  };

  // ============ HANDLERS ============

  const handleSaveTitle = async () => {
    if (!editedTask.title.trim()) return;
    setLoading(true);
    try {
      await updateTaskTitle(editedTask.title);
      setIsEditingTitle(false);
      onTaskUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDescription = async () => {
    setLoading(true);
    try {
      let content = "";
      if (editorRef.current) {
        content = editorRef.current.getContent().trim();
      } else {
        content = editedTask.description?.trim() || "";
      }

      const plainText = content
        .replace(/<[^>]*>/g, "") // bỏ hết HTML tags
        .replace(/&nbsp;/g, "") // bỏ khoảng trắng đặc biệt
        .trim();

      if (!plainText) {
        content = ""; // nếu rỗng thật sự, đặt thành ""
      }

      await updateTaskDescription(content);

      setEditedTask((prev) => ({
        ...prev,
        description: content,
      }));

      setIsEditingDescription(false);
      onTaskUpdate();
    } catch (e) {
      console.error("❌ Lỗi khi lưu mô tả:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDescription = () => {
    setIsEditingDescription(false);
  };

  const handleDeleteTask = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa task này?")) return;
    setLoading(true);
    try {
      await deleteTask();
      onTaskUpdate();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ===== Xử lý upload file =====
  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    //   const iconClass = "w-4 h-4 text-gray-600";

    switch (ext) {
      case "pdf":
        return <span className="text-red-500 font-bold text-xs">PDF</span>;
      case "doc":
      case "docx":
        return <span className="text-blue-500 font-bold text-xs">DOC</span>;
      case "xls":
      case "xlsx":
        return <span className="text-green-500 font-bold text-xs">XLS</span>;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <span className="text-purple-500 font-bold text-xs">IMG</span>;
      case "zip":
      case "rar":
        return <span className="text-yellow-500 font-bold text-xs">ZIP</span>;
      default:
        return <span className="text-gray-500 font-bold text-xs">FILE</span>;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  // Show toast function
  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  // Cập nhật hàm handleFileUpload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadingFileName(file.name);

    try {
      await uploadAttachment(file);
      showToast("Tệp đã được tải lên thành công", "success");
      onTaskUpdate();
    } catch (error) {
      console.error("Lỗi khi tải lên tệp:", error);
      showToast("Lỗi khi tải lên tệp", "error");
    } finally {
      setUploadingFile(false);
      setUploadingFileName("");
      // Reset input để có thể chọn lại cùng file
      e.target.value = "";
    }
  };

  // ============ Cấu hình TinyMCE cho MÔ TẢ ============
  const descriptionEditorConfig = {
    height: 300,
    menubar: true,
    plugins: [
      "advlist",
      "autolink",
      "lists",
      "link",
      "image",
      "charmap",
      "preview",
      "anchor",
      "searchreplace",
      "visualblocks",
      "code",
      "fullscreen",
      "insertdatetime",
      "media",
      "table",
      "code",
      "help",
      "wordcount",
    ],
    toolbar:
      "undo redo | blocks | bold italic underline strikethrough | " +
      "forecolor backcolor | alignleft aligncenter alignright alignjustify | " +
      "bullist numlist outdent indent | link image | removeformat | help",
    content_style: `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; }
      .mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before { color: #999; font-style: italic; }
    `,
    placeholder: "Thêm mô tả chi tiết cho task...",
    branding: false,
    statusbar: true,
    elementpath: true,
    paste_data_images: false,
    images_upload_handler: async (blobInfo, progress) => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", blobInfo.blob(), blobInfo.filename());
        formData.append("taskId", task._id);

        axios
          .post(`${httpUrl}/api/v1/tasks-attachment`, formData, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (e) => {
              progress((e.loaded / e.total) * 100);
            },
          })
          .then((response) => {
            resolve(response.data.data.url);
          })
          .catch((error) => {
            reject("Upload failed: " + error.message);
          });
      });
    },
  };

  // ============ Cấu hình TinyMCE cho COMMENT (Đơn giản hơn) ============
  const commentEditorConfig = {
    height: 150,
    menubar: false,
    plugins: ["autolink", "lists", "link"],
    toolbar: "bold italic underline | bullist numlist | link | removeformat",
    content_style: `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; }
      .mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before { color: #999; font-style: italic; }
    `,
    placeholder: "Viết bình luận...",
    branding: false,
    statusbar: false,
    elementpath: false,
  };

  if (!isOpen) return null;

  if (!editedTask) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">Đang tải...</p>
        </div>
      </div>
    );
  }

  // ============ RENDER (Bố cục 2 cột) ============
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex-1 flex items-center gap-3">
            <CheckIcon />
            <div>
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editedTask.title}
                  onChange={(e) =>
                    setEditedTask({ ...editedTask, title: e.target.value })
                  }
                  className="text-xl font-bold w-full px-2 py-1 border border-blue-500 rounded"
                  autoFocus
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                />
              ) : (
                <div
                  className="text-xl font-bold text-gray-800 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {editedTask.title}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            ✕
          </button>
        </div>

        {/* Thân modal chia 2 cột */}
        <div className="flex flex-1 overflow-hidden">
          {/* ============ CỘT TRÁI (Nội dung) ============ */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* --- Các nút hành động (Placeholder) --- */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm">
                <LabelIcon /> Nhãn
              </button>
              <button className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm">
                Việc cần làm
              </button>
              <button className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm">
                Thành viên
              </button>
            </div>

            {/* --- Ngày (Placeholder) --- */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 mb-1">Ngày</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm">4 thg 11 - 10:30 6 thg 11</span>
                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-sm">
                  Hoàn tất
                </span>
              </div>
            </div>

            {/* --- Mô tả (Giữ nguyên logic) --- */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-2">Mô tả</h3>
              {isEditingDescription ? (
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <Editor
                    apiKey={tinyApiKey}
                    onInit={(evt, editor) => (editorRef.current = editor)}
                    initialValue={editedTask.description || ""}
                    init={descriptionEditorConfig}
                  />
                  <div className="flex gap-2 mt-2 p-3 bg-gray-50 border-t">
                    <button
                      onClick={handleSaveDescription}
                      disabled={loading}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? "Đang lưu..." : "Lưu"}
                    </button>
                    <button
                      onClick={handleCancelDescription}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="min-h-12 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => setIsEditingDescription(true)}
                >
                  {editedTask.description ? (
                    <div
                      className="text-gray-700 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: editedTask.description,
                      }}
                    />
                  ) : (
                    <p className="text-gray-500">Thêm mô tả chi tiết hơn...</p>
                  )}
                </div>
              )}
            </div>

            {/* --- Tệp đính kèm --- */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-700">
                  Các tệp đính kèm
                </h3>
                <label className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded cursor-pointer transition-colors">
                  Thêm
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                  />
                </label>
              </div>

              {/* Uploading file indicator */}
              {uploadingFile && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800">
                      Đang tải lên...
                    </p>
                    <p className="text-xs text-blue-600">{uploadingFileName}</p>
                  </div>
                  <div className="w-20 bg-blue-200 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full animate-pulse"></div>
                  </div>
                </div>
              )}

              {/* File list */}
              {editedTask.attachments?.length > 0 ? (
                <ul className="space-y-2">
                  {editedTask.attachments.map((file) => (
                    <li key={file._id} className="group">
                      <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        {/* File icon based on type */}
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                          {getFileIcon(file.fileName)}
                        </div>

                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-gray-700 hover:text-blue-600 block truncate"
                          >
                            {file.fileName}
                          </a>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)} •{" "}
                            {formatDate(file.createdAt)}
                          </p>
                        </div>

                        {/* Download button */}
                        <a
                          href={file.url}
                          download={file.fileName}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-opacity"
                          title="Tải xuống"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                !uploadingFile && (
                  <p className="text-sm text-gray-500 py-2">
                    Chưa có tệp đính kèm nào.
                  </p>
                )
              )}
            </div>

            {/* --- Checklist (Placeholder) --- */}
            <div className="mb-6">
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                <span>abc</span>
              </label>
            </div>

            {/* --- Hành động (Xóa) --- */}
            <div className="mt-8 pt-4 border-t">
              <button
                onClick={handleDeleteTask}
                disabled={loading}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-100 rounded"
              >
                🗑️ Xóa Task
              </button>
            </div>
          </div>

          {/* ============ CỘT PHẢI (Nhận xét / Hoạt động) ============ */}
          <div className="w-2/5 p-6 bg-gray-50 border-l border-gray-200 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">
                Nhận xét và hoạt động
              </h3>
              <button className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded">
                Hiện chi tiết
              </button>
            </div>

            {/* --- Viết bình luận --- */}
            <div className="mb-6">
              <Editor
                apiKey={tinyApiKey}
                onInit={(evt, editor) => (commentEditorRef.current = editor)}
                initialValue={""}
                init={commentEditorConfig}
              />
              <div className="flex items-center gap-4 mt-2">
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  onClick={() => {
                    // TODO: Gọi API lưu comment
                    // const commentContent = commentEditorRef.current.getContent();
                    console.log(
                      "Lưu comment:",
                      commentEditorRef.current.getContent()
                    );
                    // Sau khi lưu, bạn có thể muốn xóa nội dung editor
                    // commentEditorRef.current.setContent('');
                    // Và tải lại danh sách hoạt động/comment
                  }}
                >
                  Lưu
                </button>
                <label className="flex items-center gap-1 text-sm text-gray-600">
                  <input type="checkbox" defaultChecked /> Theo dõi
                </label>
              </div>
            </div>

            {/* --- Luồng hoạt động (Placeholder) --- */}
            <div className="space-y-4">
              {/* Đây là nơi bạn sẽ map qua mảng comments/activities */}
              <div className="flex gap-2">
                <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-green-600 text-white font-bold text-sm">
                  V
                </span>
                <div>
                  <p className="text-sm">
                    <span className="font-semibold">vũ</span> đã thêm thẻ này
                    vào danh sách Thêm task mới
                  </p>
                  <span className="text-xs text-gray-500">
                    10:30 4 thg 11, 2025
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm transition-all duration-300 ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : toast.type === "error"
              ? "bg-red-500 text-white"
              : "bg-blue-500 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" && (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {toast.type === "error" && (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskModal;
