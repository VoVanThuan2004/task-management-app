import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Đăng ký Push Notification ngay khi app khởi động
async function registerPush() {
  // Kiểm tra browser có hỗ trợ Service Worker và Push API không
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("Push notification không được hỗ trợ trên trình duyệt này.");
    return;
  }

  try {
    // Đợi service worker sẵn sàng (do vite-plugin-pwa tự tạo)
    const registration = await navigator.serviceWorker.ready;

    // Lấy public key từ .env frontend (bạn đã tạo ở bước trước)
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
      console.error("VITE_VAPID_PUBLIC_KEY chưa được thiết lập trong .env");
      return;
    }

    // Đăng ký subscription với Push service của browser
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, 
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // Gửi subscription lên backend để lưu
    const httpUrl = import.meta.env.VITE_API_URL
    const response = await fetch(`${httpUrl}/api/subscribe`, {
      method: "POST",
      body: JSON.stringify(subscription),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      console.log("Đăng ký Push Notification thành công!");
    } else {
      console.error("Lỗi khi gửi subscription lên server:", response.status);
    }
  } catch (error) {
    // Các lỗi thường gặp:
    // - Người dùng chặn thông báo
    // - Không có HTTPS (ngrok sẽ giải quyết)
    // - Service worker chưa active
    console.error("Đăng ký Push Notification thất bại:", error);
  }
}

// Gọi hàm đăng ký ngay khi trang load
registerPush();

// Render app như cũ
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);