// client/src/api/client.ts
import axios from "axios";

// Базовый URL бэкенда — берём из переменной окружения или используем относительный путь
const baseURL = import.meta.env.VITE_API_URL || "/api";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Интерцептор для добавления токена в заголовок Authorization
apiClient.interceptors.request.use(
  (config) => {
    // Токен храним в localStorage под ключом 'master-token'
    const token = localStorage.getItem("master-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Интерцептор для обработки ошибок 401 (неавторизован) — можно очистить токен и перенаправить на логин
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Если токен невалиден, удаляем его и можно перенаправить на страницу входа
      localStorage.removeItem("master-token");
      // Редирект лучше делать в компонентах через navigate, но здесь просто выбрасываем ошибку
      // Можно также диспатчить событие, но пока оставим так
    }
    return Promise.reject(error);
  },
);

export default apiClient;
