// client/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useRoomStore } from './stores/roomStore';

// Инициализация мастер-стора: Zustand persist — единственный источник
// истины для токена. Вызываем до рендера, чтобы ProtectedRoute /
// LoginPage сразу видели восстановленную из хранилища сессию.
useRoomStore.getState().initialize();

// Глобальный перехватчик fetch для добавления токена авторизации.
// Токен берётся из roomStore (единственный источник истины), а не из
// отдельного ключа localStorage, который раньше рассинхронизировался.
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const [url, config] = args;
  if (typeof url === 'string' && url.startsWith('/api')) {
    const token = useRoomStore.getState().token;
    if (token) {
      const headers = new Headers(config?.headers);
      headers.set('Authorization', `Bearer ${token}`);
      const newConfig = { ...config, headers };
      const response = await originalFetch(url, newConfig);
      // 401 — сессия невалидна: выходим и перенаправляем на страницу входа
      if (response.status === 401) {
        import('./api/client').then(({ handleUnauthorized }) => {
          handleUnauthorized();
        });
      }
      return response;
    }
  }
  return originalFetch(...args);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);