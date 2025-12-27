import { Users, LogOut, Menu, X, LayoutDashboardIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const httpUrl = import.meta.env.VITE_API_URL;

const SideBar = ({ isCollapsed, setIsCollapsed }) => {
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

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-gray-900 text-white
      transition-all duration-300 ease-in-out
      ${isCollapsed ? "w-18" : "w-64"}
      overflow-y-auto`}
    >
      {/* Header + Toggle Button */}
      <div className="relative px-6 py-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <h1
            className={`font-bold flex items-center gap-3 transition-all duration-300 ${
              isCollapsed ? "opacity-0 w-0" : "text-2xl"
            }`}
          >
            <span>ADMIN PANEL</span>
          </h1>

          {/* Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors absolute right-4"
            title={isCollapsed ? "Mở rộng menu" : "Thu nhỏ menu"}
          >
            {isCollapsed ? <Menu size={22} /> : <X size={22} />}
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.href} className="relative group">
              <a
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
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

      {/* Logout - Bottom */}
      <div className="px-4 pb-8">
        <button
          onClick={handleLogout}
          className={`group flex items-center gap-4 w-full px-4 py-3 rounded-xl font-medium text-gray-300 hover:bg-red-900/50 hover:text-red-300 transition-all duration-200`}
          title={isCollapsed ? "Đăng xuất" : ""}
        >
          <LogOut
            size={22}
            className="group-hover:text-red-400 flex-shrink-0"
          />
          <span
            className={`transition-all duration-300 ${
              isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            }`}
          >
            Đăng xuất
          </span>
        </button>
      </div>
    </aside>
  );
};

export default SideBar;
