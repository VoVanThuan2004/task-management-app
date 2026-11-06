import { Route, Routes, Navigate } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import HomePage from "../pages/HomePage";
import BoardDetail from "../pages/BoardDetail";
import LoginPage from "../pages/LoginPage";
import RecoveryPassword from "../pages/RecoveryPassword";
import Register from "../pages/Register";
import ProfilePage from "../pages/ProfilePage";
import ChangePassword from "../pages/ChangePassword";
import PaymentHistory from "../pages/PaymentHistory";
import HeaderTest from "../pages/HeaderTest";
import TaskDetail from "../components/TaskDetail";
import AdminPage from "../pages/admin/AdminPage";
import UserPage from "../pages/admin/UserPage";
import DashboardPage from "../pages/admin/DashboardPage";
import PrivateRoute from "./PrivateRoute";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/boards/:boardId/:title" element={<BoardDetail />}>
        {/* Child route cho task detail - URL con */}
        <Route path=":taskId/:taskTitle" element={<TaskDetail />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/recovery-password" element={<RecoveryPassword />} />
      <Route path="/register" element={<Register />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/payment-history" element={<PaymentHistory />} />
      <Route path="/test" element={<HeaderTest />} />

      {/* ADMIN */}
      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRoles={["ADMIN"]}>
            <AdminPage />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<UserPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
