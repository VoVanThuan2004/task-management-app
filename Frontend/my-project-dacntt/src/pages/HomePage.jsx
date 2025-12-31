import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  LayoutGrid,
  Users,
  Loader2,
  LogIn,
  Plus,
  X,
  CreditCard,
  Crown,
  Check,
  Wallet,
} from "lucide-react";
import { useUser } from "../components/useUser";
import { AnimatePresence, motion as Motion } from "framer-motion";
import toast from "react-hot-toast";
import Profile from "../components/Profile";

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

  // State để chuyển tab
  const [activeSection, setActiveSection] = useState("my");

  // State mua gói vip
  const [showVipModal, setShowVipModal] = useState(false);
  const [vipModalData, setVipModalData] = useState({
    message: "",
    title: "Nâng cấp lên gói VIP",
  });
  const [loadingPayment, setLoadingPayment] = useState(false);

  const [vipStatus, setVipStatus] = useState(null);
  const [loadingVip, setLoadingVip] = useState(false);

  const httpUrl = import.meta.env.VITE_API_URL;
  const accessToken = localStorage.getItem("accessToken");
  const isLoggedIn = !!accessToken;

  const { user, setUser } = useUser();
  const navigate = useNavigate();

  const backgroundColors = [
    // Màu solid gốc của bạn
    "#026aa7",
    "#d29034",
    "#519839",
    "#b04632",
    "#89609e",
    "#cd5a91",
    "#4bbf6b",
    "#00aecc",

    // 4 màu gradient mới - giống Trello, đẹp lung linh
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // Purple to Indigo (rất phổ biến trong Trello custom)
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", // Pink to Red (năng động, nữ tính)
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", // Blue to Cyan (tươi mát, hiện đại)
    "linear-gradient(135deg, #43cea2 0%, #185a9d 100%)", // Green to Deep Blue (tươi sáng, chuyên nghiệp)
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
    } catch (err) {
      const errorResponse = err.response?.data;

      if (
        err.response?.status === 403 &&
        errorResponse?.error === "BOARD_LIMIT_EXCEEDED"
      ) {
        // MỞ MODAL VIP + truyền message từ backend
        setVipModalData({
          message:
            errorResponse.message || "Bạn đã đạt giới hạn tạo bảng miễn phí.",
          title: "Đạt giới hạn bảng miễn phí",
        });
        setShowVipModal(true);
        handleCloseCreateModal();
      } else {
        if (err.response?.status === 403) {
          navigate("/login");
        } else {
          alert("Lỗi hệ thống");
        }
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setFormData({
      title: "",
      type: "private",
      background: "#026aa7",
    });
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

  const handleUpgradeVip = async () => {
    setLoadingPayment(true);
    try {
      const res = await axios.post(
        `${httpUrl}/api/v1/payment/vip`,
        { amount: 100000 },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (res.data.data) {
        window.location.href = res.data.data;
      }
    } catch (err) {
      console.log(err);
      toast.error("Không thể tạo link thanh toán. Vui lòng thử lại.");
      setLoadingPayment(false);
    }
  };

  // Hàm lấy trạng thái VIP
  const fetchVipStatus = async () => {
    if (activeSection !== "vip") return;
    setLoadingVip(true);
    try {
      const res = await axios.get(`${httpUrl}/api/v1/users/vip`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.data.status === "success") {
        setVipStatus(res.data.data);
      }
    } catch (err) {
      console.log(err);
      toast.error("Không thể tải thông tin gói VIP");
      setVipStatus(null);
    } finally {
      setLoadingVip(false);
    }
  };

  useEffect(() => {
    if (activeSection === "vip") {
      fetchVipStatus();
    }
  }, [activeSection]);

  // Dữ liệu board hiện tại
  const currentBoards = activeSection === "my" ? myBoards : invitedBoards;

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

          {/* Nâng cấp VIP - thêm vào dưới "Được mời vào" */}
          <div className="mt-6">
            <div
              onClick={() => setActiveSection("vip")}
              className={`flex items-center gap-2 text-gray-600 font-medium mb-2 cursor-pointer hover:text-blue-600 transition-colors ${
                activeSection === "vip" ? "text-blue-600" : ""
              }`}
            >
              <Wallet size={18} />
              <span>Nâng cấp tài khoản VIP</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {/* Header */}
        {/* Header - Đã tối ưu responsive cho mobile */}
        <div className="flex items-center justify-between mb-6">
          {/* Tiêu đề - chiếm hết không gian còn lại, căn trái */}
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex-1 truncate pr-4">
            {activeSection === "my"
              ? "Bảng của tôi"
              : activeSection === "invited"
              ? "Bảng được mời vào"
              : "Nâng cấp tài khoản VIP"}
          </h1>

          {/* Profile - luôn nằm bên phải, cả mobile lẫn desktop */}
          <div className="flex-shrink-0">
            <Profile
              isLoggedIn={isLoggedIn}
              user={user}
              setShowProfileMenu={setShowProfileMenu}
              showProfileMenu={showProfileMenu}
              handleLogout={handleLogout}
            />
          </div>
        </div>

        {/* Nội dung chính theo activeSection */}
        {activeSection === "vip" ? (
          loadingVip ? (
            <div className="flex justify-center items-center py-32">
              <Loader2 className="animate-spin text-orange-600" size={48} />
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[80vh] px-4 py-8">
              <div className="w-full max-w-lg">
                {!accessToken ? (
                  <h2 className="text-xl font-bold text-gray-800 text-center">
                    Vui lòng đăng nhập
                  </h2>
                ) : (
                  <div className="bg-white rounded-3xl shadow-2xl border border-gray-300 overflow-hidden">
                    {/* Header VIP */}
                    <div className="bg-orange-400 text-white p-10 text-center">
                      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-5">
                        <Crown size={48} />
                      </div>
                      <h2 className="text-3xl font-extrabold">
                        {vipStatus?.isVip
                          ? "Bạn đang là thành viên VIP"
                          : "Nâng cấp lên gói VIP"}
                      </h2>
                      <p className="text-white/90 mt-3 text-lg">
                        Trải nghiệm không giới hạn với các tính năng cao cấp
                      </p>
                    </div>

                    {/* Body */}
                    <div className="p-8 space-y-8">
                      {vipStatus?.isVip ? (
                        /* ĐÃ LÀ VIP */
                        <div className="text-center py-6">
                          <p className="text-3xl font-semibold text-green-600 mb-5">
                            Đã kích hoạt thành công!
                          </p>
                          <p className="text-xl text-gray-700 mb-3">
                            Gói VIP của bạn sẽ hết hạn vào:
                          </p>
                          <p className="text-3xl font-extrabold text-orange-500 mb-8">
                            {vipStatus.expirationDate
                              ? new Date(
                                  vipStatus.expirationDate
                                ).toLocaleDateString("vi-VN", {
                                  weekday: "long",
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "Chưa xác định"}
                          </p>

                          <div className="bg-white-50 border-2 border-orange-200 rounded-3xl p-8">
                            <p className="text-xl text-black font-semibold">
                              Bạn đang sử dụng đầy đủ các tính năng cao cấp
                            </p>
                            <p className="text-black mt-3">
                              Không giới hạn bảng, thẻ và AI gợi ý thông minh
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* CHƯA LÀ VIP */
                        <>
                          <div className="text-center">
                            <p className="text-xl text-gray-700 leading-relaxed">
                              Nâng cấp ngay để mở khóa toàn bộ sức mạnh của hệ
                              thống!
                            </p>
                          </div>

                          {/* Giá gói */}
                          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-4 border-amber-300 rounded-3xl p-8 text-center">
                            <p className="text-amber-600 font-bold uppercase tracking-widest mb-3">
                              Gói VIP - 30 ngày
                            </p>
                            <p className="text-6xl font-extrabold text-amber-700">
                              100.000
                              <span className="text-3xl font-normal"> VND</span>
                            </p>
                          </div>

                          {/* Lợi ích */}
                          <div className="grid md:grid-cols-2 gap-6 mt-6">
                            {[
                              "Tạo không giới hạn số lượng bảng làm việc",
                              "Mỗi bảng không giới hạn số lượng thẻ (task)",
                              "Sử dụng AI gợi ý việc cần làm thông minh",
                              "Ưu tiên hỗ trợ kỹ thuật & cập nhật tính năng mới",
                            ].map((benefit, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-4 bg-gray-50 rounded-2xl p-5"
                              >
                                <Check
                                  size={28}
                                  className="text-green-600 flex-shrink-0 mt-0.5"
                                />
                                <p className="text-gray-800 font-medium">
                                  {benefit}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Nút nâng cấp */}
                          <div className="text-center mt-10">
                            <button
                              onClick={handleUpgradeVip}
                              disabled={loadingPayment}
                              className="inline-flex items-center gap-3 px-10 py-5 bg-orange-500 text-white text-xl font-bold rounded-3xl hover:bg-orange-600 transition-all shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                              {loadingPayment ? (
                                <>
                                  <Loader2 className="animate-spin" size={28} />
                                  Đang chuyển đến thanh toán...
                                </>
                              ) : (
                                <>
                                  <CreditCard size={32} />
                                  Nâng cấp ngay
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          /* ==================== BOARD GRID (my / invited) ==================== */
          <>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-gray-400" size={32} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {/* Nút Tạo bảng */}
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
                                backgroundImage: board.background,
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
                    <p className="text-gray-500 text-xl">
                      {activeSection === "my"
                        ? "Bạn chưa có bảng nào. Hãy tạo bảng mới!"
                        : "Chưa có bảng nào mời bạn tham gia."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
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
          <button
            onClick={() => setActiveSection("vip")}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              activeSection === "vip" ? "text-blue-600" : "text-gray-600"
            }`}
          >
            <Wallet size={20} />
            <span className="text-xs mt-1">Gói VIP</span>
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
            onClick={() => handleCloseCreateModal()}
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
                  onClick={() => handleCloseCreateModal()}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div
                className="h-32 w-full rounded-t-xl"
                style={{
                  background: formData.background.startsWith("linear-gradient")
                    ? undefined
                    : formData.background,
                  backgroundImage: formData.background.startsWith(
                    "linear-gradient"
                  )
                    ? formData.background
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
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
                  <div className="flex justify-center">
                    <div className="grid grid-cols-4 gap-8">
                      {backgroundColors.map((color) => (
                        <button
                          key={color}
                          onClick={() =>
                            setFormData({ ...formData, background: color })
                          }
                          className={`w-12 aspect-square rounded-lg border-2 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 ${
                            formData.background === color
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-gray-300"
                          }`}
                          style={{
                            background: color.startsWith("linear-gradient")
                              ? undefined
                              : color,
                            backgroundImage: color.startsWith("linear-gradient")
                              ? color
                              : undefined,
                          }}
                        />
                      ))}
                    </div>
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

      {/* Modal Nâng cấp VIP */}
      <AnimatePresence>
        {showVipModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowVipModal(false)}
          >
            <Motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header đẹp */}
              <div className="bg-orange-400 text-white p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold">{vipModalData.title}</h2>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                <div className="text-center text-gray-600">
                  <p className="text-lg leading-relaxed">
                    {vipModalData.message}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
                  <div className="text-center">
                    <p className="text-md text-amber-600 font-medium uppercase tracking-wide mb-2">
                      Gói VIP - Chỉ
                    </p>
                    <p className="text-4xl font-bold text-amber-700">
                      100.000{" "}
                      <span className="text-lg font-normal">VND/ tháng</span>
                    </p>
                    {/* <p className="text-sm text-amber-600 mt-1">/ month</p> */}
                  </div>

                  <ul className="mt-5 space-y-3 text-sm text-gray-700">
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      Tạo không giới hạn số lượng bảng làm việc
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      Mỗi bảng không giới hạn thẻ (task)
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      Sử dụng AI gợi ý việc cần làm thông minh
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      Ưu tiên hỗ trợ & cập nhật tính năng mới
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowVipModal(false)}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => handleUpgradeVip()}
                    disabled={loadingPayment}
                    className="flex-1 py-3 bg-orange-400 text-white rounded-xl hover:bg-orange-500 transition font-medium shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    <CreditCard size={18} />
                    Thanh toán ngay
                  </button>
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
