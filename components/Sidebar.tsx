

import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Users, ChevronsLeft, FolderOpen, PieChart, LogOut, Settings, Moon, Sun, Building2, Shield, Bell, Check, Trash2, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TasksContext';
import { useToast } from '../contexts/ToastContext';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
  onNavigate: (taskId: string) => void;
  clearFilters: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar, activeView, setActiveView, onNavigate, clearFilters }) => {
  const { currentUser, logout, isAdmin, adminMode, setAdminMode } = useAuth();
  const { settings, updateSetting, notifications, unreadCount, markAllNotificationsRead, markNotificationRead, activeYear, setActiveYear, availableYears } = useTasks();
  const { addNotification } = useToast();
  const isDarkMode = settings.theme === 'dark';
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const yearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (yearRef.current && !yearRef.current.contains(event.target as Node)) {
        setYearDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
     updateSetting('theme', isDarkMode ? 'light' : 'dark');
  };

  const handleNotificationClick = (notif: any) => {
      if (!notif.isRead) {
          markNotificationRead(notif.id);
      }
      if (notif.taskId) {
          onNavigate(notif.taskId);
          setShowNotifications(false);
      }
  };

  const NotificationDropdown = () => (
    <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-[#09090b] rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Notificações</h3>
            {unreadCount > 0 && (
                <button 
                    onClick={(e) => { e.stopPropagation(); markAllNotificationsRead(); }}
                    className="text-xs text-lm-yellow hover:text-yellow-600 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                >
                    <Check size={12} /> Marcar todas como lido
                </button>
            )}
        </div>
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 dark:text-gray-600">
                    <Bell size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">Nenhuma notificação</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-50 dark:divide-zinc-800">
                    {notifications.map(notif => (
                        <div 
                            key={notif.id} 
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-4 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors relative group cursor-pointer ${!notif.isRead ? 'bg-yellow-50/30 dark:bg-yellow-900/10' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-bold text-gray-900 dark:text-white">{notif.sender}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400">{notif.timestamp}</span>
                                    {!notif.isRead && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); markNotificationRead(notif.id); }}
                                            className="p-1 text-gray-400 hover:text-lm-yellow transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
                                            title="Marcar como lida"
                                        >
                                            <Check size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">{notif.message}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );

  if (!isOpen) {
    return (
        <div className="fixed top-6 left-6 z-50 flex flex-col gap-2 animate-fade-in">
            <button onClick={toggleSidebar} className="p-3 bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-300 hover:text-lm-dark dark:hover:text-white rounded-xl shadow-card border border-gray-100 dark:border-zinc-800 hover:scale-105 transition-all">
                <FolderOpen size={20} />
            </button>
            <div className="relative" ref={notifRef}>
                <button 
                    onClick={() => setShowNotifications(!showNotifications)} 
                    className="p-3 bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-300 hover:text-lm-dark dark:hover:text-white rounded-xl shadow-card border border-gray-100 dark:border-zinc-800 hover:scale-105 transition-all relative"
                >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900"></span>
                    )}
                </button>
                {showNotifications && <NotificationDropdown />}
            </div>
        </div>
    )
  }

  const menuItems = [
    { id: 'my_day', label: 'Meu Dia', icon: Sun },
    { id: 'my_obligations', label: 'Minhas Tarefas', icon: FolderOpen },
    { id: 'kanban', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'reports', label: 'Relatórios', icon: PieChart },
    { id: 'team', label: 'Colaboradores', icon: Users },
    ...(isAdmin && adminMode ? [
        { id: 'companies', label: 'Empresas', icon: Building2 },
        { id: 'audit_log', label: 'Auditoria', icon: Shield }
    ] : []),
    { id: 'settings', label: 'Configurações', icon: Settings }, 
  ];

  return (
    <div className="h-screen w-[280px] bg-white dark:bg-black border-r border-gray-200 dark:border-zinc-900 flex flex-col flex-shrink-0 transition-all duration-300 relative z-40">
      
      <div className="px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <img 
              src="https://i.imgur.com/jLQaW2W.png" 
              alt="L&M Logo" 
              className={`w-10 h-auto object-contain ${isDarkMode ? 'hidden' : 'block'}`}
            />
            <img 
              src="https://i.imgur.com/65bHdqS.png" 
              alt="L&M Logo Dark" 
              className={`w-10 h-auto object-contain ${isDarkMode ? 'block' : 'hidden'}`}
            />
            <div className="flex flex-col">
                <span className="font-extrabold text-gray-900 dark:text-white leading-none text-base tracking-tight">L&M Controle</span>
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider mt-1">Assessoria Contábil</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="relative" ref={notifRef}>
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-lg transition-all relative"
                >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-zinc-900"></span>
                    )}
                </button>
                {showNotifications && <NotificationDropdown />}
            </div>
            <button 
            onClick={toggleSidebar}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-lg transition-all"
            >
            <ChevronsLeft size={18} />
            </button>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
        <p className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider mb-2 mt-2">Menu Principal</p>
        
        {menuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
                <button
                key={item.id}
                onClick={() => {
                    clearFilters();
                    setActiveView(item.id);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                    isActive 
                    ? 'bg-gray-50 dark:bg-zinc-900 text-lm-dark dark:text-white' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                >
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-lm-yellow rounded-r-full"></div>
                )}
                <div className="relative">
                    <item.icon size={20} className={`transition-colors ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                </div>
                {item.label}
                </button>
            )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-zinc-900">
        
        {/* Year Selector */}
        <div className="relative mb-3" ref={yearRef}>
            <button 
                onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-900 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    Ano: {activeYear}
                </span>
                <div className={`transition-transform duration-200 ${yearDropdownOpen ? 'rotate-180' : ''}`}>
                    <ChevronsLeft size={14} className="-rotate-90" />
                </div>
            </button>
            
            {yearDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-[#09090b] rounded-xl shadow-xl border border-gray-200 dark:border-zinc-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                        {availableYears.map(year => (
                            <button
                                key={year}
                                onClick={() => {
                                    setActiveYear(year);
                                    setYearDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-between ${
                                    activeYear === year 
                                    ? 'bg-lm-yellow/10 text-lm-yellow' 
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900'
                                }`}
                            >
                                {year}
                                {activeYear === year && <Check size={12} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {isAdmin && (
            <button 
                onClick={() => setAdminMode(!adminMode)}
                className="w-full mb-3 flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-900 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Shield size={14} className={adminMode ? 'text-lm-yellow' : 'text-gray-400'} />
                    Modo Admin
                </span>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${adminMode ? 'bg-lm-yellow' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${adminMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
            </button>
        )}

        <button 
            onClick={toggleTheme}
            className="w-full mb-3 flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-900 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        >
            <span className="flex items-center gap-2">
                {isDarkMode ? <Moon size={14} /> : <Sun size={14} />}
                {isDarkMode ? 'Modo Escuro' : 'Modo Claro'}
            </span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${isDarkMode ? 'bg-lm-yellow' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${isDarkMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
        </button>

        {currentUser ? (
            <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-3 flex items-center justify-between group hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors cursor-default border border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white font-bold flex items-center justify-center shrink-0 shadow-sm text-sm">
                        {currentUser.name.charAt(0)}
                    </div>
                    <div className="flex flex-col truncate">
                        <span className="text-sm font-bold text-gray-900 dark:text-white truncate" title={currentUser.name}>
                            {currentUser.name.split(' ')[0]}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium truncate">
                            {currentUser.department || 'Colaborador'}
                        </span>
                    </div>
                </div>
                <button 
                    onClick={() => logout()}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-all shadow-none hover:shadow-sm"
                    title="Sair"
                >
                    <LogOut size={16} />
                </button>
            </div>
        ) : null}
      </div>
    </div>
  );
};

export default Sidebar;
