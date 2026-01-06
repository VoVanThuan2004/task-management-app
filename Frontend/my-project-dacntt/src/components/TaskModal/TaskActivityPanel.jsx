import React, { useState, useRef, useEffect, useCallback } from "react";
import { Editor } from "@tinymce/tinymce-react";
import {
  MessageCircle,
  Bell,
  Loader2,
  Paperclip,
  X,
  Smile,
  Edit2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import axios from "axios";
import Picker from "emoji-picker-react";
import TaskActivityLog from "../TaskModal/TaskActivityLog";
import Avatar from "../Avatar";
import toast from "react-hot-toast";
import { AnimatePresence, motion as Motion } from "framer-motion";

const TABS = { COMMENTS: "comments", ACTIVITY: "activity" };

const TaskActivityPanel = ({
  taskId,
  boardId,
  tinyApiKey,
  commentEditorConfig,
  accessToken,
  socket, // Truyền socket từ modal
  isReadOnly,
}) => {
  const [activeTab, setActiveTab] = useState(TABS.COMMENTS);
  const [comments, setComments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalComments, setTotalComments] = useState(0); // ← thêm state này
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);

  const commentEditorRef = useRef(null);
  const [files, setFiles] = useState([]); // File đính kèm
  const fileInputRef = useRef(null);
  const httpUrl = import.meta.env.VITE_API_URL;
  const userId = localStorage.getItem("userId");
  const limit = 10; // cố định

  const [activityCount, setActivityCount] = useState(0);

  // === Tải comment ===
  const fetchComments = useCallback(
    async (pageNum = 1, append = false) => {
      if (loading || sending) return; // ← THÊM sending
      setLoadingMore(pageNum > 1);
      setLoading(pageNum === 1);

      try {
        const res = await axios.get(
          `${httpUrl}/api/v1/comments/${taskId}?page=${pageNum}&limit=${limit}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const { data, totalPages, totalComments } = res.data;
        setComments((prev) => (append ? [...prev, ...data] : data));
        setTotalComments(totalComments);
        setTotalPages(totalPages);
        setPage(pageNum + 1);
        setHasMore(pageNum < totalPages);
      } catch (err) {
        console.error("Lỗi khi tải comment:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [taskId, accessToken] // ← THÊM sending
  );

  useEffect(() => {
    if (activeTab === TABS.COMMENTS && taskId) {
      fetchComments(1, false);
    }
  }, [activeTab, taskId, fetchComments]);

  // === Tải tổng số hoạt động ===
  const fetchTotalActivityLogs = async () => {
    try {
      const res = await axios.get(
        `${httpUrl}/api/v1/activity-log/${taskId}/count`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setActivityCount(res.data.data);
    } catch (error) {
      console.log(error);
      toast.error("Lỗi hệ thống khi tải hoạt động task");
    }
  };

  useEffect(() => {
    fetchTotalActivityLogs();
  }, [taskId]);

  // === Socket: nhận comment mới ===
  useEffect(() => {
    if (!socket) return;

    socket.emit("joinBoard", boardId);

    const handleNewComment = (data) => {
      if (data.taskId === taskId) {
        setComments((prev) => {
          // Tránh duplicate (an toàn)
          const exists = prev.some(
            (c) => c._id?.toString() === data.comment._id?.toString()
          );
          if (exists) return prev;

          return [data.comment, ...prev];
        });

        // Cập nhật totalComments & totalPages từ backend → chính xác 100%
        if (data.totalComments != null) {
          setTotalComments(data.totalComments);
          setTotalPages(Math.ceil(data.totalComments / limit));
          setHasMore(data.totalComments > comments.length + 1);
        }
      }
    };

    const handleDeleteComment = (data) => {
      if (data.taskId === taskId) {
        setComments((prev) => prev.filter((c) => c._id !== data.commentId));

        // Cập nhật total nếu backend gửi, hoặc tự giảm 1
        if (data.totalComments != null) {
          setTotalComments(data.totalComments);
          setTotalPages(Math.ceil(data.totalComments / limit));
        } else {
          setTotalComments((prev) => Math.max(0, prev - 1));
          setTotalPages(Math.ceil(Math.max(0, totalComments - 1) / limit));
        }
      }
    };

    // HÀM CẬP NHẬT TIN NHẮN MESSAGE
    const handleUpdateComment = (data) => {
      const {
        commentId,
        taskId: socketTaskId,
        message,
        isEdited,
        newAttachments,
        deletedFiles,
      } = data;

      // Chỉ update comment của task đang mở
      if (socketTaskId !== taskId) return;

      setComments((prev) =>
        prev.map((comment) => {
          if (comment._id?.toString() !== commentId?.toString()) {
            return comment;
          }

          return {
            ...comment,
            message,
            isEdited,

            // Thêm file mới
            attachments: [
              ...(comment.attachments || []),
              ...(newAttachments || []),
            ],

            // Xóa file bị delete
            ...(deletedFiles?.length > 0 && {
              attachments: (comment.attachments || []).filter(
                (att) => !deletedFiles.includes(att.filePublicId)
              ),
            }),
          };
        })
      );
    };

    // NHẬN REACTION REALTIME
    const handleEmojiUpdated = (data) => {
      setComments((prev) =>
        prev.map((c) =>
          c._id === data.commentId
            ? {
                ...c,
                emojiSummary: data.emojiStats.map((e) => ({
                  emoji: e._id,
                  count: e.count,
                })),
              }
            : c
        )
      );
    };

    socket.on("comment:new", handleNewComment);
    socket.on("comment:updated", handleUpdateComment);

    socket.on("comment:deleted", handleDeleteComment);
    socket.on("comment:emojiUpdated", handleEmojiUpdated);

    return () => {
      socket.off("comment:new", handleNewComment);
      socket.off("comment:updated", handleUpdateComment);

      socket.off("comment:deleted", handleDeleteComment);
      socket.off("comment:emojiUpdated", handleEmojiUpdated);
      socket.emit("leaveBoard", boardId);
    };
  }, [socket, boardId, taskId, userId]);

  // === Xử lý file ===
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = null;
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // === Gửi comment + file ===
  const handleSaveComment = async () => {
    const content = commentEditorRef.current?.getContent()?.trim();
    if (!content && files.length === 0) return;

    const formData = new FormData();
    formData.append("taskId", taskId);
    formData.append("message", content || "");
    files.forEach((file) => formData.append("files", file));

    try {
      setSending(true);
      await axios.post(`${httpUrl}/api/v1/comments`, formData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // Chỉ reset form - comment mới sẽ đến từ socket
      commentEditorRef.current?.setContent("");
      setFiles([]);
    } catch (err) {
      console.error("Lỗi khi gửi comment:", err);
    } finally {
      setSending(false);
    }
  };

  // === XÓA COMMENT ===
  const handleDeleteComment = async (commentId) => {
    if (!commentId) return;
    
    try {
      await axios.delete(`${httpUrl}/api/v1/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      console.error("Lỗi xóa comment:", err);
      alert("Không thể xóa bình luận. Vui lòng thử lại.");
    }
  };

  // === THẢ EMOJI ===
  const handleEmojiReaction = async (commentId, emoji) => {
    try {
      await axios.post(
        `${httpUrl}/api/v1/comments-emoji`,
        { commentId, emoji },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } catch (err) {
      console.error("Lỗi thả emoji:", err);
    }
  };

  if (isReadOnly === true) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-500">
        Bạn không có quyền xem bình luận và hoạt động
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* === Tabs === */}
      <div className="flex gap-1 mb-5 border-b border-gray-200 px-6 pt-6 shrink-0">
        <button
          onClick={() => setActiveTab(TABS.COMMENTS)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === TABS.COMMENTS
              ? "bg-white text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          <MessageCircle size={16} />
          Thảo luận
          {comments.length > 0 && (
            <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
              {comments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab(TABS.ACTIVITY)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === TABS.ACTIVITY
              ? "bg-white text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          <Bell size={16} />
          Thông báo hoạt động
          {activityCount > 0 && (
            <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
              {activityCount}
            </span>
          )}
        </button>
      </div>

      {/* === Nội dung cuộn được === */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        {activeTab === TABS.COMMENTS ? (
          <>
            <span className="hidden">{totalPages}</span>
            {/* === Viết bình luận === */}
            <div className="mb-6 bg-white rounded-lg shadow-sm p-3">
              <Editor
                apiKey={tinyApiKey}
                onInit={(evt, editor) => (commentEditorRef.current = editor)}
                initialValue=""
                init={{
                  ...commentEditorConfig,
                  height: 120,
                  placeholder: "Viết bình luận...",
                }}
              />

              {/* File đính kèm */}
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-gray-50 p-2 rounded border"
                    >
                      <span className="text-xs text-gray-700 truncate max-w-[180px]">
                        {file.name}
                      </span>
                      <button
                        onClick={() => removeFile(i)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-500 hover:text-gray-700 p-1"
                    title="Đính kèm file"
                  >
                    <Paperclip size={18} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveComment}
                    disabled={sending}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {sending && <Loader2 size={14} className="animate-spin" />}
                    Gửi
                  </button>
                </div>
              </div>
            </div>

            {/* === Danh sách comment === */}
            <div className="space-y-5">
              {loading && comments.length === 0 ? (
                <div className="text-center py-8">
                  <Loader2
                    className="mx-auto animate-spin text-gray-400"
                    size={24}
                  />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-8">
                  Chưa có bình luận nào.
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment._id}>
                    <CommentItem
                      comment={comment}
                      onDelete={handleDeleteComment}
                      handleEmojiReaction={handleEmojiReaction}
                      tinyApiKey={tinyApiKey}
                      commentEditorConfig={commentEditorConfig}
                    />
                  </div>
                ))
              )}

              {/* === Nút Xem thêm / Tải thêm === */}
              {loadingMore ? (
                // 1. Nếu đang tải thêm -> Hiển thị spinner
                <div className="flex justify-center py-3">
                  <Loader2 className="animate-spin text-gray-400" size={20} />
                </div>
              ) : hasMore ? (
                // 2. Nếu còn trang (hasMore) -> Hiển thị nút
                <div className="text-center py-3">
                  <button
                    onClick={() => fetchComments(page, true)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Xem thêm bình luận ...
                  </button>
                </div>
              ) : null}
              {/* 3. Nếu không còn trang -> Không hiển thị gì */}
            </div>
          </>
        ) : (
          <TaskActivityLog
            taskId={taskId}
            socket={socket}
            onTotalChange={setActivityCount}
          />
        )}
      </div>
    </div>
  );
};

/* === Comment Item === */
const CommentItem = ({
  comment,
  onDelete,
  handleEmojiReaction,
  tinyApiKey,
  commentEditorConfig,
}) => {
  const user = comment.user || {};
  const currentUserId = localStorage.getItem("userId");
  const isMyComment = comment.user._id === currentUserId;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef(null);
  const commentRef = useRef(null);
  const [showActionsMenu, setShowActionsMenu] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState(comment.message || "");
  const [editFiles, setEditFiles] = useState([]); // file mới thêm khi edit
  const [deletedFiles, setDeletedFiles] = useState([]); // publicId file muốn xóa
  const [editing, setEditing] = useState(false);

  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const httpUrl = import.meta.env.VITE_API_URL;

  const time = new Date(comment.createdAt).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });

  const onEmojiClick = (emojiData) => {
    handleEmojiReaction(comment._id, emojiData.emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    const handleClickOutside = () => setShowActionsMenu(null);
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Đóng emoji picker khi click ra ngoài
  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (e) => {
      // Nếu click KHÔNG nằm trong comment item HOẶC picker → đóng
      if (
        commentRef.current &&
        !commentRef.current.contains(e.target) &&
        pickerRef.current &&
        !pickerRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  // Hàm xử lý cập nhật comment
  const handleUpdateComment = async () => {
    if (
      !editMessage.trim() &&
      editFiles.length === 0 &&
      deletedFiles.length === 0
    ) {
      setIsEditing(false);
      return;
    }

    setEditing(true);
    try {
      const formData = new FormData();
      formData.append("message", editMessage);

      if (deletedFiles.length > 0) {
        formData.append("deletedFiles", JSON.stringify(deletedFiles));
      }

      editFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await axios.put(
        `${httpUrl}/api/v1/comments/${comment._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data.status === "success") {
        toast.success("Cập nhật bình luận thành công");
        setIsEditing(false);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Lỗi khi cập nhật bình luận"
      );
    } finally {
      setEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditMessage(comment.message || "");
    setEditFiles([]);
    setDeletedFiles([]);
  };

  // Xử lý xóa file khi đang edit
  const handleRemoveExistingFile = (publicId) => {
    setDeletedFiles((prev) => [...prev, publicId]);
  };

  const handleRemoveNewFile = (index) => {
    setEditFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex gap-3 group relative" ref={commentRef}>
      {/* Avatar */}
      <Avatar user={user} size="w-10 h-10" />

      <div className="flex-1">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-800">
              {user.fullName || "Người dùng"}
              {comment.isEdited && (
                <span className="text-xs text-gray-500 ml-1">
                  (đã chỉnh sửa)
                </span>
              )}
            </p>

            {isMyComment && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActionsMenu(comment._id); // mở menu cho comment này
                  }}
                  className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  title="Tùy chọn"
                >
                  <MoreHorizontal
                    size={14}
                    className="text-gray-500 hover:text-gray-700"
                  />
                </button>

                {/* Popup menu nhỏ */}
                <AnimatePresence>
                  {showActionsMenu === comment._id && (
                    <Motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10"
                      onClick={(e) => e.stopPropagation()} // ngăn đóng khi click vào menu
                    >
                      {/* Nút Chỉnh sửa */}
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowActionsMenu(false);
                          setTimeout(() => editorRef.current?.focus(), 100);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        <Edit2 size={15} />
                        Chỉnh sửa
                      </button>

                      {/* Nút Xóa */}
                      <button
                        onClick={() => {
                          onDelete(comment._id);
                          setShowActionsMenu(null);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 size={15} />
                        Xóa
                      </button>
                    </Motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <Editor
                apiKey={tinyApiKey}
                onInit={(evt, editor) => (editorRef.current = editor)}
                value={editMessage}
                onEditorChange={(content) => setEditMessage(content)}
                init={{
                  ...commentEditorConfig,
                  height: 150,
                  placeholder: "Chỉnh sửa bình luận...",
                }}
              />

              {/* File hiện tại - có thể xóa */}
              {comment.attachments?.filter(
                (f) => !deletedFiles.includes(f.filePublicId)
              ).length > 0 && (
                <div className="space-y-2">
                  {comment.attachments
                    .filter((f) => !deletedFiles.includes(f.filePublicId))
                    .map((file) => (
                      <div
                        key={file._id}
                        className="flex items-center justify-between bg-gray-50 p-2 rounded border"
                      >
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          className="text-xs text-blue-600 truncate max-w-[200px]"
                        >
                          {file.fileName}
                        </a>
                        <button
                          onClick={() =>
                            handleRemoveExistingFile(file.filePublicId)
                          }
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {/* File mới thêm */}
              {editFiles.length > 0 && (
                <div className="space-y-2">
                  {editFiles.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-blue-50 p-2 rounded border"
                    >
                      <span className="text-xs text-blue-700 truncate max-w-[200px]">
                        {file.name}
                      </span>
                      <button
                        onClick={() => handleRemoveNewFile(i)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Nút thêm file + hành động */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <Paperclip size={18} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setEditFiles((prev) => [
                        ...prev,
                        ...Array.from(e.target.files),
                      ]);
                    }
                  }}
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleUpdateComment}
                    disabled={editing}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
                  >
                    {editing && <Loader2 size={14} className="animate-spin" />}
                    Lưu
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Nội dung bình luận bình thường */}
              <div
                className="text-sm text-gray-700 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: comment.message }}
              />

              {/* File đính kèm */}
              {comment.attachments?.length > 0 && (
                <div className="mt-3 space-y-2">
                  {comment.attachments.map((file) => (
                    <a
                      key={file._id}
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded border hover:bg-gray-100 transition"
                    >
                      <Paperclip size={14} className="text-gray-500" />
                      <span className="text-xs text-blue-600 truncate max-w-[180px]">
                        {file.fileName}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({(file.fileSize / 1024).toFixed(1)} KB)
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER: Time + Emoji */}
        <div className="flex items-center justify-between mt-1 ml-3">
          <p className="text-xs text-gray-500">{time}</p>

          <div className="flex items-center gap-1">
            {/* Hiển thị emoji đã thả */}
            {comment.emojiSummary?.length > 0 && (
              <>
                {comment.emojiSummary.map((e) => (
                  <button
                    key={e.emoji}
                    onClick={() => handleEmojiReaction(comment._id, e.emoji)}
                    className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-all
                      ${
                        e.count > 1
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-gray-100 text-gray-700"
                      }
                      hover:scale-110 hover:shadow-sm`}
                  >
                    {e.emoji} {e.count > 1 && e.count}
                  </button>
                ))}
              </>
            )}

            {/* Nút mở Emoji Picker */}
            <div className="relative" ref={pickerRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors" // Thêm/điều chỉnh màu
                title="Thả cảm xúc"
              >
                <Smile size={16} /> {/* <--- Thay thế ở đây */}
              </button>

              {/* EMOJI PICKER – GIỐNG TRELLO */}
              {showEmojiPicker && (
                <div
                  className="absolute bottom-6 right-0 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Picker
                    onEmojiClick={onEmojiClick}
                    previewPosition="none"
                    searchPlaceholder="Tìm emoji..."
                    skinTonePosition="none"
                    native={true}
                    emojiStyle="native"
                    height={350}
                    width={300}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskActivityPanel;
