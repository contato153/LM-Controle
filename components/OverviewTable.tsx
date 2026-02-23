
import React, { useState, useRef, useEffect, memo, useMemo, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { CompanyTask, Department, isFiscalFinished, getEffectivePriority } from '../types';
import { Building2, UserCircle2, Search, AlertCircle, History, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TasksContext';

interface OverviewTableProps {
  tasks: CompanyTask[];
  onNavigate: (dept: Department, subView?: 'LUCRO' | 'REINF' | 'BALANCETE' | 'BALANCO', taskId?: string) => void;
  onTaskSelect: (task: CompanyTask) => void;
  activeView?: string; 
}

const ResponsibleSelect = ({ value, field, task, isOpen, onToggle, onClose, disabled = false }: any) => {
    const { updateTask, collaborators } = useTasks();
    const { isAdmin, currentUser } = useAuth();
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 200 });

    useLayoutEffect(() => {
        if (isOpen && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const dropdownHeight = 200; // Aprox height
            
            // Default to opening downwards
            let top = rect.bottom + 4;
            
            // If near bottom, consider adjusting logic (simplified here to just follow trigger)
            if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                // Could open upwards logic here if needed, keeping simple for now
            }

            setPosition({
                top: top + window.scrollY,
                left: rect.left + window.scrollX,
                width: Math.max(rect.width, 220) // Min width 220px for better usability
            });
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as HTMLElement;
            // Check if click is inside the portal content
            if (target.closest('.responsible-dropdown-content')) return;
            // Check if click is on the trigger itself
            if (wrapperRef.current && wrapperRef.current.contains(target)) return;
            
            onClose();
        }
        
        function handleScroll(event: Event) {
             // Close on scroll to avoid floating detached element
             if ((event.target as HTMLElement).closest('.responsible-dropdown-content')) return;
             onClose();
        }

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", handleScroll, true);
        
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [wrapperRef, isOpen, onClose]);

    const availableCollaborators = isAdmin ? collaborators : collaborators.filter((c: any) => c.id === currentUser?.id);
    const filtered = availableCollaborators.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()));

    if (disabled) {
        return (
            <div className="flex items-center gap-2 px-2 py-1.5 opacity-50 cursor-not-allowed group relative bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-transparent w-full">
                 <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 flex items-center justify-center font-bold text-[9px] border border-gray-200 dark:border-zinc-700 flex-shrink-0">
                     <Lock size={10}/>
                 </div>
                 <span className="truncate font-medium text-xs text-gray-400 dark:text-gray-500 flex-1">Bloqueado</span>
            </div>
        );
    }

    return (
        <>
            <div 
                ref={wrapperRef}
                onClick={(e) => { e.stopPropagation(); onToggle(); setSearch(''); }}
                className={`flex items-center gap-2 text-xs transition-colors rounded-lg px-2 py-1.5 border border-transparent hover:bg-gray-200 dark:hover:bg-zinc-600 hover:border-gray-300 dark:hover:border-zinc-500 cursor-pointer group bg-transparent w-full`}
            >
                 <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-gray-300 flex items-center justify-center font-bold text-[9px] border border-gray-300 dark:border-zinc-600 group-hover:bg-white dark:group-hover:bg-zinc-600 flex-shrink-0">
                     {value ? value.charAt(0) : <UserCircle2 size={12}/>}
                 </div>
                 <span className="truncate font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white flex-1" title={value || 'Vazio'}>{value || 'Vazio'}</span>
            </div>

             {isOpen && createPortal(
                <div 
                    className="responsible-dropdown-content fixed z-[9999] bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-xl rounded-lg p-1 animate-fade-in"
                    style={{ top: position.top, left: position.left, width: position.width }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {isAdmin && (
                        <div className="flex items-center border-b border-gray-50 dark:border-zinc-700 px-2 pb-1 mb-1">
                            <Search size={12} className="text-gray-400 mr-2"/>
                            <input autoFocus type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full text-xs outline-none text-gray-700 dark:text-gray-200 bg-transparent py-1.5"/>
                        </div>
                    )}
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        <div onClick={(e) => { e.stopPropagation(); updateTask(task, field, ''); onClose(); }} className={`px-3 py-2 text-xs font-bold rounded cursor-pointer transition-colors mb-0.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400`}>Remover</div>
                        {filtered.map((c: any) => (
                            <div key={c.id} onClick={(e) => { e.stopPropagation(); updateTask(task, field, c.name); onClose(); }} className={`px-3 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 text-xs rounded cursor-pointer transition-colors ${value === c.name ? 'bg-lm-yellow/20 dark:bg-lm-yellow/10 font-bold' : ''}`}>
                                {c.name}
                            </div>
                        ))}
                    </div>
                </div>,
                document.body
             )}
        </>
    )
}

const TableRow = memo(({ task, index, activeDropdown, onTaskSelect, onNavigate, handleToggle, setActiveDropdown, px, py, itemHeight }: any) => {
    const { isAdmin, currentUser } = useAuth();
    const fiscalFinished = isFiscalFinished(task.statusFiscal);

    const canEdit = (field: keyof CompanyTask) => {
        if (isAdmin) return true;
        if (!fiscalFinished && ['statusContabil', 'statusBalanco'].includes(field)) return false;
        if (!currentUser) return false;
        const userDept = currentUser.department?.toUpperCase() || '';
        const isFiscal = userDept.includes('FISCAL') || userDept.includes('TODOS');
        const isContabil = userDept.includes('CONTÁBIL') || userDept.includes('CONTABIL') || userDept.includes('TODOS');
        if (['respFiscal', 'statusFiscal', 'respReinf', 'statusReinf'].includes(field)) return isFiscal;
        if (['respContabil', 'statusContabil', 'respBalanco', 'statusBalanco', 'respLucro', 'statusLucro', 'respECD', 'statusECD', 'respECF', 'statusECF'].includes(field)) return isContabil;
        return true;
    }

    const getRegimeColor = (r: string) => {
        if (!r) return 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-600';
        const regime = r.toUpperCase();
        if (regime.includes('REAL')) return 'bg-gray-800 dark:bg-zinc-700 text-white dark:text-white border-gray-800 dark:border-zinc-600'; 
        if (regime.includes('PRESUMIDO')) return 'bg-lm-yellow text-gray-900 border-lm-yellow';
        if (regime.includes('SIMPLES')) return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
        if (regime.includes('IMUNE') || regime.includes('ISENTA')) return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
        return 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-600';
    }

    const getStatusBadge = (task: CompanyTask, status: string, dept: Department, subView?: string, disabled: boolean = false) => {
        if (!status) return <span className="text-gray-300 dark:text-gray-600">-</span>;
        const s = status.toUpperCase();
        let colorClass = 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-600';
        let dotClass = 'bg-gray-400';
        if (s.includes('FINALIZADA') || s.includes('ENVIADA') || s.includes('LUCRO LANÇADO')) { colorClass = 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50'; dotClass = 'bg-green-500'; }
        else if (s.includes('PENDENTE') || s.includes('EM ABERTO')) { colorClass = 'bg-white dark:bg-red-900/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30 shadow-sm'; dotClass = 'bg-red-500'; }
        else if (s.includes('RETIFICAÇÃO') || s.includes('DISTRIBUIÇÃO')) { colorClass = 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/50'; dotClass = 'bg-orange-500'; }
        else if (s.includes('DISPENSADA') || s.includes('RETIFICADA') || s.includes('NÃO SE APLICA')) { colorClass = 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50'; dotClass = 'bg-blue-500'; }

        return (
            <button 
                onClick={(e) => { e.stopPropagation(); onNavigate(dept, subView, task.id); }} 
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border cursor-pointer hover:shadow-md transition-all max-w-full truncate ${colorClass}`}
                title={disabled ? "Este status depende da finalização do Fiscal, mas você pode clicar para visualizar." : "Clique para ir ao quadro"}
            >
                {disabled && !isAdmin ? <Lock size={8} className="opacity-70 flex-shrink-0" /> : <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`}></div>}
                <span className="truncate">{status}</span>
            </button>
        );
    };

    const formatLastEditor = (editorString?: string) => {
        if (!editorString) return { name: '-', date: '' };
        const parts = editorString.split(' em ');
        return { name: parts[0] || 'Desconhecido', date: parts[1] || '' };
    };

    const isRowActive = activeDropdown && activeDropdown.startsWith(task.id + '-');
    const lastEdit = formatLastEditor(task.lastEditor);
    
    const effectivePriority = getEffectivePriority(task);
    
    const isOdd = index % 2 !== 0;
    
    return (
        <tr 
            onClick={() => onTaskSelect(task)}
            style={{ height: itemHeight, maxHeight: itemHeight, overflow: 'hidden' }}
            className={`group cursor-pointer border-b border-gray-100 dark:border-zinc-800 ${isRowActive ? 'z-50 relative' : 'z-0 relative'} ${isOdd ? 'bg-[#ffcc29]/10 dark:bg-[#ffcc29]/5' : 'bg-white dark:bg-zinc-900'}`} 
        >
            <td className={`${px} ${py} text-center`}>
                <span className="font-mono text-xs font-bold text-gray-400 dark:text-gray-500 bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 px-1.5 py-0.5 rounded shadow-sm">{task.id}</span>
            </td>
            <td className={`${px} ${py} text-center`}>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border inline-block max-w-full truncate ${
                    effectivePriority === 'ALTA' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50' :
                    effectivePriority === 'MÉDIA' ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/50' :
                    'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50'
                }`}>{effectivePriority || 'BAIXA'}</span>
            </td>
            <td className={`${px} ${py} text-center`}>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border whitespace-nowrap inline-block max-w-full truncate ${getRegimeColor(task.regime)}`}>
                    {task.regime ? task.regime.replace('LUCRO ', '').replace('IMUNE/', '') : 'N/A'}
                </span>
            </td>
            <td className={`${px} ${py} overflow-hidden`}>
                <div className="flex flex-col truncate pr-4">
                    <span className="font-bold text-gray-900 dark:text-white text-sm truncate" title={task.name}>{task.name}</span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">
                        <Building2 size={10} /> {task.cnpj}
                    </div>
                </div>
            </td>
            <td className={`${px} ${py}`}>
                <div className="flex flex-col items-start gap-1 w-full overflow-hidden">
                    {getStatusBadge(task, task.statusFiscal, Department.FISCAL)}
                    <ResponsibleSelect value={task.respFiscal} field="respFiscal" task={task} isOpen={activeDropdown === `${task.id}-respFiscal`} onToggle={() => handleToggle(`${task.id}-respFiscal`)} onClose={() => setActiveDropdown(null)} disabled={!canEdit('respFiscal')} />
                </div>
            </td>
            <td className={`${px} ${py}`}>
                <div className="flex flex-col gap-3 w-full overflow-hidden">
                    <div className="flex flex-col gap-1 border-l-2 border-indigo-100 dark:border-indigo-900/30 pl-2 overflow-hidden">
                        <div className="flex items-center gap-2 overflow-hidden"><span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase w-14 flex-shrink-0">Balancete</span><div className="overflow-hidden">{getStatusBadge(task, task.statusContabil, Department.CONTABIL, 'BALANCETE', !fiscalFinished && !isAdmin)}</div></div>
                        <ResponsibleSelect value={task.respContabil} field="respContabil" task={task} isOpen={activeDropdown === `${task.id}-respContabil`} onToggle={() => handleToggle(`${task.id}-respContabil`)} onClose={() => setActiveDropdown(null)} disabled={!canEdit('respContabil')} />
                    </div>
                    <div className="flex flex-col gap-1 border-l-2 border-teal-100 dark:border-teal-900/30 pl-2 overflow-hidden">
                        <div className="flex items-center gap-2 overflow-hidden"><span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase w-14 flex-shrink-0">Balanço</span><div className="overflow-hidden">{getStatusBadge(task, task.statusBalanco, Department.CONTABIL, 'BALANCO', !fiscalFinished && !isAdmin)}</div></div>
                        <ResponsibleSelect value={task.respBalanco} field="respBalanco" task={task} isOpen={activeDropdown === `${task.id}-respBalanco`} onToggle={() => handleToggle(`${task.id}-respBalanco`)} onClose={() => setActiveDropdown(null)} disabled={!canEdit('respBalanco')} />
                    </div>
                </div>
            </td>
            <td className={`${px} ${py}`}>
                <div className="flex flex-col gap-3 w-full overflow-hidden">
                    <div className="flex flex-col gap-1 border-l-2 border-red-100 dark:border-red-900/30 pl-2 overflow-hidden">
                        <div className="flex items-center gap-2 overflow-hidden"><span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase w-10 flex-shrink-0">Reinf</span><div className="overflow-hidden">{getStatusBadge(task, task.statusReinf, Department.LUCRO_REINF, 'REINF')}</div></div>
                        <ResponsibleSelect value={task.respReinf} field="respReinf" task={task} isOpen={activeDropdown === `${task.id}-respReinf`} onToggle={() => handleToggle(`${task.id}-respReinf`)} onClose={() => setActiveDropdown(null)} disabled={!canEdit('respReinf')} />
                    </div>
                    <div className="flex flex-col gap-1 border-l-2 border-blue-100 dark:border-blue-900/30 pl-2 overflow-hidden">
                        <div className="flex items-center gap-2 overflow-hidden"><span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase w-10 flex-shrink-0">Lucro</span><div className="overflow-hidden">{getStatusBadge(task, task.statusLucro, Department.LUCRO_REINF, 'LUCRO')}</div></div>
                        <ResponsibleSelect value={task.respLucro} field="respLucro" task={task} isOpen={activeDropdown === `${task.id}-respLucro`} onToggle={() => handleToggle(`${task.id}-respLucro`)} onClose={() => setActiveDropdown(null)} disabled={!canEdit('respLucro')} />
                    </div>
                </div>
            </td>
            <td className={`${px} ${py}`}>
                <div className="flex flex-col gap-3 w-full overflow-hidden">
                    <div className="flex flex-col gap-1 border-l-2 border-green-100 dark:border-green-900/30 pl-2 overflow-hidden">
                        <div className="flex items-center gap-2 overflow-hidden"><span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase w-8 flex-shrink-0">ECD</span><div className="overflow-hidden">{getStatusBadge(task, task.statusECD, Department.ECD)}</div></div>
                        <ResponsibleSelect value={task.respECD} field="respECD" task={task} isOpen={activeDropdown === `${task.id}-respECD`} onToggle={() => handleToggle(`${task.id}-respECD`)} onClose={() => setActiveDropdown(null)} disabled={!canEdit('respECD')} />
                    </div>
                    <div className="flex flex-col gap-1 border-l-2 border-purple-100 dark:border-purple-900/30 pl-2 overflow-hidden">
                        <div className="flex items-center gap-2 overflow-hidden"><span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase w-8 flex-shrink-0">ECF</span><div className="overflow-hidden">{getStatusBadge(task, task.statusECF, Department.ECF)}</div></div>
                        <ResponsibleSelect value={task.respECF} field="respECF" task={task} isOpen={activeDropdown === `${task.id}-respECF`} onToggle={() => handleToggle(`${task.id}-respECF`)} onClose={() => setActiveDropdown(null)} disabled={!canEdit('respECF')} />
                    </div>
                </div>
            </td>
            <td className={`${px} ${py} text-right`}>
                <div className="flex flex-col items-end gap-0.5 overflow-hidden"><span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate w-full">{lastEdit.name}</span>{lastEdit.date && (<div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-mono"><History size={10} />{lastEdit.date}</div>)}</div>
            </td>
        </tr>
    );
}, (prev, next) => {
    // Custom comparison to prevent unnecessary re-renders during scroll
    const wasActive = prev.activeDropdown && prev.activeDropdown.startsWith(prev.task.id + '-');
    const isActive = next.activeDropdown && next.activeDropdown.startsWith(next.task.id + '-');
    
    // If the row's active state changed, it must re-render
    if (!!wasActive !== !!isActive) return false;
    
    // If the row is active, and the specific dropdown changed, re-render
    if (wasActive && isActive && prev.activeDropdown !== next.activeDropdown) return false;

    // If activeDropdown changed but neither matches this task, we can ignore it (assuming other props equal)
    // But we must check other props
    
    return (
        prev.task === next.task &&
        prev.index === next.index &&
        prev.itemHeight === next.itemHeight &&
        prev.px === next.px &&
        prev.py === next.py &&
        prev.handleToggle === next.handleToggle &&
        prev.onTaskSelect === next.onTaskSelect &&
        prev.onNavigate === next.onNavigate
    );
});

const OverviewTable: React.FC<OverviewTableProps> = ({ tasks, onNavigate, onTaskSelect, activeView }) => {
  const { settings } = useTasks();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Virtualization State
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);

  // Alturas fixas para garantir estabilidade do scroll
  // Aumentado significativamente para refletir melhor o tamanho real das linhas com múltiplos badges e seletores
  const ITEM_HEIGHT = settings.density === 'compact' ? 125 : 170; 
  const OVERSCAN = 20;

  const py = settings.density === 'compact' ? 'py-2' : 'py-4';
  const px = 'px-3'; // Reduzido padding lateral para ganhar espaço

  const handleToggle = useCallback((id: string) => {
      setActiveDropdown(prev => prev === id ? null : id);
  }, []);

  // Monitorar altura do container
  useEffect(() => {
    if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
    }
    const observer = new ResizeObserver((entries) => {
        if (entries[0]) {
            // Use requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
            requestAnimationFrame(() => {
                setContainerHeight(entries[0].contentRect.height);
            });
        }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const rafRef = useRef<number | null>(null);

  // Handler de Scroll (Otimizado com rAF e cancelamento)
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      const top = e.currentTarget.scrollTop;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
          setScrollTop(top);
      });
  }, []);

  // Cálculo da Virtualização
  const { visibleTasks, paddingTop, paddingBottom, startIndex } = useMemo(() => {
      const totalCount = tasks.length;
      
      const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
      const endIndex = Math.min(totalCount, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN);
      
      const visible = tasks.slice(startIndex, endIndex);
      
      const padTop = startIndex * ITEM_HEIGHT;
      const padBottom = Math.max(0, (totalCount - endIndex) * ITEM_HEIGHT);

      return { visibleTasks: visible, paddingTop: padTop, paddingBottom: padBottom, startIndex };
  }, [tasks, scrollTop, containerHeight, ITEM_HEIGHT]);


  return (
    <div className="h-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden flex flex-col mx-2 lg:mx-0">
        <div 
            ref={containerRef}
            onScroll={handleScroll}
            className="overflow-auto flex-1 custom-scrollbar pb-20 relative"
        >
            <table className="w-full text-left whitespace-nowrap table-fixed border-separate border-spacing-0">
                <thead className="bg-gray-50/95 dark:bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-20 border-b border-gray-200 dark:border-zinc-700 shadow-sm">
                    <tr>
                        <th className={`${px} py-4 text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[4%] text-center border-b border-gray-200 dark:border-zinc-700`}>ID</th>
                        <th className={`${px} py-4 text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[8%] text-center border-b border-gray-200 dark:border-zinc-700`}>Prioridade</th>
                        <th className={`${px} py-4 text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[9%] text-center border-b border-gray-200 dark:border-zinc-700`}>Regime</th>
                        <th className={`${px} py-4 text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[15%] border-b border-gray-200 dark:border-zinc-700`}>Empresa</th>
                        <th className={`${px} py-4 text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[13.5%] border-b border-gray-200 dark:border-zinc-700`}><div>Fiscal</div><div className="text-[9px] text-gray-300 dark:text-gray-600 font-normal mt-0.5 normal-case">Dept. Fiscal</div></th>
                        <th className={`${px} py-4 text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[13.5%] border-b border-gray-200 dark:border-zinc-700`}><div>Contábil</div><div className="text-[9px] text-gray-300 dark:text-gray-600 font-normal mt-0.5 normal-case">Balancete & Balanço</div></th>
                        <th className={`${px} py-4 text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[13.5%] border-b border-gray-200 dark:border-zinc-700`}><div>Reinf / Lucro</div><div className="text-[9px] text-gray-300 dark:text-gray-600 font-normal mt-0.5 normal-case">Dept. Fiscal & Contábil</div></th>
                        <th className={`${px} py-4 text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[13.5%] border-b border-gray-200 dark:border-zinc-700`}><div>ECD / ECF</div><div className="text-[9px] text-gray-300 dark:text-gray-600 font-normal mt-0.5 normal-case">Dept. Contábil</div></th>
                        <th className={`${px} py-4 text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right w-[10%] border-b border-gray-200 dark:border-zinc-700`}>Última Alteração</th>
                    </tr>
                </thead>
                <tbody className="relative">
                    {paddingTop > 0 && (
                        <tr key="padding-top"><td colSpan={9} style={{ height: paddingTop, padding: 0 }}><div style={{ height: paddingTop }}></div></td></tr>
                    )}
                    
                    {visibleTasks.map((task, index) => (
                         <TableRow 
                            key={task.id} 
                            task={task} 
                            index={startIndex + index} 
                            activeDropdown={activeDropdown} 
                            onTaskSelect={onTaskSelect} 
                            onNavigate={onNavigate} 
                            handleToggle={handleToggle} 
                            setActiveDropdown={setActiveDropdown} 
                            px={px} 
                            py={py}
                            itemHeight={ITEM_HEIGHT}
                        />
                    ))}

                    {paddingBottom > 0 && (
                        <tr key="padding-bottom"><td colSpan={9} style={{ height: paddingBottom, padding: 0 }}><div style={{ height: paddingBottom }}></div></td></tr>
                    )}

                    {tasks.length === 0 && (
                        <tr><td colSpan={9} className="px-6 py-20 text-center"><div className="flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500"><AlertCircle size={40} strokeWidth={1.5} className="opacity-50"/><span className="text-sm font-medium">Nenhum dado encontrado</span></div></td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default OverviewTable;
