import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useUser } from "../components/useUser";
import { GoogleLogin } from "@react-oauth/google";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { fetchUser } = useUser();

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      try {
        const decodedToken = jwtDecode(accessToken);
        const roleName = decodedToken.roleName;
        if (roleName === "ADMIN") {
          navigate("/admin");
        } else if (roleName === "USER") {
          navigate("/");
        }
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("roleName");
      }
    }
  }, [navigate]);

  const handleOnSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:8080/api/v1/auth/login",
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      const { accessToken, refreshToken } = response.data.data;

      if (!accessToken) {
        setError("Không tìm thấy token.");
        return;
      }

      const decodedToken = jwtDecode(accessToken);
      const userId = decodedToken.userId;
      const roleName = decodedToken.roleName;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("userId", userId);
      localStorage.setItem("roleName", roleName);

      await fetchUser();

      if (roleName === "ADMIN") {
        navigate("/admin");
      } else if (roleName === "USER") {
        navigate("/home");
      } else {
        setError("Vai trò không hợp lệ");
      }
    } catch (error) {
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError("Không thể kết nối máy chủ. Vui lòng thử lại sau.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    const httpUrl = import.meta.env.VITE_API_URL;
    setIsLoading(true);

    try {
      const idToken = credentialResponse.credential;

      const res = await axios.post(
        `${httpUrl}/api/v1/auth/login/social-account`,
        {
          provider: "google",
          idToken,
        }
      );

      if (res.data.status === "success") {
        const { accessToken, refreshToken } = res.data.data;
        const decodedToken = jwtDecode(accessToken);
        const userId = decodedToken.userId;
        const roleName = decodedToken.roleName;

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("userId", userId);
        localStorage.setItem("roleName", roleName);

        await fetchUser();

        if (roleName === "ADMIN") {
          navigate("/admin");
        } else if (roleName === "USER") {
          navigate("/home");
        } else {
          setError("Vai trò không hợp lệ");
        }
      }
    } catch (error) {
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError("Không thể kết nối máy chủ. Vui lòng thử lại sau.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Chào mừng trở lại
              </h2>
              <p className="text-gray-600">
                Đăng nhập để tiếp tục quản lý công việc
              </p>
            </div>

            <form onSubmit={handleOnSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.336-3.234.938-4.675M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm2.828-2.828A10.05 10.05 0 0122 12c0 5.523-4.477 10-10 10a9.96 9.96 0 01-4.675-.938m1.414-1.414A9.96 9.96 0 012 12c0-5.523 4.477-10 10-10 1.657 0 3.234.336 4.675.938"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-600 flex items-center">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {error}
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                  onClick={() => navigate("/recovery-password")}
                >
                  Quên mật khẩu?
                </button>
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                  onClick={() => navigate("/register")}
                >
                  Tạo tài khoản mới
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Đang đăng nhập...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Hoặc tiếp tục với
                  </span>
                </div>
              </div>

              <div className="mt-4 flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleLogin}
                  onError={() => {
                    console.log("Đăng nhập Google thất bại");
                    setError("Đăng nhập Google thất bại");
                  }}
                  theme="outline"
                  size="large"
                  shape="rectangular"
                  width="100%"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {/* <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            © 2024 TaskFlow. Quản lý công việc chuyên nghiệp
          </p>
        </div> */}
      </div>
    </div>
  );
};

export default LoginPage;
