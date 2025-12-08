const actionMessage = Object.freeze({
  TASK_CREATE: "đã tạo task",
  TASK_UPDATE_TITLE: "đã đổi tiêu đề task thành",
  TASK_UPDATE_DESCRIPTION: "đã cập nhật mô tả",
  TASK_COMPLETE: "đã hoàn thành task này",
  TASK_UNCOMPLETE: "đã bỏ hoàn thành task này",
  TASK_MOVE: "đã di chuyển task sang",

  // Checklist
  CHECKITEM_CREATE: "đã thêm mục việc cần làm",
  CHECKITEM_COMPLETE: "đã hoàn thành mục",
  CHECKITEM_UNCOMPLETE: "đã bỏ hoàn thành mục",
  CHECKITEM_DELETE: "đã xóa mục việc cần làm",
  CHECKITEM_UPDATE_TITLE: "đã sửa tiêu đề mục việc cần làm",

  // Attachment
  ATTACHMENT_UPLOAD: "đã tải lên tệp",
  ATTACHMENT_DELETE: "đã xóa tệp đính kèm",

  // Member
  MEMBER_ASSIGN: "đã gán thành viên",
  MEMBER_UNASSIGN: "đã bỏ gán thành viên",

  // Label
  LABEL_ADD: "đã thêm nhãn",
  LABEL_REMOVE: "đã xóa nhãn",

  // Deadline
  DEADLINE_SET: "đã đặt hạn hoàn thành",
  DEADLINE_REMOVE: "đã xóa hạn hoàn thành",
});

module.exports = actionMessage;