import React from 'react';
import { CheckCircle2, Target } from 'lucide-react';
import { ReportStats } from '../../hooks/useReportStats';

interface ReportsProgressDistributionProps {
    stats: ReportStats;
}

export const ReportsProgressDistribution: React.FC<ReportsProgressDistributionProps> = ({ stats }) => {
    const pieSegments = stats.regimeStats.map(r => {
        let color = '#9CA3AF';
        if (r.regime.includes('REAL')) color = '#3B82F6';
        else if (r.regime.includes('PRESUMIDO')) color = '#F59E0B';
        else if (r.regime.includes('SIMPLES')) color = '#10B981';

        const share = (r.total / stats.totalCompanies) * 100;
        return { ...r, color, share };
    }).sort((a, b) => b.share - a.share);

    let currentAngle = 0;
    const gradient = `conic-gradient(${pieSegments.map(s => {
        const start = currentAngle;
        currentAngle += s.share;
        return `${s.color} ${start}% ${currentAngle}%`;
    }).join(', ')})`;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-enter" style={{ animationDelay: '200ms' }}>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 flex flex-col justify-center">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                    <div className="p-1.5 bg-gray-100 dark:bg-zinc-800 rounded-lg text-gray-600 dark:text-gray-400">
                        <CheckCircle2 size={18} />
                    </div>
                    Progresso por Área
                </h3>
                <div className="space-y-6">
                    {stats.deptStats.map((dept) => (
                        <div key={dept.label}>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <span className="text-sm font-bold text-gray-800 dark:text-white block">{dept.label}</span>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">{dept.sublabel}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">{dept.percentage}%</span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-gray-100 dark:border-zinc-700">{dept.finished}/{dept.total}</span>
                                </div>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                                <div
                                    className={`h-2 rounded-full transition-all duration-1000 ${dept.percentage === 100 ? 'bg-green-500' : dept.percentage > 70 ? 'bg-blue-500' : dept.percentage > 30 ? 'bg-yellow-500' : 'bg-red-400'}`}
                                    style={{ width: `${dept.percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 flex flex-col justify-center overflow-hidden">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                    <div className="p-1.5 bg-gray-100 dark:bg-zinc-800 rounded-lg text-gray-600 dark:text-gray-400">
                        <Target size={18} />
                    </div>
                    Distribuição e Conclusão (Regimes)
                </h3>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-8 h-full">
                    <div className="relative w-40 h-40 rounded-full shadow-sm flex items-center justify-center shrink-0 ring-8 ring-gray-50 dark:ring-zinc-800/50" style={{ background: gradient }}>
                        <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-full flex flex-col items-center justify-center shadow-sm z-10 p-2 text-center transition-colors">
                            <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalCompanies}</span>
                            <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider leading-tight">Empresas</span>
                        </div>
                    </div>
                    <div className="flex-1 w-full space-y-3 min-w-0">
                        {pieSegments.map(s => (
                            <div key={s.regime} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: s.color }}></div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-800 dark:text-gray-100 text-xs leading-tight truncate group-hover:text-black dark:group-hover:text-white transition-colors" title={s.regime}>
                                            {s.regime.replace('LUCRO ', '').replace('NACIONAL', '')}
                                        </p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{s.share.toFixed(1)}% do Volume</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end flex-shrink-0 ml-2">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border whitespace-nowrap ${s.percentage === 100 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-700'}`}>
                                        {s.percentage}% Conc.
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
