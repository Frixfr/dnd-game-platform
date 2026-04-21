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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Вход для игрока">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Пароль от персонажа (если есть)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            placeholder="Введите пароль"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1">
            Если у персонажа нет пароля, выберите "Выберу доступных"
          </p>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-200 rounded hover:bg-slate-300"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSelectAvailable}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Выберу доступных
          </button>
          <button
            type="button"
            onClick={handleLoginWithPassword}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Ввести пароль'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PlayerAuthModal;