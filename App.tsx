

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import KanbanColumn from './components/KanbanColumn'; 
import OverviewTable from './components/OverviewTable';
import Login from './components/Login';
import ReportsDashboard from './components/ReportsDashboard';
import TeamView from './components/TeamView';
import SettingsView from './components/SettingsView';
import TaskDrawer from './components/TaskDrawer';
import { CompanyTask, COLUMNS_FISCAL, COLUMNS_CONTABIL, COLUMNS_BALANCO, COLUMNS_ECD, COLUMNS_LUCRO_REINF, COLUMNS_REINF, Department } from './types';
import { Search, RefreshCw, X, ChevronDown, Calculator, Receipt, Filter, ArrowUpDown, FileBarChart, Scale, CheckCircle2, Bell } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useTasks } from './contexts/TasksContext';
import { useToast } from './contexts/ToastContext';
import { useTaskFilters } from './hooks/useTaskFilters';

// --- COMPONENTE SKELETON (LOADER VISUAL) ---
const SkeletonLoader = () => (
  <div className="flex h-screen w-full bg-gray-50 dark:bg-black overflow-hidden font-sans transition-colors duration-300">
    {/* Sidebar Skeleton */}
    <div className="hidden lg:flex flex-col w-[280px] bg-white dark:bg-black border-r border-gray-200 dark:border-zinc-900 h-full p-6 gap-8 z-20">
        <div className="flex items-center gap-3 mb-2 px-2">
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-zinc-800 animate-pulse shrink-0"></div>
            <div className="flex flex-col gap-2 w-full">
                <div className="h-4 w-32 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                <div className="h-2 w-20 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse"></div>
            </div>
        </div>
        <div className="space-y-2 mt-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 w-full bg-gray-100 dark:bg-zinc-900 rounded-xl animate-pulse"></div>
            ))}
        </div>
        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-zinc-900">
            <div className="h-12 w-full bg-gray-100 dark:bg-zinc-900 rounded-xl animate-pulse"></div>
        </div>
    </div>

    {/* Main Area Skeleton */}
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-black lg:rounded-l-[30px] lg:shadow-2xl overflow-hidden border-l border-gray-200 dark:border-zinc-900 relative z-10 ml-[-1px]">
        {/* Header Skeleton */}
        <div className="h-auto p-8 border-b border-gray-100 dark:border-zinc-900 flex flex-col gap-6 bg-gray-50/50 dark:bg-black/50">
            <div className="flex justify-between items-start">
                <div className="space-y-3">
                    <div className="h-8 w-48 bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse"></div>
                    <div className="h-4 w-32 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                </div>
                <div className="h-10 w-10 bg-gray-200 dark:bg-zinc-800 rounded-xl animate-pulse"></div>
            </div>
            {/* Filters Skeleton */}
            <div className="flex gap-3 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-9 w-28 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg animate-pulse shrink-0"></div>
                ))}
            </div>
        </div>

        {/* Kanban Columns Skeleton */}
        <div className="flex-1 p-8 pt-6 flex gap-6 overflow-hidden">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="w-80 lg:w-[340px] flex-shrink-0 flex flex-col h-full bg-gray-100/50 dark:bg-[#09090b] rounded-2xl border border-gray-200/60 dark:border-zinc-800 p-4 gap-4 animate-pulse">
                     <div className="flex items-center justify-between mb-2 px-1">
                         <div className="h-4 w-24 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                         <div className="h-5 w-8 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                     </div>
                     <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                         {[...Array(3)].map((_, j) => (
                             <div key={j} className="w-full h-44 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-5 flex flex-col justify-between shadow-sm">
                                 <div className="space-y-3">
                                     <div className="flex justify-between">
                                         <div className="h-3 w-10 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                                         <div className="h-4 w-16 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                                     </div>
                                     <div className="h-4 w-3/4 bg-gray-200 dark:bg-zinc-800 rounded mt-2"></div>
                                 </div>
                                 <div className="flex gap-2 mt-4">
                                     <div className="h-6 w-20 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                                     <div className="h-6 w-20 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>
            ))}
        </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const { currentUser } = useAuth();
  const { tasks, isLoading, refreshData, settings, collaborators, notifications, markNotificationRead, unreadCount } = useTasks();
  const { addNotification } = useToast();

  const [activeView, setActiveView] = useState('kanban'); 
  const [currentDept, setCurrentDept] = useState<Department>(Department.FISCAL);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [activeSubView, setActiveSubView] = useState<'LUCRO' | 'REINF' | 'BALANCETE' | 'BALANCO'>('BALANCETE');
  const [selectedTask, setSelectedTask] = useState<CompanyTask | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const {
      filteredTasks,
      searchQuery, setSearchQuery,
      filterRegime, setFilterRegime,
      filterPriority, setFilterPriority,
      filterResponsible, setFilterResponsible,
      filterStatus, setFilterStatus,
      sortOrder, setSortOrder,
      clearFilters
  } = useTaskFilters({ tasks, currentDept, activeView, activeSubView, currentUser, collaborators });

  useEffect(() => {
      if (currentUser && settings.defaultDepartment) {
          setCurrentDept(settings.defaultDepartment);
      }
  }, [currentUser, settings.defaultDepartment]);

  useEffect(() => { 
      clearFilters();
  }, [activeView]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
            setShowNotifications(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!currentUser) return <Login />;
  
  // SKELETON LOADING STATE
  if (isLoading && tasks.length === 0) {
      return <SkeletonLoader />;
  }

  // --- VISIBLE DEPARTMENTS LOGIC ---
  // Modificado: Agora "Minhas Tarefas" mostra todas as abas, assim como a Visão Geral.
  // O filtro de tarefas (useTaskFilters) garante que o usuário só veja o que é dele dentro de cada aba.
  const getVisibleDepartments = () => {
      return [Department.TODOS, Department.FISCAL, Department.CONTABIL, Department.LUCRO_REINF, Department.ECD, Department.ECF];
  };

  const getColumnsForDept = () => {
      switch (currentDept) {
          case Department.FISCAL: return COLUMNS_FISCAL;
          case Department.CONTABIL: return activeSubView === 'BALANCO' ? COLUMNS_BALANCO : COLUMNS_CONTABIL;
          case Department.LUCRO_REINF: return activeSubView === 'REINF' ? COLUMNS_REINF : COLUMNS_LUCRO_REINF;
          case Department.ECD: return COLUMNS_ECD;
          case Department.ECF: return COLUMNS_ECD.map(c => c.id === 'DISPENSADA' ? {...c, id: 'NÃO SE APLICA', title: 'Não se Aplica'} : c); 
          default: return COLUMNS_FISCAL;
      }
  };

  const handleNavigateToTask = (dept: Department, subView?: 'LUCRO' | 'REINF' | 'BALANCETE' | 'BALANCO', taskId?: string) => {
      setCurrentDept(dept);
      if (subView) setActiveSubView(subView);
      if (taskId) { 
          // Filtrar a view kanban em vez de abrir o drawer
          setSearchQuery(`id:${taskId}`); 
          setFilterRegime(''); 
          setFilterPriority(''); 
          setFilterResponsible(''); 
          setFilterStatus(''); 
      }
      // Se não estiver em Minhas Tarefas, vai para Kanban global.
      // Se estiver em Minhas Tarefas, PERMANECE lá (mas muda o departamento acima).
      if (activeView !== 'my_obligations') setActiveView('kanban');
  };

  const renderKanbanView = () => (
    <div className="h-full flex flex-col animate-enter">
      <div className={`flex-shrink-0 z-30 sticky top-0 bg-gray-50/95 dark:bg-black/95 backdrop-blur-md border-b border-gray-200 dark:border-zinc-900 transition-colors ${settings.reduceMotion ? '' : 'duration-300'}`}>
          <div className="px-8 pt-6 pb-2">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight transition-colors">
                        {activeView === 'my_obligations' ? `Minhas Tarefas: ${currentDept === Department.TODOS ? 'Visão Geral' : currentDept}` : currentDept}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1 transition-colors">
                        {filteredTasks.length} {filteredTasks.length === 1 ? 'obrigação listada' : 'obrigações listadas'}
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* NOTIFICATION BELL */}
                    <div className="relative" ref={notifRef}>
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`p-2.5 rounded-xl border transition-all shadow-sm ${showNotifications ? 'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-white border-gray-300 dark:border-zinc-600' : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-400 hover:text-lm-dark dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'}`}
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-zinc-900 rounded-full"></span>
                            )}
                        </button>
                        
                        {showNotifications && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-800 overflow-hidden z-[60] animate-pop-in">
                                <div className="p-3 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-800/30">
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Notificações</span>
                                    {unreadCount > 0 && <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold">{unreadCount} nova(s)</span>}
                                </div>
                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400 text-xs">
                                            Nenhuma notificação no momento.
                                        </div>
                                    ) : (
                                        notifications.map(n => (
                                            <div 
                                                key={n.id} 
                                                onClick={() => {
                                                    markNotificationRead(n.id);
                                                    handleNavigateToTask(Department.TODOS, undefined, n.taskId);
                                                    setShowNotifications(false);
                                                }}
                                                className={`p-3 border-b border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors relative ${!n.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                            >
                                                {!n.isRead && <div className="absolute left-2 top-4 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
                                                <div className="pl-3">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-bold text-xs text-gray-800 dark:text-gray-200">{n.sender}</span>
                                                        <span className="text-[9px] text-gray-400">{n.timestamp.split(' ')[0]}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{n.message}</p>
                                                    <div className="mt-1.5">
                                                        <span className="text-[9px] font-mono bg-gray-100 dark:bg-zinc-800 text-gray-500 px-1 py-0.5 rounded border border-gray-200 dark:border-zinc-700">#{n.taskId}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={() => refreshData()} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-2.5 rounded-xl text-gray-400 hover:text-lm-dark dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-all shadow-sm">
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                <div className="bg-white dark:bg-zinc-900 p-1 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex overflow-x-auto no-scrollbar transition-colors">
                    {getVisibleDepartments().map((dept) => (
                        <button key={dept} onClick={() => setCurrentDept(dept)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${currentDept === dept ? 'bg-gray-900 dark:bg-zinc-700 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800'}`}>
                            {dept}
                        </button>
                    ))}
                </div>
                {currentDept === Department.CONTABIL && (
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm transition-colors animate-enter">
                         <button onClick={() => setActiveSubView('BALANCETE')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubView === 'BALANCETE' ? 'bg-lm-yellow/20 dark:bg-lm-yellow/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}><FileBarChart size={14} /> Balancete</button>
                         <div className="w-px h-4 bg-gray-200 dark:bg-zinc-800"></div>
                         <button onClick={() => setActiveSubView('BALANCO')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubView === 'BALANCO' ? 'bg-lm-yellow/20 dark:bg-lm-yellow/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}><Scale size={14} /> Balanço Patrimonial</button>
                    </div>
                )}
                {currentDept === Department.LUCRO_REINF && (
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm transition-colors animate-enter">
                        <button onClick={() => setActiveSubView('LUCRO')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubView === 'LUCRO' ? 'bg-lm-yellow/20 dark:bg-lm-yellow/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}><Calculator size={14} /> Distribuição de Lucro</button>
                        <div className="w-px h-4 bg-gray-200 dark:bg-zinc-800"></div>
                        <button onClick={() => setActiveSubView('REINF')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubView === 'REINF' ? 'bg-lm-yellow/20 dark:bg-lm-yellow/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}><Receipt size={14} /> EFD-Reinf</button>
                    </div>
                )}
            </div>
            
            <div className="flex flex-col lg:flex-row gap-3 pb-4">
                <div className="relative flex-1 max-w-md group animate-pop-in">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-lm-dark dark:group-focus-within:text-white transition-colors" />
                    <input type="text" placeholder="Buscar por nome, CNPJ ou código..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-zinc-700 focus:border-gray-400 dark:focus:border-zinc-600 shadow-sm transition-all" />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                     <div className="relative animate-pop-in">
                        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="appearance-none pl-9 pr-8 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-100 dark:focus:ring-zinc-800 cursor-pointer transition-colors">
                            <option value="LAST_MODIFIED_DESC">Recentes (Última Alteração)</option>
                            <option value="LAST_MODIFIED_ASC">Antigos (Última Alteração)</option>
                            <option value="ID_ASC">ID (Menor → Maior)</option>
                            <option value="ID_DESC">ID (Maior → Menor)</option>
                            <option value="NAME_ASC">Nome (A → Z)</option>
                            <option value="NAME_DESC">Nome (Z → A)</option>
                        </select>
                        <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <div className="relative animate-pop-in">
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="appearance-none pl-9 pr-8 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-100 dark:focus:ring-zinc-800 cursor-pointer transition-colors">
                            <option value="">Status da Empresa</option><option value="HAS_FINISHED">Com alguma tarefa executada</option>
                        </select>
                        <CheckCircle2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                     <div className="relative animate-pop-in">
                        <select value={filterRegime} onChange={(e) => setFilterRegime(e.target.value)} className="appearance-none pl-9 pr-8 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-100 dark:focus:ring-zinc-800 cursor-pointer transition-colors">
                            <option value="">Regime</option><option value="LUCRO REAL">Real</option><option value="LUCRO PRESUMIDO">Presumido</option><option value="SIMPLES NACIONAL">Simples</option><option value="IMUNE/ISENTA">Imune/Isenta</option>
                        </select>
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <div className="relative animate-pop-in">
                        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="appearance-none pl-9 pr-8 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-100 dark:focus:ring-zinc-800 cursor-pointer transition-colors">
                            <option value="">Prioridade</option><option value="ALTA">Alta</option><option value="MÉDIA">Média</option><option value="BAIXA">Baixa</option>
                        </select>
                         <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-gray-300 dark:border-gray-500"></div>
                    </div>
                    {activeView !== 'my_obligations' && (
                        <div className="relative animate-pop-in">
                            <select value={filterResponsible} onChange={(e) => setFilterResponsible(e.target.value)} className="appearance-none pl-3 pr-8 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-100 dark:focus:ring-zinc-800 cursor-pointer w-40 truncate transition-colors">
                                <option value="">Todos</option><option value="HAS_RESPONSIBLE" className="text-green-600 font-bold">● Com Resp</option><option value="NO_RESPONSIBLE" className="text-red-500 font-bold">○ Sem Resp</option><hr />
                                {collaborators.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    )}
                    {(filterRegime || filterPriority || filterResponsible || filterStatus || searchQuery) && (
                        <button onClick={clearFilters} className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors animate-pop-in"><X size={18} /></button>
                    )}
                </div>
            </div>
          </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 lg:p-8 pt-4">
            {currentDept === Department.TODOS ? (
                <OverviewTable 
                    tasks={filteredTasks} 
                    onNavigate={handleNavigateToTask}
                    onTaskSelect={setSelectedTask}
                    activeView={activeView}
                />
            ) : (
                <div className="flex h-full gap-6">
                {getColumnsForDept().map((col) => {
                    let statusField: keyof CompanyTask = 'statusFiscal';
                    let responsibleField: keyof CompanyTask = 'respFiscal';
                    switch (currentDept) {
                        case Department.FISCAL: statusField = 'statusFiscal'; responsibleField = 'respFiscal'; break;
                        case Department.CONTABIL: statusField = activeSubView === 'BALANCO' ? 'statusBalanco' : 'statusContabil'; responsibleField = activeSubView === 'BALANCO' ? 'respBalanco' : 'respContabil'; break;
                        case Department.LUCRO_REINF: statusField = activeSubView === 'REINF' ? 'statusReinf' : 'statusLucro'; responsibleField = activeSubView === 'REINF' ? 'respReinf' : 'respLucro'; break;
                        case Department.ECD: statusField = 'statusECD'; responsibleField = 'respECD'; break;
                        case Department.ECF: statusField = 'statusECF'; responsibleField = 'respECF'; break;
                    }
                    const colTasks = filteredTasks.filter(t => t[statusField] === col.id);
                    return (
                        <KanbanColumn
                            key={col.id}
                            id={col.id}
                            title={col.title}
                            color={col.color}
                            tasks={colTasks}
                            currentDept={currentDept}
                            onCardClick={setSelectedTask}
                            activeView={activeView}
                            statusField={statusField}
                            responsibleField={responsibleField}
                        />
                    );
                })}
                </div>
            )}
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen w-full bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 font-sans overflow-hidden transition-colors ${settings.reduceMotion ? '' : 'duration-300'}`}>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} activeView={activeView} setActiveView={setActiveView} />
      <main className={`flex-1 flex flex-col h-full relative shadow-2xl rounded-l-[30px] overflow-hidden bg-white dark:bg-black ml-[-20px] z-0 transition-colors border-l border-gray-200 dark:border-zinc-900 ${settings.reduceMotion ? '' : 'duration-300'}`}>
        <div className="flex-1 w-full h-full overflow-hidden">
            {(activeView === 'kanban' || activeView === 'my_obligations') && renderKanbanView()}
            {activeView === 'reports' && <ReportsDashboard />}
            {activeView === 'team' && <TeamView />}
            {activeView === 'settings' && <SettingsView />}
        </div>
      </main>
      {selectedTask && <TaskDrawer task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} onNotify={(title, msg) => addNotification(title, msg, 'success')} />}
    </div>
  );
};

export default App;