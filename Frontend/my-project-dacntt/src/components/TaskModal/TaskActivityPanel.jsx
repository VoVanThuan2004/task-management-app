import React, { useState, useRef, useEffect, useCallback } from "react";
import { Editor } from "@tinymce/tinymce-react";
import {
  MessageCircle,
  Bell,
  Loader2,
  Paperclip,
  X,
  Smile,
} from "lucide-react";
import axios from "axios";
import Picker from "emoji-picker-react";

const TABS = { COMMENTS: "comments", ACTIVITY: "activity" };

const TaskActivityPanel = ({
  taskId,
  boardId,
  tinyApiKey,
  commentEditorConfig,
  accessToken,
  activities = [],
  socket, // Truyền socket từ modal
}) => {
  const [activeTab, setActiveTab] = useState(TABS.COMMENTS);
  const [comments, setComments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);

  const commentEditorRef = useRef(null);
  const [files, setFiles] = useState([]); // File đính kèm
  const fileInputRef = useRef(null);

  const httpUrl = import.meta.env.VITE_API_URL;

  const userId = localStorage.getItem("userId");

  // === Tải comment ===
  const fetchComments = useCallback(
    async (pageNum = 1, append = false) => {
      if (loading || sending) return; // ← THÊM sending
      setLoadingMore(pageNum > 1);
      setLoading(pageNum === 1);

      try {
        const res = await axios.get(
          `${httpUrl}/api/v1/comments/${taskId}?page=${pageNum}&limit=10`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const { data, page, totalPages } = res.data;
        setComments((prev) => (append ? [...prev, ...data] : data));
        setPage(page + 1);
        setTotalPages(totalPages);
        setHasMore(page < totalPages);
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

  // === Socket: nhận comment mới ===
  useEffect(() => {
    if (!socket) return;

    socket.emit("joinBoard", boardId);

    const handleNewComment = (data) => {
      if (data.taskId === taskId && data.comment.user._id !== userId) {
        setComments((prev) => [data.comment, ...prev]);
      }
    };

    const handleDeleteComment = (data) => {
      if (data.taskId === taskId) {
        setComments((prev) => prev.filter((c) => c._id !== data.commentId));

        // setTotalPages((prev) => {
        //   const newTotal = prev * 10 - 1;
        //   return Math.max(1, Math.ceil(newTotal / 10));
        // });
      }
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
    socket.on("comment:deleted", handleDeleteComment);
    socket.on("comment:emojiUpdated", handleEmojiUpdated);

    return () => {
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

      const res = await axios.post(`${httpUrl}/api/v1/comments`, formData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // XÓA FORM
      commentEditorRef.current?.setContent("");
      setFiles([]);

      // LẤY COMMENT MỚI TỪ API RESPONSE
      const newComment = res.data.data?.comment;
      const attachments = res.data.data?.attachments || [];
      const fullName = res.data.data?.fullName;
      const avatar = res.data.data?.avatar;

      if (newComment) {
        setComments((prev) => [
          {
            ...newComment,
            user: {
              _id: res.data.data?.userId || userId, // ← THÊM _id
              fullName,
              avatar,
            },
            attachments,
            emojiSummary: [],
          },
          ...prev,
        ]);

        setTotalPages((prev) => Math.ceil((prev * 10 + 1) / 10));
      }

      console.log(boardId);
    } catch (err) {
      console.error("Lỗi khi gửi comment:", err);
      // Có thể thêm toast error
    } finally {
      setSending(false);
    }
  };

  // === XÓA COMMENT ===
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này?")) return;

    try {
      await axios.delete(`${httpUrl}/api/v1/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // XÓA TRONG UI
      // setComments((prev) => prev.filter((c) => c._id !== commentId));

      // // CẬP NHẬT totalPages
      // setTotalPages((prev) => {
      //   const newTotal = prev * 10 - 1;
      //   return Math.max(1, Math.ceil(newTotal / 10));
      // });

      // TẢI LẠI TRANG 1 ĐỂ ĐỒNG BỘ (phòng khi xóa comment ở trang khác)
      // fetchComments(1, false);
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
          /* === Hoạt động === */
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-8">
                Chưa có hoạt động nào.
              </p>
            ) : (
              activities.map((activity) => (
                <ActivityItem key={activity._id} activity={activity} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* === Comment Item === */
const CommentItem = ({ comment, onDelete, handleEmojiReaction }) => {
  const user = comment.user || {};
  const currentUserId = localStorage.getItem("userId");
  const isMyComment = comment.user._id === currentUserId;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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

  return (
    <div className="flex gap-3 group relative">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.fullName}
            className="w-9 h-9 rounded-full object-cover border"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            {user.fullName?.[0] || "U"}
          </div>
        )}
      </div>

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
              <button
                onClick={() => onDelete(comment._id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-red-500 hover:text-red-700"
              >
                Xóa
              </button>
            )}
          </div>

          {/* Nội dung */}
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
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded border hover:bg-gray-100 transition-colors"
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
            <div className="relative">
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
                    emojiStyle="native" // iOS/Android style
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

/* === Activity Item === */
const ActivityItem = ({ activity }) => {
  const user = activity.user || {};
  const time = new Date(activity.createdAt).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium">
          {user.fullName?.[0] || "U"}
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-800">
          <span className="font-medium">{user.fullName || "Người dùng"}</span>{" "}
          <span className="text-gray-600">
            đã {activity.action || "thực hiện hành động"}
          </span>
          {activity.target && (
            <span className="font-medium text-blue-600">
              {" "}
              {activity.target}
            </span>
          )}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{time}</p>
      </div>
    </div>
  );
};

export default TaskActivityPanel;
