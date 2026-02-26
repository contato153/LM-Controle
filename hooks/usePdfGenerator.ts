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
    selectedColumnIds?: string[]; // Optional, defaults to a set if not provided
    includeCharts?: boolean;
    includeTable?: boolean;
    orientation?: 'portrait' | 'landscape';
}

export const usePdfGenerator = () => {
    const [isGenerating, setIsGenerating] = useState(false);

    const generatePDF = async (filteredTasks: CompanyTask[], config: PdfGeneratorConfig, onComplete: () => void) => {
        setIsGenerating(true);
        
        // Simulate a small delay for the loading state to be visible
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const doc = new jsPDF({ orientation: config.orientation || 'landscape', unit: 'mm', format: 'a4' });
            const totalPagesExp = '{total_pages_count_string}';
            
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);

            // Cores da Marca
            const colorYellow: [number, number, number] = [255, 214, 0]; // #FFD600
            const colorDark: [number, number, number] = [17, 24, 39];    // #111827
            // const colorGray: [number, number, number] = [243, 244, 246]; // #F3F4F6

            // --- HEADER ---
            // Barra Lateral Amarela
            doc.setFillColor(colorYellow[0], colorYellow[1], colorYellow[2]);
            doc.rect(0, 0, 8, pageHeight, 'F');

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

            // --- TABELA DE DADOS ---
            if (config.includeTable !== false) {
                startY += 30;

                // Ordenar colunas baseado na seleção
                const cols = config.selectedColumnIds 
                    ? AVAILABLE_COLUMNS.filter(col => config.selectedColumnIds!.includes(col.id))
                    : AVAILABLE_COLUMNS.filter(col => ['id', 'name', 'regime', 'statusFiscal', 'statusContabil', 'respFiscal'].includes(col.id)); // Default columns
                
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
