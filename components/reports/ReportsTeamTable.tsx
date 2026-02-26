import React, { useState, useMemo } from 'react';
import { Users, Building2, Trophy, Filter } from 'lucide-react';
import { ReportStats } from '../../hooks/useReportStats';

interface ReportsTeamTableProps {
    stats: ReportStats;
}

export const ReportsTeamTable: React.FC<ReportsTeamTableProps> = ({ stats }) => {
    const [selectedDept, setSelectedDept] = useState<string>('ALL');
    const [showAll, setShowAll] = useState(false);

    const departments = useMemo(() => {
        const depts = new Set<string>();
        stats.teamStats.forEach(member => {
            if (member.department) depts.add(member.department);
        });
        return Array.from(depts).sort();
    }, [stats.teamStats]);

    // Sort by percentage descending, then by total tasks
    const sortedTeam = useMemo(() => {
        let filtered = [...stats.teamStats];
        if (selectedDept !== 'ALL') {
            filtered = filtered.filter(m => m.department === selectedDept);
        }
        return filtered.sort((a, b) => {
            if (b.percentage !== a.percentage) return b.percentage - a.percentage;
            return b.total - a.total;
        });
    }, [stats.teamStats, selectedDept]);

    const displayedTeam = showAll ? sortedTeam : sortedTeam.slice(0, 10);

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden animate-enter" style={{ animationDelay: '300ms' }}>
            <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                        <div className="p-1.5 bg-gray-100 dark:bg-zinc-800 rounded-lg text-gray-600 dark:text-gray-400">
                            <Users size={18} />
                        </div>
                        Produtividade da Equipe
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-9">Desempenho individual baseado na seleção atual</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-zinc-800">
                        <Filter size={14} className="text-gray-400" />
                        <select 
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="bg-transparent text-xs font-bold text-gray-600 dark:text-gray-300 outline-none cursor-pointer"
                        >
                            <option value="ALL">Geral (Todos)</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                    
                    <button 
                        onClick={() => setShowAll(!showAll)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${showAll ? 'bg-lm-yellow text-gray-900 border-lm-yellow' : 'bg-white dark:bg-zinc-900 text-gray-500 border-gray-200 dark:border-zinc-800 hover:bg-gray-50'}`}
                    >
                        {showAll ? 'Ver Top 10' : 'Ver Todos'}
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left whitespace-nowrap border-separate border-spacing-0">
                    <thead className="bg-gray-50/80 dark:bg-zinc-900/80 text-gray-500 dark:text-gray-400 font-semibold text-[10px] uppercase tracking-wider border-b border-gray-100 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                            <th className="px-6 py-3 border-b border-gray-100 dark:border-zinc-800 w-16 text-center">Rank</th>
                            <th className="px-6 py-3 border-b border-gray-100 dark:border-zinc-800">Colaborador</th>
                            <th className="px-6 py-3 border-b border-gray-100 dark:border-zinc-800">Depto</th>
                            <th className="px-4 py-3 text-center text-gray-400 w-32 border-b border-gray-100 dark:border-zinc-800"><Building2 size={12} className="mx-auto mb-1" />Real</th>
                            <th className="px-4 py-3 text-center text-gray-400 w-32 border-b border-gray-100 dark:border-zinc-800"><Building2 size={12} className="mx-auto mb-1 text-lm-yellow" />Presumido</th>
                            <th className="px-4 py-3 text-center text-gray-400 w-32 border-b border-gray-100 dark:border-zinc-800"><Building2 size={12} className="mx-auto mb-1 text-blue-500" />Simples</th>
                            <th className="px-6 py-3 text-center border-b border-gray-100 dark:border-zinc-800">Total</th>
                            <th className="px-6 py-3 text-center border-b border-gray-100 dark:border-zinc-800 w-48">Progresso</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                        {displayedTeam.map((member, index) => (
                            <tr key={member.name} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors group">
                                <td className="px-6 py-4 text-center">
                                    {index < 3 && selectedDept === 'ALL' ? (
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto text-xs font-bold ${
                                            index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500' :
                                            index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' :
                                            'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-500'
                                        }`}>
                                            {index + 1}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 font-mono">{index + 1}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-zinc-900 group-hover:ring-lm-yellow/20 transition-all">
                                            {member.name.charAt(0)}
                                        </div>
                                        <span className="text-sm">{member.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 uppercase">
                                        {member.department}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-center font-mono text-xs">
                                    <span className={`px-2 py-1 rounded ${member.breakdown.real.total > 0 ? "bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 font-bold" : "text-gray-300 dark:text-zinc-700 opacity-50"}`}>
                                        {member.breakdown.real.finished}/{member.breakdown.real.total}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-center font-mono text-xs">
                                    <span className={`px-2 py-1 rounded ${member.breakdown.presumido.total > 0 ? "bg-lm-yellow/10 text-gray-800 dark:text-gray-200 font-bold" : "text-gray-300 dark:text-zinc-700 opacity-50"}`}>
                                        {member.breakdown.presumido.finished}/{member.breakdown.presumido.total}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-center font-mono text-xs">
                                    <span className={`px-2 py-1 rounded ${member.breakdown.simples.total > 0 ? "bg-blue-50 dark:bg-blue-900/20 text-gray-800 dark:text-gray-200 font-bold" : "text-gray-300 dark:text-zinc-700 opacity-50"}`}>
                                        {member.breakdown.simples.finished}/{member.breakdown.simples.total}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-mono text-xs font-bold border border-gray-200 dark:border-zinc-700">
                                        {member.finished}/{member.total}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 w-24 bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-1.5 rounded-full transition-all duration-1000 ${member.percentage === 100 ? 'bg-green-500' : 'bg-lm-yellow'}`}
                                                style={{ width: `${member.percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-8 text-right">{member.percentage}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {sortedTeam.length > 10 && !showAll && (
                <div className="p-4 bg-gray-50/50 dark:bg-zinc-800/30 border-t border-gray-100 dark:border-zinc-800 text-center">
                    <button 
                        onClick={() => setShowAll(true)}
                        className="text-xs font-bold text-lm-dark dark:text-lm-yellow hover:underline"
                    >
                        Mostrar todos os {sortedTeam.length} colaboradores
                    </button>
                </div>
            )}
        </div>
    );
};
