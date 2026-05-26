import React, { useState } from 'react';
import Modal from './Modal';
import { useNavigate } from 'react-router-dom';
import { usePlayerSessionStore } from '../../stores/playerSessionStore';

interface PlayerAuthModalProps {
  onClose: () => void;
  onSelectAvailable: () => void; // вместо onLogin
}

const PlayerAuthModal: React.FC<PlayerAuthModalProps> = ({ onClose, onSelectAvailable }) => {
  const navigate = useNavigate();
  const { setSelectedPlayer } = usePlayerSessionStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectAvailable = () => {
    onSelectAvailable();
  };

  const handleLoginWithPassword = async () => {
    if (!password.trim()) {
      setError('Введите пароль');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/players/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
      }
      setSelectedPlayer(data.player);
      navigate(`/player/${data.player.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка входа';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Вход для игрока">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#F2E9E4] mb-1">
            Пароль от персонажа (если есть)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-[#F2E9E4]/30 rounded-md shadow-sm bg-[#0A1F44] text-[#F2E9E4]"
            placeholder="Введите пароль"
            autoFocus
          />
          <p className="text-xs text-[#F2E9E4]/60 mt-1">
            Если у персонажа нет пароля, выберите "Выберу доступных"
          </p>
        </div>
        {error && <p className="text-[#FF0026] text-sm">{error}</p>}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[#F2E9E4] bg-[#0A1F44]/80 border border-[#F2E9E4]/30 rounded hover:bg-[#0A1F44]"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSelectAvailable}
            className="px-4 py-2 bg-[#FF0026] text-white rounded hover:bg-[#FF0026]/90"
          >
            Выберу доступных
          </button>
          <button
            type="button"
            onClick={handleLoginWithPassword}
            disabled={loading}
            className="px-4 py-2 bg-[#FF0026] text-white rounded hover:bg-[#FF0026]/90 disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Ввести пароль'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PlayerAuthModal;