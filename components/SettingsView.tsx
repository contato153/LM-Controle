
import React from 'react';
import { Settings, Shield, Monitor, Zap, Layout, Clock, MousePointer2, Bell } from 'lucide-react';
import { APP_INFO } from '../config/app';
import { Department } from '../types';
import { useTasks } from '../contexts/TasksContext';

const SettingsView: React.FC = () => {
  const { settings, updateSetting } = useTasks();
  
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
    <div className="w-full h-full overflow-y-auto bg-[#F7F7F5] dark:bg-black p-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-8 pb-10">
        <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3"><Settings className="text-lm-dark dark:text-lm-yellow" size={32} />Configurações</h2>
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
                <div className="py-4 border-t border-gray-100 dark:border-zinc-800">
                     <div className="flex items-start gap-3 mb-3"><div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400"><Layout size={18} /></div><div><p className="text-sm font-bold text-gray-900 dark:text-white">Departamento Padrão</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Selecione qual visão abrir ao iniciar o sistema.</p></div></div>
                    <select value={settings.defaultDepartment} onChange={(e) => updateSetting('defaultDepartment', e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-lm-yellow/50 outline-none">
                        {Object.values(Department).map(dept => (<option key={dept} value={dept}>{dept}</option>))}
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-[#09090b] rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 transition-colors">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Shield size={20} className="text-gray-400" />Sistema</h3>
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
