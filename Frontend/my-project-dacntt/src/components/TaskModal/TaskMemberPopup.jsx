import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  XMarkIcon,
  UserPlusIcon,
  UserMinusIcon,
} from "@heroicons/react/24/outline";

const TaskMembersPopup = ({
  boardId,
  taskId,
  onClose,
  triggerRect, // Vị trí nút "Thành viên" để căn popup
  onMemberAssign, // Callback khi gán thành viên
  onMemberUnassign, // Callback khi bỏ gán
}) => {
  const [members, setMembers] = useState({ assigned: [], available: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const popupRef = useRef(null);
  const httpUrl = import.meta.env.VITE_API_URL;
  const accessToken = localStorage.getItem("accessToken");

  // Đóng popup khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Lấy danh sách thành viên
  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(
          `${httpUrl}/api/v1/task-assignee/${boardId}/${taskId}/members`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        setMembers(res.data.data);
      } catch (err) {
        setError("Không tải được thành viên");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [boardId, taskId]);

  // Xử lý gán thành viên
  const handleAssign = async (userId) => {
    try {
      await axios.post(`/api/v1/task-assignee/${boardId}/${taskId}/assign`, {
        userId,
      });
      setMembers((prev) => ({
        assigned: [
          ...prev.assigned,
          prev.available.find((u) => u._id === userId),
        ].filter(Boolean),
        available: prev.available.filter((u) => u._id !== userId),
      }));
      onMemberAssign?.();
    } catch (err) {
      setError("Gán thất bại: " + err.message);
    }
  };

  // Xử lý bỏ gán
  const handleUnassign = async (userId) => {
    try {
      await axios.delete(
        `/api/v1/task-assignee/${boardId}/${taskId}/unassign/${userId}`
      );
      setMembers((prev) => ({
        assigned: prev.assigned.filter((u) => u._id !== userId),
        available: [
          ...prev.available,
          prev.assigned.find((u) => u._id === userId),
        ].filter(Boolean),
      }));
      onMemberUnassign?.();
    } catch (err) {
      setError("Bỏ gán thất bại: " + err.message);
    }
  };

  // Tính vị trí popup
  const style = triggerRect
    ? {
        position: "absolute",
        top: 50,
        left: triggerRect.left - 60,
        transform: "translateX(-50%)",
        zIndex: 1000,
      }
    : {};

  return (
    <div
      ref={popupRef}
      className="bg-white rounded-lg shadow-xl border border-gray-200 w-80 py-2"
      style={style}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h3 className="text-sm font-semibold text-gray-800">Thành viên</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <XMarkIcon className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Đang tải...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-sm text-red-600">{error}</div>
        ) : (
          <>
            {/* Đã gán */}
            <div className="px-4 py-2">
              <p className="text-xs font-medium text-gray-600 mb-1">
                Đã gán ({members.assigned.length})
              </p>
              {members.assigned.length > 0 ? (
                <div className="space-y-1">
                  {members.assigned.map((user) => (
                    <MemberItem
                      key={user._id}
                      user={user}
                      isAssigned={true}
                      onToggle={() => handleUnassign(user._id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Chưa có thành viên
                </p>
              )}
            </div>

            <div className="border-t my-2"></div>

            {/* Có thể gán */}
            <div className="px-4 py-2">
              <p className="text-xs font-medium text-gray-600 mb-1">
                Gợi ý gán ({members.available.length})
              </p>
              {members.available.length > 0 ? (
                <div className="space-y-1">
                  {members.available.map((user) => (
                    <MemberItem
                      key={user._id}
                      user={user}
                      isAssigned={false}
                      onToggle={() => handleAssign(user._id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Không có thành viên khả dụng
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Sub-component: Hiển thị 1 thành viên
const MemberItem = ({ user, isAssigned, onToggle }) => {
  return (
    <div
      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 border">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.fullName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-600">
              {user.fullName?.charAt(0)?.toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{user.fullName}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
      </div>
      {isAssigned ? (
        <UserMinusIcon className="w-4 h-4 text-red-500" />
      ) : (
        <UserPlusIcon className="w-4 h-4 text-green-500" />
      )}
    </div>
  );
};

export default TaskMembersPopup;
