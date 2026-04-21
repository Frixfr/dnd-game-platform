import React, { useState, type ReactNode } from 'react';
import Toast from '../components/ui/Toast';
import { NotificationContext } from './notificationContext';

export interface NotificationContextType {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
}

type ToastType = 'error' | 'success' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const showError = (message: string) => addToast(message, 'error');
  const showSuccess = (message: string) => addToast(message, 'success');
  const showInfo = (message: string) => addToast(message, 'info');

  return (
    <NotificationContext.Provider value={{ showError, showSuccess, showInfo }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};