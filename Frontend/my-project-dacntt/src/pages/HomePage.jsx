import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  LayoutGrid,
  Users,
  Loader2,
  User,
  LogOut,
  Plus,
  X,
  LogIn,
  Settings,
  KeyRoundIcon
} from "lucide-react";
import { useUser } from "../components/useUser";
import { AnimatePresence, motion as Motion } from "framer-motion";
import Avatar from "../components/Avatar";

export default function HomePage() {
  const [myBoards, setMyBoards] = useState([]);
  const [invitedBoards, setInvitedBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    type: "private",
    background: "#026aa7",
  });

  // Thêm state để chuyển tab
  const [activeSection, setActiveSection] = useState("my");

  const httpUrl = import.meta.env.VITE_API_URL;
  const accessToken = localStorage.getItem("accessToken");
  const isLoggedIn = !!accessToken;

  const { user, setUser } = useUser();
  const navigate = useNavigate();

  const backgroundColors = [
    "#026aa7",
    "#d29034",
    "#519839",
    "#b04632",
    "#89609e",
    "#cd5a91",
    "#4bbf6b",
    "#00aecc",
  ];

  useEffect(() => {
    if (isLoggedIn) {
      fetchBoards();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const [resOwned, resInvited] = await Promise.all([
        axios.get(`${httpUrl}/api/v1/boards`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        axios.get(`${httpUrl}/api/v1/boards-invited`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);
      setMyBoards(resOwned.data?.data || []);
      setInvitedBoards(resInvited.data?.data || []);
    } catch (error) {
      console.error("Lỗi khi load boards:", error);
      if (error.response?.status === 401) {
        handleAutoLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAutoLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("roleName");

    setMyBoards([]);
    setInvitedBoards([]);
    setUser(null);

    navigate("/");
  };

  const handleCreateBoard = async () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (!formData.title.trim()) {
      alert("Vui lòng nhập tên bảng");
      return;
    }

    try {
      setCreating(true);
      const response = await axios.post(
        `${httpUrl}/api/v1/boards`,
        {
          title: formData.title,
          type: formData.type,
          background: formData.background,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.data.status === "success") {
        setShowCreateModal(false);
        setFormData({ title: "", type: "private", background: "#026aa7" });
        fetchBoards();
      }
    } catch (error) {
      console.error("Lỗi khi tạo bảng:", error);
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        alert("Có lỗi xảy ra khi tạo bảng");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleBoardClick = (board) => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    navigate(`/boards/${board._id}/${encodeURIComponent(board.title)}`);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${httpUrl}/api/v1/auth/logout`, {
        refreshToken: localStorage.getItem("refreshToken"),
      });
    } catch (error) {
      console.log("Error: " + error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("roleName");
      setUser(null);

      setMyBoards([]);
      setInvitedBoards([]);
      navigate("/");
    }
  };

  const handleLogin = () => {
    navigate("/login");
  };

  // Dữ liệu board hiện tại
  const currentBoards = activeSection === "my" ? myBoards : invitedBoards;
  const sectionTitle =
    activeSection === "my" ? "Bảng của bạn" : "Bảng được mời";

  return (
    <div className="flex min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Sidebar - Ẩn trên mobile */}
      <aside className="hidden md:block w-64 bg-white border-r border-gray-200 p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            Không gian làm việc
          </h2>

          {/* Cá nhân */}
          <div>
            <div
              onClick={() => setActiveSection("my")}
              className={`flex items-center gap-2 text-gray-600 font-medium mb-2 cursor-pointer hover:text-blue-600 transition-colors ${
                activeSection === "my" ? "text-blue-600" : ""
              }`}
            >
              <LayoutGrid size={18} />
              <span>Cá nhân</span>
            </div>
            <ul className="ml-6 space-y-1 text-gray-600">
              {!isLoggedIn ? (
                <li className="text-sm text-gray-400 italic">
                  Vui lòng đăng nhập
                </li>
              ) : myBoards.length === 0 ? (
                <li className="text-sm text-gray-400 italic">
                  Không có bảng nào
                </li>
              ) : (
                myBoards.map((board) => (
                  <li
                    key={board._id}
                    onClick={() => handleBoardClick(board)}
                    className="hover:text-blue-600 cursor-pointer text-sm"
                  >
                    {board.title}
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Được mời vào */}
          <div className="mt-6">
            <div
              onClick={() => setActiveSection("invited")}
              className={`flex items-center gap-2 text-gray-600 font-medium mb-2 cursor-pointer hover:text-blue-600 transition-colors ${
                activeSection === "invited" ? "text-blue-600" : ""
              }`}
            >
              <Users size={18} />
              <span>Được mời vào</span>
            </div>
            <ul className="ml-6 space-y-1 text-gray-600">
              {!isLoggedIn ? (
                <li className="text-sm text-gray-400 italic">
                  Vui lòng đăng nhập
                </li>
              ) : invitedBoards.length === 0 ? (
                <li className="text-sm text-gray-400 italic">
                  Chưa có lời mời
                </li>
              ) : (
                invitedBoards.map((board) => (
                  <li
                    key={board._id}
                    onClick={() => handleBoardClick(board)}
                    className="hover:text-blue-600 cursor-pointer text-sm"
                  >
                    {board.title}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            {sectionTitle}
          </h1>

          {/* Profile / Login */}
          <div className="relative">
            {isLoggedIn ? (
              <div className="relative">
                {/* Nút Avatar + Tên */}
                <button
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 select-none"
                >
                  <div className="text-right leading-tight">
                    <p className="text-sm font-medium text-gray-700">
                      Hello, {user?.fullName || "User"}
                    </p>
                  </div>

                  {/* Avatar chuẩn Trello 2025 */}
                  <Avatar user={user} size="w-10 h-10" />
                </button>

                {/* Profile Menu Dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <Avatar
                        user={user}
                        size="w-12 h-12"
                        className="ring-4 ring-white shadow-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {user?.fullName || "User"}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {user?.email || "user@example.com"}
                        </p>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-2">
                      <button
                        onClick={() => navigate("/profile")}
                        className="flex items-center gap-3 w-full px-5 py-3 hover:bg-gray-50 text-gray-700 transition"
                      >
                        <User size={18} />
                        <span>Hồ sơ cá nhân</span>
                      </button>

                      <button
                        onClick={() => {
                          alert("Tính năng đang phát triển");
                          setShowProfileMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-5 py-3 hover:bg-gray-50 text-gray-700 transition"
                      >
                        <Settings size={18} />
                        <span>Cài đặt</span>
                      </button>

                      <button
                        onClick={() => {
                          navigate("/change-password");
                          setShowProfileMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-5 py-3 hover:bg-gray-50 text-gray-700 transition"
                      >
                        <KeyRoundIcon size={18} />
                        <span>Thay đổi mật khẩu</span>
                      </button>

                      <hr className="my-2 border-gray-200" />

                      <button
                        onClick={() => {
                          handleLogout();
                          setShowProfileMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-5 py-3 hover:bg-red-50 text-red-600 transition font-medium"
                      >
                        <LogOut size={18} />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full px-6 py-2.5 shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-medium"
              >
                <LogIn size={18} />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>

        {/* Boards Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {/* Nút Tạo bảng - CHỈ HIỆN KHI Ở TAB "CÁ NHÂN" */}
            {activeSection === "my" && isLoggedIn && (
              <div
                onClick={() => setShowCreateModal(true)}
                className="rounded-xl shadow-sm border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all cursor-pointer bg-gray-50 hover:bg-gray-100 flex items-center justify-center min-h-[100px]"
              >
                <div className="text-center p-4">
                  <Plus size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600 font-medium text-sm">
                    Tạo bảng mới
                  </p>
                </div>
              </div>
            )}

            {/* Danh sách board */}
            {currentBoards.length > 0 ? (
              currentBoards.map((board) => (
                <div
                  key={board._id}
                  onClick={() => handleBoardClick(board)}
                  className="rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col"
                >
                  <div
                    className="h-[100px] w-full"
                    style={
                      board.background?.startsWith("#")
                        ? { backgroundColor: board.background }
                        : {
                            backgroundImage: board.background
                              ? `url(${board.background})`
                              : "linear-gradient(135deg, #c3e0e5, #a2d2ff)",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                    }
                  />
                  <div className="bg-white p-3 md:p-4">
                    <h3 className="font-semibold text-gray-800 truncate text-sm md:text-base">
                      {board.title}
                    </h3>
                    {board.ownerName && (
                      <p className="text-xs text-gray-500 mt-1">
                        Chủ sở hữu: {board.ownerName}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">
                  {activeSection === "my"
                    ? "Bạn chưa có bảng nào. Hãy tạo bảng mới!"
                    : "Chưa có bảng nào mời bạn."}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex justify-around py-2">
          <button
            onClick={() => setActiveSection("my")}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              activeSection === "my" ? "text-blue-600" : "text-gray-600"
            }`}
          >
            <LayoutGrid size={20} />
            <span className="text-xs mt-1">Cá nhân</span>
          </button>
          <button
            onClick={() => setActiveSection("invited")}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              activeSection === "invited" ? "text-blue-600" : "text-gray-600"
            }`}
          >
            <Users size={20} />
            <span className="text-xs mt-1">Mời vào</span>
          </button>
        </div>
      </div>

      {/* Modal Tạo bảng */}
      <AnimatePresence>
        {showCreateModal && (
          <Motion.div
            key="create-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <Motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white rounded-xl shadow-lg w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  Tạo bảng
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div
                className="h-20 w-full rounded-t-lg"
                style={{ backgroundColor: formData.background }}
              />

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiêu đề bảng *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Nhập tiêu đề bảng..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Màu nền
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {backgroundColors.map((color) => (
                      <button
                        key={color}
                        onClick={() =>
                          setFormData({ ...formData, background: color })
                        }
                        className={`w-12 h-8 rounded-lg border-2 ${
                          formData.background === color
                            ? "border-blue-500 ring-2 ring-blue-200"
                            : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quyền xem
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="private">Riêng tư</option>
                    <option value="public">Công khai</option>
                    <option value="workspace">Không gian làm việc</option>
                  </select>
                </div>

                <button
                  onClick={handleCreateBoard}
                  disabled={creating || !formData.title.trim()}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? "Đang tạo..." : "Tạo bảng"}
                </button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
