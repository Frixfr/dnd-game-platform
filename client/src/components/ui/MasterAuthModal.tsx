// client/src/components/ui/MasterAuthModal.tsx
import React, { useState } from 'react';
import Modal from './Modal';
import { useRoomStore } from '../../stores/roomStore';

interface MasterAuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const MasterAuthModal: React.FC<MasterAuthModalProps> = ({ onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await useRoomStore.getState().loginAsMaster(password);
      onSuccess();
    } catch {
      // Ошибка уже сохранена в сторе, берём оттуда
      const storeError = useRoomStore.getState().error;
      setError(storeError || 'Неверный пароль или ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Вход для мастера">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="master-password" className="block text-sm font-medium text-[#F2E9E4]">
            Пароль
          </label>
          <input
            id="master-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-[#F2E9E4]/30 rounded-md shadow-sm focus:outline-none focus:ring-[#FF0026] focus:border-[#FF0026] bg-[#0A1F44] text-[#F2E9E4]"
            disabled={isLoading}
          />
        </div>
        {error && <p className="text-[#FF0026] text-sm">{error}</p>}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[#F2E9E4] bg-[#0A1F44]/80 border border-[#F2E9E4]/30 rounded hover:bg-[#0A1F44] transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-[#FF0026] text-white rounded hover:bg-[#FF0026]/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default MasterAuthModal;