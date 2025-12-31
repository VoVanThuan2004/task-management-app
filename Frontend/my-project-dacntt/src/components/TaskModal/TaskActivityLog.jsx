import React, { useEffect, useState } from "react";
import { Clock, ChevronDown, Loader2 } from "lucide-react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { ActionConfig } from "./ActionConfig";
import Avatar from "../Avatar";

const TaskActivityLog = ({ taskId, socket, onTotalChange }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalActivityLogs: 0,
    totalPages: 1,
  });

  const httpUrl = import.meta.env.VITE_API_URL;
  const accessToken = localStorage.getItem("accessToken");

  // Mỗi khi totalActivityLogs thay đổi → báo lên component cha
  useEffect(() => {
    if (onTotalChange) {
      onTotalChange(pagination.totalActivityLogs);
    }
  }, [pagination.totalActivityLogs, onTotalChange]);

  useEffect(() => {
    fetchActivityLogs(1);
  }, [taskId]);

  // Socket
  useEffect(() => {
    if (!socket) return;

    socket.emit("joinTask", taskId);

    // Nhận thông báo khi cập nhật tiêu đề task
    socket.on("activityLogTask", (data) => {
      console.log("New activity:", data);
      setActivities((a) => [data, ...a]);
      // Cập nhật tổng số logs
      setPagination((prev) => ({
        ...prev,
        totalActivityLogs: prev.totalActivityLogs + 1,
        totalPages: Math.ceil((prev.totalActivityLogs + 1) / prev.limit),
      }));
    });

    return () => {
      socket.off("activityLogTask");
      socket.emit("leaveTask", taskId);
    };
  }, [socket, taskId]);

  const fetchActivityLogs = async (pageNum = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await axios.get(
        `${httpUrl}/api/v1/activity-log/${taskId}/task`,
        {
          params: {
            page: pageNum,
            limit: 10,
          },
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.data.status === "success") {
        const newActivities = response.data.data;

        if (pageNum === 1) {
          // Trang đầu tiên - thay thế toàn bộ
          setActivities(newActivities);
        } else {
          // Trang tiếp theo - thêm vào cuối
          setActivities((prev) => [...prev, ...newActivities]);
        }

        setPagination(response.data.pagination);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("[x] Lỗi khi tải activity logs:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    if (nextPage <= pagination.totalPages) {
      fetchActivityLogs(nextPage);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.length > 0 ? (
        <>
          {/* Timeline Header */}
          {/* === HEADER – Lịch sử hoạt động === */}
          {/* <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-20 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3 px-2">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Clock size={18} />
                <span>Lịch sử hoạt động</span>
              </h3>
              <span className="text-xs bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full text-xs">
                {pagination.totalActivityLogs} sự kiện
              </span>
            </div>
          </div> */}

          {/* Timeline */}
          <div className="relative mt-1">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 to-purple-500"></div>

            {/* Activity Items */}
            <div className="space-y-5 relative z-10">
              {activities.map((activity) => {
                const config = ActionConfig[activity.action] || {};

                return (
                  <div
                    key={activity._id}
                    className={`ml-14 pb-3 border-l-4 pl-4 rounded-lg shadow-sm transition-all duration-200 hover:translate-x-1 ${
                      config.color || "bg-gray-50 border-gray-200"
                    }`}
                  >
                    {/* Header: Avatar + Name + Time */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Avatar */}
                        <Avatar user={activity} size="w-9 h-9 mt-1" />

                        {/* Name */}
                        <div className="flex flex-col">
                          <p className="text-sm font-medium text-gray-800">
                            {activity.fullName}
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(activity.createdAt), {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action + Description */}
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{config.icon}</div>

                      <div className="flex-1">
                        <span className="inline-block text-xs font-semibold text-gray-700 bg-white bg-opacity-60 px-2 py-0.5 rounded">
                          {config.label || activity.action}
                        </span>

                        <p className="text-sm text-gray-700 mt-1">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Load More Button */}
          {page < pagination.totalPages && (
            <div className="flex justify-center mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang tải...</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    <span>
                      Xem thêm ({page}/{pagination.totalPages})
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* End of list indicator */}
          {page === pagination.totalPages && activities.length > 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              ✓ Bạn đã xem hết tất cả hoạt động
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Chưa có hoạt động nào</p>
        </div>
      )}
    </div>
  );
};

export default TaskActivityLog;
