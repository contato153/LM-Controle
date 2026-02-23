
import React, { useMemo, useState } from 'react';
import { PieChart, TrendingUp, AlertTriangle, CheckCircle2, Target, Users, Clock, Building2, Filter, X, Eye, Calendar, AlertOctagon, Hourglass, Settings2, FileDown, ChevronDown, Check } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { useTasks } from '../contexts/TasksContext';
import { isFiscalFinished, CompanyTask, Department } from '../types';

// Definição das colunas disponíveis para o relatório
const AVAILABLE_COLUMNS = [
    { id: 'id', label: 'ID', width: 15 },
    { id: 'name', label: 'Empresa', width: 50 },
    { id: 'cnpj', label: 'CNPJ', width: 35 },
    { id: 'regime', label: 'Regime', width: 30 },
    { id: 'prioridade', label: 'Prioridade', width: 25 },
    { id: 'dueDate', label: 'Vencimento', width: 25 },
    { id: 'respFiscal', label: 'Resp. Fiscal', width: 30 },
    { id: 'statusFiscal', label: 'Status Fiscal', width: 30 },
    { id: 'respContabil', label: 'Resp. Contábil', width: 30 },
    { id: 'statusContabil', label: 'Status Contábil', width: 30 },
    { id: 'respBalanco', label: 'Resp. Balanço', width: 30 },
    { id: 'statusBalanco', label: 'Status Balanço', width: 30 },
    { id: 'respReinf', label: 'Resp. Reinf', width: 30 },
    { id: 'statusReinf', label: 'Status Reinf', width: 30 },
    { id: 'respLucro', label: 'Resp. Lucro', width: 30 },
    { id: 'statusLucro', label: 'Status Lucro', width: 30 },
    { id: 'respECD', label: 'Resp. ECD', width: 30 },
    { id: 'statusECD', label: 'Status ECD', width: 30 },
    { id: 'respECF', label: 'Resp. ECF', width: 30 },
    { id: 'statusECF', label: 'Status ECF', width: 30 },
    { id: 'lastEditor', label: 'Última Edição', width: 40 },
];

const ReportsDashboard: React.FC = () => {
  const { tasks, collaborators } = useTasks();
  
  // Filtros Básicos
  const [filterContext, setFilterContext] = useState<string>('ALL'); 
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterRegime, setFilterRegime] = useState<string>('');
  const [filterResponsible, setFilterResponsible] = useState<string>('');

  // Configuração do Relatório
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [reportTitle, setReportTitle] = useState('Relatório Gerencial de Obrigações');
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>([
      'id', 'name', 'regime', 'statusFiscal', 'statusContabil', 'respFiscal'
  ]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
        if (filterRegime && t.regime !== filterRegime) return false;
        if (filterResponsible) {
             const isResp = t.respFiscal === filterResponsible || t.respContabil === filterResponsible || t.respBalanco === filterResponsible || t.respReinf === filterResponsible || t.respLucro === filterResponsible || t.respECD === filterResponsible || t.respECF === filterResponsible;
             if (!isResp) return false;
        }

        const isFinished = (s: string) => {
            if (!s) return false;
            const up = s.toUpperCase();
            return ['FINALIZADA', 'ENVIADA', 'LUCRO LANÇADO', 'EFD ENVIADA', 'EFD RETIFICADA', 'DISPENSADA', 'NÃO SE APLICA', 'NÃO HÁ DISTRIBUIÇÃO'].includes(up);
        };

        if (filterStatus === 'ALL') return true;
        const wantPending = filterStatus === 'PENDING';

        let statusRelevant = '';
        switch (filterContext) {
            case 'FISCAL': statusRelevant = t.statusFiscal; break;
            case 'CONTABIL': statusRelevant = t.statusContabil; break; 
            case 'REINF': statusRelevant = t.statusReinf; break;
            case 'LUCRO': statusRelevant = t.statusLucro; break;
            case 'ECD': statusRelevant = t.statusECD; break;
            case 'ECF': statusRelevant = t.statusECF; break;
            case 'ALL': 
                const allStatuses = [t.statusFiscal, t.statusContabil, t.statusReinf, t.statusLucro, t.statusECD, t.statusECF];
                const hasPending = allStatuses.some(s => !isFinished(s));
                if (wantPending) return hasPending; 
                else return !hasPending; 
        }

        const finished = isFinished(statusRelevant);
        return wantPending ? !finished : finished;
    });
  }, [tasks, filterRegime, filterResponsible, filterContext, filterStatus]);

  // Função para alternar colunas selecionadas
  const toggleColumn = (colId: string) => {
      setSelectedColumnIds(prev => 
          prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
      );
  };

  // --- GERADOR DE PDF PROFISSIONAL ---
  const generatePDF = () => {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const totalPagesExp = '{total_pages_count_string}';
      
      // Cores da Marca
      const colorYellow = [255, 214, 0]; // #FFD600
      const colorDark = [17, 24, 39];    // #111827
      const colorGray = [243, 244, 246]; // #F3F4F6

      // --- HEADER ---
      // Barra Lateral Amarela
      doc.setFillColor(colorYellow[0], colorYellow[1], colorYellow[2]);
      doc.rect(0, 0, 8, 210, 'F');

      // Título e Subtítulo
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(colorDark[0], colorDark[1], colorDark[2]);
      doc.text(reportTitle.toUpperCase(), 15, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 15, 26);
      
      // --- BLOCO DE FILTROS APLICADOS ---
      let startY = 35;
      
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(15, startY, 270, 20, 2, 2, 'FD');
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text("FILTROS APLICADOS:", 20, startY + 6);

      doc.setFont("helvetica", "normal");
      const contextLabel = { 'ALL': 'Geral', 'FISCAL': 'Fiscal', 'CONTABIL': 'Contábil', 'REINF': 'Reinf', 'LUCRO': 'Lucro', 'ECD': 'ECD', 'ECF': 'ECF' }[filterContext] || filterContext;
      const statusLabel = filterStatus === 'ALL' ? 'Todos' : (filterStatus === 'PENDING' ? 'Pendentes' : 'Finalizados');
      
      // Linha 1 de filtros
      doc.text(`Contexto: ${contextLabel}`, 20, startY + 14);
      doc.text(`Status: ${statusLabel}`, 80, startY + 14);
      doc.text(`Regime: ${filterRegime || 'Todos'}`, 140, startY + 14);
      doc.text(`Responsável: ${filterResponsible || 'Todos'}`, 200, startY + 14);

      // --- SUMÁRIO EXECUTIVO ---
      startY += 28;
      
      const totalItems = filteredTasks.length;
      const highPriority = filteredTasks.filter(t => t.prioridade === 'ALTA').length;
      
      // Helper para contar concluídos na seleção atual
      const isFinished = (s: string) => ['FINALIZADA', 'ENVIADA', 'LUCRO LANÇADO', 'EFD ENVIADA', 'EFD RETIFICADA', 'DISPENSADA', 'NÃO SE APLICA'].includes((s || '').toUpperCase());
      const doneCount = filteredTasks.filter(t => isFinished(t.statusFiscal) && isFinished(t.statusContabil)).length; // Estimativa simples
      const progress = totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0;

      // Cards de Resumo
      const cardWidth = 85;
      const cardHeight = 20;
      
      // Card 1: Total
      doc.setFillColor(colorDark[0], colorDark[1], colorDark[2]);
      doc.roundedRect(15, startY, cardWidth, cardHeight, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8); doc.text("TOTAL LISTADO", 20, startY + 6);
      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(`${totalItems} Empresas`, 20, startY + 14);

      // Card 2: Prioridade Alta
      doc.setFillColor(220, 38, 38); // Vermelho
      doc.roundedRect(15 + cardWidth + 7, startY, cardWidth, cardHeight, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text("PRIORIDADE ALTA", 20 + cardWidth + 7, startY + 6);
      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(`${highPriority} Casos`, 20 + cardWidth + 7, startY + 14);
      
      // Card 3: Progresso Geral (Estimado)
      doc.setFillColor(colorYellow[0], colorYellow[1], colorYellow[2]);
      doc.roundedRect(15 + (cardWidth * 2) + 14, startY, cardWidth, cardHeight, 1, 1, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text("ESTIMATIVA DE CONCLUSÃO", 20 + (cardWidth * 2) + 14, startY + 6);
      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(`${progress}% Concluído`, 20 + (cardWidth * 2) + 14, startY + 14);

      // --- TABELA DE DADOS ---
      startY += 30;

      // Ordenar colunas baseado na seleção
      const columnsToPrint = AVAILABLE_COLUMNS.filter(col => selectedColumnIds.includes(col.id));
      const head = [columnsToPrint.map(c => c.label)];
      
      const body = filteredTasks.map(task => {
          return columnsToPrint.map(col => {
              const val = task[col.id as keyof CompanyTask];
              if (col.id === 'regime' && typeof val === 'string') return val.replace('LUCRO ', '').replace('NACIONAL', '');
              if (col.id === 'name') return (val as string).substring(0, 35); // Truncar nome
              if (!val) return '-';
              return val;
          });
      });

      autoTable(doc, {
          startY: startY,
          head: head,
          body: body,
          theme: 'grid',
          headStyles: {
              fillColor: colorDark,
              textColor: [255, 255, 255],
              fontSize: 8,
              fontStyle: 'bold',
              halign: 'center'
          },
          bodyStyles: {
              fontSize: 7,
              textColor: [50, 50, 50],
              cellPadding: 2,
          },
          alternateRowStyles: {
              fillColor: [249, 250, 251]
          },
          columnStyles: {
              // Ajustes finos se necessário
              0: { halign: 'center' }
          },
          didDrawPage: function (data) {
              // Footer
              let str = 'Página ' + (doc as any).internal.getNumberOfPages();
              if (typeof doc.putTotalPages === 'function') {
                  str = str + ' de ' + totalPagesExp;
              }
              doc.setFontSize(8);
              doc.setFont("helvetica", "normal");
              doc.setTextColor(150, 150, 150);
              const pageSize = doc.internal.pageSize;
              const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
              doc.text(str, data.settings.margin.left, pageHeight - 10);
              doc.text("L&M Controle - Assessoria Contábil", pageSize.width - 60, pageHeight - 10);
          },
          margin: { top: 30, left: 15, right: 15 }
      });

      if (typeof doc.putTotalPages === 'function') {
          doc.putTotalPages(totalPagesExp);
      }

      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
      setShowConfigModal(false);
  };

  const parseBrDate = (str: string) => {
    if (!str) return null;
    const [day, month, year] = str.split('/');
    return new Date(Number(year), Number(month) - 1, Number(day));
  };

  const stats = useMemo(() => {
    const sourceData = filteredTasks; 
    const totalCompanies = sourceData.length;
    if (totalCompanies === 0) return null;

    // --- DEADLINE STATS ---
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let overdueCount = 0;
    let approachingCount = 0;
    let onTrackCount = 0;
    let noDateCount = 0;

    sourceData.forEach(t => {
        const allOk = isFiscalFinished(t.statusFiscal) && isFiscalFinished(t.statusContabil) && isFiscalFinished(t.statusReinf) && isFiscalFinished(t.statusLucro);
        
        if (allOk) {
            onTrackCount++;
            return;
        }

        if (!t.dueDate) {
            noDateCount++;
            return;
        }

        const date = parseBrDate(t.dueDate);
        if (!date) {
            noDateCount++;
            return;
        }

        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) overdueCount++;
        else if (diffDays <= 3) approachingCount++;
        else onTrackCount++;
    });


    // --- GENERAL STATS ---
    const isFinished = (status: string) => {
        if (!status) return false;
        const s = status.toUpperCase();
        if (['FINALIZADA', 'ENVIADA', 'LUCRO LANÇADO', 'EFD ENVIADA', 'EFD RETIFICADA', 'DISPENSADA', 'NÃO SE APLICA', 'NÃO HÁ DISTRIBUIÇÃO'].includes(s)) return true;
        return false;
    };

    const pendingCompaniesCount = sourceData.filter(t => {
        return !isFinished(t.statusFiscal) || !isFinished(t.statusContabil) || !isFinished(t.statusReinf) || !isFinished(t.statusLucro) || !isFinished(t.statusECD) || !isFinished(t.statusECF);
    }).length;

    let totalFiscal = 0; let finishedFiscal = 0;
    let totalContabil = 0; let finishedContabil = 0;

    sourceData.forEach(t => {
        totalFiscal += 2; if(isFinished(t.statusFiscal)) finishedFiscal++; if(isFinished(t.statusReinf)) finishedFiscal++;
        const fiscalOk = isFinished(t.statusFiscal);
        totalContabil += 4; if(fiscalOk && isFinished(t.statusContabil)) finishedContabil++; if(fiscalOk && isFinished(t.statusLucro)) finishedContabil++; if(fiscalOk && isFinished(t.statusECD)) finishedContabil++; if(fiscalOk && isFinished(t.statusECF)) finishedContabil++;
    });

    const totalOps = totalFiscal + totalContabil;
    const finishedOps = finishedFiscal + finishedContabil;
    
    const globalProgress = totalOps > 0 ? Math.round((finishedOps / totalOps) * 100) : 0;
    const deptStats = [
        { label: 'Fiscal', sublabel: '(Fiscal + Reinf)', percentage: totalFiscal > 0 ? Math.round((finishedFiscal/totalFiscal)*100) : 0, finished: finishedFiscal, total: totalFiscal },
        { label: 'Contábil', sublabel: '(Cont + Lucro + ECD/ECF)', percentage: totalContabil > 0 ? Math.round((finishedContabil/totalContabil)*100) : 0, finished: finishedContabil, total: totalContabil }
    ];

    const highPriorityPending = sourceData.filter(t => t.prioridade === 'ALTA' && (!isFinished(t.statusFiscal) || !isFinished(t.statusContabil))).length;

    const regimes = ['LUCRO REAL', 'LUCRO PRESUMIDO', 'SIMPLES NACIONAL', 'NENHUM INFORMADO'];
    const regimeStats = regimes.map(regime => {
        const tasksRegime = sourceData.filter(t => (t.regime || 'NENHUM INFORMADO') === regime);
        let opsRegime = 0;
        let finishedRegime = 0;
        tasksRegime.forEach(t => {
             const fiscalOk = isFinished(t.statusFiscal);
             opsRegime += 6; 
             if (isFinished(t.statusFiscal)) finishedRegime++; if (isFinished(t.statusReinf)) finishedRegime++;
             if (fiscalOk && isFinished(t.statusContabil)) finishedRegime++; if (fiscalOk && isFinished(t.statusLucro)) finishedRegime++;
             if (fiscalOk && isFinished(t.statusECD)) finishedRegime++; if (fiscalOk && isFinished(t.statusECF)) finishedRegime++;
        });
        return { regime, total: tasksRegime.length, opsCount: opsRegime, percentage: opsRegime > 0 ? Math.round((finishedRegime / opsRegime) * 100) : 0 };
    }).filter(r => r.total > 0);

    const teamStats = collaborators.map(c => {
        let totalAssigned = 0;
        let totalFinishedCollab = 0;
        const real = { total: 0, finished: 0 };
        const presumido = { total: 0, finished: 0 };
        const simples = { total: 0, finished: 0 };

        sourceData.forEach(t => {
            const fiscalOk = isFinished(t.statusFiscal);
            const regime = (t.regime || '').toUpperCase();
            const increment = (isDone: boolean) => {
                totalAssigned++; if (isDone) totalFinishedCollab++;
                if (regime.includes('REAL')) { real.total++; if (isDone) real.finished++; } else if (regime.includes('PRESUMIDO')) { presumido.total++; if (isDone) presumido.finished++; } else if (regime.includes('SIMPLES')) { simples.total++; if (isDone) simples.finished++; }
            };
            if (t.respFiscal === c.name) increment(isFinished(t.statusFiscal)); if (t.respContabil === c.name) increment(fiscalOk && isFinished(t.statusContabil)); if (t.respReinf === c.name) increment(isFinished(t.statusReinf)); if (t.respLucro === c.name) increment(fiscalOk && isFinished(t.statusLucro)); if (t.respECD === c.name) increment(fiscalOk && isFinished(t.statusECD)); if (t.respECF === c.name) increment(fiscalOk && isFinished(t.statusECF));
        });
        return { name: c.name, total: totalAssigned, finished: totalFinishedCollab, percentage: totalAssigned > 0 ? Math.round((totalFinishedCollab / totalAssigned) * 100) : 0, breakdown: { real, presumido, simples } };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    return { totalCompanies, pendingCompaniesCount, globalProgress, highPriorityPending, deptStats, regimeStats, teamStats, deadlines: { overdueCount, approachingCount, onTrackCount, noDateCount } };
  }, [filteredTasks, collaborators]);

  const REGIME_COLORS: Record<string, string> = { 'LUCRO REAL': '#64748B', 'LUCRO PRESUMIDO': '#FFD600', 'SIMPLES NACIONAL': '#3B82F6', 'NENHUM INFORMADO': '#9CA3AF' };
  let pieSegments: any[] = [];
  let gradient = 'conic-gradient(#f3f4f6 0% 100%)';
  if (stats) {
      const totalOpsVolume = stats.regimeStats.reduce((acc, r) => acc + r.opsCount, 0);
      let currentDeg = 0;
      pieSegments = stats.regimeStats.map(r => {
          const share = totalOpsVolume > 0 ? (r.opsCount / totalOpsVolume) * 100 : 0;
          let color = REGIME_COLORS[r.regime] || '#9ca3af'; 
          const start = currentDeg;
          const end = currentDeg + share;
          currentDeg += share;
          return { ...r, share, color, start, end };
      });
      if (pieSegments.length > 0) gradient = `conic-gradient(${pieSegments.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ')})`;
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F7F7F5] dark:bg-black p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <PieChart className="text-lm-dark dark:text-lm-yellow" size={32} />
                Relatórios e Métricas
            </h2>
            <div className="hidden md:block text-sm text-gray-500 dark:text-gray-400 font-medium bg-white dark:bg-zinc-900 px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm">
                {stats ? `${filteredTasks.length} registros filtrados` : 'Carregando...'}
            </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-card border border-gray-200 dark:border-zinc-800 p-5 animate-enter">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-zinc-800">
                <Filter size={18} className="text-lm-dark dark:text-lm-yellow" />
                <h3 className="font-bold text-gray-800 dark:text-white">Gerador de Relatórios em PDF</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Contexto</label>
                    <select value={filterContext} onChange={(e) => setFilterContext(e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lm-yellow/50">
                        <option value="ALL">Todas Obrigações</option><option value="FISCAL">Fiscal</option><option value="CONTABIL">Contábil</option><option value="REINF">EFD-Reinf</option><option value="LUCRO">Distribuição Lucro</option><option value="ECD">ECD</option><option value="ECF">ECF</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lm-yellow/50">
                        <option value="ALL">Todos</option><option value="PENDING">Pendentes</option><option value="DONE">Finalizadas</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Regime</label>
                    <select value={filterRegime} onChange={(e) => setFilterRegime(e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lm-yellow/50">
                        <option value="">Todos</option><option value="LUCRO REAL">Real</option><option value="LUCRO PRESUMIDO">Presumido</option><option value="SIMPLES NACIONAL">Simples</option><option value="IMUNE/ISENTA">Imune/Isenta</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Responsável</label>
                    <select value={filterResponsible} onChange={(e) => setFilterResponsible(e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lm-yellow/50">
                        <option value="">Todos</option>{collaborators.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>

                <div className="flex items-end gap-2">
                    <button onClick={() => setShowConfigModal(true)} disabled={filteredTasks.length === 0} className={`flex-1 p-2 rounded-lg font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all ${filteredTasks.length > 0 ? 'bg-lm-dark dark:bg-lm-yellow text-white dark:text-black hover:bg-black dark:hover:bg-yellow-400 hover:scale-[1.02]' : 'bg-gray-200 dark:bg-zinc-800 text-gray-400 cursor-not-allowed'}`}>
                        <FileDown size={18} />
                        Gerar PDF
                    </button>
                    {(filterRegime || filterResponsible || filterStatus !== 'ALL' || filterContext !== 'ALL') && (<button onClick={() => { setFilterContext('ALL'); setFilterStatus('ALL'); setFilterRegime(''); setFilterResponsible(''); }} className="p-2 bg-gray-100 dark:bg-zinc-800 text-gray-500 hover:text-red-500 rounded-lg transition-colors"><X size={20} /></button>)}
                </div>
            </div>
        </div>

        {/* MODAL DE CONFIGURAÇÃO DO RELATÓRIO */}
        {showConfigModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
                <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-950">
                        <div className="flex items-center gap-3">
                            <div className="bg-lm-yellow/20 p-2 rounded-lg text-lm-dark dark:text-lm-yellow">
                                <Settings2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Personalizar Relatório</h3>
                                <p className="text-xs text-gray-500">Selecione as colunas e opções do documento.</p>
                            </div>
                        </div>
                        <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24}/></button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Título do Relatório</label>
                            <input 
                                type="text" 
                                value={reportTitle} 
                                onChange={(e) => setReportTitle(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lm-yellow"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Colunas Visíveis</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {AVAILABLE_COLUMNS.map(col => (
                                    <button 
                                        key={col.id}
                                        onClick={() => toggleColumn(col.id)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${
                                            selectedColumnIds.includes(col.id)
                                            ? 'bg-lm-yellow/10 border-lm-yellow text-gray-900 dark:text-white font-bold'
                                            : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-700'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedColumnIds.includes(col.id) ? 'bg-lm-yellow border-lm-yellow' : 'border-gray-300 dark:border-zinc-600'}`}>
                                            {selectedColumnIds.includes(col.id) && <Check size={12} className="text-black" />}
                                        </div>
                                        {col.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 flex justify-end gap-3">
                         <button onClick={() => setShowConfigModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">Cancelar</button>
                         <button onClick={generatePDF} className="px-6 py-2 bg-lm-dark dark:bg-lm-yellow text-white dark:text-black font-bold rounded-lg hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                            <FileDown size={18} />
                            Baixar PDF
                         </button>
                    </div>
                </div>
            </div>
        )}

        {!stats ? (<div className="p-12 text-center text-gray-400">Carregando estatísticas...</div>) : (
            <>
                {/* --- SEÇÃO: MONITORAMENTO DE PRAZOS --- */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6 animate-enter">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <Calendar size={20} className="text-gray-400" />
                        Monitoramento de Prazos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-xl flex flex-col items-center justify-center">
                            <AlertOctagon size={32} className="text-red-500 mb-2" />
                            <span className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.deadlines.overdueCount}</span>
                            <span className="text-xs font-bold uppercase text-red-400 dark:text-red-500 mt-1">Vencidas</span>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-4 rounded-xl flex flex-col items-center justify-center">
                            <Hourglass size={32} className="text-orange-500 mb-2" />
                            <span className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.deadlines.approachingCount}</span>
                            <span className="text-xs font-bold uppercase text-orange-400 dark:text-orange-500 mt-1">Próximas (3 dias)</span>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 p-4 rounded-xl flex flex-col items-center justify-center">
                            <CheckCircle2 size={32} className="text-green-500 mb-2" />
                            <span className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.deadlines.onTrackCount}</span>
                            <span className="text-xs font-bold uppercase text-green-400 dark:text-green-500 mt-1">No Prazo / OK</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700 p-4 rounded-xl flex flex-col items-center justify-center">
                            <Calendar size={32} className="text-gray-400 mb-2" />
                            <span className="text-3xl font-bold text-gray-500 dark:text-gray-300">{stats.deadlines.noDateCount}</span>
                            <span className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 mt-1">Sem Vencimento</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-enter" style={{ animationDelay: '100ms' }}>
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp size={64} className="text-blue-600 dark:text-blue-400" /></div>
                        <div><p className="text-gray-500 dark:text-gray-400 font-medium text-sm uppercase tracking-wider">Conclusão (Seleção)</p><h3 className="text-4xl font-bold text-gray-900 dark:text-white mt-1">{stats.globalProgress}%</h3></div>
                        <div className="w-full bg-gray-100 dark:bg-zinc-700 h-1.5 rounded-full mt-2 overflow-hidden"><div className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${stats.globalProgress}%` }}></div></div>
                    </div>
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-orange-300 dark:hover:border-orange-600 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Clock size={64} className="text-orange-500" /></div>
                        <div><p className="text-orange-600 dark:text-orange-400 font-medium text-sm uppercase tracking-wider">Pendentes (Seleção)</p><h3 className="text-4xl font-bold text-gray-900 dark:text-white mt-1">{stats.pendingCompaniesCount}</h3></div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">de {stats.totalCompanies} listadas</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-red-300 dark:hover:border-red-600 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><AlertTriangle size={64} className="text-red-600 dark:text-red-400" /></div>
                        <div><p className="text-red-600 dark:text-red-400 font-medium text-sm uppercase tracking-wider">Prioridade Alta (Pend)</p><h3 className="text-4xl font-bold text-gray-900 dark:text-white mt-1">{stats.highPriorityPending}</h3></div>
                        <div className="flex items-center gap-1 text-sm text-red-500 dark:text-red-400 font-medium mt-1"><AlertTriangle size={14} /><span>Atenção necessária</span></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-enter" style={{ animationDelay: '200ms' }}>
                    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6 flex flex-col justify-center">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2"><CheckCircle2 size={20} className="text-gray-400" />Progresso por Área (Seleção Atual)</h3>
                        <div className="space-y-8">{stats.deptStats.map((dept) => (<div key={dept.label}><div className="flex justify-between items-end mb-2"><div><span className="text-base font-bold text-gray-800 dark:text-white block">{dept.label}</span><span className="text-xs text-gray-400 dark:text-gray-400 font-medium">{dept.sublabel}</span></div><div className="flex flex-col items-end"><span className="text-2xl font-bold text-gray-900 dark:text-white">{dept.percentage}%</span><span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{dept.finished}/{dept.total} obrigações</span></div></div><div className="w-full bg-gray-100 dark:bg-zinc-700 h-3 rounded-full overflow-hidden shadow-inner"><div className={`h-3 rounded-full transition-all duration-1000 ${dept.percentage === 100 ? 'bg-green-500' : dept.percentage > 70 ? 'bg-blue-500' : dept.percentage > 30 ? 'bg-lm-yellow' : 'bg-red-400'}`} style={{ width: `${dept.percentage}%` }}></div></div></div>))}</div>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6 flex flex-col justify-center overflow-hidden">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2"><Target size={20} className="text-gray-400" />Distribuição e Conclusão (Regimes)</h3>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 h-full">
                            <div className="relative w-40 h-40 rounded-full shadow-sm flex items-center justify-center shrink-0" style={{ background: gradient }}><div className="w-20 h-20 bg-white dark:bg-zinc-800 rounded-full flex flex-col items-center justify-center shadow-sm z-10 p-2 text-center transition-colors"><span className="text-xl font-bold text-gray-800 dark:text-white">{stats.totalCompanies}</span><span className="text-[9px] text-gray-400 dark:text-gray-400 uppercase font-bold tracking-wider leading-tight">Empresas<br/>Filtradas</span></div></div>
                            <div className="flex-1 w-full space-y-2 min-w-0">{pieSegments.map(s => (<div key={s.regime} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-900/50 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"><div className="flex items-center gap-2 overflow-hidden"><div className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: s.color }}></div><div className="min-w-0"><p className="font-bold text-gray-800 dark:text-gray-100 text-xs leading-tight truncate" title={s.regime}>{s.regime.replace('LUCRO ', '').replace('NACIONAL', '')}</p><p className="text-[9px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{s.share.toFixed(1)}% do Vol.</p></div></div><div className="flex flex-col items-end flex-shrink-0 ml-2"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${s.percentage === 100 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-white dark:bg-zinc-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-zinc-600'}`}>{s.percentage}% Conc.</span></div></div>))}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden animate-enter" style={{ animationDelay: '300ms' }}>
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50"><h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2"><Users size={20} className="text-gray-500 dark:text-gray-400" />Produtividade da Equipe (Sobre seleção atual)</h3></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-white dark:bg-zinc-900 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-zinc-700"><tr><th className="px-6 py-4">Colaborador</th><th className="px-4 py-4 text-center text-gray-400 w-32"><Building2 size={14} className="mx-auto mb-1"/>Real</th><th className="px-4 py-4 text-center text-gray-400 w-32"><Building2 size={14} className="mx-auto mb-1 text-lm-yellow"/>Presumido</th><th className="px-4 py-4 text-center text-gray-400 w-32"><Building2 size={14} className="mx-auto mb-1 text-blue-500"/>Simples</th><th className="px-6 py-4 text-center">Total</th><th className="px-6 py-4 text-center">Progresso</th></tr></thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-zinc-700">{stats.teamStats.map((member) => (<tr key={member.name} className="hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors"><td className="px-6 py-4 font-medium text-gray-900 dark:text-white"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-lm-yellow/20 dark:bg-lm-yellow/10 flex items-center justify-center text-xs font-bold text-lm-dark dark:text-lm-yellow">{member.name.charAt(0)}</div>{member.name}</div></td><td className="px-4 py-4 text-center font-mono text-xs"><span className={member.breakdown.real.total > 0 ? "text-gray-800 dark:text-gray-200 font-bold" : "text-gray-300 dark:text-zinc-600"}>{member.breakdown.real.finished} / {member.breakdown.real.total}</span></td><td className="px-4 py-4 text-center font-mono text-xs"><span className={member.breakdown.presumido.total > 0 ? "text-gray-800 dark:text-gray-200 font-bold" : "text-gray-300 dark:text-zinc-600"}>{member.breakdown.presumido.finished} / {member.breakdown.presumido.total}</span></td><td className="px-4 py-4 text-center font-mono text-xs"><span className={member.breakdown.simples.total > 0 ? "text-gray-800 dark:text-gray-200 font-bold" : "text-gray-300 dark:text-zinc-600"}>{member.breakdown.simples.finished} / {member.breakdown.simples.total}</span></td><td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300 font-mono text-sm font-bold bg-gray-50/50 dark:bg-zinc-900/50">{member.finished} <span className="text-gray-400 font-normal">/</span> {member.total}</td><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="flex-1 w-24 bg-gray-100 dark:bg-zinc-600 h-1.5 rounded-full overflow-hidden"><div className={`h-1.5 rounded-full ${member.percentage === 100 ? 'bg-green-500' : 'bg-lm-yellow'}`} style={{ width: `${member.percentage}%` }}></div></div><span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-8 text-right">{member.percentage}%</span></div></td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default ReportsDashboard;
