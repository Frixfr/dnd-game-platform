// Файл: client/src/components/ui/ConfirmModal.tsx
import React from 'react';
import Modal from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Подтверждение',
  message,
  onConfirm,
  onCancel,
  confirmText = 'Удалить',
  cancelText = 'Отмена',
}) => {
  if (!isOpen) return null;

  return (
    <Modal onClose={onCancel} title={title}>
      <p className="text-[#F2E9E4] mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-[#F2E9E4] text-[#F2E9E4] hover:bg-[#0A1F44]/80 transition-colors"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-lg bg-[#FF0026] text-white hover:bg-[#FF0026]/90 transition-colors"
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;