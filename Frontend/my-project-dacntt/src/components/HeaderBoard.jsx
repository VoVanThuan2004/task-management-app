import { useState, useRef, useEffect } from "react";
import axios from "axios";
import Avatar from "./Avatar";
import { Crown, User, Trash2Icon } from "lucide-react";
import { io } from "socket.io-client";


const HeaderBoard = ({
  board,
  boardTitle,
  onBoardUpdate,
  isMember,
}) => {
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

  const [boardMembers, setBoardMembers] = useState([]);

  // Thêm useEffect để fetch thành viên
  useEffect(() => {
    const fetchBoardMembers = async () => {
      if (!board?._id) return;
      try {
        const res = await axios.get(
          `${httpUrl}/api/v1/boards-member/${board._id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        setBoardMembers(res.data.data || []);
      } catch (err) {
        console.error("Lỗi lấy thành viên bảng:", err);
      }
    };

    fetchBoardMembers();
  }, [board?._id, accessToken, httpUrl]);

  // Xử lý click outside để đóng popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (membersRef.current && !membersRef.current.contains(event.target)) {
        // setShowMembers(false);
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

  // Xử lý socket
  useEffect(() => {
    // Khởi tạo socket mới
    const newSocket = io(httpUrl, {
      transports: ["websocket"],
      auth: { token: accessToken },
    });

    newSocket.emit("joinBoard", board?._id);

    // Cập nhật khi xóa thành viên ra khỏi bảng
    newSocket.on("memberRemoved", (data) => {
      setBoardMembers((prevMembers) =>
        prevMembers.filter((member) => member._id !== data.userId)
      );
    })

    return () => {
      newSocket.emit("leaveBoard", board?._id);
      newSocket.disconnect();
    };
  }, [board?._id, accessToken]);

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

  // const handleInviteMember = async (email) => {
  //   try {
  //     console.log("Invite member:", email);
  //     // await inviteMember(board._id, email);
  //   } catch (error) {
  //     console.error("Invite member error:", error);
  //   }
  // };

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

  // Xóa thành viên ra khỏi bảng
  const handleDeleteMember = async (boardId, userId) => {
    if (!boardId || !userId) return;

    if (!window.confirm("Bạn có chắc muốn xóa thành viên này khỏi bảng?"))
      return;

    setShareError("");
    setShareSuccess("");
    setLoadingShare(true);

    try {
      const res = await axios.delete(
        `${httpUrl}/api/v1/boards-member/${boardId}/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (res.data?.status === "success") {
        const removedUserId = res.data?.data?.userId;
        // Cập nhật UI: loại bỏ thành viên khỏi danh sách
        setBoardMembers((prev) => prev.filter((m) => m._id !== removedUserId));

        setShareSuccess("Đã xóa thành viên khỏi bảng.");
      } else {
        const msg = res.data?.message || "Xóa thành viên thất bại.";
        setShareError(msg);
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Lỗi khi xóa thành viên. Vui lòng thử lại.";
      setShareError(msg);
      console.error("handleDeleteMember error:", error);
    } finally {
      setLoadingShare(false);
    }
  };

  // get current user id from JWT (works with typical payload fields: id, _id or userId)
  const getUserIdFromToken = (token) => {
    if (!token) return null;
    try {
      const base64Url = token.split(".")[1] || "";
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const payload = JSON.parse(jsonPayload);
      return payload?.userId || null;
    } catch {
      return null;
    }
  };

  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    setCurrentUserId(getUserIdFromToken(accessToken));
  }, [accessToken]);

  return (
    <>
      <header className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm shadow-sm z-10">
        {/* Board Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-800">
            {board?.title || boardTitle}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-5">
          {/* Members List - Chỉ hiện khi isMember = true */}
          {isMember && (
            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-3">
                {boardMembers.slice(0, 6).map((member, idx) => (
                  <div
                    key={member._id}
                    className="relative group"
                    style={{ zIndex: boardMembers.length - idx }}
                  >
                    <Avatar
                      user={member}
                      size="w-10 h-10"
                      className="ring-4 ring-white shadow-md transition-all duration-200 hover:scale-110 hover:z-50 hover:ring-blue-300"
                    />

                    {/* Tooltip hiện ở DƯỚI */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-4 py-2.5 bg-black/90 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50">
                      <p className="font-semibold">
                        {member.fullName || "Không rõ tên"}
                      </p>
                      <p className="text-gray-300">{member.email}</p>
                      {/* Mũi tên chỉ xuống */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 w-0 h-0 border-6 border-transparent border-b-black/90"></div>
                    </div>
                  </div>
                ))}

                {/* +N nếu có nhiều hơn 6 người – cũng có tooltip ở dưới */}
                {boardMembers.length > 6 && (
                  <div className="relative group">
                    <div className="w-10 h-10 rounded-full bg-gray-700 text-white text-xs font-bold flex items-center justify-center ring-4 ring-white shadow-md">
                      <span className="text-sm">
                        +{boardMembers.length - 6}
                      </span>
                    </div>

                    {/* Tooltip +N cũng hiện ở dưới */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-4 py-2.5 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50">
                      <p className="font-medium">
                        Và {boardMembers.length - 6} người khác
                      </p>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 w-0 h-0 border-6 border-transparent border-b-black/90"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filter Button - Chỉ hiện khi isMember = true */}
          {isMember && (
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
          )}

          {/* Share Button - Chỉ hiện khi isMember = true */}
          {isMember && (
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
          )}

          {/* More Options Button - Chỉ hiện khi isMember = true */}
          {isMember && (
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
          )}
        </div>
      </header>

      {/* Modal Chia sẻ bảng */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-135 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Chia sẻ bảng</h3>
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

            {/* Danh sách thành viên hiện tại */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Thành viên hiện tại ({boardMembers.length})
              </h4>
              <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto border border-gray-200">
                {boardMembers.length > 0 ? (
                  <div className="space-y-2">
                    {boardMembers.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow"
                      >
                        <Avatar user={member} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800 truncate">
                            {member.fullName || "Không rõ tên"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {member.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap
      ${
        member.role === "owner"
          ? "bg-yellow-100 text-yellow-800"
          : "bg-blue-100 text-blue-700"
      }`}
                          >
                            {member.role === "owner" ? (
                              <>
                                <Crown size={14} className="text-yellow-700" />
                                Quản trị viên
                              </>
                            ) : (
                              <>
                                <User size={14} className="text-blue-700" />
                                Thành viên
                              </>
                            )}
                          </span>

                          {/* Hide delete button for the current user. Optionally also hide if member.role === 'owner' */}
                          {member._id !== currentUserId &&
                            member.role !== "owner" && (
                              <button
                                onClick={() =>
                                  handleDeleteMember(board._id, member._id)
                                }
                                className="cursor-pointer"
                              >
                                <Trash2Icon
                                  size={15}
                                  className="text-red-500 ml-1.5 mr-1"
                                />
                              </button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-3">
                    Chưa có thành viên nào
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 my-4"></div>

            {/* Ô nhập tìm kiếm */}
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Mời thành viên mới
            </h4>
            <input
              type="text"
              placeholder="Nhập email hoặc tên người dùng..."
              value={inviteQuery}
              onChange={(e) => setInviteQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            {/* Danh sách kết quả tìm kiếm */}
            {inviteQuery && searchResults.length > 0 && (
              <ul className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto mb-3 bg-white">
                {searchResults.map((user) => {
                  const isAlreadyMember = boardMembers.some(
                    (member) => member._id === user._id
                  );

                  return (
                    <li
                      key={user._id}
                      onClick={() => {
                        if (!isAlreadyMember) {
                          handleSelectUser(user);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                        isAlreadyMember
                          ? "bg-gray-100 cursor-not-allowed opacity-60"
                          : "hover:bg-blue-50"
                      } ${
                        selectedUser && selectedUser._id === user._id
                          ? "bg-blue-100"
                          : ""
                      }`}
                    >
                      <Avatar user={user} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">
                          {user.fullName || "Không rõ tên"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      {isAlreadyMember && (
                        <span className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded-full">
                          ✓ Đã là thành viên
                        </span>
                      )}
                    </li>
                  );
                })}

                {/* Hiển thị khi toàn bộ kết quả tìm kiếm đều là thành viên hiện tại */}
                {searchResults.every((user) =>
                  boardMembers.some((member) => member._id === user._id)
                ) &&
                  searchResults.length > 0 && (
                    <li className="p-3 text-center text-gray-500 text-sm bg-gray-50">
                      ✓ Tất cả kết quả đều là thành viên hiện tại
                    </li>
                  )}
              </ul>
            )}

            {/* Nếu có query nhưng không tìm thấy */}
            {inviteQuery && searchResults.length === 0 && (
              <p className="text-gray-500 text-sm mb-3 text-center">
                Không tìm thấy người dùng phù hợp.
              </p>
            )}

            {/* Người dùng được chọn */}
            {selectedUser && (
              <div className="flex items-center gap-3 mb-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <Avatar user={selectedUser} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">
                    {selectedUser.fullName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {selectedUser.email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="ml-auto p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Bỏ chọn"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Tin nhắn lời mời */}
            <textarea
              placeholder="Nhập lời mời (tuỳ chọn)..."
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              rows={3}
            />

            {/* Hiển thị thông báo */}
            {shareError && (
              <div className="flex items-center gap-2 text-red-600 text-sm mb-3 bg-red-50 p-3 rounded-lg border border-red-200">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{shareError}</span>
              </div>
            )}
            {shareSuccess && (
              <div className="flex items-center gap-2 text-green-600 text-sm mb-3 bg-green-50 p-3 rounded-lg border border-green-200">
                <svg
                  className="w-4 h-4 flex-shrink-0"
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
                <span>{shareSuccess}</span>
              </div>
            )}

            {/* Nút hành động */}
            <div className="flex gap-3 pt-2">
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
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Đóng
              </button>

              <button
                onClick={handleShareBoard}
                disabled={!selectedUser || loadingShare}
                className={`flex-1 py-2 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-all ${
                  selectedUser && !loadingShare
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {loadingShare && (
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
