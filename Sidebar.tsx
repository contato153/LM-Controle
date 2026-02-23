
import React from 'react';
import { LayoutDashboard, Users, Settings, Database, ChevronsLeft, FolderOpen, PieChart, CheckCircle2 } from 'lucide-react';
import { GOOGLE_CREDENTIALS } from '../config/credentials';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar, activeView, setActiveView }) => {
  if (!isOpen) {
    return (
        <div className="fixed top-4 left-4 z-50">
            <button onClick={toggleSidebar} className="p-2 hover:bg-gray-200 rounded text-gray-500 transition-colors bg-white shadow-sm border border-gray-200">
                <FolderOpen size={20} />
            </button>
        </div>
    )
  }

  const menuItems = [
    { id: 'kanban', label: 'Controle de Obrigações', icon: LayoutDashboard },
    { id: 'team', label: 'Colaboradores', icon: Users },
    { id: 'reports', label: 'Relatórios', icon: PieChart },
    { id: 'data', label: 'Planilha Fonte', icon: Database },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="h-screen w-64 bg-[#F7F7F5] border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-300">
      {/* Header */}
      <div className="p-4 flex items-center justify-between group">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-lm-yellow flex items-center justify-center text-xs font-bold text-gray-800 shadow-sm">
            L&M
          </div>
          <span className="font-semibold text-gray-700 text-sm truncate">L&M Controle</span>
        </div>
        <button 
          onClick={toggleSidebar}
          className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronsLeft size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        <div className="space-y-0.5">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                activeView === item.id 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-200/50'
              }`}
            >
              <item.icon size={16} className={activeView === item.id ? "text-lm-dark" : "text-gray-500"} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-8 px-3">
          <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Filtros Rápidos</p>
          <button className="w-full flex items-center gap-2 px-0 py-1.5 text-sm text-gray-600 hover:bg-gray-200/50 rounded-sm">
             <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
             <span>Lucro Real</span>
          </button>
          <button className="w-full flex items-center gap-2 px-0 py-1.5 text-sm text-gray-600 hover:bg-gray-200/50 rounded-sm">
             <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
             <span>Lucro Presumido</span>
          </button>
          <button className="w-full flex items-center gap-2 px-0 py-1.5 text-sm text-gray-600 hover:bg-gray-200/50 rounded-sm">
             <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"></span>
             <span>Prioridade Alta</span>
          </button>
        </div>
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-green-700 font-medium">
                <CheckCircle2 size={12} className="text-green-600" />
                Planilha Sincronizada
            </div>
            <div className="text-[10px] text-gray-400 truncate" title={GOOGLE_CREDENTIALS.client_email}>
                {GOOGLE_CREDENTIALS.client_email}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
