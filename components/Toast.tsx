
import React, { useEffect } from 'react';
import { X, BellRing, Info, AlertCircle, CheckCircle } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface ToastProps {
  notification: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000); // Auto close after 5 seconds

    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  const getStyles = () => {
    switch (notification.type) {
        case 'error':
            return 'border-red-500 bg-white dark:bg-zinc-900';
        case 'warning':
            return 'border-orange-500 bg-white dark:bg-zinc-900';
        case 'success':
            return 'border-green-500 bg-white dark:bg-zinc-900';
        default:
            return 'border-lm-yellow bg-white dark:bg-zinc-900';
    }
  };

  const getIcon = () => {
      switch (notification.type) {
        case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />;
        case 'warning': return <AlertCircle className="h-5 w-5 text-orange-500" />;
        case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
        default: return <BellRing className="h-5 w-5 text-lm-dark dark:text-lm-yellow" />;
      }
  };

  return (
    <div className={`flex items-start w-80 border-l-4 shadow-xl rounded-r-lg pointer-events-auto overflow-hidden animate-slide-up-toast mb-3 transition-all ${getStyles()}`}>
      <div className="p-4 flex-1">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            {getIcon()}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {notification.title}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-snug">
              {notification.message}
            </p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-gray-100 dark:border-zinc-800">
        <button
          onClick={() => onClose(notification.id)}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-gray-500 focus:outline-none"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
