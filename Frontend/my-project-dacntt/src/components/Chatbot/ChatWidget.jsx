import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  CreditCard,
  Crown,
  Check,
} from "lucide-react";
import axios from "axios";
import { AnimatePresence, motion as Motion } from "framer-motion";
import toast from "react-hot-toast";

// Inline Styles for Glassmorphism & Animation
const styles = {
  container: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: 9999,
    fontFamily: "'Inter', sans-serif",
  },
  fab: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    color: "#fff",
  },
  chatWindow: {
    width: "350px",
    height: "500px",
    background: "rgba(255, 255, 255, 0.85)",
    backdropFilter: "blur(12px)",
    borderRadius: "20px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    position: "absolute",
    bottom: "80px",
    right: "0",
    animation: "fadeIn 0.3s ease-out",
  },
  header: {
    padding: "15px 20px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: "600",
  },
  messagesArea: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    scrollBehavior: "smooth",
  },
  inputArea: {
    padding: "15px",
    background: "rgba(255,255,255,0.5)",
    borderTop: "1px solid rgba(0,0,0,0.05)",
    display: "flex",
    gap: "10px",
  },
  input: {
    flex: 1,
    padding: "10px 15px",
    borderRadius: "20px",
    border: "1px solid #ddd",
    outline: "none",
    fontSize: "14px",
    background: "#fff",
  },
  bubble: {
    maxWidth: "80%",
    padding: "10px 15px",
    borderRadius: "15px",
    fontSize: "14px",
    lineHeight: "1.4",
    position: "relative",
    wordWrap: "break-word",
  },
  botBubble: {
    background: "#f0f2f5",
    color: "#333",
    alignSelf: "flex-start",
    borderBottomLeftRadius: "2px",
  },
  userBubble: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    alignSelf: "flex-end",
    borderBottomRightRadius: "2px",
  },
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const httpUrl = import.meta.env.VITE_API_URL;

  // State mua gói vip
  const [showVipModal, setShowVipModal] = useState(false);
  const [vipModalData, setVipModalData] = useState({
    message: "",
    title: "Nâng cấp lên gói VIP",
  });
  const [loadingPayment, setLoadingPayment] = useState(false);

  // Load chat history from localStorage
  const loadChatHistory = () => {
    try {
      const saved = localStorage.getItem("chatHistory");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
    return [
      {
        role: "bot",
        text: "Xin chào! Mình là trợ lý ảo AI. Mình có thể giúp gì cho bạn? (Tạo task, xem deadline...)",
      },
    ];
  };

  const [messages, setMessages] = useState(loadChatHistory);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserId, setLastUserId] = useState(localStorage.getItem("userId"));
  const messagesEndRef = useRef(null);

  // Use useLocation to parse manually if needed
  const location = useLocation();
  const getBoardId = () => {
    // Regex parse /boards/:boardId
    const match = location.pathname.match(/\/boards\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Check auth/user state on open
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");

    if (!token) {
      setMessages([
        {
          role: "bot",
          text: "Xin chào! Mình là trợ lý ảo AI. Vui lòng đăng nhập để sử dụng tính năng này.",
        },
      ]);
      localStorage.removeItem("chatHistory");
      setLastUserId(null);
    } else if (userId !== lastUserId) {
      // User changed -> Reset chat
      const initialMsg = [
        {
          role: "bot",
          text: "Xin chào! Mình là trợ lý ảo AI. Mình có thể giúp gì cho bạn? (Tạo task, xem deadline...)",
        },
      ];
      setMessages(initialMsg);
      localStorage.setItem("chatHistory", JSON.stringify(initialMsg));
      setLastUserId(userId);
    }
  }, [isOpen]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("chatHistory", JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save chat history:", e);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg = inputText;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInputText("");
    setIsLoading(true);

    try {
      const boardId = getBoardId();
      // Adjust API endpoint based on your config
      // Assuming API_ROOT is defined or use Env variable
      const apiUrl = `${
        import.meta.env.VITE_API_URL || "http://localhost:8080"
      }/api/ai/chat`;

      // Retrieve token from localStorage
      const token = localStorage.getItem("accessToken");

      const res = await axios.post(
        apiUrl,
        {
          message: userMsg,
          boardId,
        },
        {
          headers: { Authorization: `Bearer ${token}` }, // Send Auth
        }
      );

      const reply = res.data.data.reply_text;
      setMessages((prev) => [...prev, { role: "bot", text: reply }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  // Hàm mở chat bot - check xem tài khoản có vip không
  const openChatBotAI = async () => {
    if (localStorage.getItem("accessToken")) {
      try {
        const res = await axios.get(`${httpUrl}/api/v1/users/vip`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });

        if (res.data.data.isVip === true) {
          setIsOpen(true);
        }

        if (res.data.data.isVip === false) {
          // Hiển thị modal popup thanh toán gói vip
          setVipModalData({
            message:
              "Bạn đã đạt giới hạn sử dụng các tính năng nâng cao AI miễn phí.",
            title: "Đạt giới hạn sử dụng tính năng miễn phí",
          });
          setShowVipModal(true);
        }
      } catch (error) {
        console.log(error);
      }
    } else {
      setIsOpen(true);
    }
  };

  // API thanh toán vnpay
  const handleUpgradeVip = async () => {
    setLoadingPayment(true);
    try {
      const res = await axios.post(
        `${httpUrl}/api/v1/payment/vip`,
        { amount: 100000 },
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );

      if (res.data.data) {
        window.location.href = res.data.data;
      }
    } catch (err) {
      console.log(err);
      toast.error("Không thể tạo link thanh toán. Vui lòng thử lại.");
      setLoadingPayment(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Chat Window */}
      {isOpen && (
        <div style={styles.chatWindow}>
          <div style={styles.header}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bot size={20} /> AI Assistant
            </div>
            <X
              size={20}
              style={{ cursor: "pointer" }}
              onClick={() => setIsOpen(false)}
            />
          </div>

          <div style={styles.messagesArea}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.bubble,
                  ...(msg.role === "bot"
                    ? styles.botBubble
                    : styles.userBubble),
                }}
              >
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div
                style={{
                  ...styles.bubble,
                  ...styles.botBubble,
                  fontStyle: "italic",
                  color: "#888",
                }}
              >
                Đang nhập...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputArea}>
            <input
              style={styles.input}
              placeholder="Nhập yêu cầu..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              onClick={handleSend}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#667eea",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <div
        style={{
          ...styles.fab,
          transform: isOpen ? "scale(0)" : "scale(1)",
        }}
        onClick={() => openChatBotAI()}
      >
        <MessageSquare size={28} />
      </div>

      {/* Keyframes for animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Modal Nâng cấp VIP */}
      <AnimatePresence>
        {showVipModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowVipModal(false)}
          >
            <Motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header đẹp */}
              <div className="bg-orange-400 text-white p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold">{vipModalData.title}</h2>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                <div className="text-center text-gray-600">
                  <p className="text-lg leading-relaxed">
                    {vipModalData.message}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
                  <div className="text-center">
                    <p className="text-md text-amber-600 font-medium uppercase tracking-wide mb-2">
                      Gói VIP - Chỉ
                    </p>
                    <p className="text-4xl font-bold text-amber-700">
                      100.000{" "}
                      <span className="text-lg font-normal">VND/ tháng</span>
                    </p>
                    {/* <p className="text-sm text-amber-600 mt-1">/ month</p> */}
                  </div>

                  <ul className="mt-5 space-y-3 text-sm text-gray-700">
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      Tạo không giới hạn số lượng bảng làm việc
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      Mỗi bảng không giới hạn thẻ (task)
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      Sử dụng AI gợi ý việc cần làm thông minh
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      Ưu tiên hỗ trợ & cập nhật tính năng mới
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowVipModal(false)}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => handleUpgradeVip()}
                    disabled={loadingPayment}
                    className="flex-1 py-3 bg-orange-400 text-white rounded-xl hover:bg-orange-500 transition font-medium shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    <CreditCard size={18} />
                    Thanh toán ngay
                  </button>
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatWidget;
