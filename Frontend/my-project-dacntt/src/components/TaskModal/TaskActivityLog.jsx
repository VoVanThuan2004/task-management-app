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
      <div className="space-y-5 py-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex animate-pulse gap-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-1/3 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {activities.length > 0 ? (
        <>
          <div className="relative">
            <div
              className="absolute left-4 top-2 bottom-2 w-px bg-gray-200"
              aria-hidden="true"
            />

            <div className="relative space-y-4">
              {activities.map((activity) => {
                const config = ActionConfig[activity.action] || {};
                const createdAt = new Date(activity.createdAt);
                const actionLabel = config.label || activity.action;

                return (
                  <div key={activity._id} className="flex gap-3">
                    <div className="relative shrink-0">
                      <Avatar user={activity} size="w-8 h-8" />
                      <span
                        className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-1 ring-gray-200"
                        title={actionLabel}
                        aria-label={actionLabel}
                      >
                        <span className="scale-[0.65]">{config.icon}</span>
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-sm leading-5 text-gray-600 break-words">
                        <span className="font-medium text-gray-900">
                          {activity.fullName || "Người dùng"}
                        </span>{" "}
                        {activity.description}
                      </p>
                      <time
                        dateTime={activity.createdAt}
                        title={createdAt.toLocaleString("vi-VN")}
                        className="mt-1 block text-xs text-gray-400"
                      >
                        {formatDistanceToNow(createdAt, {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </time>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {page < pagination.totalPages ? (
            <div className="mt-5 flex justify-center border-t border-gray-100 pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Đang tải...</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={15} />
                    <span>Tải thêm hoạt động</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="mt-5 border-t border-gray-100 pt-4 text-center text-xs text-gray-400">
              Đã hiển thị tất cả hoạt động
            </p>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50">
            <Clock size={20} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">Chưa có hoạt động nào</p>
        </div>
      )}
    </div>
  );
};

export default TaskActivityLog;
