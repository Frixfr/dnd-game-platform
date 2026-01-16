// Header — верхняя панель для авторизованных страниц.
// Используется внутри Layout, НЕ на LoginPage.
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const navigate = useNavigate();

  // Пример: кнопка выхода — возвращает на главную (LoginPage)
  const handleLogout = () => {
    // В будущем: очистка Zustand-стора, отключение Socket.IO
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Левая часть: заголовок текущей страницы */}
        <h1 className="text-xl font-semibold text-slate-800">
          Панель мастера
        </h1>

        {/* Правая часть: действия пользователя */}
        <div className="flex items-center space-x-4">
          {/* Можно добавить аватар, уведомления и т.д. */}
          <button
            onClick={handleLogout}
            className="text-sm text-slate-600 hover:text-slate-800 transition-colors"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;