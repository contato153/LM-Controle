
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from 'react';
import { CompanyTask, Department } from '../types';
import KanbanCard from './KanbanCard';
import { useTasks } from '../contexts/TasksContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AnimatePresence } from 'framer-motion';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: CompanyTask[];
  currentDept: Department;
  onCardClick: (task: CompanyTask) => void;
  activeView: string;
  statusField: keyof CompanyTask;
  responsibleField: keyof CompanyTask;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  color,
  tasks,
  currentDept,
  onCardClick,
  activeView,
  statusField,
  responsibleField
}) => {
  const { updateTask, settings, tasks: allTasks } = useTasks();
  const { isAdmin, isEffectiveAdmin, currentUser } = useAuth();
  const { addNotification } = useToast();
  
  const storageKey = `lm_kanban_scroll_${activeView}_${currentDept}_${id}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Constantes de Virtualização
  // Estimativa de altura do card + margens baseada na densidade
  const ITEM_HEIGHT = settings.density === 'compact' ? 120 : 160; 
  const OVERSCAN = 3; // Renderizar 3 itens acima/abaixo da área visível para scroll suave

  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600); // Valor inicial seguro

  // Monitorar altura do container para cálculos precisos
  useEffect(() => {
    if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
    }
    const observer = new ResizeObserver((entries) => {
        if (entries[0]) {
            setContainerHeight(entries[0].contentRect.height);
        }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Restaurar posição do scroll
  useLayoutEffect(() => {
      try {
          const item = sessionStorage.getItem(storageKey);
          if (item && containerRef.current) {
              const saved = JSON.parse(item);
              containerRef.current.scrollTop = saved.scroll || 0;
              setScrollTop(saved.scroll || 0);
          }
      } catch { }
  }, [storageKey]);

  // Handler de Scroll Otimizado
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      const top = e.currentTarget.scrollTop;
      
      // Atualiza o estado visual via requestAnimationFrame para não bloquear a thread principal
      requestAnimationFrame(() => {
        setScrollTop(top);
      });

      // Debounce para salvar no sessionStorage
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
          sessionStorage.setItem(storageKey, JSON.stringify({ scroll: top }));
      }, 150);
  }, [storageKey]);

  // Cálculo dos itens visíveis (Virtualização)
  const { visibleTasks, paddingTop, paddingBottom } = useMemo(() => {
      const totalCount = tasks.length;
      
      // Índices de início e fim baseados no scroll atual
      const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
      const endIndex = Math.min(totalCount, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN);
      
      const visible = tasks.slice(startIndex, endIndex);
      
      // Espaçadores para simular a altura total da lista
      const padTop = startIndex * ITEM_HEIGHT;
      const padBottom = Math.max(0, (totalCount - endIndex) * ITEM_HEIGHT);

      return { visibleTasks: visible, paddingTop: padTop, paddingBottom: padBottom };
  }, [tasks, scrollTop, containerHeight, ITEM_HEIGHT]);

  const [isOver, setIsOver] = useState(false);

  const onDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData("taskId", id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, newStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    const task = allTasks.find(t => t.id === taskId);
    
    if (task && task[statusField] !== newStatus) {
      // Se for admin movendo uma tarefa sem responsável, auto-atribuir
      const currentResponsible = task[responsibleField] as string;
      if (!currentResponsible && isEffectiveAdmin && currentUser) {
          addNotification("Atribuição Automática", `Você foi definido como responsável.`, "info");
          await updateTask(task, responsibleField, currentUser.name);
      }

      await updateTask(task, statusField, newStatus);
    }
  }, [allTasks, statusField, responsibleField, isEffectiveAdmin, currentUser, updateTask, addNotification]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (!isOver) setIsOver(true);
  }, [isOver]);

  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOver) setIsOver(true);
  }, [isOver]);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we are leaving to a child element
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
    }
    
    setIsOver(false);
  }, []);

  return (
    <div 
        className={`flex-shrink-0 w-80 lg:w-[340px] flex flex-col h-full rounded-2xl bg-gray-100/50 dark:bg-[#09090b] border ${isOver ? 'border-lm-yellow ring-2 ring-lm-yellow/20 bg-lm-yellow/5' : 'border-gray-200/60 dark:border-zinc-800'} animate-column-enter group/column`}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, id)}
    >
        <div className="p-4 flex items-center justify-between sticky top-0 bg-gray-100/50 dark:bg-[#09090b] backdrop-blur-sm rounded-t-2xl z-10 pointer-events-none">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${color.replace('bg-', 'bg-').replace('100', '500')}`}></div>
                <span className="text-sm font-extrabold text-gray-700 dark:text-gray-200 uppercase tracking-wide">{title}</span>
            </div>
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-md shadow-sm border border-gray-100 dark:border-zinc-800">
                {tasks.length}
            </span>
        </div>
        
        <div 
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar transition-colors group-hover/column:bg-gray-200/30 dark:group-hover/column:bg-zinc-800/30 rounded-b-2xl relative min-h-[150px]"
        >
            {tasks.length === 0 ? (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl m-2 opacity-50 pointer-events-none">
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-600">Arraste aqui</span>
                </div>
            ) : (
                <>
                    {/* Espaçador Superior */}
                    <div style={{ height: paddingTop, width: '100%', flexShrink: 0 }}></div>
                    
                    {/* Itens Renderizados (Apenas os visíveis) */}
                    <AnimatePresence>
                        {visibleTasks.map(task => (
                            <KanbanCard 
                                key={task.id} 
                                task={task} 
                                currentDept={currentDept}
                                onDragStart={onDragStart}
                                density={settings.density}
                                onClick={onCardClick}
                                responsibleField={responsibleField}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Espaçador Inferior */}
                    <div style={{ height: paddingBottom, width: '100%', flexShrink: 0 }}></div>
                </>
            )}
        </div>
    </div>
  );
};

export default KanbanColumn;
