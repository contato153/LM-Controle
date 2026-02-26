import React from 'react';
import { Calendar, AlertOctagon, Hourglass, CheckCircle2 } from 'lucide-react';
import { ReportStats } from '../../hooks/useReportStats';
import { motion } from 'framer-motion';

interface ReportsDeadlineStatsProps {
    stats: ReportStats;
}

export const ReportsDeadlineStats: React.FC<ReportsDeadlineStatsProps> = ({ stats }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="space-y-6"
        >
            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Calendar size={24} className="text-lm-dark dark:text-lm-yellow" />
                Monitoramento de Prazos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertOctagon size={64} className="text-red-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Vencidas</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-gray-900 dark:text-white">{stats.deadlines.overdueCount}</span>
                            <span className="text-xs text-gray-400 font-medium">tarefas</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500/20">
                        <div className="h-full bg-red-500" style={{ width: '100%' }}></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Hourglass size={64} className="text-orange-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Próximas (3 dias)</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-gray-900 dark:text-white">{stats.deadlines.approachingCount}</span>
                            <span className="text-xs text-gray-400 font-medium">tarefas</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-orange-500/20">
                        <div className="h-full bg-orange-500" style={{ width: '100%' }}></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle2 size={64} className="text-green-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">No Prazo</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-gray-900 dark:text-white">{stats.deadlines.onTrackCount}</span>
                            <span className="text-xs text-gray-400 font-medium">tarefas</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-green-500/20">
                        <div className="h-full bg-green-500" style={{ width: '100%' }}></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar size={64} className="text-gray-400" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                            <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Sem Vencimento</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-gray-900 dark:text-white">{stats.deadlines.noDateCount}</span>
                            <span className="text-xs text-gray-400 font-medium">tarefas</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200 dark:bg-zinc-700">
                        <div className="h-full bg-gray-400" style={{ width: '100%' }}></div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
