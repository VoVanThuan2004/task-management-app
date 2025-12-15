import React, { useState } from "react";
import axios from "axios";
import { X } from "lucide-react";
import ManualAdd from "./ManualAdd";

const httpUrl = import.meta.env.VITE_API_URL;

export default function AiChecklistModal({ taskId, accessToken, onClose, onSaved, initialTitle = "", initialDescription = "" }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        // Send current task title/description so AI can base suggestion on it
        title: initialTitle || "",
        description: initialDescription || "",
        users: [],
        taskId,
      };

      const res = await axios.post(`${httpUrl}/api/ai/generate-checklist`, payload, {
        timeout: 60000,
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Expect AI returns { title, items: [{ title, assignedTo, position, dueDate }] }
      const data = res.data || {};
      console.log("AI generate response:", data);

      // Title: prefer the current task title (initialTitle) so UI doesn't replace it unexpectedly.
      // If you want AI title instead, swap the order.
      setTitle(initialTitle || data.title || data.checklist_text || "Checklist đề xuất");

      // Normalize items from possible response shapes: data.items, data.checklist_items, data.checklistItems
      const rawItems = data.items || data.checklist_items || data.checklistItems || [];

      // rawItems may be array of strings or array of objects
      const normalized = Array.isArray(rawItems)
        ? rawItems.map((it) => {
            if (!it) return null;
            if (typeof it === "string") return { title: it };
            if (typeof it === "object") {
              // if object has text field names
              return {
                title: it.title || it.text || it.name || it.checklist_text || "(Mục)",
                assignedTo: it.assignedTo || it.assignee || null,
                position: typeof it.position === "number" ? it.position : undefined,
                dueDate: it.dueDate || it.deadline || null,
              };
            }
            return null;
          }).filter(Boolean)
        : [];

      setItems(normalized);
      if (normalized.length === 0) {
        setError("AI không trả về mục nào. Bạn có thể thêm mục thủ công bên dưới.");
      }
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
      const res = await axios.post(`${httpUrl}/api/ai/save-checklist`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg w-96 max-h-[80vh] overflow-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Gợi ý checklist (AI)</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-3">
          <div className="flex gap-2">
            <button
              onClick={generate}
              className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
              disabled={loading}
            >
              Sinh checklist
            </button>
            <button
              onClick={() => { setItems(null); setTitle(""); setError(null); }}
              className="px-3 py-1 bg-gray-100 rounded"
            >
              Làm lại
            </button>
          </div>
        </div>

        {loading && <div className="py-6 text-center">Đang xử lý...</div>}

        {error && <div className="text-red-600 mb-2">{error}</div>}

        {items && (
          <div>
            <div className="mb-2 text-sm text-gray-600">Tiêu đề</div>
            <input value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full px-2 py-1 border rounded mb-3" />

            <div className="space-y-2">
              {items.length === 0 && (
                <div className="p-2 text-sm text-gray-600 italic">AI không tạo được mục nào.</div>
              )}

              {items.map((it, idx) => (
                <div key={idx} className="p-2 border rounded">
                  <div className="text-sm font-medium">{it.title}</div>
                  <div className="text-xs text-gray-500">{it.assignedTo ? `Đề xuất: ${it.assignedTo}` : "Chưa gán"}</div>
                </div>
              ))}

              {/* Manual add */}
              <ManualAdd onAdd={addManualItem} />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onClose} className="px-3 py-1 rounded border">Từ chối</button>
              <button onClick={save} className="px-3 py-1 bg-green-600 text-white rounded" disabled={loading}>Chấp nhận & Lưu</button>
            </div>
          </div>
        )}

        {!items && !loading && (
          <div className="text-sm text-gray-600">Nhấn "Sinh checklist" để lấy đề xuất từ AI.</div>
        )}
      </div>
    </div>
  );
}
