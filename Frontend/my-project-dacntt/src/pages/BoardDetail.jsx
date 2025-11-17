import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Plus,
  X,
  Trash2,
  CheckCircle2,
  Circle,
  MessageSquare,
  Paperclip,
  CheckSquare,
  Clock,
  AlertCircle,
  Tag,
} from "lucide-react";
import TaskModal from "../components/TaskModal";
import HeaderBoard from "../components/HeaderBoard";
import { format } from "date-fns";

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

  // Hàm xử lý cập nhật board
  const handleBoardUpdate = (updatedBoard) => {
    setBoard(updatedBoard);
  };

  // Fetch board details
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

  // Socket connection
  useEffect(() => {
    if (!boardId) return;

    const socket = io(httpUrl, {
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
      console.log("Task moved - FULL DATA:", data);

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
      console.log("✅ Task's deadline is upcomming:", data);
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
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) =>
            t._id === data.taskId
              ? { ...t, totalComments: data.totalComments }
              : t
          ),
        }))
      );
    });

    socket.on("comment:deleted", (data) => {
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) =>
            t._id === data.taskId
              ? { ...t, totalComments: data.totalComments }
              : t
          ),
        }))
      );
    });


    // Xử lý khi có file đính kèm mới
    socket.on("attachment:new", (data) => {
      setColumns((prev) => 
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) =>
            t._id === data.taskId
              ? { ...t, totalAttachments: data.totalAttachments }
              : t
          ),
        }))
      )
    })

    socket.on("comment:attachment:new", (data) => {
      setColumns((prev) => 
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) =>
            t._id === data.taskId
              ? { ...t, totalAttachments: data.totalAttachments }
              : t
          ),
        }))
      )
    })

    socket.on("attachment:deleted", (data) => {
      setColumns((prev) => 
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) =>
            t._id === data.taskId
              ? { ...t, totalAttachments: data.totalAttachments }
              : t
          ),
        }))
      )
    })

    return () => {
      socket.emit("leaveBoard", boardId);
      socket.disconnect();
    };
  }, [boardId, accessToken]);

  // Fetch columns với tasks
  useEffect(() => {
    fetchColumns();
  }, [boardId, accessToken]);

  const fetchColumns = async () => {
    try {
      const res = await axios.get(`${httpUrl}/api/v1/columns/${boardId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      console.log("📦 Columns data from API:", res.data.data); // DEBUG

      const sortedColumns = (res.data.data || [])
        .sort((a, b) => a.position - b.position)
        .map((col) => {
          console.log(`📝 Column ${col.title} tasks:`, col.tasks); // DEBUG
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
      await axios.post(
        `${httpUrl}/api/v1/columns`,
        { boardId, title: newTitle },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setNewTitle("");
      setIsAddingColumn(false);
    } catch (err) {
      console.error("❌ Lỗi khi thêm column:", err);
    }
  };

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
    }
  };

  const handleTaskTitleChange = (columnId, value) => {
    setNewTaskTitles((prev) => ({ ...prev, [columnId]: value }));
  };

  const handleToggleTaskComplete = async (taskId, isCompleted) => {
    try {
      await axios.patch(
        `${httpUrl}/api/v1/tasks/${taskId}`,
        { isCompleted },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      // Socket sẽ cập nhật qua event "taskCompletionUpdated"
    } catch (error) {
      console.error("Lỗi khi cập nhật task:", error);
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
  const handleColumnMove = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination || source.index === destination.index) return;

    // Optimistic update
    const newColumns = Array.from(columns);
    const [movedColumn] = newColumns.splice(source.index, 1);
    newColumns.splice(destination.index, 0, movedColumn);
    setColumns(newColumns);

    try {
      await axios.put(
        `${httpUrl}/api/v1/columns/${draggableId}/position`,
        { destinationIndex: destination.index },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } catch (err) {
      console.error("❌ Lỗi khi di chuyển column:", err);
      fetchColumns(); // Rollback
    }
  };

  const handleTaskMove = async (result) => {
    const { source, destination, draggableId } = result;

    if (
      !destination ||
      (source.droppableId === destination.droppableId &&
        source.index === destination.index)
    )
      return;

    // Optimistic update
    const newColumns = columns.map((col) => ({
      ...col,
      tasks: [...(col.tasks || [])],
    }));

    const sourceCol = newColumns.find((col) => col._id === source.droppableId);
    const destCol = newColumns.find(
      (col) => col._id === destination.droppableId
    );

    if (!sourceCol || !destCol) return;

    // Tìm và di chuyển task
    const taskToMove = sourceCol.tasks[source.index];
    if (!taskToMove) return;

    sourceCol.tasks.splice(source.index, 1);
    destCol.tasks.splice(destination.index, 0, taskToMove);

    setColumns(newColumns);

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
      fetchColumns(); // Rollback
    }
  };

  const handleDragEnd = async (result) => {
    const { destination, type } = result;

    if (!destination) return;

    if (type === "COLUMN") {
      await handleColumnMove(result);
    } else if (type === "TASK") {
      await handleTaskMove(result);
    }
  };

  // UI helpers
  const startEditing = (column) => {
    setEditingColumn(column._id);
    setEditTitle(column.title);
  };

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
        backgroundImage: `url(${background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    return { backgroundColor: "#f0f2f5" };
  };

  // Helper: Xác định trạng thái hạn
  const getDueDateStatus = (dueDate, isCompleted) => {
    if (isCompleted || !dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
      return { text: "Quá hạn", color: "bg-red-100 text-red-700" };
    if (diffDays <= 1)
      return { text: "Gần tới hạn", color: "bg-yellow-100 text-yellow-700" };
    return null;
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <HeaderBoard
        board={board}
        boardTitle={boardTitle}
        onBoardUpdate={handleBoardUpdate}
      />

      <main
        className="flex-1 flex gap-4 overflow-x-auto p-4"
        style={getBoardBackground()}
      >
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="columns" direction="horizontal" type="COLUMN">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex gap-4 items-start"
              >
                {columns.map((col, index) => (
                  <Draggable key={col._id} draggableId={col._id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex-shrink-0 w-72 ${
                          snapshot.isDragging ? "shadow-2xl rotate-3" : ""
                        } transition-transform duration-200`}
                      >
                        <div className="bg-gray-100 rounded-xl shadow-md p-3">
                          {/* Column Header với drag handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing"
                          >
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
                          </div>

                          {/* Tasks List */}
                          {/* Tasks List */}
                          <Droppable droppableId={col._id} type="TASK">
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`min-h-[100px] transition-colors duration-200 rounded-lg ${
                                  snapshot.isDraggingOver ? "bg-blue-50/50" : ""
                                }`}
                              >
                                {(col.tasks || []).map((task, index) => {
                                  const dueStatus = getDueDateStatus(
                                    task.dueDate,
                                    task.isCompleted
                                  );
                                  const hasChecklist = task.totalChecklists > 0;
                                  const completedItems =
                                    task.totalChecklistItems || 0;
                                  const totalItems = task.totalChecklists || 0;

                                  return (
                                    <Draggable
                                      key={task._id}
                                      draggableId={task._id}
                                      index={index}
                                    >
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`mb-2 cursor-grab active:cursor-grabbing transition-all duration-200 ${
                                            snapshot.isDragging
                                              ? "rotate-3 shadow-xl scale-105"
                                              : ""
                                          }`}
                                        >
                                          <div
                                            onClick={() =>
                                              handleTaskClick(task)
                                            }
                                            className={`group bg-white rounded-lg shadow-sm p-3 cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200/80 ${
                                              task.isCompleted
                                                ? "opacity-75 bg-gray-50"
                                                : ""
                                            }`}
                                          >
                                            {/* Labels */}
                                            {task.taskLabels &&
                                              task.taskLabels.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                  {task.taskLabels.map(
                                                    (label) => (
                                                      <span
                                                        key={label._id}
                                                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                                                        style={{
                                                          backgroundColor:
                                                            label.color,
                                                        }}
                                                      >
                                                        {label.title}
                                                      </span>
                                                    )
                                                  )}
                                                </div>
                                              )}

                                            {/* Title + Checkbox */}
                                            <div className="flex items-start gap-2">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleToggleTaskComplete(
                                                    task._id,
                                                    !task.isCompleted
                                                  );
                                                }}
                                                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 transition-all duration-200 flex items-center justify-center ${
                                                  task.isCompleted
                                                    ? "bg-green-500 border-green-500"
                                                    : "border-gray-300 hover:border-green-400 hover:bg-green-50"
                                                }`}
                                              >
                                                {task.isCompleted ? (
                                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                                ) : (
                                                  <Circle className="w-3.5 h-3.5 text-gray-400" />
                                                )}
                                              </button>
                                              <p
                                                className={`flex-1 text-sm font-medium text-gray-800 leading-tight ${
                                                  task.isCompleted
                                                    ? "line-through text-gray-500"
                                                    : ""
                                                }`}
                                              >
                                                {task.title}
                                              </p>
                                            </div>

                                            {/* Due Date & Status Badge */}
                                            {(task.dueDate || dueStatus) && (
                                              <div className="flex items-center gap-1 mt-2 text-xs">
                                                <Clock className="w-3.5 h-3.5 text-gray-500" />
                                                <span className="text-gray-600">
                                                  {task.dueDate
                                                    ? format(
                                                        new Date(task.dueDate),
                                                        "dd MMM"
                                                      )
                                                    : ""}
                                                </span>
                                                {dueStatus && (
                                                  <span
                                                    className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${dueStatus.color}`}
                                                  >
                                                    {dueStatus.text}
                                                  </span>
                                                )}
                                              </div>
                                            )}

                                            {/* Footer: Checklist, Comments, Attachments */}
                                            {(hasChecklist ||
                                              task.totalComments > 0 ||
                                              task.totalAttachments > 0) && (
                                              <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                                                {/* Checklist */}
                                                {hasChecklist && (
                                                  <div className="flex items-center gap-1">
                                                    <CheckSquare className="w-4 h-4 text-gray-500" />
                                                    <span
                                                      className={
                                                        completedItems ===
                                                        totalItems
                                                          ? "text-green-600 font-medium"
                                                          : ""
                                                      }
                                                    >
                                                      {completedItems}/
                                                      {totalItems}
                                                    </span>
                                                  </div>
                                                )}

                                                {/* Comments */}
                                                {task.totalComments > 0 && (
                                                  <div className="flex items-center gap-1">
                                                    <MessageSquare className="w-4 h-4" />
                                                    <span>
                                                      {task.totalComments}
                                                    </span>
                                                  </div>
                                                )}

                                                {/* Attachments */}
                                                {task.totalAttachments > 0 && (
                                                  <div className="flex items-center gap-1">
                                                    <Paperclip className="w-4 h-4" />
                                                    <span>
                                                      {task.totalAttachments}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {provided.placeholder}

                                {/* Empty state */}
                                {(col.tasks || []).length === 0 && (
                                  <div className="text-center py-6 text-gray-400 text-sm italic">
                                    (Chưa có thẻ nào)
                                  </div>
                                )}
                              </div>
                            )}
                          </Droppable>

                          {/* Add Task Form */}
                          <div className="mt-3">
                            <input
                              type="text"
                              value={newTaskTitles[col._id] || ""}
                              onChange={(e) =>
                                handleTaskTitleChange(col._id, e.target.value)
                              }
                              placeholder="Nhập tiêu đề thẻ..."
                              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              onKeyPress={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  newTaskTitles[col._id]?.trim()
                                ) {
                                  handleAddTask(
                                    col._id,
                                    newTaskTitles[col._id].trim()
                                  );
                                }
                              }}
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => {
                                  if (newTaskTitles[col._id]?.trim()) {
                                    handleAddTask(
                                      col._id,
                                      newTaskTitles[col._id].trim()
                                    );
                                  }
                                }}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-lg transition-colors duration-200"
                              >
                                Thêm thẻ
                              </button>
                              <button
                                onClick={() =>
                                  setNewTaskTitles((prev) => ({
                                    ...prev,
                                    [col._id]: "",
                                  }))
                                }
                                className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                {/* Add Column Form */}
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

      <TaskModal
        task={selectedTask}
        isOpen={showTaskModal}
        onClose={handleCloseModal}
        onTaskUpdate={handleTaskUpdate}
      />
    </div>
  );
}
