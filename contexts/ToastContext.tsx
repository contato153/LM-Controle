
import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast, { ToastMessage } from '../components/Toast';

interface ToastContextType {
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<ToastMessage[]>([]);

  const addNotification = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      const id = Date.now().toString() + Math.random().toString().slice(2, 5);
      setNotifications(prev => [...prev, { id, title, message, type }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end pointer-events-none">
          {notifications.map(n => (
              <Toast key={n.id} notification={n} onClose={removeNotification} />
          ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
