import React from 'react';
import { X, FileText, CheckCircle2 } from 'lucide-react';

interface ReportsConfigModalProps {
    showConfigModal: boolean;
    setShowConfigModal: (show: boolean) => void;
    reportConfig: {
        title: string;
        subtitle: string;
        includeCharts: boolean;
        includeTable: boolean;
        orientation: 'landscape';
    };
    setReportConfig: React.Dispatch<React.SetStateAction<{
        title: string;
        subtitle: string;
        includeCharts: boolean;
        includeTable: boolean;
        orientation: 'landscape';
    }>>;
    handleGeneratePDF: () => void;
    isGenerating: boolean;
}

export const ReportsConfigModal: React.FC<ReportsConfigModalProps> = ({ showConfigModal, setShowConfigModal, reportConfig, setReportConfig, handleGeneratePDF, isGenerating }) => {
    if (!showConfigModal) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-enter">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-zinc-800 overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50 flex-shrink-0">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FileText size={20} className="text-lm-dark dark:text-lm-yellow" />
                        Configurar Relatório PDF
                    </h3>
                    <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Título do Relatório</label>
                        <input
                            type="text"
                            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-lm-yellow/50 focus:border-lm-yellow transition-all"
                            value={reportConfig.title}
                            onChange={(e) => setReportConfig(prev => ({ ...prev, title: e.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Subtítulo (Opcional)</label>
                        <input
                            type="text"
                            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-lm-yellow/50 focus:border-lm-yellow transition-all"
                            value={reportConfig.subtitle}
                            onChange={(e) => setReportConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                            placeholder="Ex: Resumo Semanal"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div
                            onClick={() => setReportConfig(prev => ({ ...prev, includeCharts: !prev.includeCharts }))}
                            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center gap-2 text-center ${reportConfig.includeCharts ? 'bg-lm-yellow/10 border-lm-yellow text-lm-dark dark:text-lm-yellow' : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500'}`}
                        >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${reportConfig.includeCharts ? 'bg-lm-yellow border-lm-yellow text-white' : 'border-gray-300'}`}>
                                {reportConfig.includeCharts && <CheckCircle2 size={12} />}
                            </div>
                            <span className="font-bold text-sm">Incluir Gráficos</span>
                        </div>

                        <div
                            onClick={() => setReportConfig(prev => ({ ...prev, includeTable: !prev.includeTable }))}
                            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center gap-2 text-center ${reportConfig.includeTable ? 'bg-lm-yellow/10 border-lm-yellow text-lm-dark dark:text-lm-yellow' : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500'}`}
                        >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${reportConfig.includeTable ? 'bg-lm-yellow border-lm-yellow text-white' : 'border-gray-300'}`}>
                                {reportConfig.includeTable && <CheckCircle2 size={12} />}
                            </div>
                            <span className="font-bold text-sm">Incluir Tabela</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-end gap-3 flex-shrink-0">
                    <button
                        onClick={() => setShowConfigModal(false)}
                        className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGeneratePDF}
                        disabled={isGenerating}
                        className="px-5 py-2.5 bg-lm-dark dark:bg-lm-yellow text-white dark:text-lm-dark font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-lm-dark/10 dark:shadow-lm-yellow/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Gerando...
                            </>
                        ) : (
                            <>
                                <FileText size={18} />
                                Baixar PDF
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
