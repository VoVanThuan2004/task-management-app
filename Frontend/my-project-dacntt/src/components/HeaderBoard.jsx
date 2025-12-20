import { useState, useRef, useEffect } from "react";
import axios from "axios";
import Avatar from "./Avatar";
import {
  Crown,
  User,
  Trash2Icon,
  Filter,
  Share2,
  X,
  Loader2,
  Plus,
  Zap,
  Sparkles,
  Palette,
  Settings,
  Archive,
  Tag,
  Tags,
  Check,
  Edit2,
  Trash2,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";

const HeaderBoard = ({
  board,
  boardTitle,
  onBoardUpdate,
  isMember,
  onApplyFilters,
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

  // Modal kỹ năng người dùng
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [userSkills, setUserSkills] = useState([]);
  const [newSkill, setNewSkill] = useState("");
  const [addingSkillLoading, setAddingSkillLoading] = useState(false);
  const [deletingSkill, setDeletingSkill] = useState(null);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(null);

  // Modal nhãn dán
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labels, setLabels] = useState([]);
  const [newLabel, setNewLabel] = useState({ title: "", color: "#3b82f6" }); // default blue
  const [editingLabel, setEditingLabel] = useState(null);
  const [addingLabel, setAddingLabel] = useState(false);
  const [deletingLabel, setDeletingLabel] = useState(null);

  // Refs để xử lý click outside
  const membersRef = useRef(null);
  const moreOptionsRef = useRef(null);

  const [showAllMembers, setShowAllMembers] = useState(false);

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
    });

    return () => {
      newSocket.emit("leaveBoard", board?._id);
      newSocket.disconnect();
    };
  }, [board?._id, accessToken]);

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

  // === User skill ===
  // Fetch skill khi mở modal
  const openSkillModal = async () => {
    setShowSkillModal(true);
    try {
      const res = await axios.get(`${httpUrl}/api/v1/user-skill`, {
        params: { boardId: board._id },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setUserSkills(res.data.data?.skills || []);
    } catch (err) {
      console.error("Lỗi lấy skill:", err);
    }
  };

  // Thêm skill
  const handleAddSkill = async () => {
    if (!newSkill.trim()) return;

    const skillToAdd = newSkill.trim();
    setAddingSkillLoading(true);

    try {
      const res = await axios.post(
        `${httpUrl}/api/v1/user-skill`,
        { boardId: board._id, skill: skillToAdd },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const newSkillData = res.data.data; // ← có userId luôn!

      // 1. Cập nhật modal
      setUserSkills((prev) => [
        { _id: newSkillData._id, skill: newSkillData.skill },
        ...prev,
      ]);

      // 2. CẬP NHẬT NGAY boardMembers ở header (tooltip hiện skill mới)
      setBoardMembers((prevMembers) =>
        prevMembers.map((member) =>
          member._id === newSkillData.userId
            ? {
                ...member,
                skills: [
                  { skill: newSkillData.skill },
                  ...(member.skills || []),
                ],
              }
            : member
        )
      );

      setNewSkill("");
    } catch (err) {
      alert("Lỗi hệ thống!!");
      console.log("Lỗi hệ thống: " + err);
    } finally {
      setAddingSkillLoading(false);
    }
  };

  // Xóa skill
  const handleDeleteSkill = async (skillId) => {
    setDeletingSkill(skillId);
    try {
      const res = await axios.delete(
        `${httpUrl}/api/v1/user-skill/${skillId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const deletedUserId = res.data?.data?.userId;

      // 1. Xóa khỏi modal (luôn xóa vì đây là skill của mình)
      setUserSkills((prev) => prev.filter((s) => s._id !== skillId));

      // 2. XÓA KHỎI boardMembers ở header – chỉ xóa nếu đúng userId
      setBoardMembers((prevMembers) =>
        prevMembers.map((member) => {
          const shouldUpdateThisMember = deletedUserId
            ? member._id === deletedUserId
            : true;

          if (shouldUpdateThisMember) {
            return {
              ...member,
              skills: member.skills?.filter((s) => s._id !== skillId) || [],
            };
          }
          return member;
        })
      );
    } catch (err) {
      alert("Xóa skill thất bại");
      console.log(err);
    } finally {
      setDeletingSkill(null);
    }
  };

  // === Nhãn dán ===
  // Mở modal + fetch labels
  const openLabelModal = async () => {
    setShowLabelModal(true);
    try {
      const res = await axios.get(`${httpUrl}/api/v1/labels/${board._id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setLabels(res.data.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  // Thêm nhãn
  const handleAddLabel = async () => {
    if (!newLabel.title.trim()) return;
    setAddingLabel(true);
    try {
      const res = await axios.post(
        `${httpUrl}/api/v1/labels`,
        { boardId: board._id, ...newLabel },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setLabels((prev) => [res.data.data, ...prev]);
      setNewLabel({ title: "", color: "#3b82f6" });
    } catch (err) {
      console.log(err);
    } finally {
      setAddingLabel(false);
    }
  };

  // Cập nhật nhãn
  const handleUpdateLabel = async (labelId) => {
    if (!editingLabel?.title.trim()) return;
    try {
      const res = await axios.put(
        `${httpUrl}/api/v1/labels/${labelId}`,
        editingLabel,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setLabels((prev) =>
        prev.map((l) => (l._id === labelId ? res.data.data : l))
      );
      setEditingLabel(null);
    } catch (err) {
      console.log(err);
    }
  };

  // Xóa nhãn
  const handleDeleteLabel = async (labelId) => {
    setDeletingLabel(labelId);
    try {
      await axios.delete(`${httpUrl}/api/v1/labels/${labelId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setLabels((prev) => prev.filter((l) => l._id !== labelId));
    } catch (err) {
      console.log(err);
    } finally {
      setDeletingLabel(null);
    }
  };

  // Giả sử bạn có state để quản lý filters và gọi API
  const [filters, setFilters] = useState({
    search: "",
    assignees: [],
    minTask: 0,
    taskStatus: "",
    deadline: "",
    labels: [],
    activityLog: "",
  });

  // Danh sách thành viên (từ API)
  const [boardMembersList, setBoardMembersList] = useState([]);
  const fetchBoardMembers = async () => {
    try {
      const res = await axios.get(
        `${httpUrl}/api/v1/boards-member/${board._id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      setBoardMembersList(res.data.data || []);
    } catch (err) {
      console.error("Lỗi lấy thành viên:", err);
    }
  };

  // Danh sách labels (từ API)
  const [labelsList, setLabelsList] = useState([]);
  const fetchLabels = async () => {
    try {
      const res = await axios.get(`${httpUrl}/api/v1/labels/${board._id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setLabelsList(res.data.data || []);
    } catch (err) {
      console.error("Lỗi lấy labels:", err);
    }
  };

  const openFilterPopup = async () => {
    await Promise.all([fetchBoardMembers(), fetchLabels()]);
    setShowFilter(true);
  };

  // Gọi applyFilters mỗi khi filter thay đổi
  const handleFilterChange = (newFilters) => {
    console.log("New filters:", newFilters);

    const serializedFilters = {
      ...newFilters,
      labels: newFilters.labels.join(",") || undefined, // → string "id1,id2" hoặc undefined
      assignees: newFilters.assignees.join(",") || undefined,
    };

    setFilters(newFilters);
    onApplyFilters(serializedFilters); // Gọi api lọc columns
  };

  // Xóa filter
  const clearFilters = () => {
    const emptyFilters = {
      search: "",
      assignees: [],
      minTask: 0,
      taskStatus: "",
      deadline: "",
      labels: [],
      activityLog: "",
    };
    setFilters(emptyFilters);
    onApplyFilters(emptyFilters);
  };

  return (
    <>
      <header className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm shadow-sm z-10">
        {/* Board Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-800">
            {board?.title || boardTitle}
          </h1>
        </div>

        {/* Members List + Tooltip Skill - ĐẸP NHƯ CLICKUP 2025 */}
        <div className="flex items-center gap-6">
          {/* Chỉ hiện khi là thành viên */}
          {isMember && boardMembers.length > 0 && (
            <div className="flex items-center flex-wrap gap-2">
              {/* Hiển thị tối đa 6 thành viên đầu tiên */}
              {boardMembers.slice(0, 6).map((member) => (
                <div
                  key={member._id}
                  className="relative group flex flex-col items-center"
                >
                  <Avatar
                    user={member}
                    size="w-10 h-10"
                    className="ring-4 ring-white shadow-xl transition-all duration-300 hover:scale-115 hover:z-50 hover:ring-blue-400"
                  />

                  {/* Tooltip siêu đẹp - ClickUp Style */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-80 p-6 bg-white rounded-2xl shadow-2xl border border-gray-200 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50">
                    {/* Header: Avatar + Info */}
                    <div className="flex items-center gap-4 mb-5">
                      <Avatar
                        user={member}
                        size="w-12 h-12"
                        className="ring-4 ring-white shadow-2xl flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-lg truncate">
                          {member.fullName || "Không rõ tên"}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {member.email}
                        </p>
                        {member.role === "owner" && (
                          <span className="inline-flex items-center gap-1 mt-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                            Owner
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Skills Section */}
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">
                        Kỹ năng trong dự án
                      </p>
                      {member.skills && member.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {member.skills.map((s, i) => (
                            <span
                              key={i}
                              className="px-4 py-2 bg-gradient-to-r from-violet-100 via-indigo-100 to-purple-100 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200 shadow-sm"
                            >
                              {s.skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">
                          Chưa khai báo kỹ năng
                        </p>
                      )}
                    </div>

                    {/* Mũi tên chỉ lên */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-2 w-0 h-0 border-8 border-transparent border-b-white"></div>
                  </div>
                </div>
              ))}

              {/* Nếu có nhiều hơn 6 người → nút "..." để mở popup xem thêm */}
              {boardMembers.length > 6 && (
                <button
                  onClick={() => setShowAllMembers(true)}
                  className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-gray-600 to-gray-900 text-white text-sm font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110"
                  title={`Và ${boardMembers.length - 6} thành viên khác`}
                >
                  <span className="text-lg leading-none">...</span>
                </button>
              )}
            </div>
          )}

          {/* Các nút khác - giữ nguyên */}
          {isMember && (
            <>
              <button
                onClick={() => openFilterPopup()}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all font-medium"
              >
                <Filter size={18} className="text-gray-600" />
                <span className="hidden sm:inline">Lọc</span>
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2.5 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg"
              >
                <Share2 size={18} />
                <span className="hidden sm:inline">Chia sẻ</span>
              </button>

              <div className="relative" ref={moreOptionsRef}>
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
                      <div className="absolute top-full right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                        <div className="py-2">
                          {/* KỸ NĂNG LÀM VIỆC – ĐẸP NHẤT */}
                          <button
                            onClick={() => {
                              openSkillModal();
                              setShowMoreOptions(false);
                            }}
                            className="flex items-center gap-3 w-full px-5 py-3.5 text-gray-800 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-medium"
                          >
                            <div className="relative">
                              <Zap size={19} className="text-indigo-600" />
                              <Sparkles
                                size={10}
                                className="absolute -top-1 -right-1 text-indigo-400 animate-pulse"
                              />
                            </div>
                            <span>Kỹ năng làm việc</span>
                          </button>

                          <div className="border-t border-gray-200 my-1"></div>

                          {/* THAY ĐỔI HÌNH NỀN */}
                          <button
                            onClick={() => {
                              setShowBackgroundModal(true);
                              setShowMoreOptions(false);
                            }}
                            className="flex items-center gap-3 w-full px-5 py-3.5 text-gray-700 hover:bg-gray-50 transition-all"
                          >
                            <Palette size={18} className="text-purple-600" />
                            <span>Thay đổi hình nền</span>
                          </button>

                          {/* Nhãn dán */}
                          <button
                            onClick={() => {
                              openLabelModal();
                              setShowMoreOptions(false);
                            }}
                            className="flex items-center gap-3 w-full px-5 py-3.5 text-gray-700 hover:bg-gray-50 transition-all"
                          >
                            <Tag size={18} className="text-purple-600" />
                            <span>Nhãn dán</span>
                          </button>

                          {/* CÀI ĐẶT BẢNG */}
                          <button
                            onClick={() => {
                              setShowBoardSettings(true);
                              setShowMoreOptions(false);
                            }}
                            className="flex items-center gap-3 w-full px-5 py-3.5 text-gray-700 hover:bg-gray-50 transition-all"
                          >
                            <Settings size={18} className="text-gray-600" />
                            <span>Cài đặt bảng</span>
                          </button>

                          <div className="border-t border-gray-200 my-1"></div>

                          {/* LƯU TRỮ BẢNG */}
                          <button
                            onClick={handleArchiveBoard}
                            className="flex items-center gap-3 w-full px-5 py-3.5 text-red-600 hover:bg-red-50 transition-all font-medium"
                          >
                            <Archive size={18} className="text-red-600" />
                            <span>Lưu trữ bảng</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Filter Panel - Trello Style */}
      {showFilter && (
        <div className="fixed top-20 bottom-2 right-2 w-96 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Filter size={20} className="text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Lọc</h3>
            </div>
            <button
              onClick={() => setShowFilter(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-7">
            {/* Từ khóa tìm kiếm */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Từ khóa
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  handleFilterChange({ ...filters, search: e.target.value })
                }
                placeholder="Nhập từ khóa..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <p className="text-xs text-gray-500 mt-2">
                Tìm kiếm tiêu đề thẻ, mô tả, bình luận...
              </p>
            </div>

            {/* Thành viên */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thành viên
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={filters.assignees.includes("none")}
                    onChange={(e) => {
                      let newAssignees = [...filters.assignees];
                      if (e.target.checked) {
                        newAssignees.push("none");
                      } else {
                        newAssignees = newAssignees.filter((a) => a !== "none");
                      }
                      handleFilterChange({
                        ...filters,
                        assignees: newAssignees,
                      });
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Không có thành viên
                  </span>
                </label>

                {boardMembersList.map((member) => (
                  <label
                    key={member._id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={filters.assignees.includes(member._id)}
                      onChange={(e) => {
                        let newAssignees = [...filters.assignees];
                        if (e.target.checked) {
                          newAssignees.push(member._id);
                        } else {
                          newAssignees = newAssignees.filter(
                            (a) => a !== member._id
                          );
                        }
                        handleFilterChange({
                          ...filters,
                          assignees: newAssignees,
                        });
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <Avatar user={member} size="w-8 h-8" />
                    <span className="text-sm text-gray-700 truncate">
                      {member.fullName}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Số lượng task tối thiểu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số lượng task tối thiểu
              </label>
              <input
                type="number"
                min="0"
                value={filters.minTask}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  handleFilterChange({ ...filters, minTask: value });
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Trạng thái task */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái task
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={filters.taskStatus === "completed"}
                    onChange={(e) => {
                      handleFilterChange({
                        ...filters,
                        taskStatus: e.target.checked ? "completed" : "", // nếu bỏ check → ""
                      });
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Đã hoàn thành</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={filters.taskStatus === "incomplete"}
                    onChange={(e) => {
                      handleFilterChange({
                        ...filters,
                        taskStatus: e.target.checked ? "incomplete" : "",
                      });
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Chưa hoàn thành</span>
                </label>
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày hết hạn
              </label>
              <div className="space-y-2">
                {[
                  { value: "noDeadline", label: "Không có ngày hết hạn" },
                  { value: "overdue", label: "Quá hạn" },
                  { value: "near", label: "Gần tới hạn" },
                  { value: "tomorrow", label: "Sẽ hết hạn vào ngày mai" },
                  { value: "nextWeek", label: "Sẽ hết hạn vào tuần sau" },
                  { value: "nextMonth", label: "Sẽ hết hạn vào tháng sau" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={filters.deadline === opt.value}
                      onChange={(e) => {
                        handleFilterChange({
                          ...filters,
                          deadline: e.target.checked ? opt.value : "", // nếu bỏ check → ""
                        });
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Nhãn dán */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nhãn dán
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={filters.labels.includes("none")}
                    onChange={(e) => {
                      let newLabels = [...filters.labels];
                      if (e.target.checked) {
                        newLabels.push("none");
                      } else {
                        newLabels = newLabels.filter((l) => l !== "none");
                      }
                      handleFilterChange({ ...filters, labels: newLabels });
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Không có nhãn</span>
                </label>

                {labelsList.map((label) => (
                  <label
                    key={label._id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={filters.labels.includes(label._id)}
                      onChange={(e) => {
                        let newLabels = [...filters.labels];
                        if (e.target.checked) {
                          newLabels.push(label._id);
                        } else {
                          newLabels = newLabels.filter((l) => l !== label._id);
                        }
                        handleFilterChange({ ...filters, labels: newLabels });
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-sm text-gray-700">{label.title}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Activity Log */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hoạt động gần đây
              </label>
              <div className="space-y-2">
                {[
                  { value: "", label: "Tất cả" },
                  { value: "lastWeek", label: "Tuần qua" },
                  { value: "last2Weeks", label: "2 tuần qua" },
                  { value: "last3Weeks", label: "3 tuần qua" },
                  { value: "thisMonth", label: "Tháng này" },
                  { value: "noActivity", label: "Chưa có hoạt động" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={filters.activityLog === opt.value}
                      onChange={(e) => {
                        handleFilterChange({
                          ...filters,
                          activityLog: e.target.checked ? opt.value : "",
                        });
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => {
                clearFilters();
                // reset về không filter
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition"
            >
              Xóa tất cả bộ lọc
            </button>
          </div>
        </div>
      )}

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

      {/* Modal Kỹ năng làm việc */}
      {showSkillModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Zap size={28} className="text-indigo-600" />
                  <Sparkles
                    size={14}
                    className="absolute -top-1 -right-1 text-indigo-400 animate-pulse"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Kỹ năng làm việc
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Cho mọi người biết bạn giỏi gì trong dự án này
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSkillModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={22} className="text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Danh sách skill hiện tại */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  Kỹ năng của bạn
                </h3>
                {userSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {userSkills.map((item) => (
                      <div
                        key={item._id}
                        className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full border border-indigo-200 shadow-sm hover:shadow-md transition-all"
                      >
                        <span className="font-medium text-sm">
                          {item.skill}
                        </span>
                        <button
                          onClick={() => handleDeleteSkill(item._id)}
                          disabled={deletingSkill === item._id}
                          className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-white/50 rounded-full transition-all"
                        >
                          {deletingSkill === item._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <X size={14} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-8 bg-gray-50 rounded-xl">
                    Chưa có kỹ năng nào. Hãy thêm bên dưới!
                  </p>
                )}
              </div>

              {/* Input thêm skill */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Thêm kỹ năng mới
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSkill.trim()) {
                          handleAddSkill();
                        }
                      }}
                      placeholder="React, Node.js, Figma, Python, TOEIC 900+..."
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                    <button
                      onClick={handleAddSkill}
                      disabled={addingSkillLoading || !newSkill.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-50"
                    >
                      {addingSkillLoading ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <Plus size={20} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowSkillModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal quản lý nhãn dán */}
      {showLabelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center gap-3">
                <Tags size={28} className="text-indigo-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Quản lý nhãn
                  </h2>
                  <p className="text-sm text-gray-600">
                    Thêm, sửa, xóa nhãn cho bảng làm việc
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLabelModal(false)}
                className="p-2 hover:bg-white/50 rounded-xl transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Danh sách nhãn hiện tại */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Nhãn hiện tại
                </h3>
                {labels.length > 0 ? (
                  <div className="space-y-3">
                    {labels.map((label) => (
                      <div
                        key={label._id}
                        className="group flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
                      >
                        {/* Màu nhãn */}
                        <div
                          className="w-12 h-12 rounded-lg shadow-sm flex-shrink-0"
                          style={{ backgroundColor: label.color }}
                        />

                        {/* Tên nhãn + chỉnh sửa */}
                        {editingLabel?._id === label._id ? (
                          <div className="flex-1 flex items-center gap-4">
                            {/* Input tên nhãn */}
                            <input
                              type="text"
                              value={editingLabel.title}
                              onChange={(e) =>
                                setEditingLabel({
                                  ...editingLabel,
                                  title: e.target.value,
                                })
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" &&
                                handleUpdateLabel(label._id)
                              }
                              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                              autoFocus
                            />

                            {/* Ô màu hiện tại + Dropdown chọn màu */}
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setColorDropdownOpen(editingLabel._id)
                                }
                                className="w-12 h-12 rounded-xl shadow-md border-2 border-white hover:border-gray-300 transition-all"
                                style={{ backgroundColor: editingLabel.color }}
                                title="Thay đổi màu"
                              />

                              {/* Dropdown chọn màu */}
                              {colorDropdownOpen === editingLabel._id && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-50">
                                  <div className="grid grid-cols-6 gap-3">
                                    {[
                                      "#ef4444",
                                      "#f97316",
                                      "#f59e0b",
                                      "#eab308",
                                      "#84cc16",
                                      "#22c55e",
                                      "#10b981",
                                      "#14b8a6",
                                      "#06b6d4",
                                      "#0ea5e9",
                                      "#3b82f6",
                                      "#6366f1",
                                      "#8b5cf6",
                                      "#a855f7",
                                      "#d946ef",
                                      "#ec4899",
                                      "#f43f5e",
                                      "#6b7280",
                                    ].map((color) => (
                                      <button
                                        key={color}
                                        onClick={() => {
                                          setEditingLabel((prev) => ({
                                            ...prev,
                                            color,
                                          }));
                                          setColorDropdownOpen(null);
                                        }}
                                        className={`w-10 h-10 rounded-lg transition-all hover:scale-110 hover:shadow-lg ${
                                          editingLabel.color === color
                                            ? "ring-4 ring-offset-2 ring-indigo-400"
                                            : ""
                                        }`}
                                        style={{ backgroundColor: color }}
                                      />
                                    ))}
                                  </div>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-2 w-0 h-0 border-8 border-transparent border-b-white"></div>
                                </div>
                              )}
                            </div>

                            {/* Nút lưu / hủy */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateLabel(label._id)}
                                className="p-2.5 text-green-600 hover:bg-green-50 rounded-xl transition"
                              >
                                <Check size={20} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingLabel(null);
                                  setColorDropdownOpen(null);
                                }}
                                className="p-2.5 text-gray-600 hover:bg-gray-50 rounded-xl transition"
                              >
                                <X size={20} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-between">
                            <span className="font-medium text-gray-800">
                              {label.title}
                            </span>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() =>
                                  setEditingLabel({
                                    _id: label._id,
                                    title: label.title,
                                    color: label.color,
                                  })
                                }
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                title="Sửa nhãn"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteLabel(label._id)}
                                disabled={deletingLabel === label._id}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                title="Xóa nhãn"
                              >
                                {deletingLabel === label._id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl italic">
                    Chưa có nhãn nào. Hãy thêm nhãn đầu tiên!
                  </p>
                )}
              </div>

              {/* Form thêm nhãn mới */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Thêm nhãn mới
                </h3>
                <div className="flex items-center gap-4">
                  {/* Chọn màu */}
                  <div className="flex gap-2 flex-wrap">
                    {[
                      "#ef4444",
                      "#f97316",
                      "#f59e0b",
                      "#eab308",
                      "#84cc16",
                      "#22c55e",
                      "#10b981",
                      "#14b8a6",
                      "#06b6d4",
                      "#0ea5e9",
                      "#3b82f6",
                      "#6366f1",
                      "#8b5cf6",
                      "#a855f7",
                      "#d946ef",
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() =>
                          setNewLabel((prev) => ({ ...prev, color }))
                        }
                        className={`w-10 h-10 rounded-lg transition-all hover:scale-110 ${
                          newLabel.color === color
                            ? "ring-4 ring-offset-2 ring-indigo-400"
                            : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* Input tên nhãn */}
                  <input
                    type="text"
                    value={newLabel.title}
                    onChange={(e) =>
                      setNewLabel((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleAddLabel()}
                    placeholder="Tên nhãn (Bug, Feature, Urgent...)"
                    className="flex-1 px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />

                  {/* Nút thêm */}
                  <button
                    onClick={handleAddLabel}
                    disabled={
                      addingLabel || !newLabel.title.trim() || !newLabel.color
                    }
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    {addingLabel ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Plus size={20} />
                    )}
                    Thêm nhãn
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === POPUP XEM TẤT CẢ THÀNH VIÊN (khi >6 người) === */}
      <AnimatePresence>
        {showAllMembers && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAllMembers(false)}
          >
            <Motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                <h3 className="text-xl font-bold text-gray-900">
                  Thành viên bảng làm việc ({boardMembers.length})
                </h3>
                <button
                  onClick={() => setShowAllMembers(false)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Danh sách thành viên */}
              <div className="p-6 grid grid-cols-2 gap-6 max-h-full overflow-y-auto">
                {boardMembers.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                  >
                    <Avatar
                      user={member}
                      size="w-16 h-16"
                      className="ring-4 ring-white shadow-xl flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">
                        {member.fullName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {member.email}
                      </p>
                      {member.role === "owner" && (
                        <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                          Owner
                        </span>
                      )}
                      {member.skills && member.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {member.skills.map((s, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-gradient-to-r from-violet-100 to-purple-100 text-indigo-700 text-xs font-medium rounded-full"
                            >
                              {s.skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 text-right">
                <button
                  onClick={() => setShowAllMembers(false)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition"
                >
                  Đóng
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HeaderBoard;
