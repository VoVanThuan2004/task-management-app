import React, { useState } from "react";
import axios from "axios";
import { X } from "lucide-react";
import ManualAdd from "./ManualAdd";

const httpUrl = import.meta.env.VITE_API_URL;

export default function AiChecklistModal({
  taskId,
  accessToken,
  onClose,
  onSaved,
  initialTitle = "",
  initialDescription = "",
  boardId,
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);

    // Gọi api lấy danh sách thành viên
    let fetchedMembers = [];
    try {
      const res = await axios.get(
        `${httpUrl}/api/v1/boards-member/${boardId}/AI`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      fetchedMembers = res.data.data; // ← Lưu vào biến local
    } catch (error) {
      console.log(error);
      setError("Không thể tải danh sách thành viên");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        // Send current task title/description so AI can base suggestion on it
        title: initialTitle || "",
        description: initialDescription || "",
        users: fetchedMembers,
        taskId,
      };

      console.log("Payload gửi AI:", payload);

      const res = await axios.post(
        `${httpUrl}/api/ai/generate-checklist`,
        payload,
        {
          timeout: 60000,
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      // Expect AI returns { title, items: [{ title, assignedTo, position, dueDate }] }
      const data = res.data || {};
      console.log("AI generate response:", data);

      // Title: prefer the current task title (initialTitle) so UI doesn't replace it unexpectedly.
      // If you want AI title instead, swap the order.
      setTitle(
        initialTitle || data.title || data.checklist_text || "Checklist đề xuất"
      );

      // Lấy danh sách các mục (string)
      const rawItems = data.checklist_items || [];
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        setError("AI không trả về mục nào.");
        setItems([]);
        return;
      }

      // Tạo map: item title → thông tin người được gán + skills
      const assignmentMap = new Map();
      if (Array.isArray(data.assignments)) {
        data.assignments.forEach((ass) => {
          if (ass.item && ass.assigned_to) {
            // Lấy skills từ danh sách users gốc (fetchedMembers)
            const user = fetchedMembers.find(
              (u) => u.id === ass.assigned_to.id
            );
            const skills = user?.skills || [];

            assignmentMap.set(ass.item.trim(), {
              name: ass.assigned_to.name,
              skills: skills, // array skills thực tế của user đó
            });
          }
        });
      }

      // Normalize items để hiển thị
      const normalized = rawItems.map((itemTitle, index) => {
        const title =
          typeof itemTitle === "string" ? itemTitle.trim() : "(Mục)";
        const assigned = assignmentMap.get(title);

        return {
          title,
          assignedName: assigned?.name || null,
          assignedSkills: assigned?.skills || [], // array string
          position: index,
        };
      });

      setItems(normalized);
    } catch (err) {
      console.error("AI generate error", err);
      setError("Không thể liên hệ AI service");
    } finally {
      setLoading(false);
    }
  };

  const addManualItem = (text) => {
    if (!text || !text.trim()) return;
    const newItem = { title: text.trim(), position: items ? items.length : 0 };
    setItems((prev) => (Array.isArray(prev) ? [...prev, newItem] : [newItem]));
    setError(null);
  };

  const save = async () => {
    if (!items) return;
    setLoading(true);
    setError(null);
    try {
      const payload = { taskId, title: title || "Checklist AI", items };
      const res = await axios.post(
        `${httpUrl}/api/ai/save-checklist`,
        payload,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (res.data && res.data.success) {
        // Backend returns created items under `items`.
        const created = res.data.items || [];
        // Notify parent so it can refresh check items list
        onSaved && onSaved(created);
        onClose();
      } else {
        setError("Lưu checklist thất bại");
      }
    } catch (err) {
      console.error("Save checklist error", err);
      setError("Lưu checklist thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Trắng sạch */}
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Gợi ý việc cần làm từ AI
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="Đóng"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Nút hành động */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={generate}
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang tạo...
                </>
              ) : (
                "Sinh việc cần làm"
              )}
            </button>

            <button
              onClick={() => {
                setItems(null);
                setTitle("");
                setError(null);
              }}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
            >
              Làm lại
            </button>
          </div>

          {/* Lỗi */}
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Nội dung chính */}
          {items ? (
            <div className="space-y-5">
              {/* Tiêu đề checklist */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiêu đề task
                </label>
                <input
                  type="text"
                  value={title}
                  // onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tiêu đề..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              {/* Danh sách công việc */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                  Các công việc đề xuất ({items.length})
                </h4>

                <div className="space-y-3">
                  {items.length === 0 ? (
                    <p className="text-center text-gray-500 py-6">
                      Chưa có mục nào. Hãy thử sinh lại hoặc thêm thủ công.
                    </p>
                  ) : (
                    items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                      >
                        <div className="font-medium text-gray-900 mb-2">
                          {idx + 1}. {item.title}
                        </div>

                        {item.assignedName ? (
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">
                              {item.assignedName}
                            </span>
                            {item.assignedSkills.length > 0 && (
                              <span className="inline-flex items-center px-3 py-1 text-xs text-gray-700 bg-gray-200 rounded-full">
                                {item.assignedSkills.join(", ")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            Chưa gán người thực hiện
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Thêm thủ công */}
              <div className="pt-2">
                <ManualAdd onAdd={addManualItem} />
              </div>
            </div>
          ) : (
            !loading && (
              <div className="text-center py-12 text-gray-500">
                <p className="mb-2 text-lg">Chưa có gợi ý nào</p>
                <p className="text-sm">
                  Nhấn "Sinh việc cần làm" để AI tạo danh sách công việc phù
                  hợp.
                </p>
              </div>
            )
          )}
        </div>

        {/* Footer - Chỉ hiện khi có items */}
        {items && (
          <div className="flex justify-end gap-3 p-5 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            >
              Từ chối
            </button>
            <button
              onClick={save}
              disabled={loading}
              className="px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
            >
              Chấp nhận & Lưu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
