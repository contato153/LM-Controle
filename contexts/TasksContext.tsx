

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { CompanyTask, Collaborator, UserSettings, Department, AppNotification, isFiscalFinished } from '../types';
import { fetchAllDataBatch, updateTaskStatus, logChange, getUserSettings, saveUserSettings, fetchNotifications, markNotificationAsRead } from '../services/sheetService';
import { 
  fetchAllDataSupabase, 
  updateTaskStatusSupabase, 
  logChangeSupabase, 
  getUserSettingsSupabase, 
  saveUserSettingsSupabase, 
  fetchNotificationsSupabase, 
  markNotificationAsReadSupabase, 
  markAllNotificationsAsReadSupabase, 
  updateUserPresenceSupabase, 
  createCompanySupabase, 
  bulkCreateCompaniesSupabase, 
  updateCompanyDataSupabase, 
  toggleCompanyActiveSupabase, 
  deleteCompanySupabase, 
  createCollaboratorSupabase, 
  updateCollaboratorSupabase, 
  deleteCollaboratorSupabase, 
  toggleCollaboratorActiveSupabase, 
  sendNotificationSupabase,
  fetchTasksPaginatedSupabase,
  fetchAvailableYearsSupabase,
  startNewYearCycleSupabase,
  deleteYearCycleSupabase,
  verifySecurityPasswordSupabase
} from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';
import { USE_SUPABASE } from '../config/app';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const QUERY_KEYS = {
  tasks: (year: string) => ['tasks', year],
  collaborators: ['collaborators'],
  logs: (year: string) => ['logs', year],
  notifications: (userName: string, year: string) => ['notifications', userName, year],
  settings: (userId: string) => ['settings', userId],
};

interface TasksContextType {
  tasks: CompanyTask[];
  collaborators: Collaborator[];
  logs: string[][]; // Added logs
  isLoading: boolean;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  updateTask: (task: CompanyTask, field: keyof CompanyTask, newValue: string) => Promise<void>;
  refreshData: () => Promise<void>;
  settings: UserSettings;
  updateSetting: (key: string, value: any) => void;
  lastSeenMap: Record<string, Date>;
  notifications: AppNotification[];
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  unreadCount: number; // Notificações do sistema
  onlineUsers: string[]; // IDs dos usuários online
  
  // Company Management (Supabase Only)
  createCompany: (company: CompanyTask) => Promise<void>;
  bulkCreateCompanies: (companies: CompanyTask[]) => Promise<void>;
  updateCompany: (company: CompanyTask) => Promise<void>;
  toggleCompanyActive: (companyId: string, isActive: boolean) => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
  bulkUpdateTasks: (taskIds: string[], field: keyof CompanyTask, newValue: string) => Promise<void>;

  // Collaborator Management (Supabase Only)
  createCollaborator: (collaborator: Collaborator) => Promise<void>;
  updateCollaborator: (collaborator: Collaborator) => Promise<void>;
  toggleCollaboratorActive: (collaboratorId: string, isActive: boolean) => Promise<void>;
  deleteCollaborator: (collaboratorId: string) => Promise<void>;

  // Vigência (Yearly Cycles)
  activeYear: string;
  setActiveYear: (year: string) => void;
  availableYears: string[];
  startNewCycle: (targetYear: string) => Promise<void>;
  deleteYearCycle: (year: string) => Promise<void>;
  verifySecurityPassword: (password: string) => Promise<boolean>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { addNotification } = useToast();
  const queryClient = useQueryClient();
  
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [activeYear, setActiveYear] = useState<string>(() => {
      const stored = localStorage.getItem('lm_activeYear');
      // Default to 2026 as per prompt context, or current year
      return stored || '2026';
  });
  const [availableYears, setAvailableYears] = useState<string[]>(['2026']);

  // Settings State (Local state for immediate UI feedback, synced with Query)
  const [settings, setSettings] = useState<UserSettings>({
      density: (localStorage.getItem('lm_density') as any) || 'comfortable',
      autoRefresh: localStorage.getItem('lm_autoRefresh') !== 'false',
      reduceMotion: localStorage.getItem('lm_reduceMotion') === 'true',
      defaultDepartment: (localStorage.getItem('lm_defaultDept') as Department) || Department.FISCAL,
      defaultYear: localStorage.getItem('lm_defaultYear') || '2026',
      defaultTab: (localStorage.getItem('lm_defaultTab') as any) || 'dashboard',
      enableNotifications: localStorage.getItem('lm_notifications') !== 'false',
      notificationPreferences: JSON.parse(localStorage.getItem('lm_notifPrefs') || '{"mentions":true,"myTasks":true,"general":true}'),
      theme: localStorage.getItem('lm_theme') === 'dark' ? 'dark' : 'light',
      adminMode: false, // Default to false, user must toggle
      pinnedTasks: JSON.parse(localStorage.getItem('lm_pinnedTasks') || '[]'),
      readDeadlineNotifications: JSON.parse(localStorage.getItem('lm_readDeadlines') || '[]'),
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

  // --- QUERIES ---

  // 1. Tasks Query
  const { 
    data: tasksData, 
    isLoading: isTasksLoading, 
    refetch: refreshTasks
  } = useQuery({
    queryKey: QUERY_KEYS.tasks(activeYear),
    queryFn: async () => {
      if (USE_SUPABASE && supabase) {
        const { tasks } = await fetchAllDataSupabase(activeYear);
        return tasks;
      } else {
        const data = await fetchAllDataBatch();
        return data.tasks;
      }
    },
    enabled: !!currentUser,
    refetchInterval: settings.autoRefresh ? 30000 : false,
    staleTime: 1000 * 60,
  });

  const fetchNextPage = () => {};
  const hasNextPage = false;
  const isFetchingNextPage = false;

  // 2. Collaborators Query
  const { data: collaboratorsData, isLoading: isCollabsLoading } = useQuery({
    queryKey: QUERY_KEYS.collaborators,
    queryFn: async () => {
      if (USE_SUPABASE && supabase) {
        const { data } = await supabase.from('colaboradores').select('*').is('deleted_at', null);
        return (data || []).map((c: any) => ({
            uuid: c.id,
            id: c.codigo_externo,
            name: c.nome,
            department: c.departamento,
            lastSeen: c.last_seen || null,
            role: c.role || (c.is_admin ? 'admin' : 'user'),
            active: c.active !== false,
            deleted_at: c.deleted_at
        }));
      }
      const data = await fetchAllDataBatch();
      return data.collaborators;
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // 3. Logs Query
  const { data: logsData, isLoading: isLogsLoading } = useQuery({
    queryKey: QUERY_KEYS.logs(activeYear),
    queryFn: async () => {
      if (USE_SUPABASE && supabase) {
        const { data } = await supabase.from('registros').select('*').eq('ano', activeYear).order('created_at', { ascending: false }).limit(5000);
        return (data || []).map((l: any) => [
            new Date(l.created_at).toLocaleString('pt-BR'),
            l.descricao,
            l.usuario,
            l.empresa_id || ''
        ]);
      }
      const data = await fetchAllDataBatch();
      // Sort logs descending (newest first) for Sheets
      const sortedLogs = [...(data.logs || [])].sort((a, b) => {
          const parseDate = (s: string) => {
              try {
                  if (!s) return 0;
                  const cleanStr = s.replace(',', '').trim();
                  const [d, t] = cleanStr.split(' ');
                  const [day, month, year] = d.split('/').map(Number);
                  const [h, m, s_] = t.split(':').map(Number);
                  return new Date(year, month - 1, day, h, m, s_ || 0).getTime();
              } catch (e) { return 0; }
          };
          return parseDate(b[0]) - parseDate(a[0]);
      });
      return sortedLogs;
    },
    enabled: !!currentUser,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: settings.autoRefresh ? 60000 : false, // 1 minute fallback
  });

  const refreshData = async () => {
    await Promise.all([
      refreshTasks(),
      queryClient.invalidateQueries({ queryKey: ['collaborators'] }),
      queryClient.invalidateQueries({ queryKey: ['logs'] })
    ]);
  };

  // 2. Notifications Query
  const { data: rawNotifications, refetch: refetchNotifs } = useQuery({
    queryKey: QUERY_KEYS.notifications(currentUser?.name || '', activeYear),
    queryFn: async () => {
      if (!currentUser) return [];
      if (USE_SUPABASE && supabase) {
        return await fetchNotificationsSupabase(currentUser.name, activeYear);
      } else {
        return await fetchNotifications(currentUser.name);
      }
    },
    enabled: !!currentUser,
    refetchInterval: settings.autoRefresh ? 30000 : false,
  });

  // 3. User Settings Query
  const { data: cloudSettings } = useQuery({
    queryKey: QUERY_KEYS.settings(currentUser?.id || ''),
    queryFn: async () => {
      if (!currentUser) return null;
      if (USE_SUPABASE && supabase) {
        return await getUserSettingsSupabase(currentUser.id);
      } else {
        return await getUserSettings(currentUser.id);
      }
    },
    enabled: !!currentUser,
  });

  // Sync Cloud Settings to Local State
  useEffect(() => {
    if (cloudSettings) {
      setSettings(prev => ({ ...prev, ...cloudSettings }));
      if (cloudSettings.theme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  }, [cloudSettings]);

  // 4. Available Years Query
  const { data: fetchedYears } = useQuery({
    queryKey: ['availableYears'],
    queryFn: async () => {
      if (USE_SUPABASE && supabase) {
        return await fetchAvailableYearsSupabase();
      }
      return ['2026'];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  useEffect(() => {
    if (fetchedYears) {
        setAvailableYears(fetchedYears);
        // If activeYear is not in availableYears, set it to the latest
        if (!fetchedYears.includes(activeYear)) {
            const latest = fetchedYears[0];
            setActiveYear(latest);
            localStorage.setItem('lm_activeYear', latest);
        }
    }
  }, [fetchedYears, activeYear]);

  const startNewCycleMutation = useMutation({
      mutationFn: async (targetYear: string) => {
          if (!USE_SUPABASE || !currentUser) return;
          await startNewYearCycleSupabase(activeYear, targetYear, currentUser.name);
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['availableYears'] });
          queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Invalidate current year
          addNotification("Sucesso", "Novo ciclo anual iniciado com sucesso!", "success");
      },
      onError: (error: any) => {
          addNotification("Erro", error.message || "Falha ao iniciar novo ciclo.", "error");
      }
  });

  const startNewCycle = async (targetYear: string) => {
      await startNewCycleMutation.mutateAsync(targetYear);
  };

  const deleteYearCycleMutation = useMutation({
      mutationFn: async (year: string) => {
          if (!USE_SUPABASE || !currentUser) return;
          await deleteYearCycleSupabase(year, currentUser.name);
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['availableYears'] });
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          addNotification("Sucesso", "Ciclo anual excluído com sucesso!", "success");
          setActiveYear('2026'); 
      },
      onError: (error: any) => {
          console.error("Error deleting year cycle:", error);
          addNotification("Erro", error.message || "Falha ao excluir ciclo anual.", "error");
      }
  });

  const deleteYearCycle = async (year: string) => {
      await deleteYearCycleMutation.mutateAsync(year);
  };

  const verifySecurityPassword = async (password: string): Promise<boolean> => {
      if (!USE_SUPABASE) return password === 'LMM@2026'; // Fallback for Sheets
      return await verifySecurityPasswordSupabase(password);
  };


  const tasks = useMemo(() => {
    return tasksData || [];
  }, [tasksData]);

  const collaborators = useMemo(() => collaboratorsData || [], [collaboratorsData]);
  const logs = useMemo(() => logsData || [], [logsData]);

  const lastSeenMap = useMemo(() => {
    const activityMap: Record<string, Date> = {};

    // 1. Incorporate from logs
    if (logs && logs.length > 0) {
        logs.forEach((row) => {
            const time = row[0];
            const user = row[2];
            if (time && user) {
                const logDate = parseLogDate(time);
                if (!activityMap[user] || logDate > activityMap[user]) {
                    activityMap[user] = logDate;
                }
            }
        });
    }

    // 2. Incorporate lastSeen from collaborators
    collaborators.forEach(c => {
        if (c.lastSeen) {
            const lastSeenDate = new Date(c.lastSeen);
            if (!isNaN(lastSeenDate.getTime())) {
                if (!activityMap[c.name] || lastSeenDate > activityMap[c.name]) {
                    activityMap[c.name] = lastSeenDate;
                }
            }
        }
    });
    
    return activityMap;
  }, [logs, collaborators]);

  // --- NOTIFICATIONS PROCESSING (Deadlines) ---
  const notifications = useMemo(() => {
    if (!currentUser || !tasks) return [];
    
    let fetchedNotifs = rawNotifications || [];
    // Filter mentions based on preferences
    if (!settings.notificationPreferences?.mentions) {
        fetchedNotifs = [];
    }

    const todayAtMidnight = new Date();
    todayAtMidnight.setHours(0,0,0,0);
    const deadlineNotifs: AppNotification[] = [];

    // Only generate deadline notifications if 'myTasks' preference is enabled
    if (settings.notificationPreferences?.myTasks) {
        tasks.forEach(t => {
            const isResp = t.respFiscal === currentUser.name || t.respContabil === currentUser.name || 
                        t.respBalanco === currentUser.name || t.respReinf === currentUser.name || 
                        t.respLucro === currentUser.name || t.respECD === currentUser.name || 
                        t.respECF === currentUser.name;
            
            if (!isResp || !t.dueDate) return;

            const allDone = isFiscalFinished(t.statusFiscal) && isFiscalFinished(t.statusContabil);
            if (allDone) return;

            const due = parseBrDate(t.dueDate);
            if (!due) return;

            const diffTime = due.getTime() - todayAtMidnight.getTime();
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
                // Check if already read locally
                const isReadLocally = settings.readDeadlineNotifications?.includes(notifId) || false;

                deadlineNotifs.push({
                    id: notifId,
                    recipient: currentUser.name,
                    sender: 'Sistema',
                    taskId: t.id,
                    message: msg,
                    isRead: isReadLocally, 
                    timestamp: new Date().toLocaleString('pt-BR')
                });
            }
        });
    }
    
    const allNotifs = [...fetchedNotifs, ...deadlineNotifs];
    return allNotifs.sort((a, b) => {
        if (a.isRead === b.isRead) {
            return b.id.localeCompare(a.id); 
        }
        return a.isRead ? 1 : -1; 
    });
  }, [currentUser, tasks, rawNotifications, settings.notificationPreferences, settings.readDeadlineNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const isLoading = isTasksLoading || isCollabsLoading || isLogsLoading;

  const tasksRef = useRef<CompanyTask[]>([]);
  useEffect(() => {
    if (tasks.length > 0 && tasksRef.current.length > 0 && settings.enableNotifications) {
      tasks.forEach(newT => {
        const oldT = tasksRef.current.find(t => t.id === newT.id);
        if (oldT && newT.lastEditor !== oldT.lastEditor && newT.lastEditor) {
          const editorName = newT.lastEditor.split(' em ')[0];
          if (currentUser && editorName !== currentUser.name) {
            // Determine if user is responsible
            const isResp = newT.respFiscal === currentUser.name || newT.respContabil === currentUser.name || 
                           newT.respBalanco === currentUser.name || newT.respReinf === currentUser.name || 
                           newT.respLucro === currentUser.name || newT.respECD === currentUser.name || 
                           newT.respECF === currentUser.name;
            
            // Check preferences
            const showMyTasks = settings.notificationPreferences?.myTasks && isResp;
            const showGeneral = settings.notificationPreferences?.general && !isResp;

            if (showMyTasks || showGeneral) {
                console.log(`[Notification] Triggering for ${newT.name} by ${editorName}`);
                addNotification("Alteração Detectada", `${editorName} atualizou ${newT.name}`, 'info');

                // Persist notification to DB
                if (USE_SUPABASE && currentUser) {
                    const notifId = crypto.randomUUID();
                    sendNotificationSupabase({
                        id: notifId,
                        recipient: currentUser.name,
                        sender: editorName,
                        taskId: newT.id,
                        message: `${editorName} atualizou ${newT.name}`,
                        isRead: false,
                        timestamp: new Date().toISOString()
                    }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['notifications'] });
                    });
                }
            }
          }
        }
      });
    }
    if (tasks.length > 0) {
      tasksRef.current = [...tasks];
    }
  }, [tasks, settings.enableNotifications, settings.notificationPreferences, currentUser, addNotification]);

  // Supabase Realtime Subscription & Presence
  useEffect(() => {
      if (!currentUser || !USE_SUPABASE || !supabase) return;

      // 1. Presence Channel
      const presenceChannel = supabase.channel('online-users');
      
      const trackPresence = async () => {
          // Keep tracking even if hidden, as requested by user ("bolinha verde sempre")
          await presenceChannel.track({ user_id: currentUser.id, name: currentUser.name });
      };

      presenceChannel
          .on('presence', { event: 'sync' }, () => {
              const state = presenceChannel.presenceState();
              const userIds = Object.values(state).flat().map((u: any) => u.user_id);
              // Ensure current user is always included if we are connected
              const uniqueIds = [...new Set([...userIds, currentUser.id])];
              setOnlineUsers(uniqueIds);
          })
          .subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                  await trackPresence();
              }
          });

      const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
              refreshData();
          }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // 2. Database Changes Channel
      const changesChannel = supabase
          .channel('app-db-changes')
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'empresas' },
              () => {
                  queryClient.invalidateQueries({ queryKey: ['tasks'] });
              }
          )
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'comentarios' },
              () => {
                  // We don't have a global comments query, they are fetched per task
                  // So we might need to invalidate specific task comments if we knew the ID
                  // For now, let's just invalidate all task details which might contain comments
                  queryClient.invalidateQueries({ queryKey: ['taskDetail'] });
              }
          )
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'notificacoes' },
              () => {
                  queryClient.invalidateQueries({ queryKey: ['notifications'] });
              }
          )
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'registros' },
              () => {
                  queryClient.invalidateQueries({ queryKey: ['logs'] });
              }
          )
          .subscribe();

      // 3. Periodic Heartbeat (Update last_seen in DB)
      const heartbeatInterval = setInterval(() => {
          updateUserPresenceSupabase(currentUser.id);
      }, 5 * 60 * 1000); // Every 5 minutes

      // Initial Heartbeat
      updateUserPresenceSupabase(currentUser.id);

      return () => {
          supabase.removeChannel(presenceChannel);
          supabase.removeChannel(changesChannel);
          clearInterval(heartbeatInterval);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
  }, [currentUser, refreshData]);

  // Polling
  useEffect(() => {
      if (!currentUser || !settings.autoRefresh || USE_SUPABASE) return;
      
      let timeoutId: ReturnType<typeof setTimeout>;
      let isMounted = true;

      const poll = async () => {
          if (document.visibilityState === 'visible') {
              await refreshData();
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

  // --- MUTATIONS ---

  const updateTaskMutation = useMutation({
    mutationFn: async ({ task, field, newValue }: { task: CompanyTask, field: keyof CompanyTask, newValue: string }) => {
      if (!currentUser) return;
      const timestamp = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const editorInfo = `${currentUser.name} em ${timestamp}`;

      if (USE_SUPABASE && supabase) {
        // updateTaskStatusSupabase already logs the change internally
        await updateTaskStatusSupabase(task, field, newValue, editorInfo);
      } else {
        await updateTaskStatus(task, field, newValue, editorInfo);
        await logChange(`Alteração em [${task.name}]: ${field} -> ${newValue}`, currentUser.name, task.id);
      }
    },
    onMutate: async ({ task, field, newValue }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousData = queryClient.getQueryData(['tasks']);
      
      const timestamp = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const editorInfo = `${currentUser?.name} em ${timestamp}`;

      queryClient.setQueryData(['tasks'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            tasks: page.tasks.map((t: any) => t.id === task.id ? { ...t, [field]: newValue, lastEditor: editorInfo } : t)
          }))
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['tasks'], context.previousData);
      }
      addNotification("Erro", "Falha ao salvar alteração.", "error");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateTask = async (task: CompanyTask, field: keyof CompanyTask, newValue: string) => {
    updateTaskMutation.mutate({ task, field, newValue });
  };

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, newSettings }: { key: string, value: any, newSettings: UserSettings }) => {
      if (!currentUser) return;
      if (USE_SUPABASE && supabase) {
        await saveUserSettingsSupabase(currentUser.id, currentUser.name, newSettings);
      } else {
        await saveUserSettings(currentUser.id, currentUser.name, newSettings);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
  });

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => {
        const newSettings = { ...prev, [key]: value };
        
        // Local Persistence
        if (key === 'density') localStorage.setItem('lm_density', value);
        if (key === 'autoRefresh') localStorage.setItem('lm_autoRefresh', String(value));
        if (key === 'reduceMotion') localStorage.setItem('lm_reduceMotion', String(value));
        if (key === 'defaultDepartment') localStorage.setItem('lm_defaultDept', value);
        if (key === 'defaultYear') localStorage.setItem('lm_defaultYear', value);
        if (key === 'defaultTab') localStorage.setItem('lm_defaultTab', value);
        if (key === 'enableNotifications') localStorage.setItem('lm_notifications', String(value));
        if (key === 'notificationPreferences') localStorage.setItem('lm_notifPrefs', JSON.stringify(value));
        if (key === 'pinnedTasks') localStorage.setItem('lm_pinnedTasks', JSON.stringify(value));
        if (key === 'readDeadlineNotifications') localStorage.setItem('lm_readDeadlines', JSON.stringify(value));
        if (key === 'theme') {
           localStorage.setItem('lm_theme', value === 'dark' ? 'dark' : 'light');
           if (value === 'dark') document.documentElement.classList.add('dark');
           else document.documentElement.classList.remove('dark');
        }

        // Cloud Sync (Debounced)
        if (currentUser) {
            if (settingsSaveTimeoutRef.current) clearTimeout(settingsSaveTimeoutRef.current);
            settingsSaveTimeoutRef.current = setTimeout(() => {
                updateSettingMutation.mutate({ key, value, newSettings });
            }, 2000);
        }

        return newSettings;
    });
  };

  const markNotificationReadMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check if it's a deadline notification
      if (id.startsWith('deadline-')) {
          const currentRead = settings.readDeadlineNotifications || [];
          if (!currentRead.includes(id)) {
              updateSetting('readDeadlineNotifications', [...currentRead, id]);
          }
          return;
      }

      const target = notifications.find(n => n.id === id);
      if (!target || target.isRead) return;

      if (USE_SUPABASE && supabase) {
        await markNotificationAsReadSupabase(target.id);
      } else if (target.rowIndex) {
        await markNotificationAsRead(target.rowIndex);
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previousNotifs = queryClient.getQueryData(['notifications']);
      
      queryClient.setQueryData(['notifications'], (old: any) => {
        if (!old) return old;
        return old.map((n: any) => n.id === id ? { ...n, isRead: true } : n);
      });

      return { previousNotifs };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markNotificationRead = async (id: string) => {
    markNotificationReadMutation.mutate(id);
  };

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) return;
      
      // 1. Mark all deadline notifications as read locally
      const currentDeadlineIds = notifications
          .filter(n => n.id.startsWith('deadline-') && !n.isRead)
          .map(n => n.id);
      
      if (currentDeadlineIds.length > 0) {
          const currentRead = settings.readDeadlineNotifications || [];
          const newState = [...new Set([...currentRead, ...currentDeadlineIds])];
          updateSetting('readDeadlineNotifications', newState);
      }

      if (USE_SUPABASE && supabase) {
        await markAllNotificationsAsReadSupabase(currentUser.name);
      } else {
        const unread = notifications.filter(n => !n.isRead && n.rowIndex);
        for (const n of unread) {
          if (n.rowIndex) await markNotificationAsRead(n.rowIndex);
        }
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      queryClient.setQueryData(['notifications'], (old: any) => {
        if (!old) return old;
        return old.map((n: any) => ({ ...n, isRead: true }));
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllNotificationsRead = async () => {
    markAllNotificationsReadMutation.mutate();
  };

  // --- COMPANY MANAGEMENT MUTATIONS ---

  const createCompanyMutation = useMutation({
    mutationFn: async (company: CompanyTask) => {
      if (!USE_SUPABASE || !currentUser) return;
      // Ensure the company is created in the active year
      await createCompanySupabase({ ...company, ano: activeYear }, currentUser.name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addNotification("Sucesso", "Empresa criada com sucesso!", "success");
    },
    onError: () => addNotification("Erro", "Falha ao criar empresa.", "error")
  });

  const createCompany = async (company: CompanyTask) => {
    createCompanyMutation.mutate(company);
  };

  const bulkCreateCompaniesMutation = useMutation({
    mutationFn: async (companies: CompanyTask[]) => {
      if (!USE_SUPABASE || !currentUser) return;
      const companiesWithYear = companies.map(c => ({ ...c, ano: activeYear }));
      await bulkCreateCompaniesSupabase(companiesWithYear, currentUser.name);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addNotification("Sucesso", `${variables.length} empresas importadas com sucesso!`, "success");
    },
    onError: () => addNotification("Erro", "Falha na importação em massa.", "error")
  });

  const bulkCreateCompanies = async (companies: CompanyTask[]) => {
    bulkCreateCompaniesMutation.mutate(companies);
  };

  const updateCompanyMutation = useMutation({
    mutationFn: async (company: CompanyTask) => {
      if (!USE_SUPABASE || !currentUser) return;
      // Ensure we are updating the company in the correct year context
      await updateCompanyDataSupabase({ ...company, ano: activeYear }, currentUser.name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addNotification("Sucesso", "Empresa atualizada com sucesso!", "success");
    },
    onError: () => addNotification("Erro", "Falha ao atualizar empresa.", "error")
  });

  const updateCompany = async (company: CompanyTask) => {
    updateCompanyMutation.mutate(company);
  };

  const toggleCompanyActiveMutation = useMutation({
    mutationFn: async ({ companyId, isActive }: { companyId: string, isActive: boolean }) => {
      if (!USE_SUPABASE || !currentUser) return;
      await toggleCompanyActiveSupabase(companyId, isActive, currentUser.name, activeYear);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addNotification("Sucesso", `Empresa ${variables.isActive ? 'reativada' : 'desativada'} com sucesso!`, "success");
    },
    onError: () => addNotification("Erro", "Falha ao alterar status da empresa.", "error")
  });

  const toggleCompanyActive = async (companyId: string, isActive: boolean) => {
    toggleCompanyActiveMutation.mutate({ companyId, isActive });
  };

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      if (!USE_SUPABASE || !currentUser) return;
      await deleteCompanySupabase(companyId, currentUser.name, activeYear);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addNotification("Sucesso", "Empresa excluída permanentemente.", "success");
    },
    onError: () => addNotification("Erro", "Falha ao excluir empresa.", "error")
  });

  const deleteCompany = async (companyId: string) => {
    deleteCompanyMutation.mutate(companyId);
  };

  const bulkUpdateTasksMutation = useMutation({
    mutationFn: async ({ taskIds, field, newValue }: { taskIds: string[], field: keyof CompanyTask, newValue: string }) => {
      if (!currentUser || taskIds.length === 0) return;
      const timestamp = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const editorInfo = `${currentUser.name} em ${timestamp}`;

      const promises = taskIds.map(async (id) => {
          const task = tasks.find(t => t.id === id);
          if (!task) return;
          
          if (USE_SUPABASE && supabase) {
              // updateTaskStatusSupabase already logs the change internally
              await updateTaskStatusSupabase(task, field, newValue, editorInfo);
          } else {
              await updateTaskStatus(task, field, newValue, editorInfo);
              await logChange(`Alteração em Massa [${task.name}]: ${field} -> ${newValue}`, currentUser.name, task.id);
          }
      });

      await Promise.all(promises);
    },
    onMutate: async ({ taskIds, field, newValue }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousData = queryClient.getQueryData(['tasks']);
      
      const timestamp = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const editorInfo = `${currentUser?.name} em ${timestamp}`;

      queryClient.setQueryData(['tasks'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            tasks: page.tasks.map((t: any) => 
              taskIds.includes(t.id) ? { ...t, [field]: newValue, lastEditor: editorInfo } : t
            )
          }))
        };
      });

      return { previousData };
    },
    onSuccess: (data, variables) => {
      addNotification("Sucesso", `${variables.taskIds.length} tarefas atualizadas com sucesso.`, "success");
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['tasks'], context.previousData);
      }
      addNotification("Erro", "Falha ao salvar algumas alterações em massa.", "error");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const bulkUpdateTasks = async (taskIds: string[], field: keyof CompanyTask, newValue: string) => {
    bulkUpdateTasksMutation.mutate({ taskIds, field, newValue });
  };

  // --- COLLABORATOR MANAGEMENT MUTATIONS ---

  const createCollaboratorMutation = useMutation({
    mutationFn: async (collaborator: Collaborator) => {
      if (!USE_SUPABASE || !currentUser) return;
      await createCollaboratorSupabase(collaborator);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      addNotification("Sucesso", "Colaborador criado com sucesso!", "success");
    },
    onError: () => addNotification("Erro", "Falha ao criar colaborador.", "error")
  });

  const createCollaborator = async (collaborator: Collaborator) => {
    createCollaboratorMutation.mutate(collaborator);
  };

  const updateCollaboratorMutation = useMutation({
    mutationFn: async (collaborator: Collaborator) => {
      if (!USE_SUPABASE || !currentUser) return;
      await updateCollaboratorSupabase(collaborator);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      addNotification("Sucesso", "Colaborador atualizado com sucesso!", "success");
    },
    onError: () => addNotification("Erro", "Falha ao atualizar colaborador.", "error")
  });

  const updateCollaborator = async (collaborator: Collaborator) => {
    updateCollaboratorMutation.mutate(collaborator);
  };

  const toggleCollaboratorActiveMutation = useMutation({
    mutationFn: async ({ collaboratorId, isActive }: { collaboratorId: string, isActive: boolean }) => {
      if (!USE_SUPABASE || !currentUser) return;
      await toggleCollaboratorActiveSupabase(collaboratorId, isActive);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      addNotification("Sucesso", `Colaborador ${variables.isActive ? 'reativado' : 'desativado'} com sucesso!`, "success");
    },
    onError: () => addNotification("Erro", "Falha ao alterar status do colaborador.", "error")
  });

  const toggleCollaboratorActive = async (collaboratorId: string, isActive: boolean) => {
    toggleCollaboratorActiveMutation.mutate({ collaboratorId, isActive });
  };

  const deleteCollaboratorMutation = useMutation({
    mutationFn: async (collaboratorId: string) => {
      if (!USE_SUPABASE || !currentUser) return;
      await deleteCollaboratorSupabase(collaboratorId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      addNotification("Sucesso", "Colaborador removido com sucesso!", "success");
    },
    onError: () => addNotification("Erro", "Falha ao remover colaborador.", "error")
  });

  const deleteCollaborator = async (collaboratorId: string) => {
    deleteCollaboratorMutation.mutate(collaboratorId);
  };

  return (
    <TasksContext.Provider value={{ 
        tasks, 
        collaborators, 
        logs, // Expose logs
        isLoading, 
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        updateTask, 
        refreshData, 
        settings, 
        updateSetting, 
        lastSeenMap, 
        notifications, 
        markNotificationRead, 
        markAllNotificationsRead,
        unreadCount, 
        onlineUsers,
        createCompany,
        bulkCreateCompanies,
        updateCompany,
        toggleCompanyActive,
        deleteCompany,
        bulkUpdateTasks,
        createCollaborator,
        updateCollaborator,
        toggleCollaboratorActive,
        deleteCollaborator,
        activeYear,
        setActiveYear: (year: string) => {
            setActiveYear(year);
            localStorage.setItem('lm_activeYear', year);
        },
        availableYears,
        startNewCycle,
        deleteYearCycle,
        verifySecurityPassword
    }}>
      {children}
    </TasksContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) throw new Error('useTasks must be used within a TasksProvider');
  return context;
};
