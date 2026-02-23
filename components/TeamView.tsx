
import React from 'react';
import { Users, Search, Building2, CheckSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TasksContext';

const TeamView: React.FC = () => {
  const { currentUser } = useAuth();
  const { collaborators, tasks } = useTasks();
  
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

  return (
    <div className="h-full overflow-y-auto bg-[#F7F7F5] dark:bg-zinc-950 p-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-8 pb-10">
        <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3"><Users className="text-lm-dark dark:text-lm-yellow" size={32} />Colaboradores</h2>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{collaborators.length} membros ativos</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3">
                <Search size={20} className="text-gray-400" />
                <input type="text" placeholder="Buscar colaborador..." className="w-full text-sm outline-none text-gray-700 dark:text-gray-200 bg-transparent" />
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-zinc-800/50 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-zinc-800">
                        <tr><th className="px-6 py-4">Nome</th><th className="px-6 py-4">Departamento</th><th className="px-6 py-4 text-center">Empresas</th><th className="px-6 py-4 text-center">Tarefas</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-5 dark:divide-zinc-800">
                        {collaborators.map((c, idx) => {
                            const stats = getCollaboratorStats(c.name);
                            return (
                                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group animate-depth-appear" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-lm-yellow/20 dark:bg-lm-yellow/10 border border-lm-yellow/30 dark:border-lm-yellow/20 flex items-center justify-center text-sm font-bold text-lm-dark dark:text-lm-yellow relative">{c.name.charAt(0)}</div><div><p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">{c.name}{currentUser && c.id === currentUser.id && (<span className="text-[9px] bg-gray-100 dark:bg-zinc-800 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">Você</span>)}</p><p className="text-xs text-gray-400 dark:text-gray-500">Colaborador</p></div></div></td>
                                    <td className="px-6 py-4"><span className="text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-md font-medium">{c.department || 'Geral'}</span></td>
                                    <td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-1.5 text-gray-700 dark:text-gray-300 font-mono font-bold text-sm" title="Empresas em seu nome"><Building2 size={14} className="text-gray-400 dark:text-gray-500" />{stats.companiesCount}</div></td>
                                    <td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-1.5 text-gray-700 dark:text-gray-300 font-mono font-bold text-sm" title="Tarefas em seu nome"><CheckSquare size={14} className="text-gray-400 dark:text-gray-500" />{stats.tasksCount}</div></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};

export default TeamView;
