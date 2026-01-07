import toast from "react-hot-toast";

// Hàm strip HTML và làm sạch message để hiển thị trong toast
const stripHtmlAndTruncate = (html, maxLength = 150) => {
  if (!html) return "";

  // Tạo element tạm để lấy text thuần (cách an toàn nhất)
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  let text = tempDiv.textContent || tempDiv.innerText || "";

  // Xóa khoảng trắng thừa
  text = text.replace(/\s+/g, " ").trim();

  // Cắt ngắn nếu quá dài (thêm ... ở cuối)
  if (text.length > maxLength) {
    text = text.substring(0, maxLength).trim() + "...";
  }

  return text;
};

export const showCommentNotification = (data) => {
  const userId = localStorage.getItem("userId");

  // Không hiện toast cho chính người gửi
  if (data.sender.userId === userId) return;

  // Làm sạch message: bỏ HTML, chỉ lấy text + cắt ngắn
  const cleanMessage = stripHtmlAndTruncate(data.message, 120);

  toast.custom(
    (t) => (
      <div
        onClick={() => {
          window.location.href = `/boards/${data.boardId}/${encodeURIComponent(data.boardTitle || "board")}/${data.taskId}/${encodeURIComponent(data.taskTitle || "task")}`;
          toast.dismiss(t.id);
        }}
        className={`flex items-start cursor-pointer max-w-md w-full bg-white text-gray-800 rounded-lg shadow-lg border-l-4 border-blue-500 p-4 transition-all ${
          t.visible ? "animate-enter" : "animate-leave"
        }`}
      >
        {/* Avatar */}
        <img
          src={data.sender.avatar || "/default-avatar.png"}
          alt={data.sender.fullName}
          className="w-10 h-10 rounded-full mr-3 flex-shrink-0 object-cover border border-gray-200"
        />

        {/* Nội dung */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {data.sender.fullName}
          </p>

          {/* Hiển thị message đã được làm sạch */}
          <p className="text-sm text-gray-600 line-clamp-2 mt-1">
            {cleanMessage || "(Đã gửi tệp đính kèm)"}
          </p>

          <p className="text-xs text-gray-500 mt-2">
            Trong task: <span className="font-medium">{data.taskTitle || "Không có tiêu đề"}</span>
          </p>
        </div>

        {/* Nút đóng */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(t.id);
          }}
          className="ml-4 text-gray-400 hover:text-gray-600 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    ),
    {
      duration: 5000,
      position: "top-right",
      id: `comment-alert-${data.commentId}`,
    }
  );
};