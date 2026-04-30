// client/src/components/ui/Toast.tsx
import React from 'react';
import { XCircle, CheckCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'error' | 'success' | 'info';
  action?: { label: string; onClick: () => void };
}

const Toast: React.FC<ToastProps> = ({ message, type, action }) => {
  const icons = {
    error: <XCircle className="w-5 h-5 text-red-500" />,
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    error: 'bg-red-50 border-red-200',
    success: 'bg-green-50 border-green-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${bgColors[type]}`}>
      {icons[type]}
      <span className="text-sm text-gray-800 flex-1">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default Toast;