// src/pages/ProfilePage.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Camera,
  X,
  Loader2,
  Check,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Avatar from "../components/Avatar";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const httpUrl = import.meta.env.VITE_API_URL;
const accessToken = localStorage.getItem("accessToken");

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!accessToken) {
      navigate("/");
    }
  }, [accessToken]);

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${httpUrl}/api/v1/users/profile`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const user = res.data.data;
        setProfile(user);
        setFullName(user.fullName || "");
        setAvatarPreview(user.avatar || null);
      } catch (err) {
        toast.error("Không thể tải thông tin cá nhân")
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Kiểm tra kích thước (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 5MB")
      return;
    }

    setSelectedFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleRemoveAvatar = () => {
    setSelectedFile(null);
    setAvatarPreview(profile.avatar || null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Vui lòng nhập họ tên")
      return;
    }

    setSaving(true);
    const formData = new FormData();
    formData.append("fullName", fullName.trim());
    if (selectedFile) {
      formData.append("avatar", selectedFile);
    }

    try {
      await axios.put(`${httpUrl}/api/v1/users`, formData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // Cập nhật lại profile
      setProfile((prev) => ({
        ...prev,
        fullName: fullName.trim(),
        avatar: selectedFile ? avatarPreview : prev.avatar,
      }));

      setSelectedFile(null);
      toast.success("Cập nhật thông tin thành công!")
      
    } catch (err) {
      const msg = err.response?.data?.message || "Cập nhật thất bại";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Nút Quay trở lại */}
        <button
          onClick={() => {
            window.history.back(); // quay lại route trước
            setTimeout(() => {
              window.location.reload(); // reload lại toàn trang
            }, 10);
          }}
          className="
      mb-4 flex items-center gap-2 px-4 py-2
      rounded-xl bg-white border border-gray-200 shadow-sm
      hover:bg-gray-100 hover:shadow-md
      transition-all text-gray-700 font-medium group
    "
        >
          <ArrowLeft
            size={20}
            className="text-gray-600 group-hover:-translate-x-1 transition"
          />
          <span>Quay trở lại</span>
        </button>
        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Avatar Section */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-10 text-center">
            <div className="relative inline-block">
              <div className="relative group">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-32 h-32 rounded-full object-cover shadow-2xl border-4 border-white"
                  />
                ) : (
                  <Avatar
                    user={profile}
                    size="w-32 h-32"
                    className="border-4 border-white shadow-2xl text-4xl"
                  />
                )}

                {/* Nút đổi ảnh */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                >
                  <Camera size={20} className="text-gray-700" />
                </button>

                {/* Nút xóa ảnh */}
                {selectedFile && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <h2 className="text-2xl font-bold text-white mt-6">
              {profile?.fullName || "Người dùng"}
            </h2>
            <p className="text-white/80 text-lg">{profile?.email}</p>
          </div>

          {/* Form Section */}
          <div className="p-8 space-y-8">
            {/* Email - Không chỉnh sửa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-600">
                {profile?.email}
              </div>
            </div>

            {/* Họ tên */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Họ và tên
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Nhập họ và tên"
              />
            </div>

            {/* Nút lưu */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setFullName(profile.fullName);
                  handleRemoveAvatar();
                }}
                className="px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={
                  saving || (!selectedFile && fullName === profile?.fullName)
                }
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 text-white font-medium z-50 transition-all ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" ? (
            <Check size={24} />
          ) : (
            <AlertCircle size={24} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
