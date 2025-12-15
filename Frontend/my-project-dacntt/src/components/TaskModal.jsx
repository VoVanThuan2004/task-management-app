import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { ClockIcon, UserIcon, TagIcon, X } from "lucide-react";
import TaskHeader from "./TaskModal/TaskHeader";
import TaskDatePickerPopup from "./TaskModal/TaskDatePickerPopup";
import TaskDescription from "./TaskModal/TaskDescription";
import TaskMembersPopup from "./TaskModal/TaskMemberPopup";
import TaskActivityPanel from "./TaskModal/TaskActivityPanel";
import AttachmentItem from "./TaskModal/AttachmentItem";
import CheckItemsSection from "./TaskModal/CheckItemSection";
import AiChecklistModal from "./TaskModal/AiChecklistModal";
import { motion as Motion, AnimatePresence } from "framer-motion";

const TaskModal = ({
  task,
  isOpen,
  onClose,
  onTaskUpdate,
  isMember = false,
}) => {
  const isReadOnly = !isMember;
  const [editedTask, setEditedTask] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  const editorRef = useRef(null); // Ref cho editor MÔ TẢ

  const httpUrl = import.meta.env.VITE_API_URL;
  const accessToken = localStorage.getItem("accessToken");
  const tinyApiKey = import.meta.env.VITE_TINEY_APIKEY;

  // Thêm state cho upload
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const [showPopup, setShowPopup] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiCreatedItems, setAiCreatedItems] = useState(null);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState(5);
  const [startDate, setStartDate] = useState(null);
  const [dueDate, setDueDate] = useState(null);

  // State cho popup gán thành viên
  const [showMembersPopup, setShowMembersPopup] = useState(false);
  const membersButtonRef = useRef(null);

  // State cho popup nhãn dán
  const [showLabelsPopup, setShowLabelsPopup] = useState(false);
  const labelsButtonRef = useRef(null); // ref cho nút Nhãn dán
  const [boardLabels, setBoardLabels] = useState([]); // danh sách labels từ API
  const [loadingLabels, setLoadingLabels] = useState(false);

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

    // Khởi tạo socket mới
    const newSocket = io(httpUrl, {
      transports: ["websocket"],
      auth: { token: accessToken },
    });

    setSocket(newSocket);

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
      console.log("TaskModal received title update:", data);
      if (data._id === task._id) {
        setEditedTask((prev) => (prev ? { ...prev, title: data.title } : null));
      }
    });

    newSocket.on("deadlineTaskUpdated", (data) => {
      console.log("TaskModal received deadline update:", data);
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

    newSocket.on("taskLabelUpdated", (data) => {
      console.log("taskLabelUpdated:", data);

      if (data.taskId === task._id) {
        if (data.action === "added") {
          setEditedTask((prev) => ({
            ...prev,
            labels: [
              ...prev.labels,
              {
                labelId: data.labelId,
                title: data.title,
                color: data.color,
              },
            ],
          }));
        } else if (data.action === "removed") {
          setEditedTask((prev) => ({
            ...prev,
            labels: prev.labels.filter(
              (label) => label.labelId !== data.labelId
            ),
          }));
        }
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

  // useEffect(() => {
  //   if (task?._id) {
  //     fetchLabelsForTask();
  //   }
  // }, [task?._id]);

  const fetchLabelsForTask = async () => {
    setShowLabelsPopup(!showLabelsPopup);

    try {
      setLoadingLabels(true);
      const res = await axios.get(
        `${httpUrl}/api/v1/tasks-label/${editedTask._id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      setBoardLabels(res.data.data); // mỗi label có thêm field status: true/false
    } catch (err) {
      console.error(err);
      setToast({
        show: true,
        type: "error",
        message: "Không tải được nhãn dán",
      });
    } finally {
      setLoadingLabels(false);
    }
  };

  const handleToggleLabel = async (labelId) => {
    try {
      await axios.post(
        `${httpUrl}/api/v1/tasks-label`,
        { taskId: task._id, labelId },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      // Cập nhật local state
      setBoardLabels((prev) =>
        prev.map((label) =>
          label._id === labelId ? { ...label, status: !label.status } : label
        )
      );

      // Cập nhật editedTask nếu cần hiển thị labels đã gắn ở đâu đó
      // setEditedTask(res.data.task); // backend trả về task cập nhật (tùy bạn)
    } catch (err) {
      setToast({
        show: true,
        type: "error",
        message: "Lỗi khi cập nhật nhãn",
      });

      console.log(err);
    }
  };

  if (!isOpen) return null;

  if (!editedTask) {
    return (
      <AnimatePresence>
        <Motion.div
          key="loading-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <Motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
            className="bg-white rounded-lg p-6 shadow-xl"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-2">Đang tải...</p>
          </Motion.div>
        </Motion.div>
      </AnimatePresence>
    );
  }

  // ============ RENDER (Bố cục 2 cột) ============
  return (
    <AnimatePresence>
      <Motion.div
        key={`modal-overlay-${editedTask._id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      >
        <Motion.div
          key={`modal-content-${editedTask._id}`}
          initial={{
            scale: 0.9,
            opacity: 0,
            y: 20,
          }}
          animate={{
            scale: 1,
            opacity: 1,
            y: 0,
          }}
          exit={{
            scale: 0.9,
            opacity: 0,
            y: 20,
          }}
          transition={{
            duration: 0.3,
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col h-full shadow-2xl"
        >
          {/* Header với animation */}
          <Motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <TaskHeader
              title={editedTask.title}
              isEditingTitle={isEditingTitle}
              onTitleChange={(e) =>
                setEditedTask((prev) => ({ ...prev, title: e.target.value }))
              }
              onSaveTitle={handleSaveTitle}
              onEditTitle={() => setIsEditingTitle(true)}
              onClose={onClose}
              startDate={editedTask.startDate}
              dueDate={editedTask.dueDate}
              onStartDateChange={(date) =>
                setEditedTask((prev) => ({ ...prev, startDate: date }))
              }
              onDueDateChange={(date) =>
                setEditedTask((prev) => ({ ...prev, dueDate: date }))
              }
              isReadOnly={isReadOnly}
            />
          </Motion.div>

          {/* Thân modal chia 2 cột */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* ============ CỘT TRÁI (Nội dung) ============ */}
            <Motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="flex-1 overflow-y-auto p-6 min-w-0"
            >
              {/* --- Các nút hành động (Placeholder) --- */}
              <div className="flex flex-wrap gap-2 mb-6 relative">
                {/* === NÚT THỜI GIAN === */}
                <Motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-1 px-3 py-2 rounded text-sm transition ${
                    isReadOnly
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                  onClick={() => !isReadOnly && setShowPopup(!showPopup)}
                  disabled={isReadOnly}
                >
                  <ClockIcon className="w-4 h-4" /> Thời gian
                </Motion.button>

                {/* === NÚT NHÃN DÁN === */}
                <Motion.button
                  ref={labelsButtonRef}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-1 px-3 py-2 rounded text-sm transition ${
                    isReadOnly
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                  onClick={() => !isReadOnly && fetchLabelsForTask()}  // ← Dùng hàm mới
                  disabled={isReadOnly}
                >
                  <TagIcon className="w-4 h-4" />{" "}
                  {/* Thay ClockIcon bằng TagIcon hoặc LabelIcon */}
                  Nhãn dán
                </Motion.button>

                {/* === NÚT THÀNH VIÊN === */}
                <Motion.button
                  ref={membersButtonRef}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-1 px-3 py-2 rounded text-sm transition ${
                    isReadOnly
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                  onClick={() => !isReadOnly && handleOpenMembers()}
                  disabled={isReadOnly}
                >
                  <UserIcon className="w-4 h-4" /> Thành viên
                </Motion.button>

                {/* === NÚT GỢI Ý CHECKLIST (AI) === */}
                <Motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-1 px-3 py-2 rounded text-sm transition ${
                    isReadOnly
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                  onClick={() => !isReadOnly && setShowAiModal(true)}
                  disabled={isReadOnly}
                >
                  Gợi ý checklist (AI)
                </Motion.button>

                {/* === POPUP THỜI GIAN – CHỈ HIỆN KHI ĐƯỢC PHÉP === */}
                <AnimatePresence>
                  {showPopup && !isReadOnly && (
                    <Motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TaskDatePickerPopup
                        startDate={startDate}
                        dueDate={dueDate}
                        onStartDateChange={setStartDate}
                        onDueDateChange={setDueDate}
                        reminderEnabled={reminderEnabled}
                        onReminderToggle={(e) =>
                          setReminderEnabled(e.target.checked)
                        }
                        reminderMinutes={reminderMinutes}
                        onReminderMinutesChange={(e) =>
                          setReminderMinutes(Number(e.target.value))
                        }
                        onClose={() => setShowPopup(false)}
                        onSave={handleSaveDate}
                      />
                    </Motion.div>
                  )}
                </AnimatePresence>
                {/* === POPUP AI CHECKLIST === */}
                <AnimatePresence>
                  {showAiModal && !isReadOnly && (
                    <AiChecklistModal
                          taskId={task._id}
                          accessToken={accessToken}
                          initialTitle={editedTask?.title}
                          initialDescription={editedTask?.description}
                          onClose={() => setShowAiModal(false)}
                          onSaved={(created) => {
                            setShowAiModal(false);
                            // store created check items so CheckItemSection can append them
                            setAiCreatedItems(created || []);
                            onTaskUpdate && onTaskUpdate();
                          }}
                        />
                  )}
                </AnimatePresence>

                {/* === POPUP THÀNH VIÊN – CHỈ HIỆN KHI ĐƯỢC PHÉP === */}
                <AnimatePresence>
                  {showMembersPopup && !isReadOnly && (
                    <Motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TaskMembersPopup
                        boardId={editedTask.boardId}
                        taskId={task._id}
                        onClose={() => setShowMembersPopup(false)}
                        triggerRect={membersButtonRef.current?.getBoundingClientRect()}
                        onMemberAssign={() => {
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
                    </Motion.div>
                  )}
                </AnimatePresence>

                {/* === POPUP NHÃN DÁN + OVERLAY ĐÓNG KHI CLICK NGOÀI === */}
                <AnimatePresence>
                  {showLabelsPopup && !isReadOnly && (
                    <>
                      {/* Overlay trong suốt - click vào đây để đóng */}
                      <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-40" // z-40 để dưới popup (popup z-50)
                        onClick={() => setShowLabelsPopup(false)} // ← ĐÓNG KHI CLICK RA NGOÀI
                      />

                      {/* Popup chính */}
                      <Motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="fixed z-50" // cao hơn overlay
                        style={{
                          left: labelsButtonRef.current
                            ? labelsButtonRef.current.getBoundingClientRect()
                                .left
                            : 0,
                          top: labelsButtonRef.current
                            ? labelsButtonRef.current.getBoundingClientRect()
                                .bottom + 8
                            : 0,
                        }}
                        // Quan trọng: ngăn sự kiện click lan ra overlay khi click vào popup
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-80 max-h-96 overflow-hidden">
                          {/* Header */}
                          <div className="p-4 border-b border-gray-200 relative">
                            <h3 className="text-lg font-semibold text-gray-800 pr-8">
                              Nhãn dán
                            </h3>
                            <button
                              onClick={() => setShowLabelsPopup(false)}
                              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Danh sách labels */}
                          <div className="overflow-y-auto max-h-80">
                            {loadingLabels ? (
                              <div className="p-8 text-center text-gray-500">
                                <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                              </div>
                            ) : boardLabels?.length === 0 ? (
                              <p className="text-center text-gray-500 py-8">
                                Chưa có nhãn nào trong bảng làm việc
                              </p>
                            ) : (
                              <div className="p-2">
                                {boardLabels.map((label) => (
                                  <Motion.button
                                    key={label._id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleToggleLabel(label._id)}
                                    className="w-full flex items-center justify-between p-3 rounded-lg mb-2 transition hover:bg-gray-50"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="w-10 h-8 rounded flex-shrink-0"
                                        style={{
                                          backgroundColor:
                                            label.color || "#6b7280",
                                        }}
                                      />
                                      <span className="text-sm font-medium text-gray-800">
                                        {label.title}
                                      </span>
                                    </div>

                                    {label.status && (
                                      <svg
                                        className="w-5 h-5 text-green-600 flex-shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={3}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    )}
                                  </Motion.button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* --- Nhãn (Labels) --- */}
              {editedTask.labels && editedTask.labels.length > 0 && (
                <Motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="mb-6"
                >
                  <h3 className="text-xs font-semibold text-gray-500 mb-1">
                    Nhãn
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {editedTask.labels.map((label, index) => (
                      <Motion.span
                        key={label.labelId || index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: 0.3 + index * 0.05,
                          duration: 0.3,
                        }}
                        className={`
            text-xs px-3 py-1 rounded font-medium
            ${
              label.color &&
              label.color.toLowerCase() !== "#ffffff" &&
              label.color.toLowerCase() !== "#fff"
                ? `bg-[${label.color}] text-white shadow-sm` // Dùng màu custom từ DB cho nền
                : "bg-gray-200 text-gray-700" // Màu mặc định nếu không có màu hoặc màu trắng
            }
          `}
                        style={
                          label.color &&
                          label.color.toLowerCase() !== "#ffffff" &&
                          label.color.toLowerCase() !== "#fff"
                            ? { backgroundColor: label.color }
                            : {}
                        }
                      >
                        {label.title}
                      </Motion.span>
                    ))}
                  </div>
                </Motion.div>
              )}

              {/* --- Ngày & Trạng thái --- */}
              <Motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="mb-6"
              >
                <h3 className="text-xs font-semibold text-gray-500 mb-1">
                  Ngày
                </h3>
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
                    <Motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.25, duration: 0.3 }}
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
                    </Motion.span>
                  )}
                </div>
              </Motion.div>

              {/* --- Mô tả (Giữ nguyên logic) --- */}
              <Motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              >
                <TaskDescription
                  description={editedTask?.description || ""}
                  isEditingDescription={isEditingDescription}
                  onEditDescription={setIsEditingDescription}
                  onSaveDescription={handleSaveDescription}
                  onCancelDescription={handleCancelDescription}
                  loading={loading}
                  tinyApiKey={tinyApiKey}
                  descriptionEditorConfig={descriptionEditorConfig}
                  isReadOnly={isReadOnly}
                />
              </Motion.div>

              {/* --- Tệp đính kèm --- */}
              <Motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="mb-6"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-700">
                    Các tệp đính kèm
                  </h3>

                  {/* Nút "Thêm" – chỉ hiện khi ĐƯỢC PHÉP */}
                  {!isReadOnly && (
                    <Motion.label
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`text-sm px-3 py-1.5 rounded transition-colors select-none cursor-pointer ${
                        uploadingFile
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {uploadingFile ? "Đang tải lên..." : "Thêm"}
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadingFile || isReadOnly}
                      />
                    </Motion.label>
                  )}
                </div>

                {/* Uploading indicator */}
                <AnimatePresence>
                  {uploadingFile && (
                    <Motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-2"
                    >
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-800">
                          Đang tải lên...
                        </p>
                        <p className="text-xs text-blue-600">
                          {uploadingFileName}
                        </p>
                      </div>
                    </Motion.div>
                  )}
                </AnimatePresence>

                {/* Danh sách file */}
                {editedTask.attachments?.length > 0 ? (
                  <Motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.3 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    <AnimatePresence>
                      {editedTask.attachments.map((file, idx) => (
                        <Motion.div
                          key={file._id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{
                            delay: 0.35 + idx * 0.05,
                            duration: 0.3,
                          }}
                        >
                          <AttachmentItem
                            file={file}
                            getFileIcon={getFileIcon}
                            formatFileSize={formatFileSize}
                            onDelete={
                              !isReadOnly ? handleDeleteAttachment : undefined
                            }
                            accessToken={accessToken}
                            isReadOnly={isReadOnly}
                          />
                        </Motion.div>
                      ))}
                    </AnimatePresence>
                  </Motion.div>
                ) : (
                  !uploadingFile && (
                    <Motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.35, duration: 0.3 }}
                      className="text-sm text-gray-500 py-3 text-center italic"
                    >
                      {isReadOnly
                        ? "Không có tệp đính kèm"
                        : "Chưa có tệp đính kèm nào."}
                    </Motion.p>
                  )
                )}
              </Motion.div>

              {/* --- CheckItems (Placeholder) --- */}
              <Motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <CheckItemsSection
                  key={editedTask._id}
                  taskId={editedTask._id}
                  accessToken={accessToken}
                  socket={socket}
                  isReadOnly={isReadOnly}
                  aiCreatedItems={aiCreatedItems}
                />
              </Motion.div>

              {/* --- Hành động (Xóa) --- */}
              <Motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.3 }}
                className="mt-8 pt-4 border-t"
              >
                <Motion.button
                  whileHover={{ backgroundColor: "#fee2e2" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeleteTask}
                  disabled={loading}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-100 rounded transition-colors"
                >
                  🗑️ Xóa Task
                </Motion.button>
              </Motion.div>
            </Motion.div>

            {/* ============ CỘT PHẢI (Nhận xét / Hoạt động) ============ */}
            <Motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="w-2/5 min-w-0 flex flex-col bg-gray-50 border-l border-gray-200"
            >
              <TaskActivityPanel
                key={editedTask._id}
                taskId={editedTask._id}
                boardId={editedTask.boardId}
                tinyApiKey={tinyApiKey}
                commentEditorConfig={commentEditorConfig}
                accessToken={accessToken}
                socket={socket}
                isReadOnly={isReadOnly}
              />
            </Motion.div>
          </div>
        </Motion.div>
      </Motion.div>

      {/* Toast Notification với animation */}
      <AnimatePresence>
        {toast.show && (
          <Motion.div
            key="toast"
            initial={{ opacity: 0, x: 400, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 400, y: -20 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
            className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${
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
          </Motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default TaskModal;
