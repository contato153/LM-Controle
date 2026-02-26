import React, { useState } from 'react';
import { useTrashQuery, useRestoreCompanyMutation, useRestoreCollaboratorMutation, usePermanentDeleteCompanyMutation, usePermanentDeleteCollaboratorMutation } from '../hooks/useTrashQuery';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TasksContext';
import { Trash2, RefreshCw, AlertTriangle, Building2, User, Search } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const TrashView: React.FC = () => {
    const { activeYear } = useTasks();
    const { data, isLoading, isError } = useTrashQuery(activeYear);
    const { currentUser } = useAuth();
    const { addNotification } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'companies' | 'collaborators'>('companies');

    const restoreCompany = useRestoreCompanyMutation();
    const restoreCollaborator = useRestoreCollaboratorMutation();
    const deleteCompany = usePermanentDeleteCompanyMutation();
    const deleteCollaborator = usePermanentDeleteCollaboratorMutation();

    const handleRestoreCompany = async (id: string, year: string) => {
        if (!currentUser) return;
        try {
            await restoreCompany.mutateAsync({ id, user: currentUser.name, year });
            addNotification('Sucesso', 'Empresa restaurada com sucesso.', 'success');
        } catch (error) {
            addNotification('Erro', 'Falha ao restaurar empresa.', 'error');
        }
    };

    const handleRestoreCollaborator = async (id: string) => {
        try {
            await restoreCollaborator.mutateAsync(id);
            addNotification('Sucesso', 'Colaborador restaurado com sucesso.', 'success');
        } catch (error) {
            addNotification('Erro', 'Falha ao restaurar colaborador.', 'error');
        }
    };

    const handlePermanentDeleteCompany = async (id: string, year: string) => {
        if (!currentUser) return;
        if (!window.confirm('Tem certeza? Esta ação é irreversível.')) return;
        try {
            await deleteCompany.mutateAsync({ id, user: currentUser.name, year });
            addNotification('Sucesso', 'Empresa excluída permanentemente.', 'success');
        } catch (error) {
            addNotification('Erro', 'Falha ao excluir empresa.', 'error');
        }
    };

    const handlePermanentDeleteCollaborator = async (id: string) => {
        if (!window.confirm('Tem certeza? Esta ação é irreversível.')) return;
        try {
            await deleteCollaborator.mutateAsync(id);
            addNotification('Sucesso', 'Colaborador excluído permanentemente.', 'success');
        } catch (error) {
            addNotification('Erro', 'Falha ao excluir colaborador.', 'error');
        }
    };

    const filteredTasks = (data?.tasks || []).filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredCollaborators = (data?.collaborators || []).filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lm-yellow"></div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="h-full flex items-center justify-center text-red-500">
                Erro ao carregar lixeira.
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-black animate-enter">
            {/* Header */}
            <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-8 py-6">
                <div className="max-w-[1600px] mx-auto w-full">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                            <Trash2 size={24} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lixeira</h1>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 ml-11">
                        Itens excluídos podem ser restaurados em até 30 dias.
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-8">
                <div className="max-w-[1600px] mx-auto w-full h-full flex flex-col gap-6">
                    
                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('companies')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                    activeTab === 'companies' 
                                    ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                Empresas
                            </button>
                            <button
                                onClick={() => setActiveTab('collaborators')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                    activeTab === 'collaborators' 
                                    ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                Colaboradores
                            </button>
                        </div>

                        <div className="relative w-full max-w-md">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder={`Buscar ${activeTab === 'companies' ? 'empresas' : 'colaboradores'}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-lm-yellow/50 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden flex flex-col">
                        <div className="overflow-y-auto custom-scrollbar flex-1 p-4">
                            {activeTab === 'companies' ? (
                                <div className="grid grid-cols-1 gap-3">
                                    {filteredTasks.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">Nenhuma empresa na lixeira.</div>
                                    ) : (
                                        filteredTasks.map(task => (
                                            <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                                        <Building2 size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 dark:text-white">{task.name}</h3>
                                                        <span className="text-xs font-mono text-gray-500 bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700">ID: {task.id}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleRestoreCompany(task.id, task.ano || '2026')}
                                                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                        title="Restaurar"
                                                    >
                                                        <RefreshCw size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handlePermanentDeleteCompany(task.id, task.ano || '2026')}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Excluir Permanentemente"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {filteredCollaborators.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">Nenhum colaborador na lixeira.</div>
                                    ) : (
                                        filteredCollaborators.map(collab => (
                                            <div key={collab.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                                        <User size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 dark:text-white">{collab.name}</h3>
                                                        <span className="text-xs text-gray-500">{collab.department || 'Sem departamento'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleRestoreCollaborator(collab.id)}
                                                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                        title="Restaurar"
                                                    >
                                                        <RefreshCw size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handlePermanentDeleteCollaborator(collab.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Excluir Permanentemente"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrashView;
