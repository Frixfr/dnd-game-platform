// Полноценная React-страница для мастера — замена master.html.
// Может использовать все преимущества стека: Zustand, Socket.IO, TypeScript.
import React from 'react';
import { useNavigate } from 'react-router-dom';

const MasterDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Простая кнопка выхода — возвращаемся на главную
  const handleLogout = () => {
    // В будущем: очистка Zustand-стора, отключение сокетов
    navigate('/');
  };

  return (
    <div className="master-dashboard min-h-screen bg-purple-50 p-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-purple-800">Панель ведущего</h1>        
      </header>

      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-700">Здесь будет управление игрой: карта, инициатива, чат и т.д.</p>
        {/* В будущем: подключим компоненты из components/game/ */}
      </div>
    </div>
  );
};

export default MasterDashboardPage;