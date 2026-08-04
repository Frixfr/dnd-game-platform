// client/src/components/ui/CreateRoomModal.tsx
import { useState } from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { useErrorHandler } from '../../hooks/useErrorHandler';

interface CreateRoomModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createRoom } = useRoomStore();
  const { showError } = useErrorHandler();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showError('Введите название комнаты');
      return;
    }

    setIsLoading(true);
    try {
      await createRoom(name.trim());
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Не удалось создать комнату');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div className="modal-content w-full max-w-md">
        <div className="modal-header px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold modal-title">📁 Создать комнату</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium form-label mb-1">Название комнаты *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              className="w-full form-input"
              placeholder="Например: Подземелье дракона"
              autoFocus
            />
            <p className="text-xs text-text-muted mt-1">От 1 до 50 символов</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 btn-secondary">
              Отмена
            </button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 btn-primary transition">
              {isLoading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};