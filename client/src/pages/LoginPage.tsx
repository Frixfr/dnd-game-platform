// LoginPage - Единый дизайн в стиле Dark Fantasy
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MasterAuthModal from '../components/ui/MasterAuthModal';
import PlayerAuthModal from '../components/ui/PlayerAuthModal';
import { disconnectAllSocketHandlers } from '../lib/socketCleanup';
import { usePlayerSessionStore } from '../stores/playerSessionStore';
import { Shield, Sword, Sparkles } from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);

  useEffect(() => {
    disconnectAllSocketHandlers();
    usePlayerSessionStore.getState().clearSession();
  }, []);

  const handleMasterLoginSuccess = () => {
    navigate('/master');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f13] via-[#1a1a24] to-[#0f0f13] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Декоративные элементы фона */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />
      </div>

      {/* Контейнер карточки */}
      <div className="w-full max-w-md relative z-10">
        {/* Карточка входа */}
        <div className="bg-[var(--color-bg-secondary)]/80 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl shadow-2xl p-8 animate-fade-in">
          {/* Логотип и заголовок */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                <Shield size={64} className="text-amber-400 relative z-10" />
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mb-2">
              DnD Game Platform
            </h1>
            <p className="text-[var(--text-secondary)] text-sm">
              Выберите роль для начала приключения
            </p>
          </div>

          {/* Кнопки выбора роли */}
          <div className="space-y-4">
            <button
              onClick={() => setIsMasterModalOpen(true)}
              className="w-full group relative py-4 px-6 bg-gradient-to-r from-amber-600 to-amber-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-center gap-3">
                <Sword size={20} />
                <span>Войти как Мастер</span>
              </div>
            </button>

            <button
              onClick={() => setIsPlayerModalOpen(true)}
              className="w-full group relative py-4 px-6 bg-[var(--color-bg-tertiary)] text-[var(--text-primary)] font-semibold rounded-xl border border-[var(--border-color)] hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10"
            >
              <div className="flex items-center justify-center gap-3">
                <Sparkles size={20} className="text-amber-400" />
                <span>Войти как Игрок</span>
              </div>
            </button>
          </div>

          {/* Декоративная подпись */}
          <div className="mt-8 pt-6 border-t border-[var(--border-color)] text-center">
            <p className="text-[var(--text-muted)] text-xs">
              Платформа для совместных настольных игр
            </p>
          </div>
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
        <PlayerAuthModal 
          onClose={() => setIsPlayerModalOpen(false)} 
          onSelectAvailable={() => {
            setIsPlayerModalOpen(false);
            navigate('/player/select');
          }}
        />
      )}
    </div>
  );
};

export default LoginPage;
