// Файл: client/src/components/ui/Toast.tsx
import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'error' | 'success' | 'info';
}

const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const bgColor = {
    error: 'bg-red-500',
    success: 'bg-green-500',
    info: 'bg-blue-500',
  }[type];

  const icon = {
    error: '❌',
    success: '✅',
    info: 'ℹ️',
  }[type];

  return (
    <div className={`${bgColor} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-slide-up`}>
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  );
};

export default Toast;