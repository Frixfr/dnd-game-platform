// Остаётся без изменений, так как не зависит от роутинга.
// В будущем можно добавить onSuccess и перенаправление на CharacterCreatorPage.
import React, { useState } from 'react';
import Modal from './Modal';

type Gender = 'male' | 'female';

interface PlayerAuthModalProps {
  onClose: () => void;
}

const PlayerAuthModal: React.FC<PlayerAuthModalProps> = ({ onClose }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Пожалуйста, введите имя');
      return;
    }
    alert(`Привет, ${name}! Выберите персонажа (реализация позже).`);
    onClose();
  };

  return (
    <Modal onClose={onClose} title="Вход для игрока">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="player-name" className="block text-sm font-medium text-gray-700">
            Имя
          </label>
          <input
            id="player-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">Пол</span>
          <div className="flex space-x-6">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="gender"
                checked={gender === 'female'}
                onChange={() => setGender('female')}
                className="h-4 w-4 text-pink-600"
              />
              <span className="ml-2">Женский</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="gender"
                checked={gender === 'male'}
                onChange={() => setGender('male')}
                className="h-4 w-4 text-blue-600"
              />
              <span className="ml-2">Мужской</span>
            </label>
          </div>
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
            Продолжить
           </button>
        </div>
      </form>
    </Modal>
  );
};

export default PlayerAuthModal;