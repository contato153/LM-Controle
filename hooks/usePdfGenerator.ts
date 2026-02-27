import { useState } from 'react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { CompanyTask } from '../types';

export const AVAILABLE_COLUMNS = [
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

interface PdfGeneratorConfig {
    reportTitle: string;
    reportSubtitle?: string;
    filterContext: string;
    filterStatus: string;
    filterRegime: string;
    filterResponsible: string;
    includeCharts?: boolean;
    includeTable?: boolean;
    orientation?: 'landscape';
}

export const usePdfGenerator = () => {
    const [isGenerating, setIsGenerating] = useState(false);

    const generatePDF = async (filteredTasks: CompanyTask[], config: PdfGeneratorConfig, onComplete: () => void) => {
        setIsGenerating(true);
        
        // Simulate a small delay for the loading state to be visible
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const totalPagesExp = '{total_pages_count_string}';
            
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);

            // Cores da Marca
            const colorYellow: [number, number, number] = [255, 214, 0]; // #FFD600
            const colorDark: [number, number, number] = [17, 24, 39];    // #111827

            // --- HEADER ---
            // Barra Lateral Amarela
            doc.setFillColor(colorYellow[0], colorYellow[1], colorYellow[2]);
            doc.rect(0, 0, 8, pageHeight, 'F');

            // Logo
            try {
                // Try loading from root first, then fallback if needed
                const logoImg = await loadImage('/lem-preto.png').catch(() => loadImage('lem-preto.png'));
                const logoWidth = 25;
                const imgProps = doc.getImageProperties(logoImg);
                const ratio = imgProps.width / imgProps.height;
                const logoHeight = logoWidth / ratio;
                
                doc.addImage(logoImg, 'PNG', pageWidth - margin - logoWidth, 15, logoWidth, logoHeight);
            } catch (e) {
                console.warn("Logo not found", e);
            }

            // Título e Subtítulo
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(colorDark[0], colorDark[1], colorDark[2]);
            doc.text(config.reportTitle.toUpperCase(), margin, 20);

            if (config.reportSubtitle) {
                doc.setFontSize(14);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(80, 80, 80);
                doc.text(config.reportSubtitle, margin, 28);
            }

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, config.reportSubtitle ? 34 : 26);

            // --- BLOCO DE FILTROS APLICADOS ---
            let startY = config.reportSubtitle ? 42 : 35;

            doc.setDrawColor(200, 200, 200);
            doc.setFillColor(250, 250, 250);
            doc.roundedRect(margin, startY, contentWidth, 20, 2, 2, 'FD');

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(50, 50, 50);
            doc.text("FILTROS APLICADOS:", margin + 5, startY + 6);

            doc.setFont("helvetica", "normal");
            const contextLabel = { 'ALL': 'Geral', 'FISCAL': 'Fiscal', 'CONTABIL': 'Contábil', 'REINF': 'Reinf', 'LUCRO': 'Lucro', 'ECD': 'ECD', 'ECF': 'ECF' }[config.filterContext] || config.filterContext;
            const statusLabel = config.filterStatus === 'ALL' ? 'Todos' : (config.filterStatus === 'PENDING' ? 'Pendentes' : 'Finalizados');

            // Linha 1 de filtros - Ajustar espaçamento baseado na largura
            const colWidth = contentWidth / 4;
            doc.text(`Contexto: ${contextLabel}`, margin + 5, startY + 14);
            doc.text(`Status: ${statusLabel}`, margin + 5 + colWidth, startY + 14);
            doc.text(`Regime: ${config.filterRegime || 'Todos'}`, margin + 5 + (colWidth * 2), startY + 14);
            doc.text(`Responsável: ${config.filterResponsible || 'Todos'}`, margin + 5 + (colWidth * 3), startY + 14);

            // --- SUMÁRIO EXECUTIVO ---
            startY += 28;

            const totalItems = filteredTasks.length;
            const highPriority = filteredTasks.filter(t => t.prioridade === 'ALTA').length;

            // Helper para contar concluídos na seleção atual
            const isFinished = (s: string) => ['FINALIZADA', 'ENVIADA', 'LUCRO LANÇADO', 'EFD ENVIADA', 'EFD RETIFICADA', 'DISPENSADA', 'NÃO SE APLICA'].includes((s || '').toUpperCase());
            const doneCount = filteredTasks.filter(t => isFinished(t.statusFiscal) && isFinished(t.statusContabil)).length; // Estimativa simples
            const progress = totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0;

            // Cards de Resumo
            const gap = 5;
            const cardWidth = (contentWidth - (gap * 2)) / 3;
            const cardHeight = 20;

            // Card 1: Total
            doc.setFillColor(colorDark[0], colorDark[1], colorDark[2]);
            doc.roundedRect(margin, startY, cardWidth, cardHeight, 1, 1, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8); doc.text("TOTAL LISTADO", margin + 5, startY + 6);
            doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(`${totalItems} Empresas`, margin + 5, startY + 14);

            // Card 2: Prioridade Alta
            doc.setFillColor(220, 38, 38); // Vermelho
            doc.roundedRect(margin + cardWidth + gap, startY, cardWidth, cardHeight, 1, 1, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text("PRIORIDADE ALTA", margin + cardWidth + gap + 5, startY + 6);
            doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(`${highPriority} Casos`, margin + cardWidth + gap + 5, startY + 14);

            // Card 3: Progresso Geral (Estimado)
            doc.setFillColor(colorYellow[0], colorYellow[1], colorYellow[2]);
            doc.roundedRect(margin + (cardWidth * 2) + (gap * 2), startY, cardWidth, cardHeight, 1, 1, 'F');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text("ESTIMATIVA DE CONCLUSÃO", margin + (cardWidth * 2) + (gap * 2) + 5, startY + 6);
            doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(`${progress}% Concluído`, margin + (cardWidth * 2) + (gap * 2) + 5, startY + 14);

            // --- GRÁFICOS ---
            if (config.includeCharts) {
                startY += 35;
                
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(50, 50, 50);
                doc.text("ANÁLISE GRÁFICA", margin, startY - 5);

                const chartHeight = 40;
                const chartWidth = (contentWidth / 2) - 5;
                
                // Chart 1: Status (Bar Chart)
                const statusData = [
                    { label: 'Concluído', value: doneCount, color: [34, 197, 94] }, // Green
                    { label: 'Pendente', value: totalItems - doneCount, color: [239, 68, 68] } // Red
                ];
                
                drawBarChart(doc, margin, startY, chartWidth, chartHeight, statusData, "Status Geral");

                // Chart 2: Prioridade (Bar Chart)
                const pHigh = filteredTasks.filter(t => t.prioridade === 'ALTA').length;
                const pMed = filteredTasks.filter(t => t.prioridade === 'MÉDIA').length;
                const pLow = filteredTasks.filter(t => t.prioridade === 'BAIXA' || !t.prioridade).length;
                
                const priorityData = [
                    { label: 'Alta', value: pHigh, color: [239, 68, 68] }, // Red
                    { label: 'Média', value: pMed, color: [249, 115, 22] }, // Orange
                    { label: 'Baixa', value: pLow, color: [34, 197, 94] } // Green
                ];

                drawBarChart(doc, margin + chartWidth + 10, startY, chartWidth, chartHeight, priorityData, "Distribuição por Prioridade");

                startY += chartHeight + 10;
            }

            // --- TABELA DE DADOS ---
            if (config.includeTable !== false) {
                startY += 15;

                // Definir colunas baseado no contexto (Filtro)
                let columnsToShow: string[] = ['id', 'name', 'cnpj', 'regime', 'prioridade'];

                switch (config.filterContext) {
                    case 'FISCAL':
                        columnsToShow = [...columnsToShow, 'respFiscal', 'statusFiscal', 'dueDate'];
                        break;
                    case 'CONTABIL':
                        columnsToShow = [...columnsToShow, 'respContabil', 'statusContabil', 'dueDate'];
                        break;
                    case 'REINF':
                        columnsToShow = [...columnsToShow, 'respReinf', 'statusReinf', 'dueDate'];
                        break;
                    case 'LUCRO':
                        columnsToShow = [...columnsToShow, 'respLucro', 'statusLucro', 'dueDate'];
                        break;
                    case 'ECD':
                        columnsToShow = [...columnsToShow, 'respECD', 'statusECD', 'dueDate'];
                        break;
                    case 'ECF':
                        columnsToShow = [...columnsToShow, 'respECF', 'statusECF', 'dueDate'];
                        break;
                    case 'ALL':
                    default:
                        // Visão Geral Completa - Incluir todos os status
                        columnsToShow = ['id', 'name', 'regime', 'prioridade', 'statusFiscal', 'statusContabil', 'statusReinf', 'statusLucro', 'statusECD', 'statusECF'];
                        break;
                }

                const cols = AVAILABLE_COLUMNS.filter(col => columnsToShow.includes(col.id));
                
                const head = [cols.map(c => c.label)];

                const body = filteredTasks.map(task => {
                    return cols.map(col => {
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
                    margin: { top: 30, left: margin, right: margin }
                });
            }

            if (typeof doc.putTotalPages === 'function') {
                doc.putTotalPages(totalPagesExp);
            }

            const pdfBlob = doc.output('blob');
            const blobUrl = URL.createObjectURL(pdfBlob);
            window.open(blobUrl, '_blank');
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Erro ao gerar PDF. Verifique o console.");
        } finally {
            setIsGenerating(false);
            onComplete();
        }
    };

    return { generatePDF, isGenerating };
};

function drawBarChart(doc: any, x: number, y: number, w: number, h: number, data: any[], title: string) {
    // Title
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(title, x + 2, y - 2);

    // Background
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');

    if (data.length === 0) return;

    const maxVal = Math.max(...data.map(d => d.value));
    const barWidth = (w - 20) / data.length;
    const maxBarHeight = h - 20;

    data.forEach((d, i) => {
        const barHeight = maxVal > 0 ? (d.value / maxVal) * maxBarHeight : 0;
        const bx = x + 10 + (i * barWidth) + (barWidth * 0.1);
        const by = y + h - 10 - barHeight;
        const bw = barWidth * 0.8;

        // Bar
        doc.setFillColor(d.color[0], d.color[1], d.color[2]);
        doc.roundedRect(bx, by, bw, barHeight, 1, 1, 'F');

        // Value
        if (barHeight > 5) {
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);
            doc.text(d.value.toString(), bx + (bw/2), by + 4, { align: 'center', baseline: 'top' });
        } else {
            doc.setFontSize(8);
            doc.setTextColor(50, 50, 50);
            doc.text(d.value.toString(), bx + (bw/2), by - 2, { align: 'center' });
        }

        // Label
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        doc.text(d.label, bx + (bw/2), y + h - 3, { align: 'center' });
    });
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
    });
};
