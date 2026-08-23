import React, { useState } from 'react';
import Modal from './Modal';

interface SetPasswordModalProps {
  playerName: string;
  onSetPassword: (password: string) => Promise<void>;
  onClose: () => void;
}

const SetPasswordModal: React.FC<SetPasswordModalProps> = ({ playerName, onSetPassword, onClose }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Введите пароль');
      return;
    }
    if (password.length < 3) {
      setError('Пароль должен содержать минимум 3 символа');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSetPassword(password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Задать пароль для персонажа">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-[#F2E9E4]/80 mb-2">
            Вы выбрали персонажа <strong>{playerName}</strong>. 
            Задайте пароль, чтобы в следующий раз войти под ним.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#F2E9E4]">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-[#F2E9E4]/30 rounded-md shadow-sm bg-[#0A1F44] text-[#F2E9E4]"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#F2E9E4]">Подтверждение пароля</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-[#F2E9E4]/30 rounded-md shadow-sm bg-[#0A1F44] text-[#F2E9E4]"
          />
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
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-[#FF0026] text-white rounded hover:bg-[#FF0026]/90 disabled:opacity-50"
          >
            {loading ? 'Установка...' : 'Задать пароль и войти'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SetPasswordModal;