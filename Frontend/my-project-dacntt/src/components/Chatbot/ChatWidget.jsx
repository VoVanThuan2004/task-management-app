import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import axios from 'axios';
// import { API_ROOT } from '../../utils/constants'; // Removed unused import

// Inline Styles for Glassmorphism & Animation
const styles = {
    container: {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        fontFamily: "'Inter', sans-serif",
    },
    fab: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        color: '#fff',
    },
    chatWindow: {
        width: '350px',
        height: '500px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'absolute',
        bottom: '80px',
        right: '0',
        animation: 'fadeIn 0.3s ease-out',
    },
    header: {
        padding: '15px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: '600',
    },
    messagesArea: {
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        scrollBehavior: 'smooth',
    },
    inputArea: {
        padding: '15px',
        background: 'rgba(255,255,255,0.5)',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        gap: '10px',
    },
    input: {
        flex: 1,
        padding: '10px 15px',
        borderRadius: '20px',
        border: '1px solid #ddd',
        outline: 'none',
        fontSize: '14px',
        background: '#fff',
    },
    bubble: {
        maxWidth: '80%',
        padding: '10px 15px',
        borderRadius: '15px',
        fontSize: '14px',
        lineHeight: '1.4',
        position: 'relative',
        wordWrap: 'break-word',
    },
    botBubble: {
        background: '#f0f2f5',
        color: '#333',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: '2px',
    },
    userBubble: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        alignSelf: 'flex-end',
        borderBottomRightRadius: '2px',
    },
};

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);

    // Load chat history from localStorage
    const loadChatHistory = () => {
        try {
            const saved = localStorage.getItem('chatHistory');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load chat history:', e);
        }
        return [{ role: 'bot', text: 'Xin chào! Mình là trợ lý ảo AI. Mình có thể giúp gì cho bạn? (Tạo task, xem deadline...)' }];
    };

    const [messages, setMessages] = useState(loadChatHistory);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lastUserId, setLastUserId] = useState(localStorage.getItem('userId'));

    const messagesEndRef = useRef(null);

    // Get boardId from URL if exists
    const params = useParams(); // May not work if ChatWidget is outside Routes based on context
    // Use useLocation to parse manually if needed
    const location = useLocation();

    const getBoardId = () => {
        // Regex parse /boards/:boardId
        const match = location.pathname.match(/\/boards\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Check auth/user state on open
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        const userId = localStorage.getItem('userId');

        if (!token) {
            setMessages([{ role: 'bot', text: 'Xin chào! Mình là trợ lý ảo AI. Vui lòng đăng nhập để sử dụng tính năng này.' }]);
            localStorage.removeItem('chatHistory');
            setLastUserId(null);
        } else if (userId !== lastUserId) {
            // User changed -> Reset chat
            const initialMsg = [{ role: 'bot', text: 'Xin chào! Mình là trợ lý ảo AI. Mình có thể giúp gì cho bạn? (Tạo task, xem deadline...)' }];
            setMessages(initialMsg);
            localStorage.setItem('chatHistory', JSON.stringify(initialMsg));
            setLastUserId(userId);
        }
    }, [isOpen]);

    // Save messages to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem('chatHistory', JSON.stringify(messages));
        } catch (e) {
            console.error('Failed to save chat history:', e);
        }
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMsg = inputText;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInputText('');
        setIsLoading(true);

        try {
            const boardId = getBoardId();
            // Adjust API endpoint based on your config
            // Assuming API_ROOT is defined or use Env variable
            const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/ai/chat`;

            // Retrieve token from localStorage
            const token = localStorage.getItem('accessToken');

            const res = await axios.post(apiUrl, {
                message: userMsg,
                boardId
            }, {
                headers: { Authorization: `Bearer ${token}` } // Send Auth
            });

            const reply = res.data.data.reply_text;
            setMessages(prev => [...prev, { role: 'bot', text: reply }]);

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'bot', text: 'Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSend();
    };

    return (
        <div style={styles.container}>
            {/* Chat Window */}
            {isOpen && (
                <div style={styles.chatWindow}>
                    <div style={styles.header}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Bot size={20} /> AI Assistant
                        </div>
                        <X size={20} style={{ cursor: 'pointer' }} onClick={() => setIsOpen(false)} />
                    </div>

                    <div style={styles.messagesArea}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                ...styles.bubble,
                                ...(msg.role === 'bot' ? styles.botBubble : styles.userBubble)
                            }}>
                                {msg.text}
                            </div>
                        ))}
                        {isLoading && (
                            <div style={{ ...styles.bubble, ...styles.botBubble, fontStyle: 'italic', color: '#888' }}>
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
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#667eea', display: 'flex', alignItems: 'center'
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
                    transform: isOpen ? 'scale(0)' : 'scale(1)'
                }}
                onClick={() => setIsOpen(true)}
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
        </div>
    );
};

export default ChatWidget;
