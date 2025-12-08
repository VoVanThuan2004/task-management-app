import React, { memo } from "react";
import { Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";

const TaskList = memo(
  ({ col, onTaskClick, onToggleComplete, getDueDateStatus }) => {
    return (
      <Droppable droppableId={col._id} type="TASK">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[100px] rounded-lg overflow-y-auto transition-colors duration-150 ${
              snapshot.isDraggingOver ? "bg-blue-50/50" : "bg-transparent"
            }`}
            style={{
              willChange: snapshot.isDraggingOver ? "background-color" : "auto",
            }}
          >
            {(col.tasks || []).map((task, index) => (
              <TaskCard
                key={task._id}
                task={task}
                index={index}
                columnId={col._id}
                onTaskClick={onTaskClick}
                onToggleComplete={onToggleComplete}
                getDueDateStatus={getDueDateStatus}
              />
            ))}
            {provided.placeholder}

            {(col.tasks || []).length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm italic">
                (Chưa có thẻ nào)
              </div>
            )}
          </div>
        )}
      </Droppable>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.col._id === nextProps.col._id &&
      prevProps.col.tasks?.length === nextProps.col.tasks?.length &&
      (prevProps.col.tasks || []).every(
        (task, idx) =>
          task._id === (nextProps.col.tasks?.[idx]?._id)
      )
    );
  }
);

TaskList.displayName = "TaskList";

export default TaskList;