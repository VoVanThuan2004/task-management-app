import { precacheAndRoute } from "workbox-precaching";

// Precache the assets injected by vite-plugin-pwa during the production build.
precacheAndRoute(self.__WB_MANIFEST);
