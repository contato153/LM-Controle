
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Collaborator } from '../types';
import { fetchAllDataSupabase, updateUserPresenceSupabase } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';
import { ADMIN_IDS, USE_SUPABASE } from '../config/app';

interface AuthContextType {
  currentUser: Collaborator | null;
  isAdmin: boolean;
  isEffectiveAdmin: boolean;
  adminMode: boolean;
  setAdminMode: (mode: boolean) => void;
  login: (id: string) => Promise<boolean>;
  logout: () => void;
  loginAlert: { type: 'warning' | 'error' | 'info'; message: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutos

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Collaborator | null>(null);
  const [adminMode, setAdminModeState] = useState<boolean>(() => localStorage.getItem('lm_adminMode') === 'true');
  const [loginAlert, setLoginAlert] = useState<{ type: 'warning' | 'error' | 'info'; message: string } | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = currentUser ? (currentUser.role === 'admin' || ADMIN_IDS.includes(currentUser.id)) : false;
  const isEffectiveAdmin = isAdmin && adminMode;

  const setAdminMode = (mode: boolean) => {
      setAdminModeState(mode);
      localStorage.setItem('lm_adminMode', String(mode));
  };

  // Restore session & Refresh User Data
  useEffect(() => {
    const savedUser = localStorage.getItem('lm_user');
    if (savedUser) {
        try {
            const parsedUser = JSON.parse(savedUser);
            setCurrentUser(parsedUser);
            
            // Refresh user data from server to get latest role/permissions
            if (USE_SUPABASE && supabase) {
                fetchAllDataSupabase().then(data => {
                    const freshUser = data.collaborators.find(c => c.id === parsedUser.id);
                    if (freshUser) {
                        // Check if role or other critical data changed
                        if (JSON.stringify(freshUser) !== JSON.stringify(parsedUser)) {
                            console.log("Refreshing user session data...", freshUser);
                            setCurrentUser(freshUser);
                            localStorage.setItem('lm_user', JSON.stringify(freshUser));
                        }
                    }
                }).catch(err => console.error("Failed to refresh session:", err));
            }
        } catch (e) {
            localStorage.removeItem('lm_user');
        }
    }
  }, []);

  // Debug Admin Status
  useEffect(() => {
      if (currentUser) {
          console.log(`[Auth] User: ${currentUser.name} | Role: ${currentUser.role} | IsAdmin: ${isAdmin}`);
      }
  }, [currentUser, isAdmin]);

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
          let collaborators: Collaborator[] = [];
          
          if (USE_SUPABASE && supabase) {
              const data = await fetchAllDataSupabase();
              collaborators = data.collaborators;
          } else {
              throw new Error("Supabase não está configurado.");
          }

          const user = collaborators.find(c => c.id === id);
          
          if (user) {
              if (user.active === false) {
                  throw new Error('Sua conta foi desativada. Entre em contato com o administrador.');
              }
              setCurrentUser(user);
              localStorage.setItem('lm_user', JSON.stringify(user));
              console.log("Logged in via Supabase");
              updateUserPresenceSupabase(user.id).catch(console.error);
              return true;
          }
          return false;
      } catch (e: any) {
          console.error("Login error", e);
          throw e;
      }
  };

  // Real-time Active Status Check
  useEffect(() => {
      if (!currentUser || !USE_SUPABASE || !supabase) return;

      const channel = supabase
          .channel(`user-status-${currentUser.id}`)
          .on(
              'postgres_changes',
              { 
                  event: 'UPDATE', 
                  schema: 'public', 
                  table: 'colaboradores', 
                  filter: `codigo_externo=eq.${currentUser.id}` 
              },
              (payload) => {
                  const newUser = payload.new as any;
                  if (newUser.active === false) {
                      setLoginAlert({
                          type: 'error',
                          message: 'Sua conta foi desativada pelo administrador.'
                      });
                      logout();
                  }
              }
          )
          .subscribe();

      return () => {
          supabase.removeChannel(channel);
      };
  }, [currentUser]);

  const logout = () => {
      if (currentUser && USE_SUPABASE) {
          updateUserPresenceSupabase(currentUser.id).catch(console.error);
      }
      setCurrentUser(null);
      localStorage.removeItem('lm_user');
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, isEffectiveAdmin, adminMode, setAdminMode, login, logout, loginAlert }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
