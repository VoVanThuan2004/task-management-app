import SideBar from "../../components/SideBar";
import { Outlet } from "react-router-dom";

const AdminPage = () => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <SideBar />

      {/* Nội dung bên phải */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminPage;
