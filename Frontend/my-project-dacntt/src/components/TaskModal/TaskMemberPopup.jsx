import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  UserPlusIcon,
  UserMinusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Avatar from "../Avatar";

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
    fetchMembers();
  }, [boardId, taskId]);

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

  // Gán thành viên
  const handleAssign = async (userId) => {
    try {
      setLoading(true);
      await axios.post(
        `${httpUrl}/api/v1/task-assignee`,
        { taskId, userId },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      // Cập nhật local state
      const userToMove = members.available.find((u) => u._id === userId);
      if (userToMove) {
        setMembers({
          assigned: [...members.assigned, userToMove],
          available: members.available.filter((u) => u._id !== userId),
        });
      }

      onMemberAssign?.();
    } catch (err) {
      setError("Gán thành viên thất bại");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Bỏ gán thành viên
  const handleUnassign = async (userId) => {
    try {
      setLoading(true);
      await axios.delete(
        `${httpUrl}/api/v1/task-assignee/${userId}/${taskId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      await fetchMembers();

      onMemberUnassign?.();
    } catch (err) {
      setError("Bỏ gán thất bại");
      console.error(err);
    } finally {
      setLoading(false);
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
      style={style}
      className="w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Thành viên</h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition"
        >
          <XMarkIcon className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 flex flex-col items-center justify-center text-blue-600">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-sm font-medium text-gray-600">
              Đang tải ...
            </p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        ) : (
          <>
            {/* Đã gán */}
            <div className="p-4 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-600 mb-3">
                Đã gán ({members.assigned.length})
              </p>
              {members.assigned.length > 0 ? (
                <div className="space-y-2">
                  {members.assigned.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 group transition"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar user={user} size="w-8 h-8" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {user.fullName}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnassign(user._id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 rounded transition"
                      >
                        <XMarkIcon className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic text-center py-4">
                  Chưa có thành viên nào được gán
                </p>
              )}
            </div>

            {/* Gợi ý gán */}
            <div className="p-4">
              <p className="text-xs font-medium text-gray-600 mb-3">
                Gợi ý gán ({members.available.length})
              </p>
              {members.available.length > 0 ? (
                <div className="space-y-2">
                  {members.available.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => handleAssign(user._id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition text-left"
                    >
                      <Avatar user={user} size="w-8 h-8" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.fullName}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <span className="ml-auto text-blue-600 text-sm font-medium">
                        Gán
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic text-center py-4">
                  Không còn thành viên nào để gán
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
        <div>
          <Avatar user={user} size="w-9 h-9" />
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
