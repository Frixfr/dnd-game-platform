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
    error: <XCircle className="w-5 h-5 text-[#FF0026]" />,
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    error: 'bg-[#FF0026]/10 border-[#FF0026]/20',
    success: 'bg-green-500/10 border-green-500/20',
    info: 'bg-blue-500/10 border-blue-500/20',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${bgColors[type]}`}>
      {icons[type]}
      <span className="text-sm text-[#F2E9E4] flex-1">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm font-medium text-[#FF0026] hover:text-[#cc001f] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default Toast;