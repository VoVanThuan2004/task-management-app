// UserPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Search,
  Users,
  Lock,
  Unlock,
  Calendar,
  Edit2,
  Loader2,
  X,
  Upload,
  PlusCircle,
} from "lucide-react";
import Avatar from "../../components/Avatar";
import { motion as Motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const httpUrl = import.meta.env.VITE_API_URL;

const UserPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [lockingUserId, setLockingUserId] = useState(null);

  // State update user
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [updateFullName, setUpdateFullName] = useState("");
  const [updateAvatar, setUpdateAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [updating, setUpdating] = useState(false);

  // State cho add user
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addFullName, setAddFullName] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addAvatar, setAddAvatar] = useState(null);
  const [addAvatarPreview, setAddAvatarPreview] = useState("");
  const [adding, setAdding] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${httpUrl}/api/v1/users`, {
          params: { page, limit, search: debouncedSearch || undefined },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        setUsers(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
      } catch (err) {
        console.error("Fetch users error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [page, debouncedSearch]);

  // Hàm gọi API khóa - mở khóa
  const handleToggleLock = async (user) => {
    if (lockingUserId) return;

    setLockingUserId(user._id);
    try {
      const res = await axios.put(
        `${httpUrl}/api/v1/users/${user._id}/toggle-lock`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id ? { ...u, isActive: !user.isActive } : u
        )
      );
      toast.success(res.data.message);
    } catch (error) {
      console.log(error);
    } finally {
      setLockingUserId(null);
    }
  };

  // Hàm mở modal update user
  const handleEditUser = (user) => {
    setEditingUser(user);
    setUpdateFullName(user.fullName || "");
    setAvatarPreview(user.avatar || "");
    setUpdateAvatar(null);
    setShowUpdateModal(true);
  };

  // Hàm gọi API update user
  const handleUpdateUser = async () => {
    if (!updateFullName.trim()) {
      alert("Vui lòng nhập tên đầy đủ");
      return;
    }

    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append("fullName", updateFullName.trim());
      if (updateAvatar) {
        formData.append("avatar", updateAvatar);
      }

      const res = await axios.put(
        `${httpUrl}/api/v1/users/admin/${editingUser._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Cập nhật local state
      setUsers((prev) =>
        prev.map((u) =>
          u._id === editingUser._id
            ? {
                ...u,
                fullName: res.data.data.fullName,
                avatar: res.data.data.avatar || u.avatar,
              }
            : u
        )
      );

      setShowUpdateModal(false);
    } catch (err) {
      alert("Cập nhật thất bại");
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  // Hàm gọi API thêm user
  const handleAddUser = async () => {
    if (!addEmail || !addFullName || !addPassword) {
      alert("Vui lòng nhập đầy đủ email, tên và mật khẩu");
      return;
    }

    if (addPassword.length < 8) {
      alert("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    setAdding(true);
    try {
      const formData = new FormData();
      formData.append("email", addEmail.trim());
      formData.append("fullName", addFullName.trim());
      formData.append("password", addPassword);
      if (addAvatar) {
        formData.append("avatar", addAvatar);
      }

      const res = await axios.post(`${httpUrl}/api/v1/users/admin`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // Thêm user mới vào đầu danh sách
      setUsers((prev) => [res.data.data, ...prev]);

      // Reset form + đóng modal
      setAddEmail("");
      setAddFullName("");
      setAddPassword("");
      setAddAvatar(null);
      setAddAvatarPreview("");
      setShowAddModal(false);
    } catch (err) {
      const msg = err.response?.data?.message || "Tạo người dùng thất bại";
      alert(msg);
    } finally {
      setAdding(false);
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              Quản lý người dùng
            </h1>
            <p className="text-gray-600 mt-2">
              Xem và quản lý tất cả tài khoản trong hệ thống
            </p>
          </div>

          {/* Nút Thêm người dùng */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium cursor-pointer hover:bg-blue-700 transition shadow-md hover:shadow-lg"
            title="Thêm người dùng"
          >
            <PlusCircle size={22} />
            {/* Thêm người dùng */}
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <tr>
                  <th className="px-8 py-5 text-left text-sm font-semibold text-gray-700">
                    Người dùng
                  </th>
                  <th className="px-8 py-5 text-left text-sm font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-8 py-5 text-center text-sm font-semibold text-gray-700">
                    Số bảng sở hữu
                  </th>
                  <th className="px-8 py-5 text-center text-sm font-semibold text-gray-700">
                    Trạng thái
                  </th>
                  <th className="px-8 py-5 text-center text-sm font-semibold text-gray-700">
                    Ngày đăng ký
                  </th>
                  <th className="px-8 py-5 text-center text-sm font-semibold text-gray-700">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full" />
                            <div className="h-4 bg-gray-200 rounded w-32" />
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="h-4 bg-gray-200 rounded w-48" />
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="h-4 bg-gray-200 rounded w-12 mx-auto" />
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="h-6 bg-gray-200 rounded-full w-20 mx-auto" />
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="h-4 bg-gray-200 rounded w-24 mx-auto" />
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="h-4 bg-gray-200 rounded w-24 mx-auto" />
                        </td>
                      </tr>
                    ))
                  : users.map((user) => (
                      <tr
                        key={user._id}
                        className="hover:bg-blue-50/30 transition-colors duration-200"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <Avatar user={user} size="w-10 h-10" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.fullName || "Chưa đặt tên"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-gray-600">
                          {user.email}
                        </td>
                        <td className="px-8 py-6 text-center font-medium text-gray-700">
                          {user.totalBoards || 0}
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${
                              user.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {user.isActive ? (
                              <>
                                <Unlock size={16} />
                                Hoạt động
                              </>
                            ) : (
                              <>
                                <Lock size={16} />
                                Đã khóa
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center text-gray-600">
                          <div className="flex items-center justify-center gap-2">
                            <Calendar size={16} className="text-gray-400" />
                            {new Date(user.createdAt).toLocaleDateString(
                              "vi-VN"
                            )}
                          </div>
                        </td>
                        {/* Hành động - NÚT ICON ĐẸP */}
                        <td className="px-8 py-6 text-center">
                          <div className="flex items-center justify-center gap-3">
                            {/* Nút Cập nhật */}
                            <button
                              onClick={() => handleEditUser(user)}
                              className="p-2.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 transition-all duration-200 group"
                              title="Cập nhật thông tin"
                            >
                              <Edit2
                                size={18}
                                className="group-hover:scale-110 transition-transform"
                              />
                            </button>

                            {/* Nút Khóa/Mở khóa */}
                            <button
                              onClick={() => handleToggleLock(user)}
                              disabled={lockingUserId === user._id}
                              className={`p-2.5 rounded-lg transition-all duration-200 group ${
                                user.isActive
                                  ? "bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700"
                                  : "bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700"
                              } ${
                                lockingUserId === user._id
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              title={
                                user.isActive
                                  ? "Khóa tài khoản"
                                  : "Mở khóa tài khoản"
                              }
                            >
                              {lockingUserId === user._id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : user.isActive ? (
                                <Lock
                                  size={18}
                                  className="group-hover:scale-110 transition-transform"
                                />
                              ) : (
                                <Unlock
                                  size={18}
                                  className="group-hover:scale-110 transition-transform"
                                />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {!loading && users.length === 0 && (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                Không tìm thấy người dùng nào
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-5 py-3 rounded-xl border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            >
              Trước
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-xl font-medium transition ${
                    p === page
                      ? "bg-blue-600 text-white shadow-md"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-5 py-3 rounded-xl border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            >
              Sau
            </button>
          </div>
        )}
      </div>

      {/* ===== MODAL CẬP NHẬT USER ===== */}
      <AnimatePresence>
        {showUpdateModal && editingUser && (
          <Motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowUpdateModal(false)}
          >
            {/* Overlay mờ */}
            <Motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal content - scale + slide nhẹ từ dưới */}
            <Motion.div
              className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()} // ngăn click ngoài đóng modal
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Cập nhật người dùng
                </h2>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={22} className="text-gray-500" />
                </button>
              </div>

              {/* Avatar Preview + Upload */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-32 h-32 rounded-full object-cover shadow-lg border-4 border-white"
                    />
                  ) : (
                    <Avatar
                      user={editingUser}
                      size="w-32 h-32"
                      className="shadow-lg border-4 border-white"
                    />
                  )}

                  <label className="absolute bottom-0 right-0 p-3 bg-blue-600 rounded-full cursor-pointer hover:bg-blue-700 transition shadow-lg flex items-center justify-center">
                    <Upload size={20} className="text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setUpdateAvatar(file);
                          setAvatarPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Click vào biểu tượng để thay đổi avatar
                </p>
              </div>

              {/* Full Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên đầy đủ
                </label>
                <input
                  type="text"
                  value={updateFullName}
                  onChange={(e) => setUpdateFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="Nhập tên đầy đủ"
                />
              </div>

              {/* Email (read-only) */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-600">
                  {editingUser.email}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Email không thể thay đổi
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdateUser}
                  disabled={updating}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang cập nhật...
                    </>
                  ) : (
                    "Lưu thay đổi"
                  )}
                </button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* ===== MODAL THÊM NGƯỜI DÙNG ===== */}
      <AnimatePresence>
        {showAddModal && (
          <Motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
          >
            <Motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
            />

            <Motion.div
              className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Thêm người dùng mới
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={22} className="text-gray-500" />
                </button>
              </div>

              {/* Avatar Preview + Upload */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative">
                  {addAvatarPreview ? (
                    <img
                      src={addAvatarPreview}
                      alt="Avatar preview"
                      className="w-32 h-32 rounded-full object-cover shadow-lg border-4 border-white"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-4xl font-bold text-gray-500 shadow-lg border-4 border-white">
                      ?
                    </div>
                  )}

                  <label className="absolute bottom-0 right-0 p-3 bg-blue-600 rounded-full cursor-pointer hover:bg-blue-700 transition shadow-lg flex items-center justify-center">
                    <Upload size={20} className="text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setAddAvatar(file);
                          setAddAvatarPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Click để upload avatar (tùy chọn)
                </p>
              </div>

              {/* Email */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" // đổi thành text để kiểm soát validate tốt hơn
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="abc@email.com"
                />
                {/* Message lỗi email */}
                {addEmail && !isValidEmail(addEmail) && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Email không hợp lệ (ví dụ: abc@example.com)
                  </p>
                )}
              </div>

              {/* Full Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên đầy đủ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="********"
                />
              </div>

              {/* Password */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="********"
                />
                {/* Message lỗi realtime */}
                {addPassword && addPassword.length < 8 && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Mật khẩu phải có ít nhất 8 ký tự
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={adding}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    "Tạo tài khoản"
                  )}
                </button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserPage;
