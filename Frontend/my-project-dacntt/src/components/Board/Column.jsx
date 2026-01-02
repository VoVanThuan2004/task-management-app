// src/components/board/Column.jsx
import React from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import AddTaskForm from "./AddTaskForm";
import iconDelete from "../../images/icon_delete.png";

const Column = React.memo(
  ({
    column,
    index,
    isEditing,
    editTitle,
    onStartEdit,
    onEditTitle,
    onUpdateColumn,
    onDeleteColumn,
    newTaskTitle,
    onNewTaskChange,
    onAddTask,
    onToggleTaskComplete,
    onTaskClick,
    isMember = false,
    loading,
    onDeleteTask,
  }) => {
    const isReadOnly = !isMember;

    return (
      <Draggable
        draggableId={column._id}
        index={index}
        isDragDisabled={isReadOnly}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className="flex-shrink-0 w-72"
          >
            <div
              className={`bg-gray-100 rounded-xl shadow-md ${
                snapshot.isDragging ? "opacity-70" : ""
              }`}
            >
              {/* Header - chỉ phần này mới kéo được */}
              <div
                // Chỉ cho kéo nếu là member
                {...(isReadOnly ? {} : provided.dragHandleProps)}
                className={`px-4 pt-4 flex items-center justify-between group ${
                  isReadOnly
                    ? "cursor-default"
                    : "cursor-grab active:cursor-grabbing"
                }`}
              >
                {isEditing ? (
                  <textarea
                    value={editTitle}
                    onChange={(e) => onEditTitle(e.target.value)}
                    onBlur={onUpdateColumn} // Click ra ngoài → lưu
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault(); // Tránh xuống dòng
                        onUpdateColumn();
                      }
                      if (e.key === "Escape") {
                        onStartEdit(null); // Hủy edit, khôi phục giá trị cũ
                      }
                    }}
                    className="w-full min-h-8 px-3 py-1.5 text-sm font-semibold bg-white rounded-lg border-2 border-blue-500 shadow-sm resize-none focus:outline-none"
                    autoFocus
                    rows={1}
                    disabled={isReadOnly}
                  />
                ) : (
                  <>
                    <h3
                      className={`font-semibold text-gray-800 flex-1 pr-3 ${
                        isReadOnly ? "" : "cursor-pointer hover:text-gray-600"
                      }`}
                      onClick={() =>
                        !isReadOnly && onStartEdit(column._id, column.title)
                      }
                    >
                      {column.title}
                    </h3>
                    {!isReadOnly && (
                      <button
                        onClick={() => onDeleteColumn(column._id, column.title)}
                        className="p-2 rounded-lg transition-all hover:bg-red-100"
                        title="Xóa danh sách"
                      >
                        {/* <Trash2
                          size={16}
                          className="text-red-500 hover:text-red-600"
                        /> */}
                        <img src={iconDelete} alt="cancel"/>
                        
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Task List */}
              <Droppable droppableId={column._id} type="TASK">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[100px] p-3 pt-1 transition-colors ${
                      snapshot.isDraggingOver
                        ? "bg-blue-50/70 rounded-b-xl"
                        : ""
                    }`}
                  >
                    {column.tasks?.map((task, idx) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        index={idx}
                        onClick={onTaskClick}
                        onToggleComplete={onToggleTaskComplete}
                        onDeleteTask={onDeleteTask}
                        isReadOnly={isReadOnly}
                        isMember={isMember}
                      />
                    ))}
                    {provided.placeholder}

                    {/* Giữ chiều cao khi list rỗng + đang drag vào */}
                    {column.tasks?.length === 0 && snapshot.isDraggingOver && (
                      <div className="h-32 border-2 border-dashed border-blue-300 rounded-lg" />
                    )}
                  </div>
                )}
              </Droppable>

              {/* Add Task */}
              <div className="px-3 pb-3">
                {!isReadOnly ? (
                  <AddTaskForm
                    columnId={column._id}
                    value={newTaskTitle || ""}
                    onChange={onNewTaskChange}
                    onAdd={() => onAddTask(column._id, newTaskTitle)}
                    loading={loading}
                  />
                ) : (
                  <div className="py-2 text-center text-gray-500 text-sm italic">
                    Chỉ xem • Không thể thêm thẻ
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  }
);

export default Column;
