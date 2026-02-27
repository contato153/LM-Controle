
import React, { memo, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { CompanyTask, DemandType, isFiscalFinished, getEffectivePriority } from '../types';
import { Building2, AlertTriangle, User, Lock, Search, History, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TasksContext';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';

interface KanbanCardProps {
  task: CompanyTask;
  currentDept: DemandType;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  density?: 'comfortable' | 'compact';
  onClick?: (task: CompanyTask) => void;
  responsibleField: keyof CompanyTask; 
  canEdit?: boolean;
}

// Helpers para Data
const parseBrDate = (str: string) => {
    if (!str) return null;
    const [day, month, year] = str.split('/');
    return new Date(Number(year), Number(month) - 1, Number(day));
};

const toIsoDate = (brDate?: string) => {
    if (!brDate || brDate.length !== 10) return '';
    const [day, month, year] = brDate.split('/');
    if (year.startsWith('00')) return `20${year.substring(2)}-${month}-${day}`;
    return `${year}-${month}-${day}`;
};

const toBrDate = (isoDate: string) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
};

const KanbanCard: React.FC<KanbanCardProps> = memo(({ 
    task, 
    currentDept, 
    onDragStart, 
    density = 'comfortable', 
    onClick, 
    responsibleField,
    canEdit: canEditProp
}) => {
  const { currentUser, isAdmin, isEffectiveAdmin, hasPermission } = useAuth();
  const { updateTask, collaborators, onlineUsers } = useTasks();
  const { addNotification } = useToast();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canEdit = canEditProp !== undefined ? canEditProp : hasPermission(currentDept);

  useEffect(() => {
    const handleClose = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleScroll = (event: Event) => {
        if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
        if (isDropdownOpen) setIsDropdownOpen(false);
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClose);
      window.addEventListener('scroll', handleScroll, true); 
    }
    return () => {
      document.removeEventListener('mousedown', handleClose);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isDropdownOpen]);

  useLayoutEffect(() => {
      if (isDropdownOpen && buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          const dropdownHeight = 300; 
          let topPos = rect.bottom + 8;
          let leftPos = rect.right - 256;
          if (spaceBelow < dropdownHeight) topPos = rect.top - dropdownHeight;
          if (topPos < 10) topPos = 10;
          if (leftPos < 10) leftPos = 10;
          setDropdownPos({ top: topPos, left: leftPos });
      }
  }, [isDropdownOpen]);

  const isContabilContext = currentDept === DemandType.CONTABIL; 
  const fiscalFinished = isFiscalFinished(task.statusFiscal);
  const isBlocked = isContabilContext && !fiscalFinished && !isEffectiveAdmin;

  const responsible = task[responsibleField] as string;
  
  // Use Helper de Prioridade Efetiva
  const effectivePriority = getEffectivePriority(task);
  const isHighPriority = effectivePriority === 'ALTA';
  
  const availableCollaborators = isEffectiveAdmin 
      ? collaborators 
      : collaborators.filter(c => c.id === currentUser?.id);

  const filteredCollaborators = availableCollaborators.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
      if (isDropdownOpen) {
          e.preventDefault();
          return;
      }
      if (isBlocked) {
          e.preventDefault();
          addNotification("Movimentação Bloqueada", "O Departamento Fiscal deve finalizar esta tarefa antes que ela possa ser movida no Contábil.", "warning");
          return;
      }
      if (!isEffectiveAdmin && !responsible) {
          e.preventDefault();
          addNotification("Ação Bloqueada", "É necessário atribuir um responsável antes de mover esta tarefa.", "warning");
          return;
      }
      onDragStart(e, task.id);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      const newDate = toBrDate(e.target.value);
      updateTask(task, 'dueDate', newDate);
  };
  
  const isCompact = density === 'compact';
  const p = isCompact ? 'p-3' : 'p-5';
  const mb = isCompact ? 'mb-2' : 'mb-3';
  
  const getRegimeColor = (r: string) => {
      if (!r) return 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-600';
      const regime = r.toUpperCase();
      if (regime.includes('REAL')) return 'bg-gray-800 dark:bg-zinc-700 text-white dark:text-white border-gray-800 dark:border-zinc-600'; 
      if (regime.includes('PRESUMIDO')) return 'bg-lm-yellow text-gray-900 border-lm-yellow';
      if (regime.includes('SIMPLES')) return 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
      if (regime.includes('IMUNE') || regime.includes('ISENTA')) return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      return 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-600';
  }

  const getPriorityStyle = (p: string) => {
    const priority = p ? p.toUpperCase() : 'BAIXA';
    if (priority.includes('ALTA')) return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-900/50 ring-1 ring-red-100 dark:ring-red-900/30';
    if (priority.includes('MÉDIA')) return 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-900/50 ring-1 ring-orange-100 dark:ring-orange-900/30';
    return 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-900/50 ring-1 ring-green-100 dark:ring-green-900/30';
  };

  // Logic for Due Date
  const getDueDateStatus = () => {
      if (!task.dueDate) return null;
      const date = parseBrDate(task.dueDate);
      if (!date) return null;
      
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const diffTime = date.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const isDone = isFiscalFinished(task.statusFiscal);

      // Se finalizada, verde
      if (isDone) return { color: 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800', icon: Calendar, text: task.dueDate };

      // Se atrasada, vermelha
      if (diffDays < 0) return { color: 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 font-bold', icon: AlertTriangle, text: task.dueDate };
      
      // Se próximo (3 dias), amarelo
      if (diffDays <= 3) return { color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 font-bold', icon: Calendar, text: task.dueDate };
      
      // Normal
      return { color: 'text-gray-500 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700', icon: Calendar, text: task.dueDate };
  };

  const dueStatus = getDueDateStatus();
  const dateStyle = dueStatus ? dueStatus.color : 'text-gray-500 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-700';
  const DateIcon = dueStatus ? dueStatus.icon : Calendar;

  const renderStatusOverview = () => {
    const statuses = [
        { label: 'Fiscal', status: task.statusFiscal },
        { label: 'Balancete', status: task.statusContabil },
        { label: 'Balanço', status: task.statusBalanco },
        { label: 'Reinf', status: task.statusReinf },
    ];
    return (
        <div className={`flex flex-col pt-2 border-t border-gray-50 dark:border-zinc-800 ${isCompact ? 'mt-2' : 'mt-3'}`}>
            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider mb-1.5">Obrigações</span>
            <div className="grid grid-cols-4 gap-1">
                {statuses.map((item, idx) => {
                    const done = (item.status && ['FINALIZADA', 'ENVIADA', 'LUCRO LANÇADO', 'EFD ENVIADA', 'EFD RETIFICADA', 'DISPENSADA', 'NÃO SE APLICA', 'NÃO HÁ DISTRIBUIÇÃO'].includes(item.status.toUpperCase()));
                    const colorClasses = done ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400';
                    return (
                        <div key={idx} className={`py-1 text-[8px] sm:text-[9px] font-bold uppercase text-center border rounded transition-all truncate ${colorClasses}`}>
                            {item.label}
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0 }}
      draggable={!isDropdownOpen} 
      onDragStart={handleDragStart}
      onClick={() => { if (!isDropdownOpen && onClick) onClick(task); }}
      className={`relative rounded-xl border group overflow-hidden ${mb} ${isHighPriority ? 'border-red-200 dark:border-red-900/60 shadow-[0_0_10px_rgba(220,38,38,0.1)]' : 'border-gray-200 dark:border-zinc-700 shadow-sm hover:shadow-card'} bg-white dark:bg-zinc-900 hover:-translate-y-0.5 hover:shadow-md ${isDropdownOpen ? 'z-40' : 'z-0'} ${isBlocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'} select-none`}
    >
      {isBlocked && (
          <div className="absolute top-2 right-2 z-10 text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-zinc-800 p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 shadow-sm" title="O Fiscal precisa ser finalizado primeiro">
              <Lock size={12} />
          </div>
      )}

      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all duration-300 ${isHighPriority ? 'bg-red-500' : 'bg-lm-yellow opacity-0 group-hover:opacity-100'}`}></div>

      <div className={p}>
        <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0 pr-2">
                 <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[10px] font-bold text-gray-400 dark:text-gray-500">#{task.id}</span>
                    {isHighPriority && (
                        <div className="flex items-center gap-0.5 text-[9px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1 rounded">
                            <AlertTriangle size={8} />
                            PRIORIDADE
                        </div>
                    )}
                 </div>
                 <h4 className={`font-bold text-gray-900 dark:text-white leading-snug truncate ${isCompact ? 'text-sm' : 'text-base'}`} title={task.name}>
                    {task.name}
                </h4>
            </div>
        </div>

        {isBlocked && (
            <div className="mb-2 px-2 py-1.5 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-[10px] font-bold text-gray-500 flex items-center gap-1.5 justify-center">
                <Lock size={10} />
                Aguardando Finalização Fiscal
            </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border ${getRegimeColor(task.regime)}`}>
                {task.regime ? task.regime.replace('LUCRO ', '').replace('IMUNE/', '') : 'N/A'}
            </span>

            <div className="relative">
                <select 
                    value={task.prioridade || ''}
                    disabled={!canEdit}
                    onChange={(e) => { e.stopPropagation(); updateTask(task, 'prioridade', e.target.value) }}
                    className={`text-[10px] font-bold uppercase py-0.5 pl-2 pr-5 rounded-md border-0 appearance-none outline-none focus:ring-2 focus:ring-lm-yellow/50 transition-shadow ${getPriorityStyle(effectivePriority)} cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <option value="">Auto (Data)</option>
                    <option value="BAIXA">Baixa (Manual)</option>
                    <option value="MÉDIA">Média (Manual)</option>
                    <option value="ALTA">Alta (Manual)</option>
                </select>
                <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 text-current" />
            </div>

            <div 
                className={`relative group/date rounded-md transition-all cursor-pointer hover:ring-2 hover:ring-lm-yellow/50`}
                onMouseDown={(e) => e.stopPropagation()} 
                onPointerDown={(e) => e.stopPropagation()}
                title="Alterar Vencimento"
            >
                {/* Visible Part */}
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase transition-all pointer-events-none ${dateStyle}`}>
                     <DateIcon size={10} className="pointer-events-none" />
                     <span className="min-w-[40px] text-center">{task.dueDate || 'DATA'}</span>
                </div>
                
                {/* Input - Com classe especial para clique em toda área */}
                <input 
                    type="date" 
                    disabled={!canEdit}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 date-input-full disabled:cursor-not-allowed"
                    onChange={handleDateChange}
                    onKeyDown={(e) => e.preventDefault()}
                    onMouseDown={(e) => e.stopPropagation()} // Stop drag
                    onPointerDown={(e) => e.stopPropagation()} // Stop drag
                    onClick={(e) => e.stopPropagation()} // Stop opening TaskDrawer
                    value={toIsoDate(task.dueDate)}
                />
            </div>
        </div>

        {renderStatusOverview()}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-800 mt-1">
             <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400" title="CNPJ">
                <Building2 size={12} className="text-gray-400 dark:text-gray-500" />
                <span className="font-mono text-[10px]">{task.cnpj}</span>
             </div>

             <div className="relative">
                <button 
                    ref={buttonRef}
                    disabled={!canEdit}
                    title={!canEdit ? "Você não tem permissão para alterar o responsável" : "Alterar responsável"}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsDropdownOpen(!isDropdownOpen);
                        setSearchTerm('');
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all ${
                        responsible 
                        ? 'bg-gray-50 dark:bg-zinc-800 border-gray-100 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-500' 
                        : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20'
                    } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <User size={10} className={`${responsible ? "text-gray-400 dark:text-gray-500" : "text-red-400"} pointer-events-none`} />
                    <span className={`text-[10px] font-bold truncate max-w-[80px] ${responsible ? 'text-gray-600 dark:text-gray-300' : 'text-red-500'} pointer-events-none`}>
                        {responsible ? responsible.split(' ')[0] : 'Vazio'}
                    </span>
                </button>

                {isDropdownOpen && responsibleField && createPortal(
                    <div 
                        ref={dropdownRef}
                        style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
                        className="w-64 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[9999] p-1 animate-pop-in origin-bottom-right overflow-hidden font-sans"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 p-2 border-b border-gray-50 dark:border-zinc-700">
                            <Search size={14} className="text-gray-400" />
                            <input 
                                autoFocus
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1 bg-transparent text-xs outline-none text-gray-700 dark:text-gray-200"
                            />
                        </div>
                        
                        <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
                            <button 
                                onClick={() => { updateTask(task, responsibleField, ''); setIsDropdownOpen(false); }}
                                className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mb-1"
                            >
                                Remover Responsável
                            </button>
                            
                            {filteredCollaborators.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => { updateTask(task, responsibleField, c.name); setIsDropdownOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                                        responsible === c.name 
                                        ? 'bg-lm-yellow/20 dark:bg-lm-yellow/10 text-gray-900 dark:text-white font-bold' 
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
                                    }`}
                                >
                                    {c.name}
                                    <div className="flex items-center gap-2">
                                        {onlineUsers.includes(String(c.id)) && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                                        )}
                                        {responsible === c.name && <div className="w-1.5 h-1.5 rounded-full bg-lm-yellow"></div>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>,
                    document.body
                )}
             </div>
        </div>

        {task.lastEditor && (
            <div className={`mt-2 pt-2 border-t border-gray-50 dark:border-zinc-800 flex items-center gap-1 text-[9px] text-gray-400 dark:text-gray-500 opacity-60 group-hover:opacity-100 transition-opacity`}>
                <History size={10} />
                <span className="truncate">{task.lastEditor}</span>
            </div>
        )}
      </div>
    </motion.div>
  );
}, (prev, next) => {
    return (
        prev.task.id === next.task.id &&
        prev.task.name === next.task.name &&
        prev.task.cnpj === next.task.cnpj &&
        prev.task.regime === next.task.regime &&
        prev.task.prioridade === next.task.prioridade &&
        prev.task.dueDate === next.task.dueDate &&
        prev.task.statusFiscal === next.task.statusFiscal &&
        prev.task.statusContabil === next.task.statusContabil &&
        prev.task.statusBalanco === next.task.statusBalanco &&
        prev.task.statusReinf === next.task.statusReinf &&
        prev.task.respFiscal === next.task.respFiscal &&
        prev.task.respContabil === next.task.respContabil &&
        prev.task.respBalanco === next.task.respBalanco &&
        prev.task.respReinf === next.task.respReinf &&
        prev.task.lastEditor === next.task.lastEditor &&
        prev.currentDept === next.currentDept &&
        prev.density === next.density &&
        prev.responsibleField === next.responsibleField
    );
});

const ChevronDown = ({ size, className }: { size: number, className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
);

export default KanbanCard;
