import React, { useState } from "react";

export default function ManualAdd({ onAdd }) {
  const [text, setText] = useState("");

  return (
    <div className="mt-2 flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Thêm một mục..."
        className="flex-1 px-2 py-1 border rounded"
      />
      <button
        onClick={() => {
          if (!text.trim()) return;
          onAdd(text.trim());
          setText("");
        }}
        className="px-3 py-1 bg-blue-600 text-white rounded"
      >
        Thêm
      </button>
    </div>
  );
}
