import React, { useMemo, useState, useEffect } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { useAuth } from '../contexts/AuthContext';
import { CompanyTask, AppNotification, getEffectivePriority, parseRobustDate } from '../types';
import { CheckSquare, MessageSquare, Clock, AlertCircle, ArrowRight, Calendar, Building2, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface MyDayProps {
  onNavigate: (taskId: string) => void;
}

type CalendarView = 'weekly' | 'monthly' | 'yearly';

const formatLogDescription = (description: string) => {
    // Handle "Alterou X para Y" format
    const newRegex = /Alterou (.*?) para "(.*?)"/;
    const newMatch = description.match(newRegex);
    if (newMatch) {
        const [, field, value] = newMatch;
        if (!value || value === '""') {
             return (
                <span className="flex items-center gap-1 flex-wrap">
                    Removeu o <strong className="text-gray-900 dark:text-white font-bold">{field}</strong>
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1 flex-wrap">
                Alterou <strong className="text-gray-900 dark:text-white font-bold">{field}</strong> para <strong className="text-lm-yellow-dark dark:text-lm-yellow font-bold">"{value}"</strong>
            </span>
        );
    }
    return description;
};

const MyDay: React.FC<MyDayProps> = ({ onNavigate }) => {
  const { tasks, notifications, markNotificationRead, logs } = useTasks();
  const { currentUser } = useAuth();
  const [calendarView, setCalendarView] = useState<CalendarView>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Reset date when component mounts (or view changes if desired, but user asked for reset on page exit)
  // Since component unmounts on page change, state resets automatically.
  
  // 1. Minhas Obrigações (Tarefas onde sou responsável)
  const myTasks = useMemo(() => {
    if (!currentUser) return [];
    
    return tasks.filter(task => {
      // Verifica se o usuário é responsável em algum departamento
      const isResponsible = 
        task.respFiscal === currentUser.name ||
        task.respContabil === currentUser.name ||
        task.respBalanco === currentUser.name ||
        task.respLucro === currentUser.name ||
        task.respReinf === currentUser.name ||
        task.respECD === currentUser.name ||
        task.respECF === currentUser.name;

      // Filtra apenas tarefas não finalizadas
      const hasPendingStatus = 
        (task.respFiscal === currentUser.name && !['FINALIZADA', 'ENVIADA', 'DISPENSADA', 'NÃO SE APLICA'].includes(task.statusFiscal || '')) ||
        (task.respContabil === currentUser.name && !['FINALIZADA', 'ENVIADA', 'DISPENSADA', 'NÃO SE APLICA'].includes(task.statusContabil || '')) ||
        (task.respBalanco === currentUser.name && !['FINALIZADA', 'ENVIADA', 'DISPENSADA', 'NÃO SE APLICA'].includes(task.statusBalanco || '')) ||
        (task.respLucro === currentUser.name && !['LUCRO LANÇADO', 'DISPENSADA', 'NÃO SE APLICA'].includes(task.statusLucro || '')) ||
        (task.respReinf === currentUser.name && !['ENVIADA', 'DISPENSADA', 'NÃO SE APLICA'].includes(task.statusReinf || '')) ||
        (task.respECD === currentUser.name && !['ENVIADA', 'DISPENSADA', 'NÃO SE APLICA'].includes(task.statusECD || '')) ||
        (task.respECF === currentUser.name && !['ENVIADA', 'DISPENSADA', 'NÃO SE APLICA'].includes(task.statusECF || ''));

      return isResponsible && hasPendingStatus && task.active !== false;
    }).sort((a, b) => {
        const pA = getEffectivePriority(a) === 'ALTA' ? 0 : getEffectivePriority(a) === 'MÉDIA' ? 1 : 2;
        const pB = getEffectivePriority(b) === 'ALTA' ? 0 : getEffectivePriority(b) === 'MÉDIA' ? 1 : 2;
        return pA - pB;
    });
  }, [tasks, currentUser]);

  // 2. Menções Recentes
  const myMentions = useMemo(() => {
    if (!currentUser) return [];
    return notifications
        .filter(n => {
            if (n.recipient !== currentUser.name) return false;
            // Filter out notifications for inactive tasks
            if (n.taskId) {
                const task = tasks.find(t => t.id === n.taskId);
                if (task && task.active === false) return false;
            }
            return true;
        })
        .sort((a, b) => b.id.localeCompare(a.id));
  }, [notifications, currentUser, tasks]);

  // 3. Modificações do Dia (Tarefas sob responsabilidade)
  const dailyModifications = useMemo(() => {
    if (!currentUser || !logs) return [];
    
    // Get today's date parts for robust comparison
    const now = new Date();
    const todayDay = now.getDate();
    const todayMonth = now.getMonth();
    const todayYear = now.getFullYear();
    
    // Map string[][] to objects first
    const mappedLogs = logs.map((log, index) => {
        const timestampStr = log[0] || '';
        const logDate = parseRobustDate(timestampStr);
        
        const isTodayLog = 
            logDate.getDate() === todayDay && 
            logDate.getMonth() === todayMonth && 
            logDate.getFullYear() === todayYear;

        return {
            id: `log-${index}`,
            timestamp: timestampStr,
            logDate,
            isToday: isTodayLog,
            details: log[1] || '',
            user: log[2] || '',
            taskId: log[3] || '',
            taskName: tasks.find(t => t.id === log[3])?.name || ''
        };
    });

    return mappedLogs.filter(log => {
        // Must be today
        if (!log.isToday) return false;
        
        // Must be a task (has taskId)
        if (!log.taskId) return false;
        const task = tasks.find(t => t.id === log.taskId);
        if (!task) return false;
        
        // Filter out inactive tasks
        if (task.active === false) return false;
        
        // User requested to show modifications from all users, not just their responsibilities
        return true;
    }).sort((a, b) => {
        return b.logDate.getTime() - a.logDate.getTime();
    }).slice(0, 10);
  }, [logs, tasks, currentUser]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const handleNotificationClick = (notification: AppNotification) => {
      if (!notification.isRead) {
          markNotificationRead(notification.id);
      }
      if (notification.taskId) {
          onNavigate(notification.taskId);
      }
  };

  // --- Calendar Logic ---

  const navigateDate = (direction: number) => {
      const newDate = new Date(currentDate);
      if (calendarView === 'weekly') {
          newDate.setDate(newDate.getDate() + (direction * 7));
      } else if (calendarView === 'monthly') {
          newDate.setMonth(newDate.getMonth() + direction);
      } else if (calendarView === 'yearly') {
          newDate.setFullYear(newDate.getFullYear() + direction);
      }
      setCurrentDate(newDate);
  };

  const getDaysForView = () => {
      const days = [];
      if (calendarView === 'weekly') {
          // Start from Sunday of the current week
          const startOfWeek = new Date(currentDate);
          startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
          for (let i = 0; i < 7; i++) {
              const d = new Date(startOfWeek);
              d.setDate(startOfWeek.getDate() + i);
              days.push(d);
          }
      } else if (calendarView === 'monthly') {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          for (let i = 1; i <= daysInMonth; i++) {
              days.push(new Date(year, month, i));
          }
      }
      return days;
  };

  const hasTaskOnDate = (date: Date) => {
      const dateStr = date.toLocaleDateString('pt-BR'); // DD/MM/YYYY
      // Check if any of myTasks has this due date
      // Assuming task.data_vencimento matches DD/MM/YYYY format or similar
      return myTasks.some(t => t.data_vencimento === dateStr);
  };

  const isToday = (date: Date) => {
      const today = new Date();
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
  };

  const isSelectedDate = (date: Date) => {
      // For weekly view, maybe highlight today or selected? 
      // Let's just highlight today for now as "selected" concept isn't fully interactive yet
      return isToday(date);
  };

  if (!currentUser) return <div className="p-8 text-center text-gray-500">Faça login para ver seu painel.</div>;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 space-y-8 bg-gray-50/50 dark:bg-black/20">
      
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header com Gradiente e Stats */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gradient-to-r dark:from-zinc-900 dark:to-black shadow-xl transition-colors">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gray-100/50 dark:bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-lm-yellow/10 rounded-full translate-y-1/3 -translate-x-1/3 blur-2xl"></div>
            
            <div className="relative p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">
                        {getGreeting()}, <span className="text-lm-yellow-dark dark:text-lm-yellow">{currentUser.name.split(' ')[0]}</span>!
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 text-lg max-w-xl">
                        Você tem <strong className="text-gray-900 dark:text-white">{myTasks.length} {myTasks.length === 1 ? 'obrigação pendente' : 'obrigações pendentes'}</strong>.
                    </p>
                </div>
                
                <div className="flex gap-4">
                    <div className="bg-gray-50 dark:bg-white/10 backdrop-blur-md border border-gray-100 dark:border-white/10 rounded-2xl p-4 min-w-[100px] text-center shadow-sm dark:shadow-none">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{myTasks.filter(t => getEffectivePriority(t) === 'ALTA').length}</div>
                        <div className="text-xs font-bold text-red-600 dark:text-red-300 uppercase tracking-wider">Alta Prioridade</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/10 backdrop-blur-md border border-gray-100 dark:border-white/10 rounded-2xl p-4 min-w-[100px] text-center shadow-sm dark:shadow-none">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{myMentions.filter(n => !n.isRead).length}</div>
                        <div className="text-xs font-bold text-lm-yellow-dark dark:text-lm-yellow uppercase tracking-wider">Novas Menções</div>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUNA 1 & 2: MINHAS OBRIGAÇÕES */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* PRAZOS PRÓXIMOS (CALENDÁRIO) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="text-lm-yellow-dark dark:text-lm-yellow" size={24} />
                        Prazos Próximos
                    </h2>
                    <div className="flex bg-white dark:bg-zinc-900 p-1 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                        <button 
                            onClick={() => setCalendarView('weekly')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${calendarView === 'weekly' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-lm-yellow-dark dark:text-lm-yellow shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                        >
                            Semanal
                        </button>
                        <button 
                            onClick={() => setCalendarView('monthly')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${calendarView === 'monthly' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-lm-yellow-dark dark:text-lm-yellow shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                        >
                            Mensal
                        </button>
                        <button 
                            onClick={() => setCalendarView('yearly')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${calendarView === 'yearly' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-lm-yellow-dark dark:text-lm-yellow shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                        >
                            Anual
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-6 relative">
                    {/* Navigation Controls */}
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                            <ChevronLeft size={20} className="text-gray-500 dark:text-gray-400" />
                        </button>
                        <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                            {calendarView === 'weekly' && `Semana de ${new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay())).toLocaleDateString('pt-BR')}`}
                            {calendarView === 'monthly' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            {calendarView === 'yearly' && currentDate.getFullYear()}
                        </span>
                        <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                            <ChevronRight size={20} className="text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    {calendarView === 'weekly' && (
                        <div className="flex justify-between gap-2 overflow-visible">
                            {getDaysForView().map((date, i) => {
                                const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                                const dayNum = date.getDate();
                                const today = isToday(date);
                                const hasTask = hasTaskOnDate(date);
                                
                                return (
                                    <div key={i} className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${today ? 'bg-lm-yellow text-gray-900 shadow-lg shadow-yellow-500/20 transform -translate-y-1' : 'bg-gray-50 dark:bg-zinc-800/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${today ? 'text-gray-800' : ''}`}>{dayName}</span>
                                        <span className="text-xl font-bold">{dayNum}</span>
                                        <div className="h-1.5 flex gap-0.5">
                                            {hasTask && <div className={`w-1.5 h-1.5 rounded-full ${today ? 'bg-gray-900' : 'bg-lm-yellow'}`}></div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {calendarView === 'monthly' && (
                        <div className="space-y-2">
                            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                                    <div key={`${d}-${i}`} className="text-[10px] font-bold text-gray-400">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center">
                                {getDaysForView().map((date, i) => {
                                    const day = date.getDate();
                                    const today = isToday(date);
                                    const hasTask = hasTaskOnDate(date);
                                    return (
                                        <div key={i} className={`h-9 w-9 mx-auto flex flex-col items-center justify-center rounded-lg text-xs font-medium cursor-pointer transition-all relative ${today ? 'bg-lm-yellow text-gray-900 font-bold shadow-sm' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}>
                                            {day}
                                            {hasTask && <div className={`absolute bottom-1 w-1 h-1 rounded-full ${today ? 'bg-gray-900' : 'bg-lm-yellow'}`}></div>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {calendarView === 'yearly' && (
                        <div className="grid grid-cols-3 gap-3">
                            {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => {
                                const isCurrentMonth = i === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
                                return (
                                    <div 
                                        key={m} 
                                        onClick={() => {
                                            const newDate = new Date(currentDate);
                                            newDate.setMonth(i);
                                            setCurrentDate(newDate);
                                            setCalendarView('monthly');
                                        }}
                                        className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${isCurrentMonth ? 'bg-yellow-50 dark:bg-yellow-900/20 border-lm-yellow dark:border-yellow-800' : 'bg-gray-50 dark:bg-zinc-800/30 border-transparent hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                                    >
                                        <span className={`text-xs font-bold ${isCurrentMonth ? 'text-lm-yellow-dark dark:text-lm-yellow' : 'text-gray-600 dark:text-gray-400'}`}>{m}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* LISTA DE OBRIGAÇÕES */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <CheckSquare className="text-lm-yellow-dark dark:text-lm-yellow" size={24} />
                    Minhas Obrigações
                </h2>
                <span className="text-xs font-bold bg-lm-yellow/20 text-lm-yellow-dark dark:text-lm-yellow px-3 py-1 rounded-full">
                    {myTasks.length} Pendentes
                </span>
                </div>

                {myTasks.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 text-center border border-gray-100 dark:border-zinc-800 shadow-sm">
                    <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckSquare size={40} className="text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tudo em dia!</h3>
                    <p className="text-gray-500 dark:text-gray-400">Você não tem nenhuma obrigação pendente no momento.</p>
                </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myTasks.map((task, idx) => {
                        const effectivePriority = getEffectivePriority(task);
                        return (
                        <motion.div 
                            key={task.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => onNavigate(task.id)}
                            className="group bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-lg hover:border-lm-yellow/50 dark:hover:border-lm-yellow/30 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className={`absolute top-0 left-0 w-full h-1 ${
                            effectivePriority === 'ALTA' ? 'bg-red-500' : 
                            effectivePriority === 'MÉDIA' ? 'bg-orange-500' : 'bg-green-500'
                            }`}></div>
                            
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                #{task.id}
                                </span>
                                {effectivePriority === 'ALTA' && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
                                    <AlertCircle size={12} /> Alta Prioridade
                                </span>
                                )}
                            </div>
                            
                            <h3 className="font-bold text-gray-900 dark:text-white text-base mb-2 truncate" title={task.name}>
                                {task.name}
                            </h3>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                                <Building2 size={14} />
                                <span className="font-mono">{task.cnpj}</span>
                                <span className="text-gray-300">|</span>
                                <span className="uppercase">{task.regime}</span>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-auto">
                                {task.respFiscal === currentUser.name && (
                                    <span className="text-[10px] px-2 py-1 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-zinc-700">Fiscal: <strong>{task.statusFiscal}</strong></span>
                                )}
                                {task.respContabil === currentUser.name && (
                                    <span className="text-[10px] px-2 py-1 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-zinc-700">Contábil: <strong>{task.statusContabil}</strong></span>
                                )}
                            </div>
                            
                            <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                <div className="w-8 h-8 bg-lm-yellow/20 dark:bg-lm-yellow/10 rounded-full flex items-center justify-center text-lm-yellow-dark dark:text-lm-yellow">
                                    <ArrowRight size={16} />
                                </div>
                            </div>
                        </motion.div>
                        );
                    })}
                </div>
                )}
            </div>
          </div>

          {/* COLUNA 3: MENÇÕES RECENTES & MODIFICAÇÕES */}
          <div className="space-y-8">
            {/* MENÇÕES */}
            <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="text-lm-yellow-dark dark:text-lm-yellow" size={24} />
                Menções
              </h2>
              {myMentions.some(n => !n.isRead) && (
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col max-h-[400px]">
              {myMentions.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={24} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma menção recente.</p>
                </div>
              ) : (
                <div className="overflow-y-auto custom-scrollbar p-3 space-y-3">
                  {myMentions.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                        notif.isRead 
                          ? 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-zinc-800/50' 
                          : 'bg-lm-yellow/10 dark:bg-lm-yellow/5 border-lm-yellow/20 dark:border-lm-yellow/10'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 border-2 border-white dark:border-zinc-800 shadow-sm">
                              {notif.sender.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{notif.sender}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                          <Clock size={10} />
                          {notif.timestamp.split(' ')[1] || notif.timestamp}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-3 pl-10 leading-relaxed">
                        {notif.message?.replace(`Mencionou você num comentário em: `, '').replace(`Mencionou você na descrição de: `, '')}
                      </p>
                      
                      <div className="pl-10 flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">
                              {notif.message?.includes('comentário') ? 'Comentário' : 'Descrição'}
                          </span>
                          {!notif.isRead && (
                              <span className="text-[10px] font-bold text-lm-yellow-dark dark:text-lm-yellow ml-auto flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-lm-yellow"></span> Nova
                              </span>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>

            {/* MODIFICAÇÕES DO DIA */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Activity className="text-lm-yellow-dark dark:text-lm-yellow" size={24} />
                        Modificações do Dia
                    </h2>
                </div>
                
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col max-h-[300px]">
                    {dailyModifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <Activity size={24} className="text-gray-400 mx-auto mb-2 opacity-50" />
                            <p className="text-xs text-gray-500 dark:text-gray-400">Nenhuma modificação hoje.</p>
                        </div>
                    ) : (
                        <div className="overflow-y-auto custom-scrollbar p-3 space-y-3">
                            {dailyModifications.map(log => (
                                <div key={log.id} className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{log.user}</span>
                                        <span className="text-[10px] text-gray-400">{log.timestamp.split(' ')[1]}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                                        {formatLogDescription(log.details)}
                                    </p>
                                    {log.taskName && (
                                        <div className="mt-1">
                                            <span className="text-[9px] font-mono bg-white dark:bg-zinc-900 text-gray-500 px-1 py-0.5 rounded border border-gray-200 dark:border-zinc-700 truncate max-w-full block">
                                                {log.taskName}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MyDay;
