import React from 'react';
import { Filter, FileText, ChevronDown } from 'lucide-react';

interface ReportsFiltersProps {
    filters: {
        context: string;
        status: string;
        regime: string;
        responsible: string;
    };
    setFilters: React.Dispatch<React.SetStateAction<{
        context: string;
        status: string;
        regime: string;
        responsible: string;
    }>>;
    uniqueResponsibles: string[];
    setShowConfigModal: (show: boolean) => void;
}

export const ReportsFilters: React.FC<ReportsFiltersProps> = ({ filters, setFilters, uniqueResponsibles, setShowConfigModal }) => {
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-5 animate-enter">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-lm-dark/5 dark:bg-lm-yellow/10 rounded-xl text-lm-dark dark:text-lm-yellow">
                        <Filter size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">Filtros & Exportação</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Personalize a visualização dos dados</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowConfigModal(true)}
                    className="px-5 py-2.5 bg-lm-dark dark:bg-lm-yellow text-white dark:text-lm-dark rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-lm-dark/10 dark:shadow-lm-yellow/20 active:scale-95"
                >
                    <FileText size={18} />
                    Exportar Relatório PDF
                </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">Departamento</label>
                    <div className="relative">
                        <select
                            className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-lm-yellow/50 focus:border-lm-yellow outline-none appearance-none transition-all cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800"
                            value={filters.context}
                            onChange={(e) => setFilters(prev => ({ ...prev, context: e.target.value }))}
                        >
                            <option value="ALL">Todos os Departamentos</option>
                            <option value="FISCAL">Fiscal</option>
                            <option value="CONTABIL">Contábil</option>
                            <option value="REINF">Reinf</option>
                            <option value="LUCRO">Lucro</option>
                            <option value="ECD">ECD</option>
                            <option value="ECF">ECF</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">Status</label>
                    <div className="relative">
                        <select
                            className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-lm-yellow/50 focus:border-lm-yellow outline-none appearance-none transition-all cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800"
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="ALL">Todos os Status</option>
                            <option value="PENDING">Pendentes</option>
                            <option value="FINISHED">Finalizados</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">Regime Tributário</label>
                    <div className="relative">
                        <select
                            className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-lm-yellow/50 focus:border-lm-yellow outline-none appearance-none transition-all cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800"
                            value={filters.regime}
                            onChange={(e) => setFilters(prev => ({ ...prev, regime: e.target.value }))}
                        >
                            <option value="">Todos os Regimes</option>
                            <option value="LUCRO REAL">Lucro Real</option>
                            <option value="LUCRO PRESUMIDO">Lucro Presumido</option>
                            <option value="SIMPLES NACIONAL">Simples Nacional</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">Responsável</label>
                    <div className="relative">
                        <select
                            className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-lm-yellow/50 focus:border-lm-yellow outline-none appearance-none transition-all cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800"
                            value={filters.responsible}
                            onChange={(e) => setFilters(prev => ({ ...prev, responsible: e.target.value }))}
                        >
                            <option value="">Todos os Responsáveis</option>
                            {uniqueResponsibles.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>
        </div>
    );
};
