
import React, { useState, useEffect } from 'react';
import { Users, Search, Building2, CheckSquare, Plus, X, Shield, User, Pencil, Trash2, Power, Settings, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TasksContext';
import { useToast } from '../contexts/ToastContext';
import { Collaborator, DemandType, Department } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';

interface DepartmentType {
    id: string;
    name: string;
}

const TeamView: React.FC = () => {
  const { currentUser, isEffectiveAdmin } = useAuth();
  const { addNotification } = useToast();
  const { collaborators, tasks, onlineUsers, createCollaborator, updateCollaborator, softDeleteCollaborator, toggleCollaboratorActive } = useTasks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [collaboratorToDelete, setCollaboratorToDelete] = useState<Collaborator | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [departments, setDepartments] = useState<DepartmentType[]>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [formData, setFormData] = useState<Collaborator>({
    id: '',
    name: '',
    department: '',
    permissions: [],
    role: 'user'
  });

  useEffect(() => {
      fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('departments').select('*').order('name');
      if (data) {
          setDepartments(data);
      }
  };

  const addDepartment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newDeptName.trim() || !supabase) return;
      
      const { error } = await supabase.from('departments').insert([{ name: newDeptName.trim() }]);
      if (error) {
          console.error("Error adding department:", error);
      } else {
          setNewDeptName('');
          fetchDepartments();
      }
  };

  const deleteDepartment = async (id: string) => {
      if (!supabase) return;
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) {
          console.error("Error deleting department:", error);
      } else {
          fetchDepartments();
      }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const sortedCollaborators = React.useMemo(() => {
    let filtered = [...collaborators];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.id.toLowerCase().includes(query) ||
        (c.department && c.department.toLowerCase().includes(query))
      );
    }

    if (isEffectiveAdmin) {
      if (showInactive) {
        filtered = filtered.filter(c => c.active === false);
      } else {
        filtered = filtered.filter(c => c.active !== false);
      }
    } else {
      filtered = filtered.filter(c => c.active !== false);
    }

    return filtered.sort((a, b) => {
      const aOnline = onlineUsers.includes(a.id);
      const bOnline = onlineUsers.includes(b.id);

      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;

      // If both have same online status, sort by lastSeen
      const aTime = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
      const bTime = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;

      return bTime - aTime; // Most recent first
    });
  }, [collaborators, onlineUsers, searchQuery]);
  
  const paginatedCollaborators = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedCollaborators.slice(start, start + itemsPerPage);
  }, [sortedCollaborators, currentPage]);

  const totalPages = Math.ceil(sortedCollaborators.length / itemsPerPage);

  const getCollaboratorStats = (collaboratorName: string) => {
      const myCompanies = tasks.filter(t => 
          t.respFiscal === collaboratorName || t.respContabil === collaboratorName || t.respReinf === collaboratorName || t.respLucro === collaboratorName || t.respECD === collaboratorName || t.respECF === collaboratorName
      );
      const companiesCount = myCompanies.length;
      const tasksCount = tasks.reduce((acc, t) => {
          let count = 0;
          if (t.respFiscal === collaboratorName) count++;
          if (t.respContabil === collaboratorName) count++;
          if (t.respReinf === collaboratorName) count++;
          if (t.respLucro === collaboratorName) count++;
          if (t.respECD === collaboratorName) count++;
          if (t.respECF === collaboratorName) count++;
          return acc + count;
      }, 0);
      return { companiesCount, tasksCount };
  };

  const formatLastSeen = (isoDate?: string) => {
      if (!isoDate) return 'Nunca acessou';
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return 'Nunca acessou';
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Agora mesmo';
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Há ${diffHours}h`;
      if (diffDays === 1) return 'Ontem';
      if (diffDays < 7) return `Há ${diffDays} dias`;
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({ id: '', name: '', department: '', permissions: [], role: 'user' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (collaborator: Collaborator) => {
    setIsEditing(true);
    setFormData({ 
        id: collaborator.id || '',
        name: collaborator.name || '',
        department: collaborator.department || '',
        permissions: collaborator.permissions || [],
        role: collaborator.role || 'user'
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (collaborator: Collaborator) => {
    if (currentUser && collaborator.id === currentUser.id) {
        addNotification("Ação Bloqueada", "Você não pode desativar sua própria conta.", "warning");
        return;
    }
    try {
        await toggleCollaboratorActive(collaborator.id, !collaborator.active);
    } catch (error) {
        console.error("Error toggling collaborator status:", error);
    }
  };

  const handleDeleteClick = (collaborator: Collaborator) => {
    if (currentUser && collaborator.id === currentUser.id) {
        addNotification("Ação Bloqueada", "Você não pode excluir sua própria conta.", "warning");
        return;
    }
    setCollaboratorToDelete(collaborator);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (collaboratorToDelete) {
        await softDeleteCollaborator(collaboratorToDelete.id);
        setIsDeleteModalOpen(false);
        setCollaboratorToDelete(null);
    }
  };

  const generateRandomId = () => {
    let newId = '';
    let isUnique = false;
    while (!isUnique) {
        // Generate random number between 2511 and 999999
        const randomNum = Math.floor(Math.random() * (999999 - 2511 + 1)) + 2511;
        newId = randomNum.toString();
        // Check if ID exists
        if (!collaborators.some(c => c.id === newId)) {
            isUnique = true;
        }
    }
    setFormData(prev => ({ ...prev, id: newId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) return;

    // Check for duplicate ID if creating new collaborator
    if (!isEditing && collaborators.some(c => c.id === formData.id)) {
        addNotification("Erro ao criar", `O ID ${formData.id} já está em uso por outro colaborador.`, "error");
        return;
    }

    try {
        if (isEditing) {
            await updateCollaborator(formData);
            addNotification("Sucesso", "Colaborador atualizado com sucesso.", "success");
        } else {
            await createCollaborator(formData);
            addNotification("Sucesso", "Colaborador criado com sucesso.", "success");
        }
        setIsModalOpen(false);
        setFormData({ id: '', name: '', department: '', permissions: [], role: 'user' });
    } catch (error: any) {
        console.error("Error saving collaborator:", error);
        addNotification("Erro", `Falha ao salvar colaborador: ${error.message || 'Erro desconhecido'}`, "error");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-transparent transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6 pt-10 px-6 lg:px-8 pb-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Users className="text-lm-yellow" size={28} />
              Colaboradores
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1 ml-11">
              Gerencie sua equipe, departamentos e permissões de acesso.
            </p>
          </div>
            <div className="flex items-center gap-4">
              {isEffectiveAdmin && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsDeptModalOpen(true)}
                    className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all"
                  >
                    <Briefcase size={18} />
                    Departamentos
                  </button>
                  <button 
                    onClick={handleOpenCreate}
                    className="bg-lm-yellow hover:bg-yellow-500 text-gray-900 px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all"
                  >
                    <Plus size={18} />
                    Novo Colaborador
                  </button>
                </div>
              )}
            </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
                <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Buscar colaborador..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-lm-yellow/50 outline-none transition-all" 
                />
            </div>
            {isEffectiveAdmin && (
                <button 
                    onClick={() => setShowInactive(!showInactive)}
                    className={`px-4 py-2.5 rounded-xl font-bold border transition-all flex items-center gap-2 ${showInactive ? 'bg-gray-800 text-white border-gray-800' : 'bg-white dark:bg-zinc-900 text-gray-500 border-gray-200 dark:border-zinc-800 hover:bg-gray-50'}`}
                >
                    <Power size={16} />
                    {showInactive ? 'Ver Ativos' : 'Ver Inativos'}
                </button>
            )}
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar max-h-[600px] overflow-y-auto">
                <table className="w-full text-left relative">
                    <thead className="bg-gray-50 dark:bg-zinc-800/50 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-sm rounded-t-xl">
                        <tr>
                            <th className="px-6 py-4 first:rounded-tl-xl">Nome</th>
                            {isEffectiveAdmin && <th className="px-6 py-4">ID</th>}
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Ativo</th>
                            <th className="px-6 py-4">Departamento</th>
                            <th className="px-6 py-4 text-center">Empresas</th>
                            <th className="px-6 py-4 text-center">Tarefas</th>
                            {isEffectiveAdmin && <th className="px-6 py-4 text-right w-24 last:rounded-tr-xl">Ações</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-5 dark:divide-zinc-800">
                        {paginatedCollaborators.map((c, idx) => {
                            const stats = getCollaboratorStats(c.name);
                            const isOnline = onlineUsers.includes(c.id);
                            const canManage = isEffectiveAdmin && c.role === 'user';

                            return (
                                <tr key={c.id} className={`hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group animate-depth-appear ${c.active === false ? 'opacity-60' : ''}`} style={{ animationDelay: `${idx * 50}ms` }}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3 min-w-[200px]">
                                            <div className="w-10 h-10 rounded-full bg-lm-yellow/20 dark:bg-lm-yellow/10 border border-lm-yellow/30 dark:border-lm-yellow/20 flex items-center justify-center text-sm font-bold text-lm-dark dark:text-lm-yellow relative shrink-0">
                                                {c.name.charAt(0)}
                                                {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></span>}
                                            </div>
                                            <div className="truncate">
                                                <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2 truncate">
                                                    {c.name}
                                                    {currentUser && c.id === currentUser.id && (<span className="text-[9px] bg-gray-100 dark:bg-zinc-800 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Você</span>)}
                                                    {c.role === 'admin' && <Shield size={12} className="text-lm-yellow shrink-0" title="Administrador" />}
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{c.role === 'admin' ? 'Administrador' : 'Colaborador'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    {isEffectiveAdmin && <td className="px-6 py-4 font-mono text-xs text-gray-500 whitespace-nowrap">{c.id}</td>}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {isOnline ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatLastSeen(c.lastSeen)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {c.active !== false ? (
                                            <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-bold uppercase">Ativo</span>
                                        ) : (
                                            <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-bold uppercase">Inativo</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-md font-medium">{c.department || 'Geral'}</span></td>
                                    <td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-1.5 text-gray-700 dark:text-gray-300 font-mono font-bold text-sm" title="Empresas em seu nome"><Building2 size={14} className="text-gray-400 dark:text-gray-500" />{stats.companiesCount}</div></td>
                                    <td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-1.5 text-gray-700 dark:text-gray-300 font-mono font-bold text-sm" title="Tarefas em seu nome"><CheckSquare size={14} className="text-gray-400 dark:text-gray-500" />{stats.tasksCount}</div></td>
                                    {isEffectiveAdmin && (
                                        <td className="px-6 py-4 text-right w-24">
                                            <div className="flex items-center justify-end gap-1">
                                                {canManage && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleToggleActive(c)}
                                                            className={`p-2 transition-colors ${c.active !== false ? 'text-green-500 hover:text-red-500' : 'text-gray-400 hover:text-green-500'}`}
                                                            title={c.active !== false ? "Desativar colaborador" : "Ativar colaborador"}
                                                        >
                                                            <Power size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleOpenEdit(c)}
                                                            className="p-2 text-gray-400 hover:text-lm-dark dark:hover:text-lm-yellow transition-colors"
                                                            title="Editar colaborador"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        {c.active === false && (
                                                            <button 
                                                                onClick={() => handleDeleteClick(c)}
                                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                                title="Excluir colaborador"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {/* Footer with Stats and Pagination */}
            <div className="px-6 py-5 bg-gray-50/80 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4 backdrop-blur-sm">
                <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <div className="p-1.5 bg-lm-yellow/20 dark:bg-lm-yellow/10 rounded-lg text-lm-dark dark:text-lm-yellow">
                        <Users size={18} />
                    </div>
                    <div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{collaborators.filter(c => c.active !== false).length} membros ativos</span>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Equipe operacional ativa no sistema</p>
                    </div>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 text-gray-500 hover:text-lm-dark dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            Anterior
                        </button>
                        <div className="flex items-center gap-1">
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-lm-yellow text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 text-gray-500 hover:text-lm-dark dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            Próximo
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Create/Edit Collaborator Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X size={20} />
                </button>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">ID (Código)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                        type="text" 
                        value={formData.id} 
                        onChange={e => setFormData({...formData, id: e.target.value.replace(/\D/g, '')})}
                        className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-lm-yellow/50 outline-none`}
                        placeholder="ID do colaborador"
                        required
                        />
                    </div>
                    {!isEditing && (
                        <button
                            type="button"
                            onClick={generateRandomId}
                            className="px-3 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors border border-gray-200 dark:border-zinc-700"
                            title="Gerar ID aleatório único"
                        >
                            Gerar ID
                        </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-lm-yellow/50 outline-none"
                    placeholder="Nome do colaborador"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Departamento Organizacional</label>
                  <select 
                    value={formData.department || ''} 
                    onChange={e => {
                        const dept = e.target.value;
                        let newPermissions: string[] = [];
                        
                        // Presets baseados na lógica solicitada: Fiscal mexe com Fiscal, Contábil com Contábil
                        if (dept === Department.FISCAL) {
                            newPermissions = [DemandType.FISCAL, DemandType.REINF];
                        } else if (dept === Department.CONTABIL) {
                            newPermissions = [DemandType.CONTABIL, DemandType.ECD, DemandType.ECF, DemandType.LUCRO];
                        } else if (dept === Department.MARKETING || dept === Department.TI || dept === Department.DITE) {
                            newPermissions = [DemandType.TODOS];
                        }
                        
                        setFormData({...formData, department: dept, permissions: newPermissions.length > 0 ? newPermissions : formData.permissions});
                    }}
                    className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-lm-yellow/50 outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Selecione o Departamento...</option>
                    {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Cargo / Role</label>
                  <select 
                    value={formData.role || 'user'} 
                    onChange={e => {
                        const newRole = e.target.value as 'admin' | 'user';
                        setFormData({
                            ...formData, 
                            role: newRole,
                            permissions: newRole === 'admin' ? [DemandType.TODOS] : formData.permissions
                        });
                    }}
                    className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-lm-yellow/50 outline-none appearance-none cursor-pointer"
                  >
                    <option value="user">Colaborador (User)</option>
                    <option value="admin">Administrador (Admin)</option>
                  </select>
                </div>

                {formData.role !== 'admin' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Acesso às Demandas (Permissões)</label>
                        <div className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                {Object.values(DemandType).filter(d => d !== DemandType.TODOS && d !== DemandType.LUCRO_REINF).map(dept => (
                                    <label key={dept} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700/50 p-1.5 rounded-lg transition-colors">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.permissions?.includes(dept) ? 'bg-lm-yellow border-lm-yellow text-white' : 'border-gray-300 dark:border-zinc-600'}`}>
                                            {formData.permissions?.includes(dept) && <CheckSquare size={14} />}
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden"
                                            checked={formData.permissions?.includes(dept)}
                                            onChange={(e) => {
                                                const newPermissions = e.target.checked 
                                                    ? [...(formData.permissions || []), dept]
                                                    : (formData.permissions || []).filter(p => p !== dept);
                                                setFormData({...formData, permissions: newPermissions});
                                            }}
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{dept}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400">Selecione os departamentos que este colaborador pode visualizar/editar.</p>
                    </div>
                )}

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-lm-yellow hover:bg-yellow-500 text-gray-900 text-sm font-bold rounded-lg shadow-lg shadow-yellow-500/20 transition-all"
                  >
                    {isEditing ? 'Salvar Alterações' : 'Criar Colaborador'}
                  </button>
                </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Departments Management Modal */}
      <AnimatePresence>
        {isDeptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-zinc-800"
            >
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Briefcase size={20} className="text-lm-yellow" />
                    Gerenciar Departamentos
                </h3>
                <button onClick={() => setIsDeptModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                  <form onSubmit={addDepartment} className="flex gap-2">
                      <input 
                          type="text" 
                          value={newDeptName}
                          onChange={(e) => setNewDeptName(e.target.value)}
                          placeholder="Nome do novo departamento..."
                          className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-lm-yellow/50 outline-none"
                      />
                      <button 
                          type="submit"
                          disabled={!newDeptName.trim()}
                          className="px-4 py-2.5 bg-lm-yellow hover:bg-yellow-500 text-gray-900 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                          <Plus size={20} />
                      </button>
                  </form>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                      {departments.length === 0 ? (
                          <p className="text-center text-gray-400 text-sm py-4">Nenhum departamento cadastrado.</p>
                      ) : (
                          departments.map(dept => (
                              <div key={dept.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 group">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{dept.name}</span>
                                  {/* Prevent deleting core departments if needed, or allow all */}
                                  <button 
                                      onClick={() => deleteDepartment(dept.id)}
                                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                      title="Excluir departamento"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          ))
                      )}
                  </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-zinc-800"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="text-red-600 dark:text-red-400" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Excluir Colaborador</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tem certeza que deseja excluir permanentemente <strong>{collaboratorToDelete?.name}</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeamView;
