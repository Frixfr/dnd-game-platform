// Нейтральная, профессиональная страница входа с синими акцентами.
// Полное центрирование по экрану (flex + min-h-screen).
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MasterAuthModal from '../components/ui/MasterAuthModal';
import PlayerAuthModal from '../components/ui/PlayerAuthModal';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);

  const handleMasterLoginSuccess = () => {
    navigate('/master');
  };

  return (
    // Центрируем ВЕСЬ контент по центру экрана (ранее могло быть только text-center)
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      {/* Контейнер карточки — ограничен по ширине, но всегда по центру */}
      <div className="w-full max-w-md">
        {/* Заголовок — теперь по центру, без фэнтези */}
        <h1 className="text-3xl font-bold text-slate-800 text-center mb-2">
          DnD Game Platform
        </h1>
        <p className="text-slate-600 text-center mb-8">
          Выберите роль для входа в игру
        </p>

        {/* Кнопки — теперь тоже строго по центру, одинаковой ширины */}
        <div className="space-y-4">
          <button
            onClick={() => setIsMasterModalOpen(true)}
            className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Войти как мастер
          </button>

          <button
            onClick={() => setIsPlayerModalOpen(true)}
            className="w-full py-3 px-6 bg-slate-700 text-white font-medium rounded-lg shadow hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Войти как игрок
          </button>
        </div>

        {/* Декоративная подпись — тонкая, ненавязчивая */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          Платформа для совместных настольных игр
        </div>
      </div>

      {/* Модальные окна */}
      {isMasterModalOpen && (
        <MasterAuthModal
          onClose={() => setIsMasterModalOpen(false)}
          onSuccess={handleMasterLoginSuccess}
        />
      )}
      {isPlayerModalOpen && (
        <PlayerAuthModal onClose={() => setIsPlayerModalOpen(false)} />
      )}
    </div>
  );
};

export default LoginPage;