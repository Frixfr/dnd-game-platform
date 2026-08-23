// client/src/components/ui/Modal.tsx - Новый дизайн
import React, { useEffect } from 'react';

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ children, onClose, title, maxWidth = 'max-w-2xl' }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div
        className={`modal-content w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="modal-header px-6 py-4">
            <h2 className="text-xl font-semibold modal-title">{title}</h2>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;