import {
  Route,
  Routes,
  Navigate,
  BrowserRouter as Router,
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

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <UserProvider>
        <Router>
          {/* Toaster đặt ở đây, ngoài Routes */}
          <Toaster
            position="top-right"
            reverseOrder={false}
            toastOptions={{
              success: {
                duration: 4000,
                style: {
                  marginTop: "40px",
                  background: "#4ade80",
                  color: "#fff",
                },
              },
              error: {
                style: {
                  duration: 4000,
                  marginTop: "40px",
                  background: "#ef4444",
                  color: "#fff",
                },
              },
            }}
          />

          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/boards/:boardId/:title" element={<BoardDetail />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/recovery-password" element={<RecoveryPassword />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="*" element={<Navigate to="/" replace />} />

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
            </Route>
          </Routes>
        </Router>
      </UserProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
