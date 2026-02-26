import React, { useState, useMemo } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { Search, Shield, Calendar, User, FileText, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

const formatLogDescription = (description: string) => {
    // Handle both old format: Alteração em [Name]: field -> value
    // and new format: Alterou FriendlyField para "value"
    
    const oldRegex = /Alteração em \[.*?\]:\s*(\w+)\s*->\s*(.*)/;
    const oldMatch = description.match(oldRegex);

    if (oldMatch) {
        const [, field, value] = oldMatch;
        const fieldMap: Record<string, string> = {
            respFiscal: 'Responsável Fiscal', 
            statusFiscal: 'Status Fiscal',
            respContabil: 'Responsável Contábil (Balancete)', 
            statusContabil: 'Status Contábil (Balancete)',
            respBalanco: 'Responsável Contábil (Balanço)',
            statusBalanco: 'Status Contábil (Balanço)',
            respLucro: 'Responsável Lucro',
            statusLucro: 'Status Lucro', 
            respReinf: 'Responsável Reinf',
            statusReinf: 'Status Reinf',
            respECD: 'Responsável ECD',
            statusECD: 'Status ECD', 
            respECF: 'Responsável ECF',
            statusECF: 'Status ECF', 
            prioridade: 'Prioridade', 
            regime: 'Regime', 
            cnpj: 'CNPJ',
            dueDate: 'Data de Vencimento', 
            name: 'Nome da Empresa'
        };

        const friendlyField = fieldMap[field] || field;
        const friendlyValue = value.trim() === '' ? 'Vazio' : value;

        return (
            <span className="flex items-center gap-1.5 flex-wrap">
                Alterou <strong className="text-gray-900 dark:text-white font-bold">{friendlyField}</strong> para 
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700 shadow-sm">
                    {friendlyValue}
                </span>
            </span>
        );
    }

    // Handle "Alterou X para Y" format directly if it's already there
    const newRegex = /Alterou (.*?) para "(.*?)"/;
    const newMatch = description.match(newRegex);
    if (newMatch) {
        const [, field, value] = newMatch;
        return (
            <span className="flex items-center gap-1.5 flex-wrap">
                Alterou <strong className="text-gray-900 dark:text-white font-bold">{field}</strong> para 
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700 shadow-sm">
                    {value}
                </span>
            </span>
        );
    }

    // If it's the new format or something else, just render it nicely
    return <span className="text-gray-700 dark:text-gray-300 font-medium">{description}</span>;
};

const AuditLogView: React.FC = () => {
    const { logs = [] } = useTasks(); // logs is string[][] -> [Timestamp, Description, User, TaskID]
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState('ALL');
    const [selectedCompany, setSelectedCompany] = useState('ALL');
    const [selectedMonth, setSelectedMonth] = useState('ALL');
    const [displayLimit, setDisplayLimit] = useState(50);

    const filterOptions = useMemo(() => {
        const users = new Set<string>();
        const companies = new Set<string>();
        const months = new Set<string>();

        logs.forEach(log => {
            if (log[2]) users.add(log[2]);
            if (log[3]) companies.add(log[3]);
            if (log[0]) {
                const parts = log[0].split(' ')[0].split('/');
                if (parts.length === 3) {
                    months.add(`${parts[1]}/${parts[2]}`);
                }
            }
        });

        return {
            users: Array.from(users).sort(),
            companies: Array.from(companies).sort(),
            months: Array.from(months).sort((a, b) => {
                const [mA, yA] = a.split('/').map(Number);
                const [mB, yB] = b.split('/').map(Number);
                return yB !== yA ? yB - yA : mB - mA;
            })
        };
    }, [logs]);

    const filteredLogs = useMemo(() => {
        const filtered = logs.filter(log => {
            const search = searchTerm.toLowerCase();
            const matchesSearch = (
                (log[0] || '').toLowerCase().includes(search) || // Timestamp
                (log[1] || '').toLowerCase().includes(search) || // Description
                (log[2] || '').toLowerCase().includes(search) || // User
                (log[3] || '').toLowerCase().includes(search)    // TaskID
            );

            if (!matchesSearch) return false;
            if (selectedUser !== 'ALL' && log[2] !== selectedUser) return false;
            if (selectedCompany !== 'ALL' && log[3] !== selectedCompany) return false;
            if (selectedMonth !== 'ALL') {
                const parts = log[0].split(' ')[0].split('/');
                if (parts.length === 3) {
                    const monthYear = `${parts[1]}/${parts[2]}`;
                    if (monthYear !== selectedMonth) return false;
                } else return false;
            }

            return true;
        });

        // Explicitly sort by timestamp descending (newest first)
        return [...filtered].sort((a, b) => {
            const parseDate = (s: string) => {
                try {
                    if (!s) return 0;
                    // Handle formats like "DD/MM/YYYY, HH:mm:ss" or "DD/MM/YYYY HH:mm:ss"
                    const cleanStr = s.replace(',', '').trim();
                    const [d, t] = cleanStr.split(' ');
                    const [day, month, year] = d.split('/').map(Number);
                    const [h, m, s_] = t.split(':').map(Number);
                    const date = new Date(year, month - 1, day, h, m, s_ || 0);
                    return date.getTime();
                } catch (e) {
                    return 0;
                }
            };
            const timeA = parseDate(a[0]);
            const timeB = parseDate(b[0]);
            return timeB - timeA;
        });
    }, [logs, searchTerm, selectedUser, selectedCompany, selectedMonth]);

    const displayedLogs = useMemo(() => {
        return filteredLogs.slice(0, displayLimit);
    }, [filteredLogs, displayLimit]);

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-black">
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-7xl mx-auto w-full h-full flex flex-col gap-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <Shield className="text-lm-yellow" size={28} />
                                Log de Auditoria Global
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-1 ml-11">
                                Histórico completo de ações do sistema para segurança e rastreabilidade.
                            </p>
                        </div>
                    </div>

                    {/* Filters Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar..." 
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setDisplayLimit(50); }}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-lm-yellow/50 outline-none transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800/50 px-3 py-2 rounded-xl border border-gray-100 dark:border-zinc-800">
                            <User size={14} className="text-gray-400" />
                            <select 
                                value={selectedUser}
                                onChange={(e) => { setSelectedUser(e.target.value); setDisplayLimit(50); }}
                                className="bg-transparent text-xs font-bold text-gray-600 dark:text-gray-300 outline-none cursor-pointer w-full"
                            >
                                <option value="ALL">Todos Usuários</option>
                                {filterOptions.users.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800/50 px-3 py-2 rounded-xl border border-gray-100 dark:border-zinc-800">
                            <Building2 size={14} className="text-gray-400" />
                            <select 
                                value={selectedCompany}
                                onChange={(e) => { setSelectedCompany(e.target.value); setDisplayLimit(50); }}
                                className="bg-transparent text-xs font-bold text-gray-600 dark:text-gray-300 outline-none cursor-pointer w-full"
                            >
                                <option value="ALL">Todas Empresas</option>
                                {filterOptions.companies.map(c => (
                                    <option key={c} value={c}>ID: {c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800/50 px-3 py-2 rounded-xl border border-gray-100 dark:border-zinc-800">
                            <Calendar size={14} className="text-gray-400" />
                            <select 
                                value={selectedMonth}
                                onChange={(e) => { setSelectedMonth(e.target.value); setDisplayLimit(50); }}
                                className="bg-transparent text-xs font-bold text-gray-600 dark:text-gray-300 outline-none cursor-pointer w-full"
                            >
                                <option value="ALL">Todos os Meses</option>
                                {filterOptions.months.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden flex flex-col">
                        <div className="overflow-x-auto custom-scrollbar flex-1">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-gray-50/80 dark:bg-zinc-800/50 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wider sticky top-0 backdrop-blur-sm z-10">
                                    <tr>
                                        <th className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 w-48">Data e Hora</th>
                                        <th className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 w-48">Usuário</th>
                                        <th className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">Ação Realizada</th>
                                        <th className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 w-40">Empresa (ID)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                                    {displayedLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400 dark:text-gray-600">
                                                Nenhum registro encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        displayedLogs.map((log, index) => (
                                            <tr 
                                                key={index} 
                                                className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors animate-depth-appear"
                                                style={{ animationDelay: `${(index % 50) * 10}ms` }}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-mono text-xs">
                                                        <Calendar size={14} className="text-gray-400" />
                                                        {log[0]}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                            <User size={12} />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{log[2]}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <FileText size={14} className="text-gray-400 shrink-0" />
                                                        <div className="text-sm truncate max-w-xl" title={log[1]}>
                                                            {formatLogDescription(log[1])}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {log[3] ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800 text-xs font-mono font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700">
                                                            <Building2 size={12} />
                                                            {log[3]}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300 dark:text-zinc-700 text-xs">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {filteredLogs.length > displayLimit && (
                            <div className="p-4 text-center border-t border-gray-100 dark:border-zinc-800">
                                <button 
                                    onClick={() => setDisplayLimit(prev => prev + 50)}
                                    className="px-6 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
                                >
                                    Carregar mais registros...
                                </button>
                            </div>
                        )}
                        <div className="px-6 py-3 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 text-xs text-gray-400 dark:text-gray-500 flex justify-between items-center">
                            <span>Mostrando {displayedLogs.length} de {filteredLogs.length} registros</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditLogView;
