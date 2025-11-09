import { useState, useRef, useEffect } from "react";
import axios from "axios";

const HeaderBoard = ({ board, boardTitle, onBoardUpdate }) => {
  const [showMembers, setShowMembers] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [showBoardSettings, setShowBoardSettings] = useState(false);

  // State update background
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // State invite member
  // const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [loadingShare, setLoadingShare] = useState(false);
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");
  const [inviteQuery, setInviteQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // Refs để xử lý click outside
  const membersRef = useRef(null);
  const moreOptionsRef = useRef(null);

  const httpUrl = import.meta.env.VITE_API_URL;
  const accessToken = localStorage.getItem("accessToken");

  // Xử lý click outside để đóng popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (membersRef.current && !membersRef.current.contains(event.target)) {
        setShowMembers(false);
      }
      if (
        moreOptionsRef.current &&
        !moreOptionsRef.current.contains(event.target)
      ) {
        setShowMoreOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Các hàm xử lý
  const toggleFavorite = async () => {
    try {
      // API call to toggle favorite
      console.log("Toggle favorite:", board?._id);
      // const response = await updateBoardFavorite(board._id, !board.isFavorite);
    } catch (error) {
      console.error("Toggle favorite error:", error);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      // API call to update member role
      console.log("Update role:", memberId, newRole);
      // await updateMemberRole(board._id, memberId, newRole);
    } catch (error) {
      console.error("Update role error:", error);
    }
  };

  const handleCopyBoard = async () => {
    try {
      console.log("Copy board:", board?._id);
      // const response = await copyBoard(board._id);
    } catch (error) {
      console.error("Copy board error:", error);
    }
  };

  const handleExportBoard = async () => {
    try {
      console.log("Export board:", board?._id);
      // const response = await exportBoard(board._id);
    } catch (error) {
      console.error("Export board error:", error);
    }
  };

  const handleArchiveBoard = async () => {
    if (window.confirm("Bạn có chắc muốn lưu trữ bảng này?")) {
      try {
        console.log("Archive board:", board?._id);
        // await archiveBoard(board._id);
      } catch (error) {
        console.error("Archive board error:", error);
      }
    }
  };

  const handleInviteMember = async (email) => {
    try {
      console.log("Invite member:", email);
      // await inviteMember(board._id, email);
    } catch (error) {
      console.error("Invite member error:", error);
    }
  };

  // ===== UPDATE - DELETE BACKGROUND =====
  // Hàm xử lý chọn màu
  const handleColorSelect = (color) => {
    setSelectedColor(color);
    setSelectedImage(null); // Hủy chọn ảnh nếu có
  };

  // Hàm xử lý upload ảnh
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Kiểm tra kích thước file (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Kích thước ảnh không được vượt quá 5MB");
        return;
      }

      // Kiểm tra định dạng file
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        alert("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)");
        return;
      }

      setSelectedImage(file);
      setSelectedColor(null); // Hủy chọn màu nếu có
    }
  };

  // Hàm xử lý lưu background
  const handleSaveBackground = async () => {
    try {
      setUploading(true);

      if (selectedColor) {
        // Sử dụng API updateBoard để cập nhật màu
        const response = await fetch(`${httpUrl}/api/v1/boards/${board._id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: board.title,
            type: board.type,
            background: selectedColor,
            description: board.description || "",
          }),
        });

        if (!response.ok) throw new Error("Update color failed");
        const result = await response.json();
        console.log("Updated background color:", result);

        // Gọi callback để cập nhật state parent
        if (onBoardUpdate) {
          onBoardUpdate({
            ...board,
            background: selectedColor,
          });
        }
      } else if (selectedImage) {
        // Upload ảnh background sử dụng API riêng
        const formData = new FormData();
        formData.append("background", selectedImage);

        const response = await fetch(
          `${httpUrl}/api/v1/boards-background/${board._id}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
          }
        );

        if (!response.ok) throw new Error("Upload failed");
        const result = await response.json();
        console.log("Updated background image:", result);

        // Gọi callback để cập nhật state parent
        if (onBoardUpdate) {
          onBoardUpdate({
            ...board,
            background: result.data?.background,
          });
        }
      }

      // Đóng modal và reset state
      setShowBackgroundModal(false);
      setSelectedColor(null);
      setSelectedImage(null);
    } catch (error) {
      console.error("Error updating background:", error);
      alert("Có lỗi xảy ra khi cập nhật background");
    } finally {
      setUploading(false);
    }
  };

  // Hàm xử lý xóa background
  const handleRemoveBackground = async () => {
    // Chỉ cho phép xóa nếu background là ảnh (có URL)
    if (!board?.background || !board.background.startsWith("http")) return;

    if (window.confirm("Bạn có chắc muốn xóa background này?")) {
      try {
        const response = await fetch(
          `${httpUrl}/api/v1/boards-background/${board._id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) throw new Error("Delete failed");
        const result = await response.json();

        // Gọi callback để cập nhật state parent
        if (onBoardUpdate) {
          onBoardUpdate({
            ...board,
            background: result.data?.background, // Reset về màu trắng mặc định
          });
        }

        setShowBackgroundModal(false);
        setSelectedColor(null);
        setSelectedImage(null);
      } catch (error) {
        console.error("Error deleting background:", error);
        alert("Có lỗi xảy ra khi xóa background");
      }
    }
  };

  // Hàm lấy tên màu
  const getColorName = (color) => {
    const colorNames = {
      "#026aa7": "Xanh dương",
      "#d29034": "Cam",
      "#519839": "Xanh lá",
      "#b04632": "Đỏ",
      "#89609e": "Tím",
      "#cd5a91": "Hồng",
      "#4bbf6b": "Xanh ngọc",
      "#00aecc": "Xanh biển",
    };
    return colorNames[color] || color;
  };

  // ===== MỜI THÀNH VIÊN - CHIA SẺ BẢNG =====

  // Tìm kiếm user khi nhập
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!inviteQuery.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await axios.get(
          `${httpUrl}/api/v1/users/search?query=${inviteQuery}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        console.log(res.data.data);
        setSearchResults(res.data.data || []);
      } catch {
        setSearchResults([]);
      }
    }, 400); // debounce 400ms
    return () => clearTimeout(delay);
  }, [inviteQuery]);

  // Khi chọn user trong danh sách
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setInviteQuery("");
    setSearchResults([]);
  };

  // Gửi lời mời chia sẻ
  const handleShareBoard = async () => {
    setShareError("");
    setShareSuccess("");

    if (!selectedUser) {
      setShareError("Vui lòng chọn người dùng để chia sẻ.");
      return;
    }

    try {
      setLoadingShare(true);

      await axios.post(
        `${httpUrl}/api/v1/boards/share`,
        {
          boardId: board._id,
          userIds: [selectedUser._id],
          message: inviteMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setShareSuccess("Đã gửi lời mời chia sẻ thành công!");
      setSelectedUser(null);
      setInviteMessage("");
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Không thể chia sẻ bảng. Vui lòng thử lại.";
      setShareError(msg);
    } finally {
      setLoadingShare(false);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm shadow-sm z-10">
        {/* Board Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-800">
            {board?.title || boardTitle}
          </h1>

          {/* Favorite Button */}
          <button
            onClick={toggleFavorite}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title={board?.isFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
          >
            <svg
              className={`w-5 h-5 ${
                board?.isFavorite
                  ? "text-yellow-500 fill-current"
                  : "text-gray-400"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Members List */}
          <div className="relative" ref={membersRef}>
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">
                Thành viên
              </span>
            </button>

            {/* Members Popup */}
            {showMembers && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">Thành viên</h3>
                    <button
                      onClick={() => setShowMembers(false)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <svg
                        className="w-4 h-4 text-gray-500"
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
                    </button>
                  </div>

                  {/* Add Member Section */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Email thành viên..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleInviteMember(e.target.value);
                          e.target.value = "";
                        }
                      }}
                    />
                    <button
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                      onClick={(e) => {
                        const input = e.target.previousElementSibling;
                        handleInviteMember(input.value);
                        input.value = "";
                      }}
                    >
                      Mời
                    </button>
                  </div>

                  {/* Members List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {board?.members?.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {member.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {member.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {member.email}
                            </p>
                          </div>
                        </div>
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(member._id, e.target.value)
                          }
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="member">Thành viên</option>
                          <option value="admin">Quản trị</option>
                        </select>
                      </div>
                    ))}

                    {/* Fallback khi không có members */}
                    {(!board?.members || board.members.length === 0) && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Chưa có thành viên nào
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">Lọc</span>
          </button>

          {/* Share Button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
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
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span className="text-sm font-medium">Chia sẻ</span>
          </button>

          {/* More Options Button */}
          <div className="relative" ref={moreOptionsRef}>
            <button
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                />
              </svg>
            </button>

            {/* More Options Popup */}
            {showMoreOptions && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="py-2">
                  {/* Change Background */}
                  <button
                    onClick={() => {
                      setShowBackgroundModal(true);
                      setShowMoreOptions(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Thay đổi hình nền
                  </button>

                  {/* Board Settings */}
                  <button
                    onClick={() => {
                      setShowBoardSettings(true);
                      setShowMoreOptions(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Cài đặt bảng
                  </button>

                  <div className="border-t border-gray-200 my-1"></div>

                  {/* Copy Board */}
                  <button
                    onClick={handleCopyBoard}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Sao chép bảng
                  </button>

                  {/* Export Board */}
                  <button
                    onClick={handleExportBoard}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                      />
                    </svg>
                    Xuất bảng
                  </button>

                  <div className="border-t border-gray-200 my-1"></div>

                  {/* Archive Board */}
                  <button
                    onClick={handleArchiveBoard}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                      />
                    </svg>
                    Lưu trữ bảng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal Chia sẻ bảng */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Chia sẻ bảng</h3>

            {/* Ô nhập tìm kiếm */}
            <input
              type="text"
              placeholder="Nhập email hoặc tên người dùng..."
              value={inviteQuery}
              onChange={(e) => setInviteQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            {/* Danh sách kết quả tìm kiếm */}
            {inviteQuery && searchResults.length > 0 && (
              <ul className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto mb-3">
                {searchResults.map((user) => (
                  <li
                    key={user._id}
                    onClick={() => handleSelectUser(user)}
                    className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-blue-50 ${
                      selectedUser && selectedUser._id === user._id
                        ? "bg-blue-100"
                        : ""
                    }`}
                  >
                    <img
                      src={
                        user.avatar ||
                        "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                      }
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium">
                        {user.name || "Không rõ tên"}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Nếu có query nhưng không tìm thấy */}
            {inviteQuery && searchResults.length === 0 && (
              <p className="text-gray-500 text-sm mb-3">
                Không tìm thấy người dùng phù hợp.
              </p>
            )}

            {/* Người dùng được chọn */}
            {selectedUser && (
              <div className="flex items-center gap-3 mb-3 bg-blue-50 p-2 rounded-lg">
                <img
                  src={
                    selectedUser.avatar ||
                    "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                  }
                  alt="avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium">{selectedUser.name}</p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="ml-auto text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Tin nhắn lời mời */}
            <textarea
              placeholder="Nhập lời mời (tuỳ chọn)..."
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            {/* Hiển thị thông báo */}
            {shareError && (
              <p className="text-red-500 text-sm mb-2">{shareError}</p>
            )}
            {shareSuccess && (
              <p className="text-green-600 text-sm mb-2">{shareSuccess}</p>
            )}

            {/* Nút hành động */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setInviteQuery("");
                  setSearchResults([]);
                  setSelectedUser(null);
                  setShareError("");
                  setShareSuccess("");
                  setInviteMessage("");
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Đóng
              </button>

              <button
                onClick={handleShareBoard}
                disabled={!selectedUser || loadingShare}
                className={`flex-1 py-2 rounded-lg text-white ${
                  selectedUser && !loadingShare
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {loadingShare ? "Đang chia sẻ..." : "Chia sẻ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBackgroundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[480px] max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                Thay đổi background
              </h3>
              <button
                onClick={() => {
                  setShowBackgroundModal(false);
                  setSelectedColor(null);
                  setSelectedImage(null);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
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
              </button>
            </div>

            {/* Màu sắc mặc định */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Màu sắc
              </h4>
              <div className="grid grid-cols-8 gap-2">
                {[
                  "#026aa7",
                  "#d29034",
                  "#519839",
                  "#b04632",
                  "#89609e",
                  "#cd5a91",
                  "#4bbf6b",
                  "#00aecc",
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-105 ${
                      selectedColor === color ||
                      (!selectedColor && board?.background === color)
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color }}
                    title={getColorName(color)}
                  />
                ))}
              </div>
            </div>

            {/* Upload ảnh */}
            {/* Upload ảnh */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Ảnh của bạn
              </h4>

              {/* Hiển thị ảnh hiện tại nếu có VÀ là ảnh upload (có URL) */}
              {board?.background && board.background.startsWith("http") && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">
                    Background hiện tại:
                  </p>
                  <div className="relative group">
                    <img
                      src={board.background}
                      alt="Current background"
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={handleRemoveBackground}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Xóa background"
                    >
                      <svg
                        className="w-3 h-3"
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
                    </button>
                  </div>
                </div>
              )}

              {/* Upload area */}
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg
                    className="w-8 h-8 text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm text-gray-500">
                    <span className="font-medium text-blue-600">
                      Click để upload
                    </span>{" "}
                    hoặc kéo thả
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG, GIF tối đa 5MB
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>

              {/* Preview ảnh đã chọn */}
              {selectedImage && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">Ảnh đã chọn:</p>
                  <div className="relative group">
                    <img
                      src={URL.createObjectURL(selectedImage)}
                      alt="Preview"
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Hủy chọn"
                    >
                      <svg
                        className="w-3 h-3"
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
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleRemoveBackground}
                disabled={!board?.background}
                className={`flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium transition-colors ${
                  !board?.background
                    ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Xóa background
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowBackgroundModal(false);
                    setSelectedColor(null);
                    setSelectedImage(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveBackground}
                  disabled={(!selectedImage && !selectedColor) || uploading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2 ${
                    (!selectedImage && !selectedColor) || uploading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600"
                  }`}
                >
                  {uploading && (
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  {uploading ? "Đang xử lý..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBoardSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Cài đặt bảng</h3>
            <p className="text-gray-600 mb-4">
              Chức năng cài đặt bảng đang được phát triển...
            </p>
            <button
              onClick={() => setShowBoardSettings(false)}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderBoard;
