

import React from 'react';
import { LayoutDashboard, Users, ChevronsLeft, FolderOpen, PieChart, LogOut, Settings, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TasksContext';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar, activeView, setActiveView }) => {
  const { currentUser, logout } = useAuth();
  const { settings, updateSetting } = useTasks();
  const isDarkMode = settings.theme === 'dark';

  const toggleTheme = () => {
     updateSetting('theme', isDarkMode ? 'light' : 'dark');
  };

  if (!isOpen) {
    return (
        <div className="fixed top-6 left-6 z-50 animate-fade-in">
            <button onClick={toggleSidebar} className="p-3 bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-300 hover:text-lm-dark dark:hover:text-white rounded-xl shadow-card border border-gray-100 dark:border-zinc-800 hover:scale-105 transition-all">
                <FolderOpen size={20} />
            </button>
        </div>
    )
  }

  const menuItems = [
    { id: 'my_obligations', label: 'Minhas Tarefas', icon: FolderOpen },
    { id: 'kanban', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'reports', label: 'Relatórios', icon: PieChart },
    { id: 'team', label: 'Colaboradores', icon: Users },
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
        <button 
          onClick={toggleSidebar}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-lg transition-all"
        >
          <ChevronsLeft size={18} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
        <p className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider mb-2 mt-2">Menu Principal</p>
        
        {menuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
                <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
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
