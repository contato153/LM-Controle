
import React from 'react';
import { Settings, Shield, Monitor, Zap, Layout, Clock, MousePointer2, Bell, Database, Loader2, MessageSquare, CheckSquare, Activity, Calendar, Trash2, Eye, EyeOff, Plus } from 'lucide-react';
import { APP_INFO } from '../config/app';
import { DemandType, CompanyTask } from '../types';
import { useTasks } from '../contexts/TasksContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SettingsView: React.FC = () => {
  const { settings, updateSetting, startNewCycle, activeYear, deleteYearCycle, availableYears, verifySecurityPassword, taxRegimes, addTaxRegime, removeTaxRegime } = useTasks();
  const { isAdmin, adminMode, setAdminMode, isEffectiveAdmin } = useAuth();
  const { addNotification } = useToast();

  const [showCycleConfirm, setShowCycleConfirm] = useState(false);
  const [targetYear, setTargetYear] = useState((new Date().getFullYear() + 1).toString());
  const [isStartingCycle, setIsStartingCycle] = useState(false);

  const [showDeleteYearConfirm, setShowDeleteYearConfirm] = useState(false);
  const [deleteYearPassword, setDeleteYearPassword] = useState('');
  const [deleteYearTarget, setDeleteYearTarget] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [showFinalConfirmModal, setShowFinalConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const Toggle = ({ label, description, checked, onChange, icon: Icon }: any) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-zinc-800 last:border-0">
        <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400">
                <Icon size={18} />
            </div>
            <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
            </div>
        </div>
        <button 
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${checked ? 'bg-lm-yellow' : 'bg-gray-200 dark:bg-zinc-700'}`}
        >
            <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
    </div>
  );

  return (
    <div className="w-full h-full overflow-y-auto bg-transparent transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8 pb-10 pt-10 px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Settings className="text-lm-yellow" size={28} />
              Configurações
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1 ml-11">
              Gerencie suas preferências de interface, automação e sistema.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
            <div className="bg-white dark:bg-[#09090b] rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 transition-colors">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2"><Monitor size={20} className="text-gray-400" />Interface e Visualização</h3>
                <div className="mb-6">
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Densidade da Informação</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => updateSetting('density', 'comfortable')} className={`p-3 rounded-lg border flex items-center justify-center gap-2 text-sm font-medium transition-all ${settings.density === 'comfortable' ? 'bg-gray-50 dark:bg-zinc-800 border-lm-yellow text-gray-900 dark:text-white ring-1 ring-lm-yellow' : 'bg-white dark:bg-black border-gray-200 dark:border-zinc-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-900'}`}><Layout size={16} /> Confortável</button>
                        <button type="button" onClick={() => updateSetting('density', 'compact')} className={`p-3 rounded-lg border flex items-center justify-center gap-2 text-sm font-medium transition-all ${settings.density === 'compact' ? 'bg-gray-50 dark:bg-zinc-800 border-lm-yellow text-gray-900 dark:text-white ring-1 ring-lm-yellow' : 'bg-white dark:bg-black border-gray-200 dark:border-zinc-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-900'}`}><Layout size={16} className="scale-y-75" /> Compacto</button>
                    </div>
                </div>
                <div className="border-t border-gray-50 dark:border-zinc-800">
                    <Toggle label="Reduzir Animações" description="Remove efeitos de transição para uma interface mais rápida e direta." icon={MousePointer2} checked={settings.reduceMotion} onChange={(val: boolean) => updateSetting('reduceMotion', val)} />
                </div>
            </div>

            <div className="bg-white dark:bg-[#09090b] rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 transition-colors">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2"><Zap size={20} className="text-gray-400" />Automação e Preferências</h3>
                <Toggle label="Atualização Automática" description="Atualizar dados da planilha automaticamente a cada 30 segundos." icon={Clock} checked={settings.autoRefresh} onChange={(val: boolean) => updateSetting('autoRefresh', val)} />
                <Toggle label="Alertas de Equipe" description="Receber notificação no canto da tela quando alguém alterar uma tarefa." icon={Bell} checked={settings.enableNotifications} onChange={(val: boolean) => updateSetting('enableNotifications', val)} />
                
                {settings.enableNotifications && (
                    <div className="ml-8 mt-4 space-y-4 border-l-2 border-gray-100 dark:border-zinc-800 pl-4">
                        <Toggle 
                            label="Apenas Menções" 
                            description="Notificar quando alguém mencionar você em comentários ou descrições." 
                            icon={MessageSquare} 
                            checked={settings.notificationPreferences?.mentions ?? true} 
                            onChange={(val: boolean) => updateSetting('notificationPreferences', { ...settings.notificationPreferences, mentions: val })} 
                        />
                        <Toggle 
                            label="Minhas Tarefas" 
                            description="Notificar alterações em tarefas sob sua responsabilidade." 
                            icon={CheckSquare} 
                            checked={settings.notificationPreferences?.myTasks ?? true} 
                            onChange={(val: boolean) => updateSetting('notificationPreferences', { ...settings.notificationPreferences, myTasks: val })} 
                        />
                        <Toggle 
                            label="Atualizações Gerais" 
                            description="Notificar alterações em tarefas de outros (que não sou responsável)." 
                            icon={Activity} 
                            checked={settings.notificationPreferences?.general ?? true} 
                            onChange={(val: boolean) => updateSetting('notificationPreferences', { ...settings.notificationPreferences, general: val })} 
                        />
                    </div>
                )}

                <div className="py-4 border-t border-gray-100 dark:border-zinc-800 space-y-4">
                     <div className="flex items-start gap-3 mb-3"><div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400"><Layout size={18} /></div><div><p className="text-sm font-bold text-gray-900 dark:text-white">Demanda Padrão</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Selecione qual visão abrir ao iniciar o sistema.</p></div></div>
                    <select value={settings.defaultDepartment} onChange={(e) => updateSetting('defaultDepartment', e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-lm-yellow/50 outline-none">
                        {Object.values(DemandType).map(dept => (<option key={dept} value={dept}>{dept}</option>))}
                    </select>

                    <div className="flex items-start gap-3 mb-3"><div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400"><Calendar size={18} /></div><div><p className="text-sm font-bold text-gray-900 dark:text-white">Ano Padrão</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Ano selecionado ao entrar.</p></div></div>
                    <select value={settings.defaultYear || '2026'} onChange={(e) => updateSetting('defaultYear', e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-lm-yellow/50 outline-none">
                        {availableYears.map(year => (<option key={year} value={year}>{year}</option>))}
                    </select>

                    <div className="flex items-start gap-3 mb-3"><div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400"><Layout size={18} /></div><div><p className="text-sm font-bold text-gray-900 dark:text-white">Aba Padrão</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Tela inicial do sistema.</p></div></div>
                    <select value={settings.defaultTab || 'my_day'} onChange={(e) => updateSetting('defaultTab', e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-lm-yellow/50 outline-none">
                        <option value="my_day">Meu Dia</option>
                        <option value="my_obligations">Minhas Tarefas</option>
                        <option value="kanban">Visão Geral</option>
                        <option value="reports">Relatórios</option>
                        <option value="team">Colaboradores</option>
                        <option value="settings">Configurações</option>
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-[#09090b] rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 transition-colors">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Shield size={20} className="text-gray-400" />Sistema</h3>
                
                {isAdmin && (
                    <div className="mb-6 pb-6 border-b border-gray-100 dark:border-zinc-800">
                        <Toggle 
                            label="Modo Administrador" 
                            description="Ativa funções administrativas avançadas. Quando desativado, você verá o sistema como um colaborador comum." 
                            icon={Shield} 
                            checked={adminMode} 
                            onChange={(val: boolean) => setAdminMode(val)} 
                        />
                    </div>
                )}

                {isAdmin && adminMode && (
                    <div className="mb-6 pb-6 border-b border-gray-100 dark:border-zinc-800">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Ciclo de Vigência (Anual)</h4>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/50">
                            <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-4">
                                <strong>Atenção:</strong> Iniciar um novo ciclo irá copiar todas as empresas ativas do ano atual ({activeYear}) para o novo ano, resetando os status das obrigações. O histórico será mantido no ano anterior.
                            </p>
                            
                            <div className="flex items-end gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Ano de Destino</label>
                                    <input 
                                        type="number" 
                                        value={targetYear}
                                        onChange={(e) => setTargetYear(e.target.value)}
                                        className="w-full p-2 bg-white dark:bg-black border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-lm-yellow/50 outline-none"
                                    />
                                </div>
                                <button 
                                    onClick={() => setShowCycleConfirm(true)}
                                    disabled={isStartingCycle}
                                    className="px-4 py-2 bg-lm-yellow hover:bg-yellow-500 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isStartingCycle ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                                    Iniciar Novo Ciclo
                                </button>
                            </div>

                            {showCycleConfirm && (
                                <div className="mt-4 p-4 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-zinc-700 animate-in fade-in slide-in-from-top-2">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Confirmar Novo Ciclo?</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                        Você está prestes a iniciar o ciclo de <strong>{targetYear}</strong> copiando dados de <strong>{activeYear}</strong>. Esta ação não pode ser desfeita facilmente.
                                    </p>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={async () => {
                                                setIsStartingCycle(true);
                                                try {
                                                    await startNewCycle(targetYear);
                                                    setShowCycleConfirm(false);
                                                } catch (e) {
                                                    console.error(e);
                                                } finally {
                                                    setIsStartingCycle(false);
                                                }
                                            }}
                                            className="flex-1 py-2 bg-lm-yellow hover:bg-yellow-500 text-white rounded-lg text-xs font-bold transition-colors"
                                        >
                                            Confirmar e Iniciar
                                        </button>
                                        <button 
                                            onClick={() => setShowCycleConfirm(false)}
                                            className="flex-1 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold transition-colors hover:bg-gray-200 dark:hover:bg-zinc-700"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-900/50">
                            <h5 className="text-xs font-bold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                                <Shield size={14} /> Zona de Perigo: Excluir Ciclo
                            </h5>
                            <p className="text-xs text-red-600 dark:text-red-300 mb-4">
                                Excluir um ano inteiro removerá todas as empresas, tarefas e histórico daquele ano. Requer senha de segurança.
                            </p>
                            
                            {!showDeleteYearConfirm ? (
                                <button 
                                    onClick={() => setShowDeleteYearConfirm(true)}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                                >
                                    <Trash2 size={14} />
                                    Excluir Ano de Vigência
                                </button>
                            ) : (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Ano para Excluir</label>
                                        <input 
                                            type="number" 
                                            value={deleteYearTarget}
                                            onChange={(e) => setDeleteYearTarget(e.target.value)}
                                            placeholder="Ex: 2025"
                                            className="w-full p-2 bg-white dark:bg-black border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-red-500/50 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Senha de Segurança</label>
                                        <div className="relative">
                                            <input 
                                                type={showDeletePassword ? "text" : "password"}
                                                value={deleteYearPassword}
                                                onChange={(e) => setDeleteYearPassword(e.target.value)}
                                                placeholder="Senha do Admin"
                                                className="w-full p-2 pr-10 bg-white dark:bg-black border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-red-500/50 outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowDeletePassword(!showDeletePassword)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                                            >
                                                {showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={async () => {
                                                setIsVerifyingPassword(true);
                                                try {
                                                    const isValid = await verifySecurityPassword(deleteYearPassword);
                                                    if (!isValid) {
                                                        addNotification('Erro', 'Senha incorreta.', 'error');
                                                        return;
                                                    }
                                                    if (!deleteYearTarget) {
                                                        addNotification('Erro', 'Informe o ano.', 'error');
                                                        return;
                                                    }
                                                    setShowFinalConfirmModal(true);
                                                } catch (e) {
                                                    console.error(e);
                                                } finally {
                                                    setIsVerifyingPassword(false);
                                                }
                                            }}
                                            disabled={isVerifyingPassword}
                                            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                        >
                                            {isVerifyingPassword ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar Exclusão'}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setShowDeleteYearConfirm(false);
                                                setDeleteYearPassword('');
                                                setDeleteYearTarget('');
                                            }}
                                            className="flex-1 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold transition-colors hover:bg-gray-200 dark:hover:bg-zinc-700"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {showFinalConfirmModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-[#09090b] rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 p-8 max-w-md w-full"
                            >
                                <div className="flex items-center gap-4 text-red-600 mb-6">
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-full">
                                        <Shield size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Confirmação Crítica</h3>
                                </div>
                                
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                                    Você está prestes a excluir permanentemente todos os dados do ciclo de <strong>{deleteYearTarget}</strong>. Esta ação é irreversível e apagará empresas, tarefas, comentários e histórico.
                                </p>
                                
                                <div className="flex gap-3">
                                    <button 
                                        onClick={async () => {
                                            setIsDeleting(true);
                                            try {
                                                await deleteYearCycle(deleteYearTarget);
                                                setShowFinalConfirmModal(false);
                                                setShowDeleteYearConfirm(false);
                                                setDeleteYearPassword('');
                                                setDeleteYearTarget('');
                                            } catch (e) {
                                                console.error(e);
                                            } finally {
                                                setIsDeleting(false);
                                            }
                                        }}
                                        disabled={isDeleting}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Sim, Excluir Tudo'}
                                    </button>
                                    <button 
                                        onClick={() => setShowFinalConfirmModal(false)}
                                        disabled={isDeleting}
                                        className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold transition-all hover:bg-gray-200 dark:hover:bg-zinc-700"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-zinc-800"><span className="text-sm text-gray-600 dark:text-gray-400">Versão</span><span className="text-sm font-mono font-bold text-gray-900 dark:text-white">{APP_INFO.version}</span></div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
