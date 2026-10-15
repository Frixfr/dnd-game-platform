import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Адрес бэкенда вынесен в .env (VITE_BACKEND_URL) — больше никаких
// жёстко зашитых IP: приложение запускается на любой машине.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.VITE_BACKEND_URL || "http://localhost:5000";

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 3000,
      // Прокси /api, /uploads и /socket.io на бэкенд. Клиент использует
      // только относительные пути ("/api", "/uploads"), поэтому конфликт
      // между axios.baseURL и прокси исключён: если задан абсолютный
      // VITE_API_URL, запросы идут мимо прокси напрямую на бэкенд.
      proxy: {
        "/api": {
          target: backend,
          changeOrigin: true,
        },
        "/uploads": {
          target: backend,
          changeOrigin: true,
        },
        "/socket.io": {
          target: backend,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
