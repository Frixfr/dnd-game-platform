// client/src/api/client.ts
import axios from "axios";
import type { AxiosError } from "axios";
import { useRoomStore } from "../stores/roomStore";

// Базовый URL бэкенда — берём из переменной окружения или используем относительный путь
const baseURL = import.meta.env.VITE_API_URL || "/api";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Возвращает актуальный токен мастера.
 * Единственный источник истины — Zustand store (persist в localStorage
 * под ключом "room-store"). Раньше токен дублировался в отдельном
 * ключе "master-token", что приводило к рассинхрону при logout.
 */
export function getMasterToken(): string | null {
  return useRoomStore.getState().token;
}

/**
 * Полный выход из системы: очищает мастер-стор (токен исчезает и из
 * памяти, и из persist-хранилища) и перенаправляет на страницу входа.
 * Используется интерцепторами при 401, а также fetch-перехватчиком.
 */
export function handleUnauthorized(): void {
  useRoomStore.getState().logout();
  // Редирект только если мы не на публичных маршрутах (вход / карта)
  const path = window.location.pathname;
  if (path !== "/" && !path.startsWith("/map") && !path.startsWith("/player")) {
    window.location.assign("/");
  }
}

// Интерцептор для добавления токена в заголовок Authorization
apiClient.interceptors.request.use(
  (config) => {
    const token = getMasterToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Интерцептор для обработки ошибок 401 (неавторизован):
// токен невалиден/истёк — выходим из системы и перенаправляем на вход.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  },
);

export default apiClient;
