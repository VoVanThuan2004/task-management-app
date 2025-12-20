import DatePicker from "react-datepicker";
import { motion as Motion } from "framer-motion";
import { Calendar, Bell, X, Trash2 } from "lucide-react";

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
  onRemoveDates,
}) => {
  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="absolute top-full left-0 mt-2 w-85 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h4 className="text-lg font-semibold text-gray-900">Ngày giờ</h4>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 space-y-7">
        {/* Bắt đầu */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            Bắt đầu
          </label>
          <div className="flex gap-4 items-center">
            {/* Chọn ngày */}
            <div className="flex-1">
              <DatePicker
                selected={startDate}
                onChange={(date) => {
                  if (!date) return onStartDateChange(null);
                  const newDate = startDate ? new Date(startDate) : new Date();
                  newDate.setFullYear(date.getFullYear());
                  newDate.setMonth(date.getMonth());
                  newDate.setDate(date.getDate());
                  onStartDateChange(newDate);
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText="Chọn ngày bắt đầu"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-center font-medium"
                popperPlacement="bottom-start"
                popperClassName="z-[60]"
                wrapperClassName="w-full"
              />
            </div>

            {/* Giờ phút - dùng type="time" chuẩn HTML5 */}
            <input
              type="time"
              value={startDate ? startDate.toTimeString().slice(0, 5) : ""}
              onChange={(e) => {
                if (!startDate) return;
                const [hours, minutes] = e.target.value.split(":");
                if (hours === undefined || minutes === undefined) return;
                const newDate = new Date(startDate);
                newDate.setHours(parseInt(hours, 10));
                newDate.setMinutes(parseInt(minutes, 10));
                onStartDateChange(newDate);
              }}
              className="w-36 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-center font-medium"
              placeholder="HH:mm"
            />
          </div>
        </div>

        {/* Kết thúc */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            Kết thúc
          </label>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <DatePicker
                selected={dueDate}
                onChange={(date) => {
                  if (!date) return onDueDateChange(null);
                  const newDate = dueDate ? new Date(dueDate) : new Date();
                  newDate.setFullYear(date.getFullYear());
                  newDate.setMonth(date.getMonth());
                  newDate.setDate(date.getDate());
                  onDueDateChange(newDate);
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText="Chọn ngày kết thúc"
                minDate={startDate || new Date()}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-center font-medium"
                popperPlacement="bottom-start"
                popperClassName="z-[60]"
                wrapperClassName="w-full"
              />
            </div>

            <input
              type="time"
              value={dueDate ? dueDate.toTimeString().slice(0, 5) : ""}
              onChange={(e) => {
                if (!dueDate) return;
                const [hours, minutes] = e.target.value.split(":");
                if (hours === undefined || minutes === undefined) return;
                const newDate = new Date(dueDate);
                newDate.setHours(parseInt(hours, 10));
                newDate.setMinutes(parseInt(minutes, 10));
                onDueDateChange(newDate);
              }}
              className="w-36 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-center font-medium"
              placeholder="HH:mm"
            />
          </div>
        </div>

        {/* Nhắc nhở */}
        <div className="flex items-center justify-between pt-5 border-t border-gray-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Nhắc nhở</span>
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={onReminderToggle}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>

          {reminderEnabled && (
            <select
              value={reminderMinutes}
              onChange={onReminderMinutesChange}
              className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value={0}>Vào lúc bắt đầu</option>
              <option value={5}>5 phút trước</option>
              <option value={10}>10 phút trước</option>
              <option value={15}>15 phút trước</option>
              <option value={30}>30 phút trước</option>
              <option value={60}>1 giờ trước</option>
              <option value={120}>2 giờ trước</option>
              <option value={1440}>1 ngày trước</option>
              <option value={2880}>2 ngày trước</option>
              <option value={10080}>1 tuần trước</option>
            </select>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={onRemoveDates}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Xóa thời gian
        </button>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            Lưu
          </button>
        </div>
      </div>
    </Motion.div>
  );
};

export default TaskDatePickerPopup;
