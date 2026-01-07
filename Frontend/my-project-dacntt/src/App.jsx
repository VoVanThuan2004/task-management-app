import {
  Route,
  Routes,
  Navigate,
  BrowserRouter as Router,
  useLocation,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import { UserProvider } from "./components/UserProvider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";
import BoardDetail from "./pages/BoardDetail";
import RecoveryPassword from "./pages/RecoveryPassword";
import Register from "./pages/Register";
import ProfilePage from "./pages/ProfilePage";
import ChangePassword from "./pages/ChangePassword";
import AdminPage from "./pages/admin/AdminPage";
import PrivateRoute from "./components/PrivateRoutes";
import UserPage from "./pages/admin/UserPage";
import PaymentHistory from "./pages/PaymentHistory";
import DashboardPage from "./pages/admin/DashboardPage";
import ChatWidget from "./components/Chatbot/ChatWidget";
import HeaderTest from "./pages/HeaderTest";
import TaskDetail from "./components/TaskDetail";

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <UserProvider>
        <Router>
          <AppContent />
        </Router>
      </UserProvider>
    </GoogleOAuthProvider>
  );
}

function AppContent() {
  const location = useLocation();

  // Danh sách các path KHÔNG muốn hiển thị ChatWidget
  const hideChatWidgetPaths = [
    "/login",
    "/register",
    "/recovery-password",
    "/profile",
    "/change-password",
    "/payment-history",
  ];

  const shouldHideChatWidget =
    location.pathname.startsWith("/admin") ||
    hideChatWidgetPaths.includes(location.pathname);

  return (
    <>
      {/* Toaster đặt ở đây, ngoài Routes */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={12}
        containerStyle={{ marginTop: "20px" }}
        toastOptions={{
          duration: 4000,

          // Style chung cho tất cả toast
          style: {
            background: "#fff",
            color: "#1f2937",
            borderRadius: "6px",
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            padding: "16px 28px",
            maxWidth: "420px",
            border: "none",
            fontSize: "15px",
            fontWeight: "500",
          },

          // Thành công - giống ảnh
          success: {
            icon: (
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mr-3 flex-shrink-0">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            ),
            style: {
              borderLeft: "5px solid #22c55e",
              background: "#fff",
            },
          },

          // Thất bại - giống ảnh
          error: {
            icon: (
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center mr-3 flex-shrink-0">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            ),
            style: {
              borderLeft: "5px solid #ef4444",
              background: "#fff",
            },
          },

          // === MỚI: Toast cho thông báo bình luận / hoạt động ===
          notification: {
            icon: (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-3 flex-shrink-0">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
            ),
            style: {
              borderLeft: "5px solid #3b82f6", // xanh dương
              background: "#fff",
            },
          },

          // Nút X đóng - đẹp, hover mượt
          closeButton: {
            color: "#9ca3af",
            hoverColor: "#4b5563",
            background: "transparent",
            hoverBackground: "#f3f4f6",
            padding: "4px",
            borderRadius: "8px",
          },
        }}
      />

      <Routes>
        <Route path="/" element={<HomePage />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
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
      </Routes>
      {/* Chỉ hiển thị ChatWidget khi KHÔNG ở các trang bị loại trừ */}
      {!shouldHideChatWidget && <ChatWidget />}
    </>
  );
}

export default App;
