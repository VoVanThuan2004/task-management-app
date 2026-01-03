import {
  Users,
  LogOut,
  Menu,
  X,
  LayoutDashboardIcon,
  KeyRound,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Avatar from "./Avatar";

const httpUrl = import.meta.env.VITE_API_URL;

const SideBar = ({ isCollapsed, setIsCollapsed, user, setUser }) => {
  const navigate = useNavigate();
  const currentPath = window.location.pathname;

  const isActive = (href) =>
    currentPath === href || currentPath.startsWith(href);

  const handleLogout = async () => {
    try {
      await axios.post(
        `${httpUrl}/api/v1/auth/logout`,
        { refreshToken: localStorage.getItem("refreshToken") },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
    } catch (error) {
      console.log(error);
    }
    localStorage.clear();
    setUser(null);
    navigate("/");
  };

  const menuItems = [
    {
      href: "/admin/users",
      label: "Quản lý người dùng",
      icon: Users,
    },
    {
      href: "/admin/dashboard",
      label: "Xem thống kê",
      icon: LayoutDashboardIcon,
    },
  ];

  const bottomActions = [
    {
      label: "Thông tin cá nhân",
      icon: User,
      onClick: () => navigate("/profile"),
    },
    {
      label: "Thay đổi mật khẩu",
      icon: KeyRound,
      onClick: () => navigate("/change-password"),
    },
  ];

  return (
    <aside
      className={`
    fixed inset-y-0 left-0 z-40 flex flex-col bg-gray-900 text-white
    /* CHỈ animate width → nhẹ nhất có thể */
    transition-width duration-300 ease-in-out
    overflow-hidden  /* tránh scroll bar nhảy */
    ${isCollapsed ? "w-18" : "w-64"}
  `}
    >
      {/* Header + Toggle Button */}
      <div className="relative px-6 py-6 border-b border-gray-800">
        <div className="flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Avatar
              user={user}
              size="w-10 h-10"
              className={`${isCollapsed ? "opacity-0 w-0" : ""}`}
            />
            <h1
              className={`font-bold flex items-center gap-3 transition-all duration-300 ${
                isCollapsed ? "opacity-0 w-0" : "text-2xl"
              }`}
            >
              <span>{user?.fullName}</span>
            </h1>
          </div>

          {/* Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors absolute right-4"
            title={isCollapsed ? "Mở rộng menu" : "Thu nhỏ menu"}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.href} className="relative group">
              <a
                // href={item.href}
                onClick={() => navigate(item.href)}
                className={`flex items-center px-4 py-3 rounded-xl font-medium cursor-pointer transition-all duration-300 ${
                  isActive(item.href)
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                } ${isCollapsed ? "justify-center" : "gap-4"}`}
                title={isCollapsed ? item.label : ""}
              >
                {/* Icon - luôn hiển thị, căn giữa khi collapse */}
                <item.icon
                  size={22}
                  className={`flex-shrink-0 ${
                    isActive(item.href)
                      ? "text-white"
                      : "text-gray-300 group-hover:text-white"
                  }`}
                />

                {/* Label - ẩn khi collapse */}
                <span
                  className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${
                    isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100 ml-0"
                  }`}
                >
                  {item.label}
                </span>
              </a>

              {/* Tooltip khi collapse (hover hiện label) */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-10">
                  {item.label}
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Đường phân cách */}
      <hr className="my-4 border-gray-700" />

      {/* Bottom Actions */}
      <div className="px-3 pb-6 space-y-2">
        {bottomActions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`
              group flex items-center w-full px-4 py-3 rounded-xl font-medium text-gray-300
              hover:bg-gray-800 hover:text-white transition-all duration-200
              ${isCollapsed ? "justify-center" : "gap-4"}
            `}
            title={isCollapsed ? action.label : ""}
          >
            <action.icon
              size={22}
              className="flex-shrink-0 group-hover:text-indigo-400"
            />
            {!isCollapsed && (
              <span className="whitespace-nowrap overflow-hidden">
                {action.label}
              </span>
            )}
          </button>
        ))}

        {/* Đăng xuất */}
        <button
          onClick={handleLogout}
          className={`
            group flex items-center w-full px-4 py-3 rounded-xl font-medium text-gray-300
            hover:bg-red-900/50 hover:text-red-300 transition-all duration-200
            ${isCollapsed ? "justify-center" : "gap-4"}
          `}
          title={isCollapsed ? "Đăng xuất" : ""}
        >
          <LogOut
            size={22}
            className="flex-shrink-0 group-hover:text-red-400"
          />
          {!isCollapsed && (
            <span className="whitespace-nowrap overflow-hidden">Đăng xuất</span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default SideBar;
