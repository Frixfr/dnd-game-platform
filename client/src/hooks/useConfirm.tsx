// client/src/hooks/useConfirm.ts
import { useState, useCallback } from 'react';
import ConfirmModal from '../components/ui/ConfirmModal';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export const useConfirm = () => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
  }, []);

  const handleConfirm = async () => {
    if (options) {
      await options.onConfirm();
      setOptions(null);
    }
  };

  const handleCancel = () => {
    if (options?.onCancel) options.onCancel();
    setOptions(null);
  };

  const ConfirmModalComponent = options ? (
    <ConfirmModal
      isOpen={true}
      title={options.title || 'Подтверждение'}
      message={options.message}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
    />
  ) : null;

  return { confirm, ConfirmModalComponent };
};