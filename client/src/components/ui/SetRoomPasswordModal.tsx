// client/src/components/ui/SetRoomPasswordModal.tsx
import { useState } from 'react';
import Modal from './Modal';
import { useRoomStore } from '../../stores/roomStore';
import { useErrorHandler } from '../../hooks/useErrorHandler';

interface SetRoomPasswordModalProps {
  roomId: number;
  roomName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SetRoomPasswordModal: React.FC<SetRoomPasswordModalProps> = ({
  roomId,
  roomName,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateRoom, fetchRooms } = useRoomStore();
  const { showError } = useErrorHandler();

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
      await updateRoom(roomId, { password });
      await fetchRooms();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Не удалось установить пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="🔐 Задать пароль для комнаты">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-text-secondary mb-2">
            Установите пароль для комнаты <span className="font-semibold text-text-primary">"{roomName}"</span>
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full form-input"
            placeholder="Минимум 3 символа"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Подтверждение пароля</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full form-input"
            placeholder="Повторите пароль"
          />
        </div>
        {error && <p className="text-accent-red text-sm">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 btn-secondary"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 btn-primary transition"
          >
            {loading ? 'Установка...' : 'Задать пароль'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
