import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; //  Import useParams
import { io } from "socket.io-client";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, X, Pencil, Trash2, GripVertical } from "lucide-react";

const httpUrl = import.meta.env.VITE_API_URL;

export default function BoardDetail() {
  // Lấy boardId và title từ URL
  const { boardId, title: boardTitle } = useParams();

  const [board, setBoard] = useState(null); //  State để lưu thông tin board (cho background)
  const [columns, setColumns] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [editingColumn, setEditingColumn] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false); //  State cho form thêm column

  const accessToken = localStorage.getItem("accessToken");

  const [newTaskTitles, setNewTaskTitles] = useState({});

  // Fetch thông tin board (để lấy background)
  useEffect(() => {
    const fetchBoardDetails = async () => {
      try {
        const res = await axios.get(
          `${httpUrl}/api/v1/boards-detail/${boardId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        setBoard(res.data.data);
      } catch (err) {
        console.error("❌ Lỗi khi tải chi tiết board:", err);
      }
    };
    fetchBoardDetails();
  }, [boardId, accessToken]);

  // Khởi tạo socket
  useEffect(() => {
    // Phải có boardId mới kết nối
    if (!boardId) return;

    const socket = io(httpUrl, {
      transports: ["websocket"],
      auth: { token: accessToken },
    });

    socket.emit("joinBoard", boardId);
    console.log("🟢 Joined board:", boardId);

    // Lắng nghe event realtime
    socket.on("columnAdded", (data) => {
      console.log("📩 Column added:", data);
      setColumns((prev) => [...prev, data]);
    });

    socket.on("columnUpdated", (data) => {
      console.log("✏️ Column updated:", data);
      setColumns((prev) =>
        prev.map((col) =>
          col._id === data._id ? { ...col, title: data.title } : col
        )
      );
    });

    socket.on("columnDeleted", (data) => {
      console.log("🗑️ Column deleted:", data);
      setColumns((prev) => prev.filter((col) => col._id !== data._id));
    });

    socket.on("columnMoved", (data) => {
      console.log("🔄 Column moved:", data);

      setColumns((prevColumns) => {
        const newOrder = data.columns.map((col) => {
          const existing = prevColumns.find((c) => c._id === col.id);
          return existing
            ? { ...existing, position: col.position }
            : {
                _id: col.id,
                title: col.title,
                position: col.position,
                tasks: [],
              };
        });

        // Sắp xếp theo position
        return newOrder.sort((a, b) => a.position - b.position);
      });
    });

    // socket khi thêm task vào column
    socket.on("taskAdded", (data) => {
      console.log("🔄 Task added:", data);

      setColumns((prevColumns) =>
        prevColumns.map((col) =>
          col._id === data.columnId
            ? {
                ...col,
                tasks: [
                  ...(col.tasks ?? []),
                  {
                    _id: data._id,
                    title: data.title,
                    position: data.position,
                    isCompleted: data.isCompleted,
                  },
                ],
              }
            : col
        )
      );
    });

    // Khi rời khỏi board
    return () => {
      socket.emit("leaveBoard", boardId);
      socket.disconnect();
      console.log("🔴 Left board:", boardId);
    };
  }, [boardId, accessToken, httpUrl]); //  Thêm httpUrl vào dependencies

  // Lấy danh sách column ban đầu
  useEffect(() => {
    const fetchColumns = async () => {
      try {
        const res = await axios.get(`${httpUrl}/api/v1/columns/${boardId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const sortedColumns = (res.data.data || []).sort(
          (a, b) => a.position - b.position
        );
        setColumns(sortedColumns);
      } catch (err) {
        console.error("❌ Lỗi khi tải columns:", err);
      }
    };
    fetchColumns();
  }, [boardId, accessToken, httpUrl]); //  Thêm httpUrl vào dependencies

  // Gọi API thêm column
  const handleAddColumn = async () => {
    if (!newTitle.trim()) return; // Không alert, chỉ return

    try {
      await axios.post(
        `${httpUrl}/api/v1/columns`,
        { boardId, title: newTitle },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setNewTitle("");
      setIsAddingColumn(false); //  Đóng form
    } catch (err) {
      console.error("❌ Lỗi khi thêm column:", err);
    }
  };

  // Gọi API cập nhật column
  const handleUpdateColumn = async (columnId) => {
    if (!editTitle.trim()) {
      cancelEditing();
      return;
    }

    try {
      await axios.put(
        `${httpUrl}/api/v1/columns/${columnId}`,
        { title: editTitle },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setEditingColumn(null);
      setEditTitle("");
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật column:", err);
    }
  };

  // Gọi API xóa column
  const handleDeleteColumn = async (columnId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa danh sách này?")) {
      return;
    }
    try {
      await axios.delete(`${httpUrl}/api/v1/columns/${columnId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      console.error("❌ Lỗi khi xóa column:", err);
    }
  };

  // Gọi API thêm task vào column
  const handleAddTask = async (columnId, taskTitle) => {
    if (!taskTitle.trim()) return;

    try {
      await axios.post(
        `${httpUrl}/api/v1/tasks/${columnId}`,
        { title: taskTitle },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } catch (err) {
      console.error("❌ Lỗi khi thêm task:", err);
    }
  };

  const handleTaskTitleChange = (columnId, value) => {
    setNewTaskTitles((prev) => ({ ...prev, [columnId]: value }));
  };

  // Xử lý drag & drop
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newColumns = columns.map((col) => ({
      ...col,
      tasks: Array.isArray(col.tasks) ? [...col.tasks] : [],
    }));

    const [movedColumn] = newColumns.splice(source.index, 1);
    newColumns.splice(destination.index, 0, movedColumn);

    setColumns(newColumns);

    try {
      await axios.put(
        `${httpUrl}/api/v1/columns/${draggableId}/position`,
        { destinationIndex: destination.index },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      // ❌ KHÔNG fetch lại ở đây nữa — socket sẽ tự đồng bộ
    } catch (err) {
      console.error("❌ Lỗi khi di chuyển column:", err);
      alert("Có lỗi xảy ra khi di chuyển column!");

      // Rollback lại dữ liệu thật từ server
      const res = await axios.get(`${httpUrl}/api/v1/columns/${boardId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const sortedColumns = (res.data.data || []).sort(
        (a, b) => a.position - b.position
      );
      setColumns(sortedColumns);
    }
  };

  // Bắt đầu chỉnh sửa column
  const startEditing = (column) => {
    setEditingColumn(column._id);
    setEditTitle(column.title);
  };

  // Hủy chỉnh sửa
  const cancelEditing = () => {
    setEditingColumn(null);
    setEditTitle("");
  };

  // Hủy thêm column
  const cancelAddColumn = () => {
    setIsAddingColumn(false);
    setNewTitle("");
  };

  // Lấy style cho background
  const getBoardBackground = () => {
    if (!board) return { backgroundColor: "#f0f2f5" }; // Màu nền xám nhạt mặc định

    const { background } = board;
    if (background?.startsWith("#")) {
      return { backgroundColor: background };
    }
    if (background) {
      return {
        backgroundImage: `url(${background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return { backgroundColor: "#f0f2f5" };
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header / Navbar của Board */}
      <header className="p-4 bg-white/70 backdrop-blur-sm shadow-sm z-10">
        <h1 className="text-xl font-bold text-gray-800">
          {board?.title || boardTitle}
        </h1>
        {/* TODO: Thêm các nút (Star, Invite,...) vào đây */}
      </header>

      {/* Khu vực Board (Scroll được) */}
      <main
        className="flex-1 flex gap-4 overflow-x-auto p-4"
        style={getBoardBackground()} //  Áp dụng background
      >
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="columns" direction="horizontal">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex gap-4 items-start" //  Căn các cột theo chiều ngang
              >
                {columns.map((col, index) => (
                  <Draggable key={col._id} draggableId={col._id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex-shrink-0 w-72 ${
                          snapshot.isDragging ? "shadow-2xl" : ""
                        }`}
                      >
                        {/*  Toàn bộ nội dung column là drag handle */}
                        <div
                          {...provided.dragHandleProps}
                          className="bg-gray-100 rounded-xl shadow-md p-3"
                        >
                          {/* Hiển thị form chỉnh sửa hoặc title */}
                          {editingColumn === col._id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full p-2 border border-blue-500 rounded-lg"
                                autoFocus
                                onBlur={() => handleUpdateColumn(col._id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleUpdateColumn(col._id);
                                  if (e.key === "Escape") cancelEditing();
                                }}
                              />
                            </div>
                          ) : (
                            // Header column
                            <div className="flex justify-between items-center mb-3">
                              <h2
                                className="text-md font-semibold text-gray-800 cursor-pointer flex-1"
                                onClick={() => startEditing(col)}
                              >
                                {col.title}
                              </h2>
                              <button
                                onClick={() => handleDeleteColumn(col._id)}
                                className="text-gray-400 hover:text-red-600 p-1 rounded"
                                title="Xóa danh sách"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}

                          {/* Placeholder cho cards (có thể thêm sau) */}
                          {/* Danh sách task */}
                          <div className="space-y-2 mt-2 min-h-[5rem]">
                            {col.tasks && col.tasks.length > 0 ? (
                              col.tasks.map((task) => (
                                <div
                                  key={task._id}
                                  className={`bg-white rounded-lg shadow-sm p-2 cursor-pointer hover:shadow-md transition ${
                                    task.isCompleted
                                      ? "opacity-60 line-through"
                                      : ""
                                  }`}
                                >
                                  <p className="text-sm font-medium text-gray-800 truncate">
                                    {task.title}
                                  </p>
                                  <div className="flex gap-2 text-xs text-gray-500 mt-1">
                                    {task.totalComments > 0 && (
                                      <span>💬 {task.totalComments}</span>
                                    )}
                                    {task.totalAttachments > 0 && (
                                      <span>📎 {task.totalAttachments}</span>
                                    )}
                                    {task.totalChecklistItems > 0 && (
                                      <span>
                                        ☑ {task.completedChecklistItems}/
                                        {task.totalChecklistItems}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-400 text-sm text-center p-2">
                                (Chưa có thẻ)
                              </p>
                            )}

                            {/* Form thêm task */}
                            <div className="mt-2">
                              <input
                                type="text"
                                value={newTaskTitles[col._id] || ""}
                                onChange={(e) =>
                                  handleTaskTitleChange(col._id, e.target.value)
                                }
                                placeholder="Nhập tiêu đề thẻ..."
                                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => {
                                  handleAddTask(
                                    col._id,
                                    newTaskTitles[col._id] || ""
                                  );
                                  setNewTaskTitles((prev) => ({
                                    ...prev,
                                    [col._id]: "",
                                  }));
                                }}
                                className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition"
                              >
                                + Thêm thẻ
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                {/*  Form Thêm Column (Kiểu Trello) */}
                <div className="flex-shrink-0 w-72">
                  {isAddingColumn ? (
                    <div className="bg-white rounded-xl shadow-sm p-3 space-y-2">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Nhập tiêu đề danh sách..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleAddColumn}
                          className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                        >
                          Thêm
                        </button>
                        <button
                          onClick={cancelAddColumn}
                          className="text-gray-500 hover:text-gray-700 p-2"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingColumn(true)}
                      className="w-full p-3 bg-white/50 hover:bg-white/70 text-gray-700 font-medium rounded-xl shadow-sm transition-colors"
                    >
                      <Plus size={16} className="inline mr-1" />
                      Thêm danh sách khác
                    </button>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </main>
    </div>
  );
}
