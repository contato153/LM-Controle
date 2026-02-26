

import { useState, useMemo } from 'react';
import { CompanyTask, Department, Collaborator } from '../types';

interface UseTaskFiltersProps {
  tasks: CompanyTask[];
  currentDept: Department;
  activeView: string;
  activeSubView: string;
  currentUser: Collaborator | null;
  collaborators: Collaborator[];
}

export const useTaskFilters = ({ tasks, currentDept, activeView, activeSubView, currentUser, collaborators }: UseTaskFiltersProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegime, setFilterRegime] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortOrder, setSortOrder] = useState<string>('ID_ASC');

  // Helper to parse the date string from "User Name em dd/mm/yyyy, HH:mm" or similar
  const getTaskModificationTime = (task: CompanyTask): number => {
    if (!task.lastEditor) return 0;
    
    try {
        // Expected format: "Name em dd/mm/yyyy, HH:mm"
        const parts = task.lastEditor.split(' em ');
        if (parts.length < 2) return 0;
        
        let dateStr = parts[1].trim();
        // Remove comma if present (toLocaleString behavior varies)
        dateStr = dateStr.replace(',', ''); 
        
        const [datePart, timePart] = dateStr.split(' ');
        if (!datePart) return 0;

        const [day, month, year] = datePart.split('/').map(Number);
        
        // Basic validation
        if (!day || !month) return 0;
        
        // Handle year (sometimes 2 digits, sometimes 4, sometimes missing in short formats)
        // Assuming 4 digits based on standard formatting
        const fullYear = year < 100 ? 2000 + year : year;

        let hours = 0;
        let minutes = 0;

        if (timePart) {
            const [h, m] = timePart.split(':').map(Number);
            hours = h || 0;
            minutes = m || 0;
        }

        return new Date(fullYear, month - 1, day, hours, minutes).getTime();
    } catch (e) {
        return 0;
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
        const rawQuery = searchQuery.trim();
        const query = rawQuery.toLowerCase();
        
        if (query.startsWith('id:')) {
            const exactId = query.replace('id:', '').trim();
            return t.id.toLowerCase() === exactId.toLowerCase();
        }

        // Filter out inactive companies in Kanban view and My Obligations view
        if ((activeView === 'kanban' || activeView === 'my_obligations') && t.active === false) {
            return false;
        }

        const matchesSearch = t.name.toLowerCase().includes(query) || t.id.includes(query) || (t.cnpj && t.cnpj.includes(query));
        const currentRegime = t.regime || 'NENHUM INFORMADO';
        const matchesRegime = filterRegime ? currentRegime === filterRegime : true;
        const matchesPriority = filterPriority ? t.prioridade === filterPriority : true;

        let matchesStatus = true;
        if (filterStatus) {
            const isFinished = (s: string) => {
                if (!s) return false;
                const up = s.toUpperCase();
                return ['FINALIZADA', 'ENVIADA', 'LUCRO LANÇADO', 'EFD ENVIADA', 'EFD RETIFICADA', 'DISPENSADA', 'NÃO SE APLICA', 'NÃO HÁ DISTRIBUIÇÃO'].includes(up);
            };

            const statuses = [t.statusFiscal, t.statusContabil, t.statusBalanco, t.statusReinf, t.statusLucro, t.statusECD, t.statusECF];
            const hasFinished = statuses.some(s => isFinished(s));

            if (filterStatus === 'HAS_FINISHED') {
                matchesStatus = hasFinished;
            }
        }

        let matchesResp = true;
        let responsible = '';
        switch (currentDept) {
            case Department.FISCAL: responsible = t.respFiscal; break;
            case Department.CONTABIL: responsible = activeSubView === 'BALANCO' ? t.respBalanco : t.respContabil; break;
            case Department.LUCRO_REINF: responsible = activeSubView === 'REINF' ? t.respReinf : t.respLucro; break;
            case Department.ECD: responsible = t.respECD; break;
            case Department.ECF: responsible = t.respECF; break;
            case Department.TODOS: break; 
            default: responsible = t.respFiscal;
        }

        if (filterResponsible) {
             if (currentDept === Department.TODOS) {
                 const anyResp = t.respFiscal || t.respContabil || t.respBalanco || t.respReinf || t.respLucro || t.respECD || t.respECF;
                 if (filterResponsible === 'HAS_RESPONSIBLE') matchesResp = !!anyResp;
                 else if (filterResponsible === 'NO_RESPONSIBLE') matchesResp = !anyResp;
                 else matchesResp = (t.respFiscal === filterResponsible) || (t.respContabil === filterResponsible) || (t.respBalanco === filterResponsible) || (t.respReinf === filterResponsible) || (t.respLucro === filterResponsible) || (t.respECD === filterResponsible) || (t.respECF === filterResponsible);
             } else {
                 if (filterResponsible === 'HAS_RESPONSIBLE') matchesResp = !!responsible;
                 else if (filterResponsible === 'NO_RESPONSIBLE') matchesResp = !responsible;
                 else matchesResp = responsible === filterResponsible;
             }
        }

        let matchesMyObligations = true;
        if (activeView === 'my_obligations' && currentUser) {
            // Normalização para evitar problemas de case sensitive ou espaços extras
            const uName = currentUser.name.trim().toLowerCase();
            const check = (val: string) => val ? val.trim().toLowerCase() === uName : false;

            switch (currentDept) {
                case Department.FISCAL: matchesMyObligations = check(t.respFiscal); break;
                case Department.CONTABIL: matchesMyObligations = activeSubView === 'BALANCO' ? check(t.respBalanco) : check(t.respContabil); break;
                case Department.LUCRO_REINF: matchesMyObligations = activeSubView === 'REINF' ? check(t.respReinf) : check(t.respLucro); break;
                case Department.ECD: matchesMyObligations = check(t.respECD); break;
                case Department.ECF: matchesMyObligations = check(t.respECF); break;
                case Department.TODOS:
                default:
                    // Verifica se o usuário é responsável por QUALQUER coisa na tarefa
                    matchesMyObligations = check(t.respFiscal) || 
                                           check(t.respContabil) || 
                                           check(t.respBalanco) || 
                                           check(t.respReinf) || 
                                           check(t.respLucro) || 
                                           check(t.respECD) || 
                                           check(t.respECF);
                    break;
            }
        }

        return matchesSearch && matchesRegime && matchesPriority && matchesResp && matchesMyObligations && matchesStatus;
    }).sort((a, b) => {
        if (sortOrder === 'LAST_MODIFIED_DESC') {
            return getTaskModificationTime(b) - getTaskModificationTime(a);
        }
        if (sortOrder === 'LAST_MODIFIED_ASC') {
            return getTaskModificationTime(a) - getTaskModificationTime(b);
        }
        if (sortOrder === 'NAME_ASC') return a.name.localeCompare(b.name);
        if (sortOrder === 'NAME_DESC') return b.name.localeCompare(a.name);
        if (sortOrder === 'ID_DESC') {
            const idA = parseInt(a.id);
            const idB = parseInt(b.id);
            return (!isNaN(idA) && !isNaN(idB)) ? idB - idA : b.id.localeCompare(a.id, undefined, { numeric: true });
        }
        // Default ID_ASC
        const idA = parseInt(a.id);
        const idB = parseInt(b.id);
        return (!isNaN(idA) && !isNaN(idB)) ? idA - idB : a.id.localeCompare(b.id, undefined, { numeric: true });
    });
  }, [tasks, searchQuery, filterRegime, filterPriority, filterResponsible, filterStatus, sortOrder, activeView, currentDept, activeSubView, currentUser]);

  const clearFilters = () => {
      setSearchQuery('');
      setFilterRegime('');
      setFilterPriority('');
      setFilterResponsible('');
      setFilterStatus('');
  };

  return {
      filteredTasks,
      searchQuery, setSearchQuery,
      filterRegime, setFilterRegime,
      filterPriority, setFilterPriority,
      filterResponsible, setFilterResponsible,
      filterStatus, setFilterStatus,
      sortOrder, setSortOrder,
      clearFilters
  };
};