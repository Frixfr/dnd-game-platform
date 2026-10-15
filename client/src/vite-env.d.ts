// client/src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Базовый URL REST API (по умолчанию "/api" — через прокси Vite) */
  readonly VITE_API_URL?: string;
  /** Адрес бэкенда для dev-прокси Vite (используется в vite.config.ts) */
  readonly VITE_BACKEND_URL?: string;
  /** Необязательный абсолютный URL сокет-сервера */
  readonly VITE_SOCKET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
