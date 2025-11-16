import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { ClockIcon, UserIcon } from "lucide-react"; // icon ví dụ
import TaskHeader from "./TaskModal/TaskHeader";
import TaskDatePickerPopup from "./TaskModal/TaskDatePickerPopup";
import TaskDescription from "./TaskModal/TaskDescription";
import TaskMembersPopup from "./TaskModal/TaskMemberPopup";
import TaskActivityPanel from "./TaskModal/TaskActivityPanel";
import AttachmentItem from "./TaskModal/AttachmentItem";

const TaskModal = ({ task, isOpen, onClose, onTaskUpdate }) => {
  const [editedTask, setEditedTask] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  const editorRef = useRef(null); // Ref cho editor MÔ TẢ
  // const commentEditorRef = useRef(null); // Ref cho editor COMMENT

  const httpUrl = import.meta.env.VITE_API_URL;
  const accessToken = localStorage.getItem("accessToken");
  const tinyApiKey = "emhcwa82lifw8ojhx436lj1rojy25bicl8d8ubfgavndvybz"; // API key của bạn

  // Thêm state cho upload
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const [showPopup, setShowPopup] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState(5);
  const [startDate, setStartDate] = useState(null);
  const [dueDate, setDueDate] = useState(null);

  // State cho popup gán thành viên
  const [showMembersPopup, setShowMembersPopup] = useState(false);
  const membersButtonRef = useRef(null);

  // State cho comment (thảo luận)
  // const [comments, setComments] = useState([]);
  const [activities] = useState([]); // Nếu có API

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

  // let socket;
  useEffect(() => {
    if (!isOpen || !task?._id) return;

    // Khởi tạo socket mới
    const newSocket = io(httpUrl, {
      // ⬅️ Đổi thành 'const newSocket'
      transports: ["websocket"],
      auth: { token: accessToken },
    });

    setSocket(newSocket); // ✅ CẬP NHẬT STATE

    newSocket.emit("joinBoard", task.boardId);

    newSocket.on("descriptionTaskUpdated", (data) => {
      console.log("📝 TaskModal received description update:", data);
      if (data._id === task._id) {
        setEditedTask((prev) =>
          prev ? { ...prev, description: data.description } : null
        );
      }
    });

    newSocket.on("taskTitleUpdated", (data) => {
      console.log("📝 TaskModal received title update:", data);
      if (data._id === task._id) {
        setEditedTask((prev) => (prev ? { ...prev, title: data.title } : null));
      }
    });

    newSocket.on("deadlineTaskUpdated", (data) => {
      console.log("📝 TaskModal received deadline update:", data);
      if (data._id === task._id) {
        setEditedTask((prev) =>
          prev
            ? {
                ...prev,
                startDate: data.startDate,
                dueDate: data.dueDate,
                reminderEnabled: data.reminderEnabled,
                reminderTime: data.reminderTime,
              }
            : null
        );
      }
    });

    const handleNewAttachment = (data) => {
      if (data.taskId === task._id) {
        setEditedTask((prev) => ({
          ...prev,
          attachments: [data.attachment, ...prev.attachments],
        }));
      }
    };

    newSocket.on("attachment:new", handleNewAttachment);

    // Upload comment
    const handleCommentAttachment = (data) => {
      if (data.taskId !== task._id || !Array.isArray(data.attachments)) return;
      const valid = data.attachments.filter((a) => a?._id);
      if (valid.length === 0) return;
      setEditedTask((prev) => ({
        ...prev,
        attachments: [...valid, ...(prev.attachments || [])],
      }));
    };

    newSocket.on("comment:attachment:new", handleCommentAttachment);

    const handleDelete = (data) => {
      if (data.taskId === task._id) {
        handleDeleteAttachment(data.attachmentId);
      }
    };

    newSocket.on("attachment:deleted", handleDelete);

    return () => {
      newSocket.emit("leaveBoard", task.boardId);
      newSocket.disconnect();
    };
  }, [isOpen, task?._id, task?.boardId, accessToken]);

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

  // const uploadAttachment = async (file) => {
  //   const formData = new FormData();
  //   formData.append("file", file);
  //   formData.append("taskId", task._id);

  //   const res = await axios.post(
  //     `${httpUrl}/api/v1/tasks-attachment`,
  //     formData,
  //     {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //         "Content-Type": "multipart/form-data",
  //       },
  //     }
  //   );
  //   return res.data;
  // };

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

  const handleSaveDescription = async (content = null) => {
    setLoading(true);
    try {
      let descriptionContent = content;

      // Nếu không có content từ prop, thử lấy từ editorRef (nếu có)
      if (!descriptionContent && editorRef.current) {
        descriptionContent = editorRef.current.getContent().trim();
      }

      // Validate content
      if (descriptionContent) {
        const plainText = descriptionContent
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (!plainText) {
          descriptionContent = "";
        }
      }

      console.log("📝 Saving description:", descriptionContent);

      // Gọi API cập nhật
      await updateTaskDescription(descriptionContent || "");

      // Cập nhật state local
      setEditedTask((prev) => ({
        ...prev,
        description: descriptionContent || "",
      }));

      setIsEditingDescription(false);
      onTaskUpdate();

      showToast("Mô tả đã được cập nhật", "success");
    } catch (error) {
      console.error("❌ Lỗi khi lưu mô tả:", error);
      showToast("Lỗi khi cập nhật mô tả", "error");
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

  // const formatDate = (dateString) => {
  //   if (!dateString) return "";
  //   return new Date(dateString).toLocaleDateString("vi-VN");
  // };

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

    const formData = new FormData();
    formData.append("file", file);
    formData.append("taskId", editedTask._id);

    try {
      await axios.post(`${httpUrl}/api/v1/tasks-attachment`, formData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      });

      showToast("Tệp đã được tải lên thành công", "success");
      // Không cần onTaskUpdate() → socket sẽ tự cập nhật
    } catch (error) {
      console.error("Lỗi khi tải lên tệp:", error);
      showToast("Lỗi khi tải lên tệp", "error");
    } finally {
      setUploadingFile(false);
      setUploadingFileName("");
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

  // API CẬP NHẬT DEADLINE
  const handleSaveDate = async () => {
    setShowPopup(false);
    setLoading(true);

    try {
      const payload = {
        startDate: startDate ? startDate.toISOString() : null,
        dueDate: dueDate ? dueDate.toISOString() : null,
        reminderEnabled,
        reminderTime: reminderMinutes,
      };

      // Gọi API update deadline
      const response = await axios.put(
        `${httpUrl}/api/v1/tasks/${task._id}/deadline`,
        payload,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const updatedTask = response.data.data;

      // Cập nhật state local ngay lập tức
      setEditedTask((prev) => ({
        ...prev,
        ...updatedTask,
      }));

      showToast("Ngày giờ đã được cập nhật", "success");
    } catch (error) {
      console.error("❌ Cập nhật ngày giờ thất bại:", error);
      showToast("Cập nhật ngày giờ thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMembers = () => {
    setShowMembersPopup(true);
  };

  // === XÓA FILE ===
  const handleDeleteAttachment = (attachmentId) => {
    setEditedTask((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a._id !== attachmentId),
    }));
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
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col h-full">
        {/* Header */}
        <TaskHeader
          title={editedTask.title}
          isEditingTitle={isEditingTitle}
          onTitleChange={(e) =>
            setEditedTask((prev) => ({ ...prev, title: e.target.value }))
          }
          onSaveTitle={handleSaveTitle}
          onEditTitle={() => setIsEditingTitle(true)}
          onClose={onClose} // ✅ Sửa thành onClose
          startDate={editedTask.startDate}
          dueDate={editedTask.dueDate}
          onStartDateChange={(date) =>
            setEditedTask((prev) => ({ ...prev, startDate: date }))
          }
          onDueDateChange={(date) =>
            setEditedTask((prev) => ({ ...prev, dueDate: date }))
          }
        />

        {/* Thân modal chia 2 cột */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* ============ CỘT TRÁI (Nội dung) ============ */}
          <div className="flex-1 overflow-y-auto p-6 min-w-0">
            {/* --- Các nút hành động (Placeholder) --- */}
            <div className="flex flex-wrap gap-2 mb-6 relative">
              <button
                className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm"
                onClick={() => setShowPopup(!showPopup)}
              >
                <ClockIcon /> Thời gian
              </button>
              <button className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm">
                Nhãn
              </button>
              <button className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm">
                Việc cần làm
              </button>
              <button
                ref={membersButtonRef}
                className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm"
                onClick={handleOpenMembers}
              >
                <UserIcon className="w-4 h-4" /> Thành viên
              </button>

              {/* Popup */}
              {showMembersPopup && (
                <TaskMembersPopup
                  boardId={task.boardId}
                  taskId={task._id}
                  onClose={() => setShowMembersPopup(false)}
                  triggerRect={membersButtonRef.current?.getBoundingClientRect()}
                  onMemberAssign={() => {
                    // Cập nhật lại task hoặc toast
                    setToast({
                      show: true,
                      type: "success",
                      message: "Đã gán thành viên",
                    });
                  }}
                  onMemberUnassign={() => {
                    setToast({
                      show: true,
                      type: "success",
                      message: "Đã bỏ gán thành viên",
                    });
                  }}
                />
              )}

              {/* Nút thời gian */}
              {showPopup && (
                <TaskDatePickerPopup
                  startDate={startDate}
                  dueDate={dueDate}
                  onStartDateChange={setStartDate}
                  onDueDateChange={setDueDate}
                  reminderEnabled={reminderEnabled}
                  onReminderToggle={(e) => setReminderEnabled(e.target.checked)}
                  reminderMinutes={reminderMinutes}
                  onReminderMinutesChange={(e) =>
                    setReminderMinutes(Number(e.target.value))
                  }
                  onClose={() => setShowPopup(false)}
                  onSave={handleSaveDate}
                />
              )}
            </div>

            {/* --- Ngày & Trạng thái --- */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 mb-1">Ngày</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm">
                  {editedTask.startDate
                    ? new Date(editedTask.startDate).toLocaleString("vi-VN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Chưa có ngày bắt đầu"}{" "}
                  -{" "}
                  {editedTask.dueDate
                    ? new Date(editedTask.dueDate).toLocaleString("vi-VN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Chưa có ngày kết thúc"}
                </span>

                {/* === Trạng thái theo Trello === */}
                {editedTask.status && (
                  <span
                    className={`
          text-xs px-2 py-0.5 rounded-sm font-medium flex items-center gap-1
          ${
            editedTask.isCompleted === true
              ? "bg-green-100 text-green-700"
              : editedTask.status === "Quá hạn"
              ? "bg-red-100 text-red-700"
              : editedTask.status === "Gần tới hạn"
              ? "bg-yellow-100 text-yellow-700"
              : ""
          }
        `}
                  >
                    {editedTask.isCompleted === true && (
                      <>
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Hoàn tất
                      </>
                    )}
                    {editedTask.status === "Quá hạn" && (
                      <>
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Quá hạn
                      </>
                    )}
                    {editedTask.status === "Gần tới hạn" && (
                      <>
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 9.586V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Gần tới hạn
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* --- Mô tả (Giữ nguyên logic) --- */}
            <TaskDescription
              description={editedTask?.description || ""}
              isEditingDescription={isEditingDescription}
              onEditDescription={setIsEditingDescription}
              onSaveDescription={handleSaveDescription} // Truyền hàm xử lý lưu
              onCancelDescription={handleCancelDescription}
              loading={loading}
              tinyApiKey={tinyApiKey}
              descriptionEditorConfig={descriptionEditorConfig}
            />

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

              {/* Uploading indicator */}
              {uploadingFile && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800">
                      Đang tải lên...
                    </p>
                    <p className="text-xs text-blue-600">{uploadingFileName}</p>
                  </div>
                </div>
              )}

              {/* File list */}
              {editedTask.attachments?.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {editedTask.attachments.map((file) => (
                    <AttachmentItem
                      key={file._id}
                      file={file}
                      getFileIcon={getFileIcon}
                      formatFileSize={formatFileSize}
                      onDelete={handleDeleteAttachment}
                      accessToken={accessToken}
                    />
                  ))}
                </div>
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
          <div className="w-2/5 min-w-0 flex flex-col bg-gray-50 border-l border-gray-200">
            <TaskActivityPanel
              taskId={editedTask._id}
              boardId={task.boardId}
              tinyApiKey={tinyApiKey}
              commentEditorConfig={commentEditorConfig}
              accessToken={accessToken}
              socket={socket}
              activities={activities}
            />
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
