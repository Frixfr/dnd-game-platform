// Обновлённый MasterAuthModal: теперь принимает onSuccess вместо прямого редиректа.
import React, { useState } from 'react';
import Modal from './Modal';

const MASTER_PASSWORD = 'dm123'; // ← По-прежнему хардкод (разрешено ТЗ)

interface MasterAuthModalProps {
  onClose: () => void;
  onSuccess: () => void; // ← Колбэк для родителя после успешной аутентификации
}

const MasterAuthModal: React.FC<MasterAuthModalProps> = ({ onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === MASTER_PASSWORD) {
      onSuccess(); // Уведомляем родителя — он сам решает, куда перейти
      // Это делает компонент переиспользуемым и тестируемым.
    } else {
      setError('Неверный пароль');
    }
  };

  return (
    <Modal onClose={onClose} title="Вход для мастера">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="master-password" className="block text-sm font-medium text-gray-700">
            Пароль
          </label>
          <input
            id="master-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex justify-end space-x-3">          
            <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-200 rounded hover:bg-slate-300 transition-colors"
            >
            Отмена
            </button>
            <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
            Войти
            </button>
        </div>
      </form>
    </Modal>
  );
};

export default MasterAuthModal;