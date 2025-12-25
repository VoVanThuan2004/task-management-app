import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import TaskModal from "../components/TaskModal";
import HeaderBoard from "../components/HeaderBoard";
import Column from "../components/Board/Column";
import AddColumnButton from "../components/Board/AddColumnButton";
import Snowfall from "react-snowfall";

const httpUrl = import.meta.env.VITE_API_URL;

export default function BoardDetail() {
  const { boardId, title: boardTitle } = useParams();
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [editingColumn, setEditingColumn] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newTaskTitles, setNewTaskTitles] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const accessToken = localStorage.getItem("accessToken");
  const [loading, setLoading] = useState(false);

  // Thêm ref để track drag state
  const isDraggingRef = useRef(false);
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [isMember, setIsMember] = useState(false);

  const startEditColumn = (id, title) => {
    setEditingColumnId(id);
    setEditTitle(title);
  };

  // Hàm xử lý cập nhật board
  const handleBoardUpdate = (updatedBoard) => {
    setBoard(updatedBoard);
    editingColumn;
  };

  useEffect(() => {
    const fetchBoardDetails = async () => {
      try {
        const headers = accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {};

        const res = await axios.get(
          `${httpUrl}/api/v1/boards-detail/${boardId}`,
          { headers }
        );

        const { board, isMember } = res.data.data;

        setBoard(board);
        setIsMember(isMember || false); // ← quan trọng: guest → isMember = false

        console.log(isMember);
      } catch (err) {
        const status = err.response?.status;

        // Chỉ redirect khi thật sự không được phép
        if (status === 401 || status === 403) {
          // Nếu là public board → backend sẽ trả 200 + isMember=false → không vào đây
          // Chỉ vào đây khi là private/workspace mà không có quyền
          alert("Bạn không có quyền truy cập bảng này");
          window.location.href = "/";
        } else if (status === 404) {
          alert("Bảng không tồn tại");
          window.location.href = "/";
        }
      }
    };

    fetchBoardDetails();
  }, [boardId, accessToken]);

  // Socket connection
  let socket;
  useEffect(() => {
    if (!boardId) return;

    socket = io(httpUrl, {
      transports: ["websocket"],
      auth: { token: accessToken },
    });

    socket.emit("joinBoard", boardId);

    // socket cập nhật realtime - board
    socket.on("boardBackgroundUpdated", (data) => {
      console.log("Board updated background: ", data);
      setBoard((prev) =>
        prev ? { ...prev, background: data.background } : null
      );
    });

    socket.on("boardBackgroundDeleted", (data) => {
      console.log("Board deleted background: ", data);
      setBoard((prev) =>
        prev ? { ...prev, background: data.background } : null
      );
    });

    socket.on("boardUpdated", (data) => {
      console.log("Board updated background color: ", data);
      setBoard((prev) =>
        prev ? { ...prev, background: data.background } : null
      );
    });

    socket.on("columnAdded", (data) => {
      console.log("➕ Column added:", data);
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
      if (isDraggingRef.current) return;

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
        return newOrder.sort((a, b) => a.position - b.position);
      });
    });

    socket.on("taskAdded", (data) => {
      console.log("➕ Task added:", data);
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
                ].sort((a, b) => a.position - b.position),
              }
            : col
        )
      );
    });

    socket.on("taskTitleUpdated", (data) => {
      console.log("📝 Task title updated:", data);
      setColumns((prevColumns) =>
        prevColumns.map((col) => ({
          ...col,
          tasks: col.tasks.map((task) =>
            task._id === data._id ? { ...task, title: data.title } : task
          ),
        }))
      );
    });

    socket.on("descriptionTaskUpdated", (data) => {
      console.log("📝 Task description updated:", data);
      setColumns((prevColumns) =>
        prevColumns.map((col) => ({
          ...col,
          tasks: col.tasks.map((task) =>
            task._id === data._id
              ? { ...task, description: data.description }
              : task
          ),
        }))
      );
    });

    // Xử lý khi di chuyển task
    socket.on("taskMoved", (data) => {
      if (isDraggingRef.current) return;

      console.log("Task moved:", data);

      setColumns((prev) => {
        return prev.map((col) => {
          if (col._id === data.destinationColumnId) {
            return {
              ...col,
              tasks: data.tasksInDestination.map((task) => ({
                ...task,
                _id: task._id,
              })),
            };
          }

          if (
            col._id === data.sourceColumnId &&
            data.sourceColumnId !== data.destinationColumnId
          ) {
            return {
              ...col,
              tasks: col.tasks.filter((t) => t._id !== data.movedTaskId),
            };
          }

          return col;
        });
      });
    });

    socket.on("taskCompletionUpdated", (data) => {
      console.log("✅ Task completion updated:", data);
      setColumns((prevColumns) =>
        prevColumns.map((col) => ({
          ...col,
          tasks: col.tasks.map((task) =>
            task._id === data._id
              ? { ...task, isCompleted: data.isCompleted }
              : task
          ),
        }))
      );
    });

    // xử lý task khi status = Gần tới
    socket.on("taskNearDeadline", (data) => {
      setColumns((prevColumns) =>
        prevColumns.map((col) => ({
          ...col,
          tasks: col.tasks.map((task) =>
            task._id === data.taskId ? { ...task, status: data.status } : task
          ),
        }))
      );
    });

    // xử lý task khi status = Quá hạn
    socket.on("taskOverdue", (data) => {
      setColumns((prevColumns) =>
        prevColumns.map((col) => ({
          ...col,
          tasks: col.tasks.map((task) =>
            task._id === data.taskId ? { ...task, status: data.status } : task
          ),
        }))
      );
    });

    // Xử lý khi comment mới
    socket.on("comment:new", (data) => {
      setColumns((prev) =>
        prev.map((col) => {
          // KHÔNG TOUCH COLUMN KHÁC
          const hasTask = col.tasks.some((t) => t._id === data.taskId);
          if (!hasTask) return col;

          return {
            ...col,
            tasks: col.tasks.map((t) =>
              t._id === data.taskId
                ? { ...t, totalComments: data.totalComments }
                : t
            ),
          };
        })
      );
    });

    socket.on("comment:deleted", (data) => {
      setColumns((prev) =>
        prev.map((col) => {
          const hasTask = col.tasks.some((t) => t._id === data.taskId);
          if (!hasTask) return col;

          return {
            ...col,
            tasks: col.tasks.map((t) =>
              t._id === data.taskId
                ? { ...t, totalComments: data.totalComments }
                : t
            ),
          };
        })
      );
    });

    // Xử lý khi có file đính kèm mới
    socket.on("attachment:new", (data) => {
      setColumns((prev) =>
        prev.map((col) => {
          const hasTask = col.tasks.some((t) => t._id === data.taskId);
          if (!hasTask) return col;

          return {
            ...col,
            tasks: col.tasks.map((t) =>
              t._id === data.taskId
                ? { ...t, totalAttachments: data.totalAttachments }
                : t
            ),
          };
        })
      );
    });

    socket.on("comment:attachment:new", (data) => {
      setColumns((prev) =>
        prev.map((col) => {
          const hasTask = col.tasks.some((t) => t._id === data.taskId);
          if (!hasTask) return col;

          return {
            ...col,
            tasks: col.tasks.map((t) =>
              t._id === data.taskId
                ? { ...t, totalAttachments: data.totalAttachments }
                : t
            ),
          };
        })
      );
    });

    socket.on("attachment:deleted", (data) => {
      setColumns((prev) =>
        prev.map((col) => {
          const hasTask = col.tasks.some((t) => t._id === data.taskId);
          if (!hasTask) return col;

          return {
            ...col,
            tasks: col.tasks.map((t) =>
              t._id === data.taskId
                ? { ...t, totalAttachments: data.totalAttachments }
                : t
            ),
          };
        })
      );
    });

    // Xử lý khi có check-item được click hoàn thành
    socket.on("toggle:check-item", (data) => {
      setColumns((prev) =>
        prev.map((col) => {
          const hasTask = col.tasks.some((t) => t._id === data.taskId);
          if (!hasTask) return col;

          return {
            ...col,
            tasks: col.tasks.map((t) =>
              t._id === data.taskId
                ? {
                    ...t,
                    totalCheckItemsCompleted: data.totalCheckItemsCompleted,
                  }
                : t
            ),
          };
        })
      );
    });

    socket.on("totalCheckItem", (data) => {
      setColumns((prev) =>
        prev.map((col) => {
          const hasTask = col.tasks.some((t) => t._id === data.taskId);
          if (!hasTask) return col;

          return {
            ...col,
            tasks: col.tasks.map((t) =>
              t._id === data.taskId
                ? {
                    ...t,
                    totalCheckItems: t.totalCheckItems + 1,
                  }
                : t
            ),
          };
        })
      );
    });

    socket.on("totalCheckItemDeleted", (data) => {
      setColumns((prev) =>
        prev.map((col) => {
          const hasTask = col.tasks.some((t) => t._id === data.taskId);
          if (!hasTask) return col;

          return {
            ...col,
            tasks: col.tasks.map((t) =>
              t._id === data.taskId
                ? {
                    ...t,
                    totalCheckItems: t.totalCheckItems - 1,
                  }
                : t
            ),
          };
        })
      );
    });

    // toggleTask
    socket.on("toggleTask", (data) => {
      console.log(data);
      setColumns((prev) =>
        prev.map((col) => {
          const hasTask = col.tasks.some((t) => t._id === data.taskId);
          if (!hasTask) return col;

          return {
            ...col,
            tasks: col.tasks.map((t) =>
              t._id === data.taskId
                ? {
                    ...t,
                    isCompleted: data.isCompleted,
                  }
                : t
            ),
          };
        })
      );
    });

    socket.on("taskLabelUpdated", (data) => {
      setColumns((prevColumns) =>
        prevColumns.map((col) => {
          // Tìm index của task cần cập nhật trong column này
          const taskIndex = col.tasks.findIndex((t) => t._id === data.taskId);

          // Nếu không tìm thấy task → giữ nguyên column
          if (taskIndex === -1) return col;

          // Cập nhật mảng tasks với task mới (immutable)
          const updatedTasks = col.tasks.map((task, idx) => {
            if (idx !== taskIndex) return task; // Giữ nguyên các task khác

            // Task cần cập nhật
            if (data.action === "added") {
              // Thêm label mới vào taskLabels
              return {
                ...task,
                taskLabels: [
                  ...task.taskLabels,
                  {
                    labelId: data.labelId,
                    title: data.title,
                    color: data.color,
                  },
                ],
              };
            }

            if (data.action === "removed") {
              // Xóa label có labelId khớp
              return {
                ...task,
                taskLabels: task.taskLabels.filter(
                  (label) => label.labelId !== data.labelId
                ),
              };
            }

            // Nếu action không hợp lệ (hiếm xảy ra), giữ nguyên
            return task;
          });

          // Trả về column mới với tasks đã cập nhật
          return {
            ...col,
            tasks: updatedTasks,
          };
        })
      );
    });

    socket.on("deadlineTaskUpdated", (data) => {
      setColumns((prevColumns) =>
        prevColumns.map((col) => ({
          ...col,
          tasks: col.tasks.map((task) =>
            task._id === data._id ? { ...task, dueDate: data.dueDate } : task
          ),
        }))
      );
    });

    socket.on("assignMember", (data) => {
      setColumns((prevColumns) =>
        prevColumns.map((column) => {
          // Tìm task trong column này có khớp taskId không
          const taskIndex = column.tasks.findIndex(
            (t) => t._id === data.taskId
          );

          if (taskIndex === -1) return column; // không có task này → bỏ qua

          // Tạo assignee mới theo đúng cấu trúc frontend đang dùng
          const newAssignee = {
            userId: data.userId,
            fullName: data.fullName,
            avatar: data.avatar || null,
          };

          // Lấy task cũ
          const updatedTasks = [...column.tasks];
          const targetTask = updatedTasks[taskIndex];

          // Kiểm tra tránh trùng (an toàn)
          const isAlreadyAssigned = targetTask.taskAssignees?.some(
            (a) => a.userId === data.userId
          );

          if (!isAlreadyAssigned) {
            // Thêm assignee mới vào task
            updatedTasks[taskIndex] = {
              ...targetTask,
              taskAssignees: [...(targetTask.taskAssignees || []), newAssignee],
            };
          }

          return {
            ...column,
            tasks: updatedTasks,
          };
        })
      );
    });

    socket.on("removeMember", (data) => {
      // data thường có { taskId, userId } hoặc { taskId, _id }
      console.log("removeMember socket:", data);

      const userIdToRemove = data.userId || data._id; // linh hoạt tùy backend emit gì

      setColumns((prevColumns) =>
        prevColumns.map((column) => {
          const taskIndex = column.tasks.findIndex(
            (t) => t._id === data.taskId
          );

          if (taskIndex === -1) return column;

          const updatedTasks = [...column.tasks];
          const targetTask = updatedTasks[taskIndex];

          updatedTasks[taskIndex] = {
            ...targetTask,
            taskAssignees: (targetTask.taskAssignees || []).filter(
              (a) => a.userId !== userIdToRemove
            ),
          };

          return {
            ...column,
            tasks: updatedTasks,
          };
        })
      );
    });

    return () => {
      socket.emit("leaveBoard", boardId);
      socket.disconnect();
    };
  }, [boardId, accessToken]);

  // Fetch columns với tasks
  useEffect(() => {
    fetchColumns();
  }, [boardId, accessToken]);

  const fetchColumns = async (filters = {}) => {
    try {
      const res = await axios.get(`${httpUrl}/api/v2/columns/${boardId}`, {
        params: filters,
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const sortedColumns = (res.data.data || [])
        .sort((a, b) => a.position - b.position)
        .map((col) => {
          console.log(`Column ${col.title} tasks:`, col.tasks); // DEBUG
          return {
            ...col,
            tasks: (col.tasks || []).sort((a, b) => a.position - b.position),
          };
        });

      setColumns(sortedColumns);
    } catch (err) {
      console.error("❌ Lỗi khi tải columns:", err);
    }
  };

  // Column handlers
  const handleAddColumn = async () => {
    if (!newTitle.trim()) return;
    try {
      setLoading(true);
      await axios.post(
        `${httpUrl}/api/v1/columns`,
        { boardId, title: newTitle },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setNewTitle("");
      setIsAddingColumn(false);
    } catch (err) {
      console.error("❌ Lỗi khi thêm column:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateColumn = async (columnId) => {
    if (!editTitle.trim()) {
      cancelEditing();
      return;
    }
    try {
      const res = await axios.put(
        `${httpUrl}/api/v1/columns/${columnId}`,
        { title: editTitle },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setEditingColumn(null);
      setEditTitle(res.data.data.title);
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật column:", err);
    }
  };

  const handleDeleteColumn = async (columnId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa danh sách này?")) return;
    try {
      await axios.delete(`${httpUrl}/api/v1/columns/${columnId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      console.error("❌ Lỗi khi xóa column:", err);
    }
  };

  // Task handlers
  const handleAddTask = async (columnId, taskTitle) => {
    if (!taskTitle.trim()) return;
    try {
      setLoading(true);
      await axios.post(
        `${httpUrl}/api/v1/tasks/${columnId}`,
        { title: taskTitle },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setNewTaskTitles((prev) => ({
        ...prev,
        [columnId]: "",
      }));
    } catch (err) {
      console.error("❌ Lỗi khi thêm task:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskTitleChange = (columnId, value) => {
    setNewTaskTitles((prev) => ({ ...prev, [columnId]: value }));
  };

  const handleToggleTaskComplete = async (taskId) => {
    try {
      const res = await axios.put(
        `${httpUrl}/api/v1/tasks/${taskId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (res.data.status === "success") {
        const updated = res.data.data;

        // Update UI local ngay lập tức
        setColumns((prevColumns) =>
          prevColumns.map((col) => ({
            ...col,
            tasks: col.tasks.map((task) =>
              task._id === taskId
                ? { ...task, isCompleted: updated.isCompleted }
                : task
            ),
          }))
        );
      }
    } catch (error) {
      console.error("❌ Lỗi khi toggle task complete:", error);
      // Có thể thêm toast notification ở đây
    }
  };

  // Modal handlers
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
  };

  const handleTaskUpdate = () => {
    fetchColumns();
  };

  // Drag & drop handlers
  const handleColumnMove = useCallback(
    async (result) => {
      const { source, destination, draggableId } = result;

      if (!destination || source.index === destination.index) return;

      isDraggingRef.current = true;

      // Optimistic update
      setColumns((prevColumns) => {
        const newColumns = Array.from(prevColumns);
        const [movedColumn] = newColumns.splice(source.index, 1);
        newColumns.splice(destination.index, 0, movedColumn);
        return newColumns;
      });

      try {
        await axios.put(
          `${httpUrl}/api/v1/columns/${draggableId}/position`,
          { destinationIndex: destination.index },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      } catch (err) {
        console.error("❌ Lỗi khi di chuyển column:", err);
        fetchColumns(); // Rollback
      } finally {
        isDraggingRef.current = false;
      }
    },
    [accessToken, httpUrl]
  );

  const handleTaskMove = useCallback(
    async (result) => {
      const { source, destination, draggableId } = result;

      if (
        !destination ||
        (source.droppableId === destination.droppableId &&
          source.index === destination.index)
      )
        return;

      isDraggingRef.current = true;

      // Optimistic update - chỉ cập nhật local state
      setColumns((prevColumns) => {
        const newColumns = prevColumns.map((col) => ({
          ...col,
          tasks: [...(col.tasks || [])],
        }));

        const sourceCol = newColumns.find(
          (col) => col._id === source.droppableId
        );
        const destCol = newColumns.find(
          (col) => col._id === destination.droppableId
        );

        if (!sourceCol || !destCol) return prevColumns;

        const taskToMove = sourceCol.tasks[source.index];
        if (!taskToMove) return prevColumns;

        sourceCol.tasks.splice(source.index, 1);
        destCol.tasks.splice(destination.index, 0, taskToMove);

        return newColumns;
      });

      try {
        await axios.put(
          `${httpUrl}/api/v1/tasks/${draggableId}/position`,
          {
            destinationColumnId: destination.droppableId,
            destinationIndex: destination.index,
          },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      } catch (err) {
        console.error("❌ Lỗi khi di chuyển task:", err);
        fetchColumns(); // Rollback nếu lỗi
      } finally {
        isDraggingRef.current = false;
      }
    },
    [accessToken, httpUrl]
  );

  const handleDragEnd = useCallback(
    async (result) => {
      const { destination, type } = result;

      if (!destination) return;

      if (type === "COLUMN") {
        await handleColumnMove(result);
      } else if (type === "TASK") {
        await handleTaskMove(result);
      }
    },
    [handleColumnMove, handleTaskMove]
  );

  const cancelEditing = () => {
    setEditingColumn(null);
    setEditTitle("");
  };

  const cancelAddColumn = () => {
    setIsAddingColumn(false);
    setNewTitle("");
  };

  const getBoardBackground = () => {
    if (!board) return { backgroundColor: "#f0f2f5" };
    const { background } = board;
    if (background?.startsWith("#")) return { backgroundColor: background };
    if (background)
      return {
        backgroundImage: background,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    return { backgroundColor: "#f0f2f5" };
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <HeaderBoard
        board={board}
        boardTitle={boardTitle}
        onBoardUpdate={handleBoardUpdate}
        isMember={isMember}
        socket={socket}
        onApplyFilters={fetchColumns}
      />

      {/* Tuyết rơi - phủ toàn màn hình, nhưng không che nội dung */}
      {/* <Snowfall
        snowflakeCount={125} // số lượng tuyết (tùy chỉnh 100-300)
        speed={[0.5, 2]} // tốc độ rơi chậm - nhanh
        wind={[-0.5, 2]} // gió thổi nhẹ ngang
        radius={[0.5, 4.0]} // kích thước tuyết nhỏ đến trung bình
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none", // quan trọng: tuyết không block click chuột
          zIndex: 1, // dưới header và nội dung chính
        }}
      /> */}

      <main className="flex-1 overflow-x-auto p-6" style={getBoardBackground()}>
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* BỌC TOÀN BỘ BẢNG + NÚT THÊM TRONG 1 FLEX CONTAINER */}
          <div className="flex gap-4 items-start min-w-max">
            {/* === DANH SÁCH CÁC COLUMN (có thể drag) === */}
            <Droppable droppableId="board" type="COLUMN" direction="horizontal">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex gap-4 items-start"
                >
                  {columns.map((col, index) => (
                    <Column
                      key={col._id}
                      column={col}
                      index={index}
                      isEditing={editingColumnId === col._id}
                      editTitle={editTitle}
                      onStartEdit={startEditColumn}
                      onEditTitle={setEditTitle}
                      onUpdateColumn={() => handleUpdateColumn(col._id)}
                      onDeleteColumn={handleDeleteColumn}
                      newTaskTitle={newTaskTitles[col._id]}
                      onNewTaskChange={handleTaskTitleChange}
                      onAddTask={handleAddTask}
                      onToggleTaskComplete={handleToggleTaskComplete}
                      onTaskClick={handleTaskClick}
                      isMember={isMember}
                      loading={loading}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* === NÚT THÊM COLUMN - NẰM CÙNG HÀNG VỚI CÁC COLUMN === */}
            <div className="flex-shrink-0">
              <AddColumnButton
                isAdding={isAddingColumn}
                newTitle={newTitle}
                onStartAdding={() => setIsAddingColumn(true)}
                onTitleChange={setNewTitle}
                onAdd={handleAddColumn}
                onCancel={cancelAddColumn}
                isMember={isMember}
                loading={loading}
              />
            </div>
          </div>
        </DragDropContext>
      </main>

      <TaskModal
        key={selectedTask?._id}
        task={selectedTask}
        isOpen={showTaskModal}
        onClose={handleCloseModal}
        onTaskUpdate={handleTaskUpdate}
        isMember={isMember}
      />
    </div>
  );
}
