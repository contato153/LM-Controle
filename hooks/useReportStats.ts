import { useMemo } from 'react';
import { CompanyTask, isFiscalFinished } from '../types';
import { useTasks } from '../contexts/TasksContext';

export interface ReportStats {
    totalCompanies: number;
    pendingCompaniesCount: number;
    globalProgress: number;
    highPriorityPending: number;
    deptStats: {
        label: string;
        sublabel: string;
        percentage: number;
        finished: number;
        total: number;
    }[];
    regimeStats: {
        regime: string;
        total: number;
        opsCount: number;
        percentage: number;
    }[];
    teamStats: {
        name: string;
        department: string;
        total: number;
        finished: number;
        percentage: number;
        breakdown: {
            real: { total: number; finished: number };
            presumido: { total: number; finished: number };
            simples: { total: number; finished: number };
        };
    }[];
    deadlines: {
        overdueCount: number;
        approachingCount: number;
        onTrackCount: number;
        noDateCount: number;
    };
    bottlenecks: {
        name: string;
        value: number;
    }[];
}

export const useReportStats = (
    tasks: CompanyTask[],
    collaborators: { id: string; name: string }[],
    filters: {
        context: string;
        status: string;
        regime: string;
        responsible: string;
    }
) => {
    const { taxRegimes } = useTasks();

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (filters.regime && t.regime !== filters.regime) return false;
            if (filters.responsible) {
                const isResp = t.respFiscal === filters.responsible || t.respContabil === filters.responsible || t.respBalanco === filters.responsible || t.respReinf === filters.responsible || t.respLucro === filters.responsible || t.respECD === filters.responsible || t.respECF === filters.responsible;
                if (!isResp) return false;
            }

            const isFinished = (s: string) => {
                if (!s) return false;
                const up = s.toUpperCase();
                return ['FINALIZADA', 'ENVIADA', 'LUCRO LANÇADO', 'EFD ENVIADA', 'EFD RETIFICADA', 'DISPENSADA', 'NÃO SE APLICA', 'NÃO HÁ DISTRIBUIÇÃO'].includes(up);
            };

            if (filters.status === 'ALL') return true;
            const wantPending = filters.status === 'PENDING';

            let statusRelevant = '';
            switch (filters.context) {
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
    }, [tasks, filters]);

    const stats = useMemo<ReportStats | null>(() => {
        const sourceData = filteredTasks;
        const totalCompanies = sourceData.length;
        if (totalCompanies === 0) return null;

        const parseBrDate = (str: string | undefined) => {
            if (!str) return null;
            const [day, month, year] = str.split('/');
            return new Date(Number(year), Number(month) - 1, Number(day));
        };

        // --- DEADLINE STATS ---
        const today = new Date();
        today.setHours(0, 0, 0, 0);

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
            totalFiscal += 2; if (isFinished(t.statusFiscal)) finishedFiscal++; if (isFinished(t.statusReinf)) finishedFiscal++;
            const fiscalOk = isFinished(t.statusFiscal);
            totalContabil += 4; if (fiscalOk && isFinished(t.statusContabil)) finishedContabil++; if (fiscalOk && isFinished(t.statusLucro)) finishedContabil++; if (fiscalOk && isFinished(t.statusECD)) finishedContabil++; if (fiscalOk && isFinished(t.statusECF)) finishedContabil++;
        });

        const totalOps = totalFiscal + totalContabil;
        const finishedOps = finishedFiscal + finishedContabil;

        const globalProgress = totalOps > 0 ? Math.round((finishedOps / totalOps) * 100) : 0;
        const deptStats = [
            { label: 'Fiscal', sublabel: '(Fiscal + Reinf)', percentage: totalFiscal > 0 ? Math.round((finishedFiscal / totalFiscal) * 100) : 0, finished: finishedFiscal, total: totalFiscal },
            { label: 'Contábil', sublabel: '(Cont + Lucro + ECD/ECF)', percentage: totalContabil > 0 ? Math.round((finishedContabil / totalContabil) * 100) : 0, finished: finishedContabil, total: totalContabil }
        ];

        const highPriorityPending = sourceData.filter(t => t.prioridade === 'ALTA' && (!isFinished(t.statusFiscal) || !isFinished(t.statusContabil))).length;

        const regimes = [...taxRegimes.map(r => r.name), 'NENHUM INFORMADO'];
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
            return { 
                name: c.name, 
                department: (c as any).department || 'Geral',
                total: totalAssigned, 
                finished: totalFinishedCollab, 
                percentage: totalAssigned > 0 ? Math.round((totalFinishedCollab / totalAssigned) * 100) : 0, 
                breakdown: { real, presumido, simples } 
            };
        }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

        // --- BOTTLENECKS (GARGALOS) ---
        const bottlenecks = [
            { name: 'Fiscal', value: 0 },
            { name: 'Contábil', value: 0 },
            { name: 'Reinf', value: 0 },
            { name: 'Lucro', value: 0 },
            { name: 'ECD', value: 0 },
            { name: 'ECF', value: 0 }
        ];

        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

        const parseLastEdit = (str: string | undefined) => {
            if (!str || !str.includes(' em ')) return null;
            try {
                const datePart = str.split(' em ')[1]; // "DD/MM/YYYY HH:mm:ss"
                const [date, time] = datePart.split(' ');
                const [d, m, y] = date.split('/');
                const [h, min] = time.split(':');
                return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
            } catch { return null; }
        };

        sourceData.forEach(t => {
            const check = (status: string, idx: number) => {
                if (!isFinished(status)) {
                    const lastEditDate = parseLastEdit(t.lastEditor);
                    if (lastEditDate && lastEditDate < fiveDaysAgo) {
                        bottlenecks[idx].value++;
                    }
                }
            };
            check(t.statusFiscal, 0);
            check(t.statusContabil, 1);
            check(t.statusReinf, 2);
            check(t.statusLucro, 3);
            check(t.statusECD, 4);
            check(t.statusECF, 5);
        });

        return { totalCompanies, pendingCompaniesCount, globalProgress, highPriorityPending, deptStats, regimeStats, teamStats, deadlines: { overdueCount, approachingCount, onTrackCount, noDateCount }, bottlenecks };
    }, [filteredTasks, collaborators, taxRegimes]);

    return { filteredTasks, stats };
};
