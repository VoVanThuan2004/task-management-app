import { Navigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function PrivateRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("accessToken");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  try {
    const decoded = jwtDecode(token);

    // Kiểm tra hạn token
    if (decoded.exp * 1000 < Date.now()) {
      if (localStorage.getItem("roleName") === "ADMIN") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("roleName");
        return <Navigate to="/" replace />;
      }
      // Token hết hạn → xóa và về login
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("roleName");
      return <Navigate to="/login" replace />;
    }

    // Kiểm tra role
    if (allowedRoles && !allowedRoles.includes(decoded.roleName)) {
      return <Navigate to="/" replace />;
    }

    return children;
  } catch (error) {
    console.error("Lỗi decode token:", error);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("roleName");
    return <Navigate to="/" replace />;
  }
}

export default PrivateRoute;
