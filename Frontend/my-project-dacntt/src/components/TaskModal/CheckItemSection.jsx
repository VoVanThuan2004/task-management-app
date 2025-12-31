import React, { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import axios from "axios";
import { parseISO, format } from "date-fns";
import {
  Check,
  X,
  Plus,
  Calendar,
  Trash2,
  GripVertical,
  CheckSquare,
  UserPlus,
  CalendarClock,
  Loader2
} from "lucide-react";
import Avatar from "../Avatar";
import DatePicker from "react-datepicker"; 
import "react-datepicker/dist/react-datepicker.css";

const httpUrl = import.meta.env.VITE_API_URL;

const CheckItemsSection = React.memo(
  ({
    taskId,
    task,
    accessToken,
    socket,
    isReadOnly = false,
    aiCreatedItems = null,
    onProgressChange, // New prop
  }) => {
    const [checkItems, setCheckItems] = useState([]);
    const [newTitle, setNewTitle] = useState("");

    // Notify parent about progress
    useEffect(() => {
      if (onProgressChange) {
        const completed = checkItems.filter((i) => i.isCompleted).length;
        onProgressChange(checkItems.length, completed);
      }
    }, [checkItems, onProgressChange]);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);

    // State cho popup chọn thời gian
    const [datePickerOpenFor, setDatePickerOpenFor] = useState(null); // lưu _id của item đang mở
    const [selectedStartDate, setSelectedStartDate] = useState(null);
    const [selectedDueDate, setSelectedDueDate] = useState(null);
    const [selectedStartTime, setSelectedStartTime] = useState({
      hour: "00",
      minute: "00",
    });
    const [selectedDueTime, setSelectedDueTime] = useState({
      hour: "23",
      minute: "59",
    });

    // State lấy danh sách thành viên
    const [boardMembers, setBoardMembers] = useState([]);
    const [membersPopupOpenFor, setMembersPopupOpenFor] = useState(null); // null hoặc checkItemId

    // State cập nhật title
    const [editingCheckItemId, setEditingCheckItemId] = useState(null);
    const [editingTitle, setEditingTitle] = useState("");

    // State xóa việc cần làm
    // const [showDeleteItemPopup, setShowDeleteItemPopup] = useState(null);
    const [itemIdDelete, setItemIdDelete] = useState(null);
    const [itemTitleDelete, setItemTitleDelete] = useState("");

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

    // Nếu có các item mới được tạo từ AI (sau khi user chấp nhận), append vào UI
    useEffect(() => {
      if (
        !aiCreatedItems ||
        !Array.isArray(aiCreatedItems) ||
        aiCreatedItems.length === 0
      )
        return;

      setCheckItems((prev) => {
        const prevIds = new Set(prev.map((p) => String(p._id)));
        const normalized = aiCreatedItems
          .map((it) => ({
            // Ensure shape matches existing checkItems
            _id: it._id || it.id || `${Math.random()}`,
            title: it.title || it.name || "(Mục)",
            position:
              typeof it.position === "number" ? it.position : prev.length + 0,
            isCompleted: !!it.isCompleted,
            assignedTo: it.assignedTo || null,
            dueDate: it.dueDate || null,
          }))
          .filter((n) => !prevIds.has(String(n._id)));

        if (normalized.length === 0) return prev;

        return [...prev, ...normalized].sort(
          (a, b) => (a.position || 0) - (b.position || 0)
        );
      });
    }, [aiCreatedItems]);

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

      const handleDeadlineUpdated = (data) => {
        setCheckItems((prev) =>
          prev.map((item) =>
            item._id === data._id
              ? {
                  ...item,
                  startDate: data.startDate || null,
                  dueDate: data.dueDate || null,
                  status: data.status || null,
                }
              : item
          )
        );
      };

      const handleUpdateStatusDeadline = (data) => {
        setCheckItems((prev) =>
          prev.map((item) =>
            item._id === data._id ? { ...item, status: data.status } : item
          )
        );
      };

      const handleUpdateAssignMember = (data) => {
        setCheckItems((prev) =>
          prev.map((item) =>
            item._id === data._id
              ? {
                  ...item,
                  assignedTo: data.assignedTo,
                  fullName: data.fullName,
                  avatar: data.avatar,
                }
              : item
          )
        );
      };

      socket.on("checkItemAdded", handleAdded);
      socket.on("checkItemTitleUpdated", handleTitleUpdated);
      socket.on("checkItemCompleted", handleCompleted);
      socket.on("checkItemDeleted", handleDeleted);
      socket.on("checkItemReordered", handleReordered);
      socket.on("deadlineCheckItem", handleDeadlineUpdated);
      socket.on("checkItemNearDeadline", handleUpdateStatusDeadline);
      socket.on("checkItemOverdue", handleUpdateStatusDeadline);
      socket.on("assingedToCheckItem", handleUpdateAssignMember);

      return () => {
        socket.off("checkItemAdded", handleAdded);
        socket.off("checkItemTitleUpdated", handleTitleUpdated);
        socket.off("checkItemCompleted", handleCompleted);
        socket.off("checkItemDeleted", handleDeleted);
        socket.off("checkItemReordered", handleReordered);
        socket.off("deadlineCheckItem", handleDeadlineUpdated);
        socket.off("checkItemNearDeadline", handleUpdateStatusDeadline);
        socket.off("checkItemOverdue", handleUpdateStatusDeadline);
        socket.off("assingedToCheckItem", handleUpdateAssignMember);
      };
    }, [socket, taskId]);

    // Các hàm gọi API

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

    const deleteCheckItem = async () => {
      // if (!confirm("Xóa checklist này?")) return;
      console.log("itemId: ", itemIdDelete);
      if (!itemIdDelete) return;

      if (isReadOnly) return;
      setLoading(true);
      try {
        await axios.delete(`${httpUrl}/api/v1/check-item/${itemIdDelete}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        // Update UI local ngay lập tức
        setCheckItems((prev) => prev.filter((i) => i._id !== itemIdDelete));
        setItemIdDelete("");
      } catch (err) {
        console.error("Lỗi khi xóa:", err);
        setItemIdDelete("");
        setItemTitleDelete("");
      } finally {
        setLoading(false);
      }
    };

    // === Cập nhật title
    const updateCheckItemTitle = async (checkItemId) => {
      if (!editingTitle.trim()) return;

      try {
        await axios.put(
          `${httpUrl}/api/v1/check-item/title/${checkItemId}`,
          {
            title: editingTitle.trim(),
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        setCheckItems((prev) =>
          prev.map((item) =>
            item._id === checkItemId
              ? { ...item, title: editingTitle.trim() }
              : item
          )
        );

        setEditingCheckItemId(null);
        setEditingTitle("");
      } catch (error) {
        console.log(error);
      }
    };

    const handleDragEnd = async (result) => {
      if (isReadOnly || !result.destination) return;

      const { draggableId, source, destination } = result;

      // Nếu kéo về đúng vị trí cũ → không làm gì
      if (source.index === destination.index) return;

      // ===== 1. OPTIMISTIC UPDATE: Di chuyển ngay trên UI =====
      setCheckItems((prev) => {
        const items = Array.from(prev);
        const [movedItem] = items.splice(source.index, 1);
        items.splice(destination.index, 0, movedItem);
        return items;
      });

      // ===== 2. Gọi API =====
      try {
        await axios.put(
          `${httpUrl}/api/v1/check-item/position/${draggableId}`,
          { destinationIndex: destination.index },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        // Thành công → không cần làm gì thêm
        // Socket sẽ gửi danh sách chuẩn (nếu có re-index thì UI sẽ được refine nhẹ)
      } catch (err) {
        console.error("Lỗi reorder checkItem:", err);

        // ===== 3. Revert nếu lỗi =====
        setCheckItems((prev) => {
          const items = Array.from(prev);
          const [movedItem] = items.splice(destination.index, 1);
          items.splice(source.index, 0, movedItem);
          return items;
        });

        // Optional: thông báo lỗi
        // toast.error("Không thể thay đổi thứ tự, vui lòng thử lại");
      }
    };

    // === Cập nhật deadline ===
    const updateDeadlineCheckItem = async (itemId) => {
      if (isReadOnly) return;

      try {
        const payload = {};

        // Kết hợp ngày và giờ cho startDate
        if (selectedStartDate) {
          const startDateTime = new Date(
            selectedStartDate.getFullYear(),
            selectedStartDate.getMonth(),
            selectedStartDate.getDate(),
            parseInt(selectedStartTime.hour),
            parseInt(selectedStartTime.minute)
          );
          payload.startDate = startDateTime.toISOString();
        }

        // Kết hợp ngày và giờ cho dueDate
        if (selectedDueDate) {
          const dueDateTime = new Date(
            selectedDueDate.getFullYear(),
            selectedDueDate.getMonth(),
            selectedDueDate.getDate(),
            parseInt(selectedDueTime.hour),
            parseInt(selectedDueTime.minute)
          );
          payload.dueDate = dueDateTime.toISOString();
        }

        const res = await axios.put(
          `${httpUrl}/api/v1/check-item/deadline/${itemId}`,
          payload,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const updatedItem = res.data.data;

        // Optimistic update local
        setCheckItems((prev) =>
          prev.map((item) =>
            item._id === itemId
              ? {
                  ...item,
                  startDate: updatedItem.startDate || null,
                  dueDate: updatedItem.dueDate || null,
                  status: updatedItem.status || null,
                }
              : item
          )
        );

        // Đóng popup và reset state
        setDatePickerOpenFor(null);
        setSelectedStartDate(null);
        setSelectedDueDate(null);
        setSelectedStartTime({ hour: "00", minute: "00" });
        setSelectedDueTime({ hour: "23", minute: "59" });
      } catch (error) {
        console.error("Lỗi cập nhật deadline:", error);
        alert("Không thể cập nhật thời hạn");
      }
    };

    const openDatePicker = (item) => {
      setDatePickerOpenFor(item._id);

      // Parse ngày
      setSelectedStartDate(item.startDate ? parseISO(item.startDate) : null);
      setSelectedDueDate(item.dueDate ? parseISO(item.dueDate) : null);

      // Parse giờ phút từ dữ liệu hiện tại
      if (item.startDate) {
        const startDate = parseISO(item.startDate);
        setSelectedStartTime({
          hour: startDate.getHours().toString().padStart(2, "0"),
          minute: startDate.getMinutes().toString().padStart(2, "0"),
        });
      } else {
        setSelectedStartTime({ hour: "00", minute: "00" });
      }

      if (item.dueDate) {
        const dueDate = parseISO(item.dueDate);
        setSelectedDueTime({
          hour: dueDate.getHours().toString().padStart(2, "0"),
          minute: dueDate.getMinutes().toString().padStart(2, "0"),
        });
      } else {
        setSelectedDueTime({ hour: "23", minute: "59" });
      }
    };

    // === Lấy danh sách thành viên trong board ===
    const fetchBoardMembers = async (checkItemId) => {
      if (!task?.boardId || !checkItemId) return;
      try {
        const res = await axios.get(
          `${httpUrl}/api/v1/check-item/members/${checkItemId}/${task.boardId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        setBoardMembers(res.data.data || []);

        console.log(res.data.data);
        console.log(checkItemId);
      } catch (err) {
        console.error("Lỗi lấy thành viên bảng:", err);
      }
    };

    const openMembersPopup = async (checkItemId) => {
      setMembersPopupOpenFor(checkItemId); // ← lưu id item đang mở
      await fetchBoardMembers(checkItemId);
    };

    const closeMembersPopup = () => {
      setMembersPopupOpenFor(null);
      setBoardMembers([]);
    };

    // Hàm giao nhiệm vụ cho thành viên
    const assignMemberToCheckItem = async (checkItemId, memberId) => {
      if (isReadOnly) return;
      if (!memberId || !checkItemId) return;

      try {
        setLoading(true);
        const res = await axios.put(
          `${httpUrl}/api/v1/check-item/assigned/${checkItemId}`,
          { userId: memberId },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const updatedItem = res.data.data;

        // Cập nhật local state
        setCheckItems((prev) =>
          prev.map((i) =>
            i._id === checkItemId
              ? {
                  ...i,
                  assignedTo: updatedItem.checkItem?.assignedTo || null,
                  fullName: updatedItem.fullName || null,
                  avatar: updatedItem.avatar || null,
                }
              : i
          )
        );

        await fetchBoardMembers(checkItemId);
      } catch (error) {
        console.error("Lỗi giao nhiệm vụ:", error);
        alert("Không thể giao nhiệm vụ cho thành viên");
      } finally {
        setLoading(false);
      }
    };

    // Hàm gọi API xóa thành viên ra khỏi checkItem
    const handleDeleteMember = async (checkItemId, memberId) => {
      if (isReadOnly) return;
      if (!memberId || !checkItemId) return;

      try {
        setLoading(true);
        const res = await axios.delete(
          `${httpUrl}/api/v1/check-item/${checkItemId}/members/${memberId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const data = res.data.data;

        setBoardMembers((prev) =>
          prev.map((m) =>
            m._id === data.userId ? { ...m, assignStatus: false } : m
          )
        );

        // Cập nhật local state
        setCheckItems((prev) =>
          prev.map((i) =>
            i._id === checkItemId
              ? {
                  ...i,
                  assignedTo: null,
                  fullName: null,
                  avatar: null,
                }
              : i
          )
        );
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    // Hàm mở popup xóa việc cần làm
    const handleOpenPopupDeleteItem = (itemId, itemTitle) => {
      setItemIdDelete(itemId);
      setItemTitleDelete(itemTitle);
    };

    const handleCloseDeleteItemPopup = () => {
      setItemIdDelete(null);
      setItemTitleDelete("");
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
                className="space-y-2 relative"
              >
                {checkItems.map((item, index) => {
                  const assignee = item.assignedTo
                    ? {
                        _id: item.assignedTo,
                        fullName: item.fullName || "Unknown",
                        avatar: item.avatar,
                      }
                    : null;

                  const isDatePickerOpen = datePickerOpenFor === item._id;

                  return (
                    <Draggable
                      key={item._id}
                      draggableId={item._id}
                      index={index}
                      isDragDisabled={isReadOnly}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`group flex items-center gap-3 p-3 rounded-lg bg-gray-50 transition-all relative ${
                            snapshot.isDragging
                              ? "shadow-lg bg-white ring-2 ring-blue-400 z-50"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          {/* Drag handle */}
                          {!isReadOnly && (
                            <div
                              {...provided.dragHandleProps}
                              className="opacity-60 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="w-5 h-5 text-gray-400" />
                            </div>
                          )}

                          {/* Checkbox */}
                          <button
                            onClick={() => toggleComplete(item._id)}
                            disabled={isReadOnly}
                            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              item.isCompleted
                                ? "bg-green-500 border-green-500"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {item.isCompleted && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </button>

                          {/* Nội dung */}
                          <div className="flex-1 min-w-0">
                            {editingCheckItemId === item._id ? (
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) =>
                                  setEditingTitle(e.target.value)
                                }
                                onBlur={() => updateCheckItemTitle(item._id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    updateCheckItemTitle(item._id);
                                  } else if (e.key === "Escape") {
                                    setEditingCheckItemId(null);
                                    setEditingTitle("");
                                  }
                                }}
                                className="w-full px-2 py-1 text-sm font-medium border border-blue-500 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                                autoFocus
                                onClick={(e) => e.stopPropagation()} // ngăn drag khi edit
                              />
                            ) : (
                              <p
                                onDoubleClick={() => {
                                  if (isReadOnly) return;
                                  setEditingCheckItemId(item._id);
                                  setEditingTitle(item.title);
                                }}
                                className={`text-sm font-medium break-words cursor-text select-text ${
                                  item.isCompleted
                                    ? "line-through text-gray-500"
                                    : "text-gray-800"
                                } ${
                                  !isReadOnly
                                    ? "hover:bg-gray-200 px-2 -mx-2 py-1 rounded transition"
                                    : ""
                                }`}
                              >
                                {item.title}
                              </p>
                            )}

                            {/* Assignee + Due Date - giữ nguyên */}
                            <div className="flex items-center gap-4 mt-2">
                              {assignee && (
                                <div className="flex items-center gap-1">
                                  <Avatar user={assignee} size="w-10 h-10" />
                                  <span className="text-xs font-medium text-gray-700 truncate max-w-32">
                                    {assignee.fullName}
                                  </span>
                                </div>
                              )}

                              {(item.startDate || item.dueDate) && (
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                  <div>
                                    <span>
                                      {item.startDate && (
                                        <div className="inline-block">
                                          <div>
                                            {format(
                                              new Date(item.startDate),
                                              "dd/MM/yyyy"
                                            )}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {format(
                                              new Date(item.startDate),
                                              "HH:mm"
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      {item.startDate && item.dueDate && (
                                        <span className="self-center mx-1">
                                          →
                                        </span>
                                      )}
                                      {item.dueDate && (
                                        <div className="inline-block">
                                          <div>
                                            {format(
                                              new Date(item.dueDate),
                                              "dd/MM/yyyy"
                                            )}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {format(
                                              new Date(item.dueDate),
                                              "HH:mm"
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </span>
                                  </div>
                                  {/* Chỉ hiển thị status nếu CHƯA hoàn thành */}
                                  {!item.isCompleted && item.status && (
                                    <span
                                      className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                        item.status === "Quá hạn"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-amber-100 text-amber-800"
                                      }`}
                                    >
                                      {item.status}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Nút hành động */}
                          {!isReadOnly && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Nút mở DatePicker */}
                              <button
                                onClick={() => openDatePicker(item)}
                                className="p-2 hover:bg-gray-200 rounded transition"
                                title="Đặt thời hạn"
                              >
                                <CalendarClock className="w-4 h-4 text-gray-500 hover:text-blue-600" />
                              </button>

                              <button
                                onClick={() => openMembersPopup(item._id)}
                                className="p-2 hover:bg-gray-200 rounded transition"
                                title="Giao cho thành viên"
                              >
                                <UserPlus className="w-4 h-4 text-gray-500 hover:text-blue-600" />
                              </button>

                              <button
                                onClick={() =>
                                  handleOpenPopupDeleteItem(item._id, item.title)
                                }
                                className="p-2 hover:bg-gray-200 rounded transition"
                                title="Xóa mục"
                              >
                                <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
                              </button>
                            </div>
                          )}

                          {/* POPUP DATE PICKER */}
                          {isDatePickerOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => {
                                  setDatePickerOpenFor(null);
                                  setSelectedStartDate(null);
                                  setSelectedDueDate(null);
                                  setSelectedStartTime({
                                    hour: "00",
                                    minute: "00",
                                  });
                                  setSelectedDueTime({
                                    hour: "23",
                                    minute: "59",
                                  });
                                }}
                              />

                              <div className="absolute top-full right-1 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80">
                                <h4 className="text-sm font-semibold mb-3">
                                  Thời hạn hoàn thành
                                </h4>

                                {/* Start Date (tùy chọn) */}
                                <div className="mb-4">
                                  <label className="text-xs text-gray-600 mb-1 block">
                                    Ngày bắt đầu (tùy chọn)
                                  </label>
                                  <DatePicker
                                    selected={selectedStartDate}
                                    onChange={(date) =>
                                      setSelectedStartDate(date)
                                    }
                                    placeholderText="Chọn ngày bắt đầu"
                                    dateFormat="dd/MM/yyyy"
                                    className="w-full px-3 py-2 border border-orange-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    popperPlacement="bottom-start"
                                    minDate={new Date()}
                                  />
                                  {selectedStartDate && (
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-xs text-gray-600 mb-1 block">
                                          Giờ
                                        </label>
                                        <select
                                          value={selectedStartTime.hour}
                                          onChange={(e) =>
                                            setSelectedStartTime((prev) => ({
                                              ...prev,
                                              hour: e.target.value,
                                            }))
                                          }
                                          className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                                        >
                                          {Array.from({ length: 24 }, (_, i) =>
                                            i.toString().padStart(2, "0")
                                          ).map((hour) => (
                                            <option key={hour} value={hour}>
                                              {hour}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-600 mb-1 block">
                                          Phút
                                        </label>
                                        <select
                                          value={selectedStartTime.minute}
                                          onChange={(e) =>
                                            setSelectedStartTime((prev) => ({
                                              ...prev,
                                              minute: e.target.value,
                                            }))
                                          }
                                          className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                                        >
                                          {Array.from({ length: 60 }, (_, i) =>
                                            i.toString().padStart(2, "0")
                                          ).map((minute) => (
                                            <option key={minute} value={minute}>
                                              {minute}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Due Date (chính) */}
                                <div className="mb-4">
                                  <label className="text-xs text-gray-600 mb-1 block">
                                    Ngày hết hạn
                                  </label>
                                  <DatePicker
                                    selected={selectedDueDate}
                                    onChange={(date) =>
                                      setSelectedDueDate(date)
                                    }
                                    placeholderText="Chọn ngày hết hạn"
                                    dateFormat="dd/MM/yyyy"
                                    className="w-full px-3 py-2 border border-orange-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    popperPlacement="bottom-start"
                                    minDate={
                                      selectedStartDate
                                        ? new Date(
                                            Math.max(
                                              selectedStartDate.getTime(),
                                              new Date().getTime()
                                            )
                                          )
                                        : new Date()
                                    }
                                  />
                                  {selectedDueDate && (
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-xs text-gray-600 mb-1 block">
                                          Giờ
                                        </label>
                                        <select
                                          value={selectedDueTime.hour}
                                          onChange={(e) =>
                                            setSelectedDueTime((prev) => ({
                                              ...prev,
                                              hour: e.target.value,
                                            }))
                                          }
                                          className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                                        >
                                          {Array.from({ length: 24 }, (_, i) =>
                                            i.toString().padStart(2, "0")
                                          ).map((hour) => (
                                            <option key={hour} value={hour}>
                                              {hour}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-600 mb-1 block">
                                          Phút
                                        </label>
                                        <select
                                          value={selectedDueTime.minute}
                                          onChange={(e) =>
                                            setSelectedDueTime((prev) => ({
                                              ...prev,
                                              minute: e.target.value,
                                            }))
                                          }
                                          className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                                        >
                                          {Array.from({ length: 60 }, (_, i) =>
                                            i.toString().padStart(2, "0")
                                          ).map((minute) => (
                                            <option key={minute} value={minute}>
                                              {minute}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Validation message */}
                                {selectedStartDate &&
                                  selectedDueDate &&
                                  new Date(
                                    selectedStartDate.getFullYear(),
                                    selectedStartDate.getMonth(),
                                    selectedStartDate.getDate(),
                                    parseInt(selectedStartTime.hour),
                                    parseInt(selectedStartTime.minute)
                                  ) >=
                                    new Date(
                                      selectedDueDate.getFullYear(),
                                      selectedDueDate.getMonth(),
                                      selectedDueDate.getDate(),
                                      parseInt(selectedDueTime.hour),
                                      parseInt(selectedDueTime.minute)
                                    ) && (
                                    <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs">
                                      Thời gian bắt đầu phải nhỏ hơn thời gian
                                      hết hạn
                                    </div>
                                  )}

                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setDatePickerOpenFor(null);
                                      setSelectedStartDate(null);
                                      setSelectedDueDate(null);
                                      setSelectedStartTime({
                                        hour: "00",
                                        minute: "00",
                                      });
                                      setSelectedDueTime({
                                        hour: "23",
                                        minute: "59",
                                      });
                                    }}
                                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                                  >
                                    Hủy
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateDeadlineCheckItem(item._id)
                                    }
                                    disabled={
                                      !selectedDueDate ||
                                      (selectedStartDate &&
                                        selectedDueDate &&
                                        new Date(
                                          selectedStartDate.getFullYear(),
                                          selectedStartDate.getMonth(),
                                          selectedStartDate.getDate(),
                                          parseInt(selectedStartTime.hour),
                                          parseInt(selectedStartTime.minute)
                                        ) >=
                                          new Date(
                                            selectedDueDate.getFullYear(),
                                            selectedDueDate.getMonth(),
                                            selectedDueDate.getDate(),
                                            parseInt(selectedDueTime.hour),
                                            parseInt(selectedDueTime.minute)
                                          ))
                                    }
                                    className="px-4 py-2 text-sm bg-orange-400 text-white rounded hover:bg-orange-500 disabled:opacity-50"
                                  >
                                    Lưu
                                  </button>
                                </div>
                              </div>
                            </>
                          )}

                          {membersPopupOpenFor === item._id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => closeMembersPopup()}
                              />
                              <div className="absolute top-full right-1 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-86 max-h-96 overflow-y-auto">
                                <h4 className="text-sm font-semibold mb-4 text-center">
                                  Giao nhiệm vụ cho thành viên
                                </h4>

                                {/* Overlay loading toàn popup khi đang assign */}
                                {loading && (
                                  <div className="absolute inset-0 bg-white/50 rounded-lg flex items-center justify-center z-50">
                                    <div className="flex flex-col items-center gap-3">
                                      <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                                      <p className="text-sm text-gray-700 font-medium">
                                        Đang giao nhiệm vụ...
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Danh sách thành viên */}
                                <div
                                  className={`space-y-3 ${
                                    loading
                                      ? "opacity-50 pointer-events-none"
                                      : ""
                                  }`}
                                >
                                  {boardMembers.map((member) => {
                                    const isAssigned =
                                      member.assignStatus === true;

                                    return (
                                      <div
                                        key={member._id}
                                        onClick={() =>
                                          !isAssigned &&
                                          assignMemberToCheckItem(
                                            item._id,
                                            member._id
                                          )
                                        }
                                        className={`relative p-4 rounded-xl transition-all border ${
                                          isAssigned
                                            ? "bg-orange-50 border-orange-200 shadow-sm cursor-default"
                                            : "cursor-pointer hover:bg-gray-50 hover:shadow-md hover:border-blue-200 border-transparent"
                                        } ${
                                          loading ? "cursor-not-allowed" : ""
                                        }`}
                                      >
                                        {/* Nội dung thành viên giữ nguyên */}
                                        <div className="flex items-start gap-3">
                                          <div
                                            className={`flex-shrink-0 rounded-full overflow-hidden ring-3 ${
                                              isAssigned
                                                ? "ring-orange-400 w-12 h-12"
                                                : "ring-transparent hover:ring-blue-400 w-11 h-11"
                                            } transition-all`}
                                          >
                                            <Avatar
                                              user={member}
                                              size={
                                                isAssigned
                                                  ? "w-12 h-12"
                                                  : "w-11 h-11"
                                              }
                                            />
                                          </div>

                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <p className="font-semibold text-base text-gray-900">
                                                {member.fullName}
                                              </p>
                                              {isAssigned && (
                                                <span className="text-xs bg-orange-500 text-white px-3 py-1 rounded-full font-medium">
                                                  Đã giao
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-sm text-gray-600 mb-3 truncate">
                                              {member.email}
                                            </p>

                                            {member.skills?.length > 0 ? (
                                              <div className="flex flex-wrap gap-2">
                                                {member.skills.map((s) => (
                                                  <span
                                                    key={s._id}
                                                    className={`inline-block px-3 py-1.5 text-xs font-medium rounded-full ${
                                                      isAssigned
                                                        ? "text-amber-800 bg-amber-200"
                                                        : "text-blue-800 bg-blue-100"
                                                    }`}
                                                  >
                                                    {s.skill}
                                                  </span>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="text-xs text-gray-400 italic">
                                                Chưa có kỹ năng
                                              </p>
                                            )}
                                          </div>

                                          {/* Tick + Nút Xóa khi đang được giao */}
                                          {isAssigned && (
                                            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                                              {/* Tick icon */}
                                              <svg
                                                className="w-7 h-7 text-orange-600"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                              >
                                                <path
                                                  fillRule="evenodd"
                                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                  clipRule="evenodd"
                                                />
                                              </svg>

                                              {/* Nút Xóa (hủy giao) */}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation(); // ngăn trigger click assign của div cha
                                                  handleDeleteMember(
                                                    item._id,
                                                    member._id
                                                  );
                                                }}
                                                disabled={loading}
                                                className="p-1.5 rounded-full hover:bg-red-100 transition-all group"
                                                title="Hủy giao nhiệm vụ"
                                              >
                                                <svg
                                                  className="w-5 h-5 text-gray-500 group-hover:text-red-600 transition-colors"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M6 18L18 6M6 6l12 12"
                                                  />
                                                </svg>
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Không có thành viên */}
                                {boardMembers.length === 0 && !loading && (
                                  <div className="text-center py-10 text-gray-500">
                                    <p className="text-sm">
                                      Không có thành viên nào trong bảng
                                    </p>
                                  </div>
                                )}

                                {/* Nút đóng - vẫn click được khi loading */}
                                <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                                  <button
                                    onClick={() => closeMembersPopup()}
                                    disabled={loading}
                                    className={`px-6 py-2.5 text-sm font-medium rounded-lg transition ${
                                      loading
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                  >
                                    Đóng
                                  </button>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Popup xóa mục việc cần làm */}
                          {itemIdDelete === item._id && (
                            <>
                              <div
                                className="fixed inset-0 z-40 pointer-events-none"
                                onClick={() => handleCloseDeleteItemPopup()}
                              />
                            <div className="absolute top-full right-1 z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-82 max-h-96">
                              <div className="flex flex-col items-center gap-3">
                                <div className="mt-2 rounded-full bg-red-50 w-12 h-12 flex items-center justify-center">
                                  <Trash2 className="text-red-500" />
                                </div>
                                <p className="text-xl font-bold">
                                  Xóa việc cần làm
                                </p>
                                <p className="text-md font-bold text-center">
                                  "{itemTitleDelete}"
                                </p>
                                <p className="text-gray-500 text-center text-sm">
                                  Việc cần làm này sẽ được xóa vĩnh viễn và
                                  không thể khôi phục lại được. Bạn có chắc chắn
                                  muốn tiếp tục không?
                                </p>

                                {/* Button */}
                                <div className="flex items-center gap-5 mt-4 mb-2">
                                  {/* Nút Hủy */}
                                  <button
                                    disabled={loading}
                                    onClick={handleCloseDeleteItemPopup}
                                    className={`
      rounded-xl w-35 h-12 font-semibold
      transition
      ${
        loading
          ? "bg-gray-300 cursor-not-allowed text-gray-500"
          : "bg-gray-200 cursor-pointer text-black hover:bg-gray-300"
      }
    `}
                                  >
                                    Hủy
                                  </button>

                                  {/* Nút Xóa */}
                                  <button
                                    disabled={loading}
                                    onClick={deleteCheckItem}
                                    className={`
      rounded-xl w-35 h-12 font-semibold text-white cursor-pointer
      flex items-center justify-center gap-2
      transition
      ${
        loading
          ? "bg-red-400 cursor-not-allowed"
          : "bg-red-500 hover:bg-red-600 shadow-xl"
      }
    `}
                                  >
                                    {loading ? (
                                      <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Đang xóa...
                                      </>
                                    ) : (
                                      "Xóa"
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                            </>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
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
            className="mt-3 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-2 rounded-lg transition w-full"
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
