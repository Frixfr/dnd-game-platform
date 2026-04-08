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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Задать пароль для персонажа">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Вы выбрали персонажа <strong>{playerName}</strong>. 
            Задайте пароль, чтобы в следующий раз войти под ним.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Подтверждение пароля</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
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
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Установка...' : 'Задать пароль и войти'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SetPasswordModal;