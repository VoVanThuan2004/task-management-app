import {
  Pencil,
  FileText,
  CheckCircle2,
  CircleDashed,
  ArrowRightLeft,
  PlusCircle,
  Trash2,
  Upload,
  UserPlus,
  UserMinus,
  Tag,
  CalendarPlus,
  CalendarMinus,
} from "lucide-react";

export const ActionConfig = {
  // Task
  TASK_CREATE: {
    label: "Tạo task",
    color: "bg-green-50 border-green-200",
    icon: <PlusCircle size={16} className="text-green-600" />,
  },
  TASK_UPDATE_TITLE: {
    label: "Đổi tiêu đề",
    color: "bg-blue-50 border-blue-200",
    icon: <Pencil size={16} className="text-blue-600" />,
  },
  TASK_UPDATE_DESCRIPTION: {
    label: "Cập nhật mô tả",
    color: "bg-purple-50 border-purple-200",
    icon: <FileText size={16} className="text-purple-600" />,
  },
  TASK_COMPLETE: {
    label: "Hoàn thành task",
    color: "bg-green-50 border-green-200",
    icon: <CheckCircle2 size={16} className="text-green-600" />,
  },
  TASK_UNCOMPLETE: {
    label: "Bỏ hoàn thành task",
    color: "bg-gray-50 border-gray-300",
    icon: <CircleDashed size={16} className="text-gray-600" />,
  },
  TASK_MOVE: {
    label: "Di chuyển task",
    color: "bg-orange-50 border-orange-200",
    icon: <ArrowRightLeft size={16} className="text-orange-600" />,
  },

  // Checklist
  CHECKITEM_CREATE: {
    label: "Thêm mục việc cần làm",
    color: "bg-cyan-50 border-cyan-200",
    icon: <PlusCircle size={16} className="text-cyan-600" />,
  },
  CHECKITEM_COMPLETE: {
    label: "Hoàn thành mục checklist",
    color: "bg-green-50 border-green-200",
    icon: <CheckCircle2 size={16} className="text-green-600" />,
  },
  CHECKITEM_UNCOMPLETE: {
    label: "Bỏ hoàn thành mục",
    color: "bg-gray-50 border-gray-300",
    icon: <CircleDashed size={16} className="text-gray-600" />,
  },
  CHECKITEM_DELETE: {
    label: "Xóa mục checklist",
    color: "bg-red-50 border-red-200",
    icon: <Trash2 size={16} className="text-red-600" />,
  },
  CHECKITEM_UPDATE_TITLE: {
    label: "Sửa tiêu đề mục checklist",
    color: "bg-blue-50 border-blue-200",
    icon: <Pencil size={16} className="text-blue-600" />,
  },

  // Attachment
  ATTACHMENT_UPLOAD: {
    label: "Tải lên tệp",
    color: "bg-indigo-50 border-indigo-200",
    icon: <Upload size={16} className="text-indigo-600" />,
  },
  ATTACHMENT_DELETE: {
    label: "Xóa tệp đính kèm",
    color: "bg-red-50 border-red-200",
    icon: <Trash2 size={16} className="text-red-600" />,
  },

  // Member
  MEMBER_ASSIGN: {
    label: "Gán thành viên",
    color: "bg-green-50 border-green-200",
    icon: <UserPlus size={16} className="text-green-600" />,
  },
  MEMBER_UNASSIGN: {
    label: "Bỏ gán thành viên",
    color: "bg-gray-50 border-gray-300",
    icon: <UserMinus size={16} className="text-gray-600" />,
  },

  // Label
  LABEL_ADD: {
    label: "Thêm nhãn",
    color: "bg-yellow-50 border-yellow-200",
    icon: <Tag size={16} className="text-yellow-600" />,
  },
  LABEL_REMOVE: {
    label: "Xóa nhãn",
    color: "bg-red-50 border-red-200",
    icon: <Tag size={16} className="text-red-600" />,
  },

  // Deadline
  DEADLINE_SET: {
    label: "Đặt hạn hoàn thành",
    color: "bg-blue-50 border-blue-200",
    icon: <CalendarPlus size={16} className="text-blue-600" />,
  },
  DEADLINE_REMOVE: {
    label: "Xóa hạn hoàn thành",
    color: "bg-gray-50 border-gray-300",
    icon: <CalendarMinus size={16} className="text-gray-600" />,
  },
};
