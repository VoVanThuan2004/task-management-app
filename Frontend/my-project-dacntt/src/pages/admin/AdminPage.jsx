import SideBar from "../../components/SideBar";
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useUser } from "../../components/useUser";

const AdminPage = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, setUser } = useUser();

  // Tự collapse khi màn hình nhỏ
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true); // mobile & tablet
      } else {
        setIsCollapsed(false); // desktop
      }
    };

    handleResize(); // chạy lần đầu
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <SideBar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        user={user}
        setUser={setUser}
      />

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-300 overflow-y-auto
          ${isCollapsed ? "ml-18" : "ml-64"}
        `}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AdminPage;

