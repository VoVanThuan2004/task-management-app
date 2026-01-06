import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc"; // Giữ nguyên plugin bạn đang dùng
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      manifest: {
        name: "Hệ thống Quản lý Công việc",
        short_name: "QuanLyCV",
        description: "Ứng dụng quản lý công việc, nhiệm vụ hàng ngày",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait-primary",
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000, // Giữ nguyên port 3000 như config cũ của bạn
    host: true, // (Tùy chọn) Cho phép truy cập từ mạng nội bộ (dùng khi test trên mobile cùng wifi)
  },
});
