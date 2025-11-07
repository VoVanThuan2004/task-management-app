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
} from "lucide-react";
import { useUser } from "../components/useUser";
import { AnimatePresence, motion as Motion } from "framer-motion";

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

  const httpUrl = import.meta.env.VITE_API_URL;
  const accessToken = localStorage.getItem("accessToken");
  const isLoggedIn = !!accessToken; // Kiểm tra đăng nhập

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
      setLoading(false); // Nếu chưa login thì không cần loading
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
      // Nếu token hết hạn hoặc không hợp lệ
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
    setUser(null);
    // Không navigate để người dùng vẫn ở lại trang home
  };

  const handleCreateBoard = async () => {
    // Kiểm tra đăng nhập trước khi tạo board
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
        setFormData({
          title: "",
          type: "private",
          background: "#026aa7",
        });
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
      // Không navigate để ở lại trang home
    }
  };

  const handleLogin = () => {
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            Không gian làm việc
          </h2>

          <div>
            <div className="flex items-center gap-2 text-gray-600 font-medium mb-2">
              <LayoutGrid size={18} />
              <span>Cá nhân</span>
            </div>
            <ul className="ml-6 space-y-1 text-gray-600">
              {!isLoggedIn ? (
                <li className="text-sm text-gray-400 italic">
                  Vui lòng đăng nhập để xem bảng
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
                    className="hover:text-blue-600 cursor-pointer"
                  >
                    {board.title}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2 text-gray-600 font-medium mb-2">
              <Users size={18} />
              <span>Được mời vào</span>
            </div>
            <ul className="ml-6 space-y-1 text-gray-600">
              {!isLoggedIn ? (
                <li className="text-sm text-gray-400 italic">
                  Vui lòng đăng nhập để xem lời mời
                </li>
              ) : invitedBoards.length === 0 ? (
                <li className="text-sm text-gray-400 italic">
                  Chưa có lời mời nào
                </li>
              ) : (
                invitedBoards.map((board) => (
                  <li
                    key={board._id}
                    onClick={() => handleBoardClick(board)}
                    className="hover:text-blue-600 cursor-pointer"
                  >
                    {board.title}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="text-sm text-gray-400 text-center">
          © {new Date().getFullYear()} My Trello Clone
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 relative">
          <h1 className="text-2xl font-bold text-gray-800">Bảng của bạn</h1>

          {/* Profile / Login Button */}
          <div className="relative">
            {isLoggedIn ? (
              // Hiển thị profile khi đã login
              <button
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm hover:shadow transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      Hello, {user?.fullName || "User"}
                    </p>
                  </div>
                  <img
                    src={user?.avatar || "https://i.pravatar.cc/40"}
                    alt="avatar"
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                  />
                </div>
              </button>
            ) : (
              // Hiển thị nút login khi chưa đăng nhập
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 bg-blue-600 text-white rounded-full px-6 py-2 shadow-sm hover:bg-blue-700 transition-all"
              >
                <LogIn size={18} />
                <span>Đăng nhập</span>
              </button>
            )}

            {/* Profile Menu (chỉ hiển thị khi đã login) */}
            {showProfileMenu && isLoggedIn && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {user?.fullName || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email || ""}
                  </p>
                </div>
                <button
                  onClick={() => alert("Xem hồ sơ")}
                  className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-100 text-gray-700"
                >
                  <User size={16} />
                  Xem hồ sơ
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-100 text-gray-700"
                >
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Boards Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Ô Tạo bảng mới */}
            <div
              onClick={() => setShowCreateModal(true)}
              className="rounded-xl shadow-sm border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all cursor-pointer bg-gray-50 hover:bg-gray-100 flex items-center justify-center min-h-[100px]"
            >
              <div className="text-center p-4">
                <Plus size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600 font-medium">Tạo bảng mới</p>
              </div>
            </div>

            {/* Các board hiện có */}
            {isLoggedIn ? (
              // Hiển thị boards khi đã login
              myBoards.map((board) => (
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
                  <div className="bg-white p-4">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {board.title}
                    </h3>
                    {board.ownerName && (
                      <p className="text-sm text-gray-500">
                        Owner: {board.ownerName}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              // Hiển thị thông báo khi chưa login
              <div className="col-span-3 flex items-center justify-center h-32">
                <div className="text-center">
                  <p className="text-gray-500 mb-2">
                    Vui lòng đăng nhập để xem và quản lý bảng của bạn
                  </p>
                  <button
                    onClick={handleLogin}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Đăng nhập ngay →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Tạo bảng mới */}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      </main>
    </div>
  );
}