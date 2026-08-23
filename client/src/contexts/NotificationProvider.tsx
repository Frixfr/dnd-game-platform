import React, { useState, type ReactNode } from 'react';
import Toast from '../components/ui/Toast';
import { NotificationContext, type NotificationContextType } from './notificationContext';

type ToastType = 'error' | 'success' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  action?: { label: string; onClick: () => void };
}

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastType, action?: { label: string; onClick: () => void }) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, action }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const showError = (message: string) => addToast(message, 'error');
  const showSuccess = (message: string) => addToast(message, 'success');
  const showInfo = (message: string) => addToast(message, 'info');

  const showNotification = (
    message: string,
    options?: { type?: 'success' | 'error' | 'info'; duration?: number; action?: { label: string; onClick: () => void } }
  ) => {
    const type = options?.type || 'info';
    addToast(message, type, options?.action);
  };

  const value: NotificationContextType = { showError, showSuccess, showInfo, showNotification };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} action={toast.action} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};