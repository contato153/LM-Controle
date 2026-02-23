
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Collaborator } from '../types';
import { fetchAllDataBatch } from '../services/sheetService';
import { ADMIN_IDS } from '../config/app';

interface AuthContextType {
  currentUser: Collaborator | null;
  isAdmin: boolean;
  login: (id: string) => Promise<boolean>;
  logout: () => void;
  loginAlert: { type: 'warning' | 'error' | 'info'; message: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutos

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Collaborator | null>(null);
  const [loginAlert, setLoginAlert] = useState<{ type: 'warning' | 'error' | 'info'; message: string } | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = currentUser ? ADMIN_IDS.includes(currentUser.id) : false;

  // Restore session
  useEffect(() => {
    const savedUser = localStorage.getItem('lm_user');
    if (savedUser) {
        try {
            setCurrentUser(JSON.parse(savedUser));
        } catch (e) {
            localStorage.removeItem('lm_user');
        }
    }
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (!currentUser) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    idleTimerRef.current = setTimeout(() => {
        setLoginAlert({ 
            type: 'warning', 
            message: 'Você foi desconectado por inatividade (15min) para economizar recursos.' 
        });
        logout();
    }, IDLE_TIMEOUT_MS);
  }, [currentUser]);

  useEffect(() => {
      if (!currentUser) return;
      const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
      const handleActivity = () => resetIdleTimer();

      events.forEach(event => document.addEventListener(event, handleActivity));
      resetIdleTimer();

      return () => {
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          events.forEach(event => document.removeEventListener(event, handleActivity));
      };
  }, [currentUser, resetIdleTimer]);

  const login = async (id: string): Promise<boolean> => {
      setLoginAlert(null);
      try {
          // Fetch simple batch to verify user exists
          const { collaborators } = await fetchAllDataBatch();
          const user = collaborators.find(c => c.id === id);
          
          if (user) {
              setCurrentUser(user);
              localStorage.setItem('lm_user', JSON.stringify(user));
              return true;
          }
          return false;
      } catch (e) {
          console.error("Login error", e);
          throw e;
      }
  };

  const logout = () => {
      setCurrentUser(null);
      localStorage.removeItem('lm_user');
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, login, logout, loginAlert }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
