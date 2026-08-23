// client/src/components/ui/EnterRoomModal.tsx
import { useState } from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { useErrorHandler } from '../../hooks/useErrorHandler';

interface EnterRoomModalProps {
  roomId: number;
  roomName: string;
  hasPassword?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSetPassword?: () => void;
}

export const EnterRoomModal: React.FC<EnterRoomModalProps> = ({ roomId, roomName, hasPassword, onClose, onSuccess, onSetPassword }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { enterRoom } = useRoomStore();
  const { showError } = useErrorHandler();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Если пароля нет, передаем undefined (сервер пропустит без проверки)
      await enterRoom(roomId, hasPassword ? password.trim() : undefined);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Не удалось войти в комнату');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div className="modal-content w-full max-w-md">
        <div className="modal-header px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold modal-title">🔑 Вход в комнату</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <p className="text-text-secondary text-sm">
            {hasPassword 
              ? 'Введите пароль для комнаты' 
              : 'Комната не защищена паролем. Вы можете войти без пароля или задать его.'}
            <span className="font-semibold text-text-primary"> "{roomName}"</span>
          </p>
          
          {hasPassword && (
            <div>
              <label className="block text-sm font-medium form-label mb-1">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full form-input"
                placeholder="Введите пароль"
                autoFocus
              />
            </div>
          )}

          {!hasPassword && onSetPassword && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onSetPassword}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 btn-secondary text-sm"
              >
                🔐 Задать пароль
              </button>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 btn-secondary">
              Отмена
            </button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 btn-primary transition">
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};