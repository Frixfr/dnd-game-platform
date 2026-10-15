// client/src/lib/config.ts
// Единая точка чтения конфигурации окружения клиента.

/**
 * Базовый URL REST API. По умолчанию относительный "/api" — запросы идут
 * через dev-прокси Vite на бэкенд (адрес которого задаётся в .env как
 * VITE_BACKEND_URL). Это исключает конфликт между axios.baseURL и прокси:
 * абсолютный VITE_API_URL имеет смысл задавать только при работе без прокси.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

/**
 * URL сокет-сервера. undefined = тот же origin, что у страницы
 * (соединение проходит через прокси Vite, жёсткие IP не нужны).
 */
export const SOCKET_URL: string | undefined =
  import.meta.env.VITE_SOCKET_URL || undefined;
