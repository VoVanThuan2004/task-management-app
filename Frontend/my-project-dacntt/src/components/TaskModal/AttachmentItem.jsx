import { useState, useRef } from "react";
import { X, Download, Trash2 } from "lucide-react";
import axios from "axios";

const AttachmentItem = ({
  file,
  getFileIcon,
  formatFileSize,
  onDelete, // Callback từ parent
  accessToken,
}) => {
  const isImage = file.fileType.startsWith("image/");
  const isPDF = file.fileType === "application/pdf";
  const isVideo = file.fileType.startsWith("video/");
  const isPreviewable = isImage || isPDF || isVideo;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const containerRef = useRef(null);

  const openPreview = (e) => {
    e.stopPropagation();
    setPreviewOpen(true);
    setTimeout(() => {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  };

  // === XÓA FILE ===
  const handleDelete = async (e) => {
    e.stopPropagation();
    if (deleting) return;

    if (!confirm(`Xóa file "${file.fileName}"?`)) return;

    setDeleting(true);
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/v1/tasks-attachment/${file._id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      onDelete(file._id); // Gọi callback từ parent
    } catch (error) {
      alert("Lỗi khi xóa file");
      console.error(error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* === Thumbnail === */}
      {/* === Thumbnail === */}
      <div className="group relative rounded-lg overflow-hidden bg-gray-50 border hover:border-red-300 transition-colors">
        {/* NÚT XÓA (góc phải trên, không che nội dung) */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="absolute top-2 right-2 z-20 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 disabled:opacity-50 shadow-lg"
          title="Xóa file"
        >
          {deleting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
        </button>

        {/* NỘI DUNG FILE - CHỈ CLICK VÀO ĐÂY MỚI MỞ PREVIEW */}
        <div
          className="cursor-pointer h-full"
          onClick={isPreviewable ? openPreview : undefined}
        >
          {isImage ? (
            <img
              src={file.fileUrl}
              alt={file.fileName}
              className="w-full h-32 object-cover"
            />
          ) : isVideo ? (
            <video className="w-full h-32 object-cover" controls>
              <source src={file.fileUrl} />
            </video>
          ) : isPDF ? (
            <div className="h-32 flex items-center justify-center bg-red-50">
              <svg
                className="w-12 h-12 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9 12h6v-2H9v2zM9 8h6V6H9v2z" />
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 1v10h10V5H5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center p-3 text-center">
              {getFileIcon(file.fileName)}
              <p className="text-xs text-gray-600 mt-1 truncate w-full">
                {file.fileName}
              </p>
            </div>
          )}
        </div>

        {/* Hover: xem trước (chỉ hiện khi KHÔNG click nút xóa) */}
        {isPreviewable && (
          <div className="pointer-events-none absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>
        )}

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-xs pointer-events-none">
          <p className="truncate">{file.fileName}</p>
          <p>{formatFileSize(file.fileSize)}</p>
        </div>
      </div>

      {/* === PREVIEW MODAL === */}
      {previewOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-6"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative bg-transparent rounded-lg overflow-hidden max-w-5xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            ref={containerRef}
          >
            <button
              className="absolute top-3 right-3 text-white bg-black/60 rounded-full p-2 hover:bg-black/80 z-10"
              onClick={() => setPreviewOpen(false)}
            >
              <X size={22} />
            </button>

            {isImage && (
              <img
                src={file.fileUrl}
                alt=""
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
              />
            )}
            {isVideo && (
              <video
                controls
                autoPlay
                className="max-w-[90vw] max-h-[85vh] rounded-lg"
              >
                <source src={file.fileUrl} />
              </video>
            )}
            {isPDF && (
              <iframe
                src={file.fileUrl}
                className="w-[90vw] h-[85vh] rounded-lg bg-white"
                title={file.fileName}
              />
            )}
            {!isPreviewable && (
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(
                  file.fileUrl
                )}&embedded=true`}
                className="w-[90vw] h-[85vh] rounded-lg bg-white"
                title={file.fileName}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AttachmentItem;
