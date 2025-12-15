import axios from "axios";
import { useState } from "react";
import { Eye, EyeOff, KeyRound, CheckCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ChangePassword = () => {
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const navigate = useNavigate();
  const httpUrl = import.meta.env.VITE_API_URL;
  const accessToken = localStorage.getItem("accessToken");

  const handleOnChangePassword = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const res = await axios.put(
        `${httpUrl}/api/v1/auth/change-password`,
        {
          password,
          newPassword,
          confirmNewPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (res.data.status === "success") {
        setPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } catch (error) {
      console.log(error);
      if (error.response) {
        // Backend có trả về phản hồi lỗi (ví dụ: 4xx, 5xx)
        const errorData = error.response.data;

        const errorMessage =
          errorData.message ||
          errorData.error ||
          "Lỗi không xác định từ máy chủ.";

        // Gán thông báo lỗi vào state để hiển thị lên giao diện
        setError(errorMessage);

      } else if (error.request) {
        // Yêu cầu đã được gửi nhưng không nhận được phản hồi (ví dụ: mất mạng)
        setError("Không thể kết nối đến máy chủ.");
      } else {
        // Lỗi xảy ra khi thiết lập yêu cầu
        setError("Đã xảy ra lỗi trong quá trình xử lý.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="w-full min-h-screen flex items-center justify-center p-4">
        {/* Card chính */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-100 p-8 md:p-10">
          {/* Header đẹp */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Đổi mật khẩu</h2>
            <p className="text-gray-500 mt-2">
              Hãy tạo một mật khẩu mới an toàn hơn
            </p>
          </div>

          <form onSubmit={handleOnChangePassword} className="space-y-6">
            {/* Mật khẩu hiện tại */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mật khẩu hiện tại
              </label>
              <div className="relative group">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 group-hover:border-blue-400"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 transition"
                >
                  {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Mật khẩu mới */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mật khẩu mới
              </label>
              <div className="relative group">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 group-hover:border-blue-400"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 transition"
                >
                  {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu mới */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative group">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl focus:outline-none focus:ring-4 transition-all duration-300 pr-12 ${
                    confirmNewPassword && newPassword === confirmNewPassword
                      ? "border-blue-500 ring-4 ring-blue-500/20"
                      : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 group-hover:border-blue-400"
                  }`}
                  placeholder="••••••••"
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {confirmNewPassword && newPassword === confirmNewPassword ? (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="text-gray-500 hover:text-blue-600 transition"
                    >
                      {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  )}
                </div>
              </div>
              {confirmNewPassword && newPassword === confirmNewPassword && (
                <p className="text-sm text-blue-600 mt-2 flex items-center gap-1">
                  <CheckCircle size={16} /> Mật khẩu khớp hoàn toàn
                </p>
              )}
            </div>

            {/* Hiển thị error */}
            {error && (
                <div>
                    <p className="text-sm text-red-500">{error}</p>
                </div>
            )}

            {/* Nút submit siêu đẹp */}
            <button
              type="submit"
              disabled={
                loading || newPassword !== confirmNewPassword || !password
              }
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <KeyRound size={20} />
                  Xác nhận đổi mật khẩu
                </>
              )}
            </button>
          </form>

          {/* Nút Quay lại */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate(-1)} // hoặc hàm quay lại của bạn, ví dụ: navigate('/profile')
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition"
            >
              <ArrowLeft size={20} />
              Quay lại
            </button>
          </div>

          {/* Footer nhỏ nhẹ */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              Mật khẩu nên có ít nhất 8 ký tự, bao gồm chữ hoa, số và ký tự đặc
              biệt
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
