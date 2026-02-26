import React, { useMemo, useState } from 'react';
import { PieChart } from 'lucide-react';
import { useTasks } from '../contexts/TasksContext';
import { useReportStats } from '../hooks/useReportStats';
import { usePdfGenerator } from '../hooks/usePdfGenerator';

import { ReportsFilters } from './reports/ReportsFilters';
import { ReportsAdvancedCharts } from './reports/ReportsAdvancedCharts';
import { ReportsDeadlineStats } from './reports/ReportsDeadlineStats';
import { ReportsGlobalStats } from './reports/ReportsGlobalStats';
import { ReportsProgressDistribution } from './reports/ReportsProgressDistribution';
import { ReportsTeamTable } from './reports/ReportsTeamTable';
import { ReportsConfigModal } from './reports/ReportsConfigModal';

const ReportsDashboard: React.FC = () => {
    const { tasks, collaborators } = useTasks();

    // Filtros Básicos
    const [filters, setFilters] = useState({
        context: 'ALL',
        status: 'ALL',
        regime: '',
        responsible: ''
    });

    // Configuração do Relatório
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [reportConfig, setReportConfig] = useState<{
        title: string;
        subtitle: string;
        includeCharts: boolean;
        includeTable: boolean;
        orientation: 'portrait' | 'landscape';
    }>({
        title: 'Relatório Gerencial de Obrigações',
        subtitle: '',
        includeCharts: true,
        includeTable: true,
        orientation: 'landscape'
    });

    // Custom Hooks
    const { filteredTasks, stats } = useReportStats(tasks, collaborators, filters);
    const { generatePDF, isGenerating } = usePdfGenerator();

    const uniqueResponsibles = useMemo(() => {
        const set = new Set<string>();
        tasks.forEach(t => {
            if (t.respFiscal) set.add(t.respFiscal);
            if (t.respContabil) set.add(t.respContabil);
            if (t.respBalanco) set.add(t.respBalanco);
            if (t.respReinf) set.add(t.respReinf);
            if (t.respLucro) set.add(t.respLucro);
            if (t.respECD) set.add(t.respECD);
            if (t.respECF) set.add(t.respECF);
        });
        return Array.from(set).sort();
    }, [tasks]);

    const handleGeneratePDF = () => {
        generatePDF(filteredTasks, {
            reportTitle: reportConfig.title,
            reportSubtitle: reportConfig.subtitle,
            filterContext: filters.context,
            filterStatus: filters.status,
            filterRegime: filters.regime,
            filterResponsible: filters.responsible,
            includeCharts: reportConfig.includeCharts,
            includeTable: reportConfig.includeTable,
            orientation: reportConfig.orientation
        }, () => setShowConfigModal(false));
    };

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 animate-enter">
                <p className="text-lg font-medium">Nenhum dado encontrado para os filtros selecionados.</p>
                <button 
                    onClick={() => setFilters({ context: 'ALL', status: 'ALL', regime: '', responsible: '' })}
                    className="mt-4 text-lm-dark dark:text-lm-yellow hover:underline"
                >
                    Limpar Filtros
                </button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-gray-50 dark:bg-black transition-colors duration-300">
            <div className="max-w-7xl mx-auto space-y-8 pt-10 px-6 lg:px-8 pb-20">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                      <PieChart className="text-lm-yellow" size={28} />
                      Relatórios Gerenciais
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 ml-11">
                      Análise detalhada de produtividade, prazos e status das obrigações.
                    </p>
                  </div>
                </div>

                {/* --- FILTROS E CONFIGURAÇÃO --- */}
                <ReportsFilters 
                    filters={filters} 
                    setFilters={setFilters} 
                    uniqueResponsibles={uniqueResponsibles} 
                    setShowConfigModal={setShowConfigModal} 
                />

                {/* --- DASHBOARD ANALÍTICO AVANÇADO --- */}
                <ReportsAdvancedCharts stats={stats} />

                {/* --- MONITORAMENTO DE PRAZOS --- */}
                <ReportsDeadlineStats stats={stats} />

                {/* --- CARDS GLOBAIS --- */}
                <ReportsGlobalStats stats={stats} />

                {/* --- PROGRESSO E DISTRIBUIÇÃO --- */}
                <ReportsProgressDistribution stats={stats} />

                {/* --- TABELA DE PRODUTIVIDADE --- */}
                <ReportsTeamTable stats={stats} />

                {/* --- MODAL DE CONFIGURAÇÃO DE PDF --- */}
                <ReportsConfigModal 
                    showConfigModal={showConfigModal} 
                    setShowConfigModal={setShowConfigModal}
                    reportConfig={reportConfig}
                    setReportConfig={setReportConfig}
                    handleGeneratePDF={handleGeneratePDF}
                    isGenerating={isGenerating}
                />
            </div>
        </div>
    );
};

export default ReportsDashboard;
