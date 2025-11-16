import React from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { XIcon, Clock, Bell } from "lucide-react";

const TaskDatePickerPopup = ({
  startDate,
  dueDate,
  onStartDateChange,
  onDueDateChange,
  reminderEnabled,
  onReminderToggle,
  reminderMinutes,
  onReminderMinutesChange,
  onClose,
  onSave,
}) => {
  const handleDateChange = (dateArr, currentDate, setDate) => {
    const newDate = dateArr[0];
    if (!currentDate) {
      setDate(newDate);
    } else {
      const updated = new Date(newDate);
      updated.setHours(currentDate.getHours());
      updated.setMinutes(currentDate.getMinutes());
      setDate(updated);
    }
  };

  const handleTimeChange = (timeArr, currentDate, setDate) => {
    if (!currentDate) return;
    const newTime = timeArr[0];
    const updated = new Date(currentDate);
    updated.setHours(newTime.getHours());
    updated.setMinutes(newTime.getMinutes());
    setDate(updated);
  };

  const renderDateTimePicker = (label, date, onDateChange) => (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
        <Clock className="w-4 h-4 text-blue-600" />
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <Flatpickr
          value={date}
          onChange={(arr) => handleDateChange(arr, date, onDateChange)}
          options={{ dateFormat: "d/m/Y" }}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Chọn ngày"
        />
        <Flatpickr
          value={date}
          onChange={(arr) => handleTimeChange(arr, date, onDateChange)}
          options={{
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            time_24hr: true,
          }}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Chọn giờ"
        />
      </div>
    </div>
  );

  return (
    <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-300 z-50">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h4 className="font-semibold text-gray-700 text-sm">Thời gian</h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 border-b border-gray-200">
        {/* Start Date */}
        {renderDateTimePicker("Bắt đầu", startDate, onStartDateChange)}
        {/* Due Date */}
        {renderDateTimePicker("Kết thúc", dueDate, onDueDateChange)}

        {/* Reminder Section (cho dueDate) */}
        <div className="flex items-center gap-3 mt-3">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <Bell className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={onReminderToggle}
                className="mr-1"
              />
              Nhắc nhở
            </label>
            {reminderEnabled && (
              <select
                value={reminderMinutes}
                onChange={onReminderMinutesChange}
                className="border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value={5}>5 phút trước</option>
                <option value={10}>10 phút trước</option>
                <option value={15}>15 phút trước</option>
                <option value={30}>30 phút trước</option>
                <option value={60}>1 giờ trước</option>
                <option value={1440}>1 ngày trước</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 flex justify-between items-center">
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-800 text-sm font-medium px-3 py-1.5 rounded transition-colors"
        >
          Hủy
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onStartDateChange(null);
              onDueDateChange(null);
              onReminderToggle({ target: { checked: false } });
            }}
            className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1.5 rounded transition-colors"
          >
            Xóa
          </button>
          <button
            onClick={onSave}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDatePickerPopup;
