// client/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Глобальный перехватчик fetch для добавления токена авторизации
const originalFetch = window.fetch;
window.fetch = function (...args) {
  const [url, config] = args;
  if (typeof url === 'string' && url.startsWith('/api')) {
    const token = localStorage.getItem('master-token');
    if (token) {
      const headers = new Headers(config?.headers);
      headers.set('Authorization', `Bearer ${token}`);
      const newConfig = { ...config, headers };
      return originalFetch(url, newConfig);
    }
  }
  return originalFetch(...args);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);