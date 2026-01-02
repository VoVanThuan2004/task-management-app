import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import { User, LogOut, LogIn, KeyRoundIcon, Wallet } from "lucide-react";
import { useEffect, useRef } from "react";

const Profile = ({
  isLoggedIn,
  user,
  setShowProfileMenu,
  showProfileMenu,
  handleLogout,
}) => {
  const navigate = useNavigate();

  const menuRef = useRef(null);

  useEffect(() => {
    // Hàm đóng menu khi click ra ngoài
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    // Chỉ thêm listener khi menu đang mở
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Cleanup: xóa listener khi component unmount hoặc menu đóng
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  const handleLogin = () => {
    navigate("/login");
  };
  return (
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
            <div
              ref={menuRef}
              className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50"
            >
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
                    navigate("/change-password");
                    setShowProfileMenu(false);
                  }}
                  className="flex items-center gap-3 w-full px-5 py-3 hover:bg-gray-50 text-gray-700 transition"
                >
                  <KeyRoundIcon size={18} />
                  <span>Thay đổi mật khẩu</span>
                </button>

                <button
                  onClick={() => {
                    navigate("/payment-history");
                    setShowProfileMenu(false);
                  }}
                  className="flex items-center gap-3 w-full px-5 py-3 hover:bg-gray-50 text-gray-700 transition"
                >
                  <Wallet size={18} />
                  <span>Xem lịch sử thanh toán</span>
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
          className="flex items-center gap-2 bg-blue-600 cursor-pointer text-white rounded-full px-6 py-2.5 shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all duration-300 font-medium"
        >
          <LogIn size={18} />
          <span>Đăng nhập</span>
        </button>
      )}
    </div>
  );
};

export default Profile;
