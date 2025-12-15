import React, { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import axios from "axios";
import { format } from "date-fns";
import {
  Check,
  X,
  Plus,
  Calendar,
  User,
  Trash2,
  GripVertical,
  CheckSquare,
  User2Icon,
  CalendarClock,
} from "lucide-react";

const httpUrl = import.meta.env.VITE_API_URL;

const CheckItemsSection = React.memo(
  ({ taskId, accessToken, socket, isReadOnly = false }) => {
    const [checkItems, setCheckItems] = useState([]);
    const [newTitle, setNewTitle] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);

    // Reset toàn bộ khi taskId thay đổi
    useEffect(() => {
      setCheckItems([]);
      setNewTitle("");
      setIsAdding(false);
      setLoading(false);
      // optional
    }, [taskId]); // ← QUAN TRỌNG: reset khi đổi task

    // Fetch khi taskId thay đổi
    const fetchCheckItems = useCallback(async () => {
      if (!taskId) return;
      try {
        const res = await axios.get(`${httpUrl}/api/v1/check-item/${taskId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setCheckItems(res.data.data.checkItems || []);
      } catch (err) {
        console.error("Lỗi tải check items:", err);
        setCheckItems([]);
      }
    }, [taskId, accessToken]);

    useEffect(() => {
      fetchCheckItems();
    }, [fetchCheckItems]);

    // Socket: join task mới, leave task cũ
    useEffect(() => {
      if (!socket || !taskId) return;

      // Join task mới
      socket.emit("joinTask", taskId);

      // Cleanup khi đổi task hoặc component unmount
      return () => {
        socket.emit("leaveTask", taskId);
      };
    }, [socket, taskId]);

    // ==========================
    // SOCKET REACTIONS (ONLY FOR OTHER USERS)
    // ==========================
    useEffect(() => {
      if (!socket || !taskId) return;

      const handleAdded = (data) => {
        if (data.taskId !== taskId) return;

        setCheckItems((prev) => {
          // Nếu item đã tồn tại → bỏ qua (do mình vừa tạo)
          if (prev.some((i) => i._id === data._id)) {
            console.log("Bỏ qua duplicate checkItem từ socket:", data._id);
            return prev;
          }
          // Nếu chưa có → thêm vào (người khác tạo)
          return [...prev, data].sort((a, b) => a.position - b.position);
        });
      };

      const handleTitleUpdated = (data) => {
        setCheckItems((prev) =>
          prev.map((item) =>
            item._id === data._id ? { ...item, title: data.title } : item
          )
        );
      };

      const handleCompleted = (data) => {
        setCheckItems((prev) =>
          prev.map((item) =>
            item._id === data._id
              ? { ...item, isCompleted: data.isCompleted }
              : item
          )
        );
      };

      const handleDeleted = (data) => {
        setCheckItems((prev) => prev.filter((item) => item._id !== data._id));
      };

      const handleReordered = (data) => {
        if (data.taskId !== taskId) return;

        setCheckItems((prev) => {
          // Tạo map để lookup nhanh
          const map = {};
          prev.forEach((item) => (map[item._id] = item));

          // Tạo danh sách mới theo order từ backend
          const newList = data.checkItems.map((c) => ({
            ...map[c.id], // giữ nguyên dữ liệu cũ
            _id: c.id,
            title: c.title, // backend gửi title mới (nếu có)
            position: c.position,
          }));

          // Sort theo position để đảm bảo UI thay đổi đúng
          return newList.sort((a, b) => a.position - b.position);
        });
      };

      socket.on("checkItemAdded", handleAdded);
      socket.on("checkItemTitleUpdated", handleTitleUpdated);
      socket.on("checkItemCompleted", handleCompleted);
      socket.on("checkItemDeleted", handleDeleted);
      socket.on("checkItemReordered", handleReordered);

      return () => {
        socket.off("checkItemAdded", handleAdded);
        socket.off("checkItemTitleUpdated", handleTitleUpdated);
        socket.off("checkItemCompleted", handleCompleted);
        socket.off("checkItemDeleted", handleDeleted);
        socket.off("checkItemReordered", handleReordered);
      };
    }, [socket, taskId]);

    // ==========================
    // ACTIONS (UPDATE UI FROM API RESPONSE)
    // ==========================

    // Trong CheckItemsSection.jsx

    const addCheckItem = async () => {
      if (isReadOnly || !newTitle.trim()) return;
      setLoading(true);

      try {
        const res = await axios.post(
          `${httpUrl}/api/v1/check-item/`,
          { taskId, title: newTitle.trim() },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const newItem = res.data.data;

        // Chỉ thêm từ response → KHÔNG ĐỂ SOCKET THÊM LẦN NỮA
        setCheckItems((prev) => {
          // Nếu đã có rồi (do socket đến trước) → không thêm nữa
          if (prev.some((i) => i._id === newItem._id)) return prev;
          return [...prev, newItem].sort((a, b) => a.position - b.position);
        });

        setNewTitle("");
        setIsAdding(false);
      } catch (err) {
        console.error("Lỗi khi thêm:", err);
        alert("Lỗi khi thêm check-item");
      } finally {
        setLoading(false);
      }
    };

    const toggleComplete = async (id) => {
      if (isReadOnly) return;
      try {
        const res = await axios.put(
          `${httpUrl}/api/v1/check-item/complete/${id}`,
          {},
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const updated = res.data.data;

        // Update UI local ngay lập tức
        setCheckItems((prev) =>
          prev.map((i) =>
            i._id === id ? { ...i, isCompleted: updated.isCompleted } : i
          )
        );
      } catch (err) {
        console.error("Lỗi toggle complete:", err);
      }
    };

    const deleteCheckItem = async (id) => {
      if (!confirm("Xóa checklist này?")) return;

      if (isReadOnly) return;

      try {
        await axios.delete(`${httpUrl}/api/v1/check-item/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        // 👉 Update UI local ngay lập tức
        setCheckItems((prev) => prev.filter((i) => i._id !== id));
      } catch (err) {
        console.error("Lỗi khi xóa:", err);
      }
    };

    const handleDragEnd = async (result) => {
      if (isReadOnly || !result.destination) return;

      const { draggableId, destination } = result;

      try {
        await axios.put(
          `${httpUrl}/api/v1/check-item/position/${draggableId}`,
          { destinationIndex: destination.index },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        // Không update local vì socket sẽ gửi danh sách reorder chuẩn
      } catch (err) {
        console.error("Lỗi reorder:", err);
      }
    };

    // ==========================
    // Progress
    // ==========================
    const completedCount = checkItems.filter((i) => i.isCompleted).length;
    const totalCount = checkItems.length;
    const progress = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

    return (
      <div className="mb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-gray-600" />
              Việc cần làm
            </h3>
            <span className="text-sm text-gray-500">
              {completedCount}/{totalCount}
            </span>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    progress === 100 ? "bg-green-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-gray-600 font-medium">
                {Math.round(progress)}%
              </span>
            </div>
          )}
        </div>

        {/* Danh sách checklist */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="checkitems">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-y-2"
              >
                {checkItems.map((item, index) => (
                  <Draggable
                    key={item._id}
                    draggableId={item._id}
                    index={index}
                    isDragDisabled={isReadOnly} // ← Không cho kéo nếu chỉ đọc
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`group flex items-center gap-3 p-3 rounded-lg bg-gray-50 transition-all m-3 ${
                          snapshot.isDragging
                            ? "shadow-lg bg-white ring-2 ring-blue-400"
                            : ""
                        }`}
                      >
                        {/* Drag handle – chỉ hiện khi được phép */}
                        {!isReadOnly && (
                          <div
                            {...provided.dragHandleProps}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <GripVertical className="w-5 h-5 text-gray-400" />
                          </div>
                        )}

                        {/* Checkbox – khóa khi read-only */}
                        <button
                          onClick={() => toggleComplete(item._id)}
                          disabled={isReadOnly}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isReadOnly
                              ? "cursor-not-allowed opacity-60"
                              : "hover:border-gray-500"
                          } ${
                            item.isCompleted
                              ? "bg-green-500 border-green-500"
                              : "border-gray-300"
                          }`}
                        >
                          {item.isCompleted && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </button>

                        {/* Nội dung */}
                        <div className="flex-1">
                          <p
                            className={`text-sm ${
                              item.isCompleted
                                ? "line-through text-gray-500"
                                : "text-gray-800"
                            }`}
                          >
                            {item.title}
                          </p>
                          {/* Thành viên + hạn */}
                          <div className="flex items-center gap-3 mt-1">
                            {item.assignedTo && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <User className="w-3 h-3" />
                                <span>Được giao cho bạn</span>
                              </div>
                            )}
                            {item.dueDate && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {format(new Date(item.dueDate), "dd/MM/yyyy")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Nút xóa – chỉ hiện khi hover & được phép */}
                        {!isReadOnly && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => deleteCheckItem(item._id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-50 rounded transition cursor-pointer"
                            >
                              <CalendarClock className="w-5 h-5 text-gray-500 hover:text-blue-600" />
                            </button>

                            <button
                              onClick={() => deleteCheckItem(item._id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-50 rounded transition cursor-pointer"
                            >
                              <User className="w-5 h-5 text-gray-500 hover:text-blue-600" />
                            </button>

                            <button
                              onClick={() => deleteCheckItem(item._id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-50 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-5 h-5 text-gray-500 hover:text-blue-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Nút thêm mới */}
        {isReadOnly ? (
          <div className="mt-4 py-3 text-center text-gray-500 text-sm italic border-t border-gray-200">
            Bạn đang xem ở chế độ chỉ đọc — không thể thêm mục
          </div>
        ) : isAdding ? (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-300">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTitle.trim()) addCheckItem();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewTitle("");
                }
              }}
              placeholder="Thêm một mục..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={addCheckItem}
                disabled={!newTitle.trim() || loading}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Thêm
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewTitle("");
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="mt-3 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Thêm một mục
          </button>
        )}
      </div>
    );
  }
);

export default CheckItemsSection;
