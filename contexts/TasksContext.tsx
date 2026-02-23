

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { CompanyTask, Collaborator, UserSettings, Department, AppNotification, isFiscalFinished } from '../types';
import { fetchAllDataBatch, updateTaskStatus, logChange, getUserSettings, saveUserSettings, fetchNotifications, markNotificationAsRead } from '../services/sheetService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface TasksContextType {
  tasks: CompanyTask[];
  collaborators: Collaborator[];
  isLoading: boolean;
  updateTask: (task: CompanyTask, field: keyof CompanyTask, newValue: string) => Promise<void>;
  refreshData: () => Promise<void>;
  settings: UserSettings;
  updateSetting: (key: string, value: any) => void;
  lastSeenMap: Record<string, Date>;
  notifications: AppNotification[];
  markNotificationRead: (id: string) => Promise<void>;
  unreadCount: number; // Notificações do sistema
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin } = useAuth();
  const { addNotification } = useToast();
  
  const [tasks, setTasks] = useState<CompanyTask[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, Date>>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState<UserSettings>({
      density: (localStorage.getItem('lm_density') as any) || 'comfortable',
      autoRefresh: localStorage.getItem('lm_autoRefresh') !== 'false',
      reduceMotion: localStorage.getItem('lm_reduceMotion') === 'true',
      defaultDepartment: (localStorage.getItem('lm_defaultDept') as Department) || Department.FISCAL,
      enableNotifications: localStorage.getItem('lm_notifications') !== 'false',
      theme: localStorage.getItem('lm_theme') === 'dark' ? 'dark' : 'light',
  });

  const settingsSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to parse logs & dates
  const parseLogDate = (dateStr: string) => {
    try {
        if (!dateStr) return new Date(0);
        const cleanStr = dateStr.replace(' em ', ' '); 
        const [datePart, timePart] = cleanStr.includes(',') ? cleanStr.split(', ') : cleanStr.split(' ');
        if (!datePart || !timePart) return new Date(0);
        const [day, month, year] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');
        return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second || 0));
    } catch (e) {
        return new Date(0);
    }
  };

  const parseBrDate = (str: string) => {
    if (!str) return null;
    const [day, month, year] = str.split('/');
    return new Date(Number(year), Number(month) - 1, Number(day));
  };

  const processData = useCallback((data: CompanyTask[], collabs: Collaborator[], logsData: string[][]) => {
      const logsMap: Record<string, string> = {};
      const activityMap: Record<string, Date> = {};

      if (logsData && logsData.length > 0) {
          logsData.forEach((row) => {
              const time = row[0];
              const user = row[2];
              const tId = row[3];
              
              if (time && user) {
                  if (tId) logsMap[tId] = `${user} em ${time}`;
                  const logDate = parseLogDate(time);
                  if (!activityMap[user] || logDate > activityMap[user]) {
                      activityMap[user] = logDate;
                  }
              }
          });
      }
      
      const mergedTasks = data.map(t => {
          const logEditor = logsMap[t.id];
          return logEditor ? { ...t, lastEditor: logEditor } : t;
      });

      return { tasks: mergedTasks, activityMap };
  }, []);

  const refreshData = useCallback(async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
          // 1. Fetch Main Data
          const { tasks: data, collaborators: collabs, logs: logsData } = await fetchAllDataBatch();
          const { tasks: processedTasks, activityMap } = processData(data, collabs, logsData);
          
          if (silent && settings.enableNotifications && tasks.length > 0) {
               processedTasks.forEach(newT => {
                   const oldT = tasks.find(t => t.id === newT.id);
                   if (oldT && newT.lastEditor !== oldT.lastEditor && newT.lastEditor) {
                       const editorName = newT.lastEditor.split(' em ')[0];
                       if (currentUser && editorName !== currentUser.name) {
                           addNotification("Alteração Detectada", `${editorName} atualizou ${newT.name}`, 'info');
                       }
                   }
               });
          }

          setTasks(processedTasks);
          setCollaborators(collabs);
          setLastSeenMap(activityMap);
          
          // 2. Fetch Notifications
          let fetchedNotifs: AppNotification[] = [];
          if (currentUser) {
              fetchedNotifs = await fetchNotifications(currentUser.name);
          }

          // --- LOGIC FOR DEADLINE NOTIFICATIONS ---
          if (currentUser) {
             const today = new Date();
             today.setHours(0,0,0,0);
             const deadlineNotifs: AppNotification[] = [];

             processedTasks.forEach(t => {
                 const isResp = t.respFiscal === currentUser.name || t.respContabil === currentUser.name || 
                                t.respBalanco === currentUser.name || t.respReinf === currentUser.name || 
                                t.respLucro === currentUser.name || t.respECD === currentUser.name || 
                                t.respECF === currentUser.name;
                 
                 if (!isResp || !t.dueDate) return;

                 const allDone = isFiscalFinished(t.statusFiscal) && isFiscalFinished(t.statusContabil);
                 if (allDone) return;

                 const due = parseBrDate(t.dueDate);
                 if (!due) return;

                 const diffTime = due.getTime() - today.getTime();
                 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                 let msg = '';
                 let title = '';
                 const notifId = `deadline-${t.id}-${t.dueDate}`;
                 
                 if (diffDays < 0) {
                     title = "TAREFA VENCIDA";
                     msg = `A tarefa ${t.name} venceu em ${t.dueDate}. Favor regularizar.`;
                 } else if (diffDays <= 3) {
                     title = "Vencimento Próximo";
                     msg = `A tarefa ${t.name} vence em ${t.dueDate} (${diffDays === 0 ? 'Hoje' : diffDays + ' dias'}).`;
                 }

                 if (title) {
                     deadlineNotifs.push({
                         id: notifId,
                         recipient: currentUser.name,
                         sender: 'Sistema',
                         taskId: t.id,
                         message: msg,
                         isRead: false, 
                         timestamp: new Date().toLocaleString('pt-BR')
                     });
                 }
             });
             
             fetchedNotifs = [...fetchedNotifs, ...deadlineNotifs];
          }

          // Sort notifications
          const sorted = fetchedNotifs.sort((a, b) => {
              if (a.isRead === b.isRead) {
                  return b.id.localeCompare(a.id); 
              }
              return a.isRead ? 1 : -1; 
          });
          setNotifications(sorted);

      } catch (error) {
          console.error("Fetch error", error);
          if (!silent) addNotification("Erro", "Falha ao carregar dados.", 'error');
      } finally {
          if (!silent) setIsLoading(false);
      }
  }, [currentUser, settings.enableNotifications, tasks, addNotification, processData]);

  // Initial Load & Settings Sync
  useEffect(() => {
      if (!currentUser) {
          setTasks([]);
          setNotifications([]);
          return;
      }

      const init = async () => {
          setIsLoading(true);
          // Load Settings from Cloud
          const cloudSettings = await getUserSettings(currentUser.id);
          if (cloudSettings) {
              setSettings(prev => ({ ...prev, ...cloudSettings }));
              
              // Apply theme
              if (cloudSettings.theme === 'dark') document.documentElement.classList.add('dark');
              else document.documentElement.classList.remove('dark');
          }
          // Load Data
          await refreshData(true);
          setIsLoading(false);
      };
      init();
  }, [currentUser]); 

  // Polling
  useEffect(() => {
      if (!currentUser || !settings.autoRefresh) return;
      
      let timeoutId: ReturnType<typeof setTimeout>;
      let isMounted = true;

      const poll = async () => {
          if (document.visibilityState === 'visible') {
              await refreshData(true);
          }
          if (isMounted) {
              const jitter = Math.floor(Math.random() * 10000);
              timeoutId = setTimeout(poll, 30000 + jitter);
          }
      };
      
      const initialJitter = Math.floor(Math.random() * 5000);
      timeoutId = setTimeout(poll, 30000 + initialJitter);

      return () => {
          isMounted = false;
          clearTimeout(timeoutId);
      };
  }, [currentUser, settings.autoRefresh, refreshData]);

  const updateTask = async (task: CompanyTask, field: keyof CompanyTask, newValue: string) => {
      if (!currentUser) return;
      
      const prevTasks = [...tasks];
      const timestamp = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const editorInfo = `${currentUser.name} em ${timestamp}`;

      // Optimistic Update
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, [field]: newValue, lastEditor: editorInfo } : t));

      try {
          await updateTaskStatus(task, field, newValue, editorInfo);
          await logChange(`Alteração em [${task.name}]: ${field} -> ${newValue}`, currentUser.name, task.id);
          setLastSeenMap(prev => ({...prev, [currentUser.name]: new Date()}));
      } catch (error) {
          console.error("Update failed", error);
          setTasks(prevTasks); // Rollback
          addNotification("Erro", "Falha ao salvar alteração.", "error");
      }
  };

  const updateSetting = (key: string, value: any) => {
      setSettings(prev => {
          const newSettings = { ...prev, [key]: value };
          
          // Local Persistence
          if (key === 'density') localStorage.setItem('lm_density', value);
          if (key === 'autoRefresh') localStorage.setItem('lm_autoRefresh', String(value));
          if (key === 'reduceMotion') localStorage.setItem('lm_reduceMotion', String(value));
          if (key === 'defaultDepartment') localStorage.setItem('lm_defaultDept', value);
          if (key === 'enableNotifications') localStorage.setItem('lm_notifications', String(value));
          if (key === 'theme') {
             localStorage.setItem('lm_theme', value === 'dark' ? 'dark' : 'light');
             if (value === 'dark') document.documentElement.classList.add('dark');
             else document.documentElement.classList.remove('dark');
          }

          // Cloud Sync (Debounced)
          if (currentUser) {
              if (settingsSaveTimeoutRef.current) clearTimeout(settingsSaveTimeoutRef.current);
              settingsSaveTimeoutRef.current = setTimeout(() => {
                  saveUserSettings(currentUser.id, currentUser.name, newSettings);
              }, 2000);
          }

          return newSettings;
      });
  };

  const markNotificationRead = async (id: string) => {
      const target = notifications.find(n => n.id === id);
      if (!target || target.isRead) return;

      // Optimistic
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));

      // Only mark on server if it's a real persistent notification (has rowIndex)
      if (target.rowIndex) {
          await markNotificationAsRead(target.rowIndex);
      }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <TasksContext.Provider value={{ tasks, collaborators, isLoading, updateTask, refreshData, settings, updateSetting, lastSeenMap, notifications, markNotificationRead, unreadCount }}>
      {children}
    </TasksContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) throw new Error('useTasks must be used within a TasksProvider');
  return context;
};
