import React from 'react';
import { TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { ReportStats } from '../../hooks/useReportStats';

interface ReportsGlobalStatsProps {
    stats: ReportStats;
}

export const ReportsGlobalStats: React.FC<ReportsGlobalStatsProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-enter" style={{ animationDelay: '100ms' }}>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp size={80} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <TrendingUp size={18} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">Conclusão Global</p>
                    </div>
                    <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{stats.globalProgress}%</h3>
                </div>
                <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats.globalProgress}%` }}></div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Clock size={80} className="text-orange-500" />
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
                            <Clock size={18} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">Empresas Pendentes</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{stats.pendingCompaniesCount}</h3>
                        <span className="text-sm text-gray-400 font-medium">/ {stats.totalCompanies}</span>
                    </div>
                </div>
                <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div className="bg-orange-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(stats.pendingCompaniesCount / stats.totalCompanies) * 100}%` }}></div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <AlertTriangle size={80} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                            <AlertTriangle size={18} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">Prioridade Alta</p>
                    </div>
                    <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{stats.highPriorityPending}</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-red-500 dark:text-red-400 font-medium mt-2 bg-red-50 dark:bg-red-900/10 py-1 px-2 rounded-lg w-fit">
                    <span>Atenção necessária</span>
                </div>
            </div>
        </div>
    );
};
