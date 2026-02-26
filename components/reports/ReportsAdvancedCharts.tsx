import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { ReportStats } from '../../hooks/useReportStats';

interface ReportsAdvancedChartsProps {
    stats: ReportStats;
}

export const ReportsAdvancedCharts: React.FC<ReportsAdvancedChartsProps> = ({ stats }) => {
    const COLORS = ['#10B981', '#F59E0B', '#EF4444']; // Green, Orange, Red

    const slaData = [
        { name: 'No Prazo', value: stats.deadlines.onTrackCount },
        { name: 'Próximas', value: stats.deadlines.approachingCount },
        { name: 'Vencidas', value: stats.deadlines.overdueCount },
    ].filter(d => d.value > 0);

    const totalSLA = slaData.reduce((acc, curr) => acc + curr.value, 0);

    // Prepare data for horizontal bars (Bottlenecks)
    // Filter out zero values to keep chart clean
    const bottleneckData = stats.bottlenecks.filter(b => b.value > 0);

    // Prepare data for horizontal bars (Productivity)
    const productivityData = stats.teamStats
        .slice(0, 5)
        .map(t => ({
            name: t.name.split(' ')[0], // First name only
            fullName: t.name,
            finished: t.finished
        }))
        .filter(t => t.finished > 0);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl border border-gray-700">
                    <p className="font-bold mb-1">{payload[0].payload.fullName || label}</p>
                    <p className="text-gray-300">
                        {payload[0].name}: <span className="font-bold text-white">{payload[0].value}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-enter" style={{ animationDelay: '400ms' }}>
            {/* --- GARGALOS (BOTTLENECKS) --- */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 flex flex-col h-[320px]">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-500">
                                <AlertTriangle size={18} />
                            </div>
                            Gargalos Operacionais
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-10">Tarefas paradas há +5 dias</p>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-0">
                    {bottleneckData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bottleneckData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#E5E7EB" opacity={0.3} />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={70} 
                                    tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                />
                                <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                                <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={24} name="Tarefas Paradas" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                            <CheckCircle2 size={32} className="mb-2 opacity-50" />
                            <p className="text-sm font-medium">Nenhum gargalo detectado</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- PRODUTIVIDADE (TOP 5) --- */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 flex flex-col h-[320px]">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-500">
                                <CheckCircle2 size={18} />
                            </div>
                            Top Produtividade
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-10">Tarefas concluídas (Top 5)</p>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-0">
                    {productivityData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={productivityData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#E5E7EB" opacity={0.3} />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={70} 
                                    tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                />
                                <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                                <Bar dataKey="finished" fill="#10B981" radius={[0, 4, 4, 0]} barSize={24} name="Concluídas" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                            <p className="text-sm font-medium">Sem dados de produtividade</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- SLA DE VENCIMENTOS --- */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 flex flex-col h-[320px]">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">
                                <Clock size={18} />
                            </div>
                            SLA de Vencimentos
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-10">Status geral de entregas</p>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-0 relative">
                    {totalSLA > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={slaData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {slaData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.name === 'No Prazo' ? '#10B981' : entry.name === 'Próximas' ? '#F59E0B' : '#EF4444'} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        iconType="circle" 
                                        iconSize={8} 
                                        wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', paddingTop: '10px' }} 
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pb-8">
                                <span className="text-3xl font-bold text-gray-800 dark:text-white block">{totalSLA}</span>
                                <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Total</span>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                            <p className="text-sm font-medium">Sem dados de prazo</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
