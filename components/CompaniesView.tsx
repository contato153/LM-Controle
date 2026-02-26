import React, { useState, useMemo, useEffect } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { useAuth } from '../contexts/AuthContext';
import { CompanyTask } from '../types';
import { Search, Plus, Edit2, Trash2, Power, AlertTriangle, Check, X, Building2, Upload, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CompaniesView: React.FC = () => {
  const { tasks, createCompany, bulkCreateCompanies, updateCompany, toggleCompanyActive, deleteCompany, isLoading } = useTasks();
  const { isAdmin, isEffectiveAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyTask | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Import State
  const [importMode, setImportMode] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedCompanies, setParsedCompanies] = useState<CompanyTask[]>([]);
  const [importStep, setImportStep] = useState<'input' | 'preview'>('input');

  // Form State
  const [formData, setFormData] = useState<Partial<CompanyTask>>({
    id: '',
    name: '',
    cnpj: '',
    regime: 'SIMPLES NACIONAL',
    active: true
  });
  const [isFetchingCNPJ, setIsFetchingCNPJ] = useState(false);

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const fetchCompanyData = async (cnpj: string) => {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return;

    setIsFetchingCNPJ(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (response.ok) {
        const data = await response.json();
        if (data.razao_social) {
          setFormData(prev => ({ ...prev, name: data.razao_social }));
        }
      }
    } catch (error) {
      console.error("Error fetching CNPJ data:", error);
    } finally {
      setIsFetchingCNPJ(false);
    }
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData({ ...formData, cnpj: formatted });
    
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 14) {
      fetchCompanyData(digits);
    }
  };

  const handleIDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, id: value });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportText(text);
      // We don't auto-parse here so the user can see the text and click preview
    };
    reader.readAsText(file);
  };

  const downloadLayout = () => {
    const csvContent = "ID,Nome da Empresa,CNPJ,Regime\n123,Minha Empresa Ltda,00.000.000/0001-00,Simples Nacional\n124,Outra Empresa,11.111.111/0001-11,Lucro Presumido";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "layout_empresas.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseImportText = () => {
    if (!importText.trim()) return;

    const lines = importText.trim().split('\n');
    const parsed: CompanyTask[] = [];

    // Detect delimiter (Tab for Excel copy-paste, Comma/Semi-colon for CSV)
    const firstLine = lines[0];
    let delimiter = '\t';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';')) delimiter = ';';
    else if (firstLine.includes(',')) delimiter = ',';

    // Check for headers
    let startIndex = 0;
    const headerLower = firstLine.toLowerCase();
    if (headerLower.includes('id') || headerLower.includes('código') || headerLower.includes('nome')) {
        startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
        
        // Expected order: ID, Name, CNPJ, Regime
        // Adjust as needed or make it smarter
        if (cols.length >= 2) {
            const id = cols[0];
            const name = cols[1];
            const cnpj = cols[2] ? formatCNPJ(cols[2]) : '';
            const regime = cols[3] ? cols[3].toUpperCase() : 'SIMPLES NACIONAL';

            // Validate Regime
            let validRegime = 'SIMPLES NACIONAL';
            if (regime.includes('LUCRO PRESUMIDO') || regime.includes('PRESUMIDO')) validRegime = 'LUCRO PRESUMIDO';
            else if (regime.includes('LUCRO REAL') || regime.includes('REAL')) validRegime = 'LUCRO REAL';
            else if (regime.includes('IMUNE') || regime.includes('ISENTA')) validRegime = 'IMUNE/ISENTA';

            parsed.push({
                id,
                name,
                cnpj,
                regime: validRegime,
                active: true,
                respFiscal: '',
                statusFiscal: 'EM ABERTO',
                respContabil: '',
                statusContabil: 'EM ABERTO',
                respBalanco: '',
                statusBalanco: 'EM ABERTO',
                respLucro: '',
                statusLucro: 'PENDENTE',
                respReinf: '',
                statusReinf: 'PENDENTE',
                respECD: '',
                statusECD: 'PENDENTE',
                respECF: '',
                statusECF: 'PENDENTE',
                prioridade: 'BAIXA'
            });
        }
    }

    setParsedCompanies(parsed);
    setImportStep('preview');
  };

  const handleBulkImport = async () => {
      if (parsedCompanies.length === 0) return;
      await bulkCreateCompanies(parsedCompanies);
      setIsModalOpen(false);
      setImportText('');
      setParsedCompanies([]);
      setImportStep('input');
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100; // Increased for better visibility

  const [filterRegime, setFilterRegime] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filteredCompanies = useMemo(() => {
    return tasks.filter(company => {
      const matchesSearch = 
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.cnpj.includes(searchQuery) ||
        company.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesActive = showInactive ? true : (company.active !== false); // Default to true if undefined
      const matchesRegime = filterRegime ? company.regime === filterRegime : true;
      const matchesStatus = filterStatus ? (filterStatus === 'active' ? company.active !== false : company.active === false) : true;

      return matchesSearch && matchesActive && matchesRegime && matchesStatus;
    }).sort((a, b) => {
        // Sort by active status first (active first), then by ID (numeric if possible)
        if (a.active !== false && b.active === false) return -1;
        if (a.active === false && b.active !== false) return 1;
        
        const idA = parseInt(a.id);
        const idB = parseInt(b.id);
        if (!isNaN(idA) && !isNaN(idB)) return idA - idB;
        return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
  }, [tasks, searchQuery, showInactive, filterRegime, filterStatus]);

  const paginatedCompanies = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredCompanies.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCompanies, currentPage]);

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchQuery, showInactive, filterRegime, filterStatus]);

  const handleOpenModal = (company?: CompanyTask) => {
    if (company) {
      setEditingCompany(company);
      setFormData({ ...company });
      setImportMode(false);
    } else {
      setEditingCompany(null);
      setFormData({
        id: '',
        name: '',
        cnpj: '',
        regime: 'SIMPLES NACIONAL',
        active: true
      });
      setImportMode(false);
      setImportStep('input');
      setImportText('');
      setParsedCompanies([]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) return;

    try {
      if (editingCompany) {
        await updateCompany(formData as CompanyTask);
      } else {
        await createCompany(formData as CompanyTask);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving company:", error);
    }
  };

  const handleDelete = async () => {
    if (confirmDeleteId) {
      await deleteCompany(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const handleToggleActive = async (company: CompanyTask) => {
    const newStatus = company.active === false; // Toggle
    await toggleCompanyActive(company.id, newStatus);
  };

  return (
    <div className="h-full overflow-y-auto bg-transparent transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6 pt-10 px-6 lg:px-8 pb-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Building2 className="text-lm-yellow" size={28} />
              Gerenciamento de Empresas
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1 ml-11">
              Configure, adicione ou remova empresas do sistema.
            </p>
          </div>
          {isEffectiveAdmin && (
            <button 
              onClick={() => handleOpenModal()}
              className="bg-lm-yellow hover:bg-yellow-500 text-gray-900 px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all"
            >
              <Plus size={18} />
              Nova Empresa
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, CNPJ ou ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-lm-yellow/50 transition-all"
            />
          </div>
          
          <select 
            value={filterRegime} 
            onChange={(e) => setFilterRegime(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-lm-yellow/50 cursor-pointer"
          >
            <option value="">Todos os Regimes</option>
            <option value="SIMPLES NACIONAL">Simples Nacional</option>
            <option value="LUCRO PRESUMIDO">Lucro Presumido</option>
            <option value="LUCRO REAL">Lucro Real</option>
            <option value="IMUNE/ISENTA">Imune / Isenta</option>
          </select>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-lm-yellow/50 cursor-pointer"
          >
            <option value="">Todos os Status</option>
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
          </select>

          <button 
            onClick={() => setShowInactive(!showInactive)}
            className={`px-4 py-2.5 rounded-xl font-bold border transition-all flex items-center gap-2 ${showInactive ? 'bg-gray-800 text-white border-gray-800' : 'bg-white dark:bg-zinc-900 text-gray-500 border-gray-200 dark:border-zinc-800 hover:bg-gray-50'}`}
          >
            <Power size={16} />
            {showInactive ? 'Ocultar Inativas' : 'Mostrar Inativas'}
          </button>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[calc(100vh-320px)]">
          <div className="overflow-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse sticky-header">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Empresa</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">CNPJ</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Regime</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {paginatedCompanies.map((company, idx) => (
                  <tr 
                    key={company.id} 
                    className={`group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors animate-depth-appear ${company.active === false ? 'opacity-60 grayscale' : ''}`}
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <td className="p-4 text-sm font-mono text-gray-500">{company.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-gray-900 dark:text-white max-w-[220px] truncate text-xs" title={company.name}>{company.name}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400 font-mono">{company.cnpj || '-'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border whitespace-nowrap ${
                        company.regime === 'LUCRO REAL' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' :
                        company.regime === 'LUCRO PRESUMIDO' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' :
                        company.regime === 'SIMPLES NACIONAL' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' :
                        'bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-800 dark:text-gray-400 dark:border-zinc-700'
                      }`}>
                        {company.regime}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${company.active !== false ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${company.active !== false ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {company.active !== false ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {isEffectiveAdmin && (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenModal(company)}
                            className="p-2 text-gray-400 hover:text-lm-dark dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          
                          <button 
                            onClick={() => handleToggleActive(company)}
                            className={`p-2 rounded-lg transition-all ${company.active !== false ? 'text-gray-400 hover:text-orange-500 hover:bg-white dark:hover:bg-zinc-700' : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                            title={company.active !== false ? "Desativar" : "Reativar"}
                          >
                            <Power size={16} />
                          </button>

                          {company.active === false && (
                            <button 
                              onClick={() => setConfirmDeleteId(company.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              title="Excluir Permanentemente"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredCompanies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-400">
                      Nenhuma empresa encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/30 text-xs text-gray-500 flex justify-between items-center">
            <span>Total: {filteredCompanies.length} empresas</span>
            
            {totalPages > 1 && (
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Anterior
                    </button>
                    <span className="font-bold text-gray-700 dark:text-gray-300">
                        Página {currentPage} de {totalPages}
                    </span>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Próxima
                    </button>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X size={20} />
                </button>
              </div>

              {!editingCompany && (
                <div className="flex border-b border-gray-100 dark:border-zinc-800 shrink-0">
                    <button 
                        onClick={() => setImportMode(false)}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${!importMode ? 'text-lm-dark border-b-2 border-lm-yellow bg-yellow-50/50 dark:bg-yellow-900/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800/50'}`}
                    >
                        <Edit2 size={16} /> Manual
                    </button>
                    <button 
                        onClick={() => setImportMode(true)}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${importMode ? 'text-lm-dark border-b-2 border-lm-yellow bg-yellow-50/50 dark:bg-yellow-900/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800/50'}`}
                    >
                        <Upload size={16} /> Importar (CSV/Excel)
                    </button>
                </div>
              )}
              
              <div className="overflow-y-auto p-6">
                {!importMode ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">ID (Código)</label>
                            <input 
                            type="text" 
                            value={formData.id} 
                            onChange={handleIDChange}
                            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-lm-yellow/50 outline-none"
                            placeholder="Ex: 123"
                            required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">CNPJ</label>
                            <div className="relative">
                            <input 
                                type="text" 
                                value={formData.cnpj} 
                                onChange={handleCNPJChange}
                                className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-lm-yellow/50 outline-none"
                                placeholder="00.000.000/0000-00"
                            />
                            {isFetchingCNPJ && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="w-4 h-4 border-2 border-lm-yellow border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                            </div>
                        </div>
                        </div>

                        <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nome da Empresa</label>
                        <input 
                            type="text" 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-lm-yellow/50 outline-none"
                            placeholder={isFetchingCNPJ ? "Buscando..." : "Razão Social"}
                            required
                        />
                        </div>

                        <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Regime Tributário</label>
                        <select 
                            value={formData.regime} 
                            onChange={e => setFormData({...formData, regime: e.target.value})}
                            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-lm-yellow/50 outline-none appearance-none cursor-pointer"
                        >
                            <option value="SIMPLES NACIONAL">Simples Nacional</option>
                            <option value="LUCRO PRESUMIDO">Lucro Presumido</option>
                            <option value="LUCRO REAL">Lucro Real</option>
                            <option value="IMUNE/ISENTA">Imune / Isenta</option>
                        </select>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            className="px-6 py-2 bg-lm-yellow hover:bg-yellow-500 text-gray-900 text-sm font-bold rounded-lg shadow-lg shadow-yellow-500/20 transition-all hover:scale-105 active:scale-95"
                        >
                            {editingCompany ? 'Salvar Alterações' : 'Criar Empresa'}
                        </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        {importStep === 'input' ? (
                            <>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-bold flex items-center gap-2"><FileText size={16} /> Instruções:</p>
                                        <button 
                                            onClick={downloadLayout}
                                            className="text-xs flex items-center gap-1 bg-blue-100 dark:bg-blue-800/50 hover:bg-blue-200 dark:hover:bg-blue-800 px-2 py-1 rounded transition-colors"
                                        >
                                            <Download size={12} /> Baixar Layout CSV
                                        </button>
                                    </div>
                                    <p>Copie os dados do Excel ou Google Sheets e cole abaixo, ou envie um arquivo CSV.</p>
                                    <p className="mt-2 text-xs opacity-80">Ordem esperada das colunas: <strong>ID, Nome da Empresa, CNPJ, Regime</strong></p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <Upload size={20} className="text-gray-400" />
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Selecionar arquivo CSV</span>
                                        <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                        <div className="w-full border-t border-gray-200 dark:border-zinc-700" />
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-white dark:bg-zinc-900 px-2 text-xs text-gray-500 uppercase font-bold">ou cole o texto</span>
                                    </div>
                                </div>
                                <textarea 
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                    className="w-full h-48 p-4 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl font-mono text-xs focus:ring-2 focus:ring-lm-yellow/50 outline-none resize-none"
                                    placeholder={`123\tMinha Empresa Ltda\t00.000.000/0001-00\tSimples Nacional\n124\tOutra Empresa\t11.111.111/0001-11\tLucro Presumido`}
                                />
                                <div className="flex justify-end gap-3 pt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={parseImportText}
                                        disabled={!importText.trim()}
                                        className="px-6 py-2 bg-lm-yellow hover:bg-yellow-500 text-gray-900 text-sm font-bold rounded-lg shadow-lg shadow-yellow-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Visualizar Dados
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-gray-700 dark:text-gray-300">Pré-visualização ({parsedCompanies.length} empresas)</h4>
                                    <button onClick={() => setImportStep('input')} className="text-xs text-blue-500 hover:underline">Voltar para edição</button>
                                </div>
                                <div className="border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0">
                                            <tr>
                                                <th className="p-2 font-bold text-gray-500">ID</th>
                                                <th className="p-2 font-bold text-gray-500">Nome</th>
                                                <th className="p-2 font-bold text-gray-500">CNPJ</th>
                                                <th className="p-2 font-bold text-gray-500">Regime</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                            {parsedCompanies.map((c, i) => (
                                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                                    <td className="p-2 font-mono text-gray-500">{c.id}</td>
                                                    <td className="p-2">{c.name}</td>
                                                    <td className="p-2 font-mono">{c.cnpj}</td>
                                                    <td className="p-2">{c.regime}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleBulkImport}
                                        className="px-6 py-2 bg-lm-yellow hover:bg-yellow-500 text-gray-900 text-sm font-bold rounded-lg shadow-lg shadow-yellow-500/20 transition-all"
                                    >
                                        Confirmar Importação
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-zinc-800 p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Excluir Empresa?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Esta ação é irreversível e removerá todos os dados e histórico desta empresa. Tem certeza?
              </p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-red-600/20 transition-all hover:scale-105 active:scale-95"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompaniesView;
