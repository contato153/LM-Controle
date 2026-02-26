

export enum Department {
  TODOS = 'Todos',
  FISCAL = 'Fiscal',
  CONTABIL = 'Contábil',
  LUCRO_REINF = 'Distribuição de Lucro/EFD-Reinf',
  ECD = 'ECD',
  ECF = 'ECF'
}

// Status baseados nas cores e textos da imagem
export type StatusFiscal = 'EM ABERTO' | 'FINALIZADA';
export type StatusContabil = 'EM ABERTO' | 'FINALIZADA'; // Usado para Balancete
export type StatusBalanco = 'EM ABERTO' | 'FINALIZADA'; // Novo para Balanço
export type StatusLucro = 'LUCRO LANÇADO' | 'NÃO HÁ DISTRIBUIÇÃO' | 'PENDENTE';
export type StatusReinf = 'EFD ENVIADA' | 'AGUARDANDO RETIFICAÇÃO' | 'EFD RETIFICADA' | 'PENDENTE';
export type StatusECD = 'ENVIADA' | 'PENDENTE' | 'DISPENSADA';
export type StatusECF = 'ENVIADA' | 'PENDENTE' | 'NÃO SE APLICA';
export type Priority = 'ALTA' | 'MÉDIA' | 'BAIXA' | ''; // Added empty string for auto-calc

export interface Collaborator {
  uuid?: string; // Supabase internal ID
  id: string; // ID DE ENTRADA (Col A)
  name: string; // NOME DO COLABORADOR (Col B)
  department?: string; // DEPARTAMENTO (Col C)
  lastSeen?: string; // ISO Date String
  role?: 'admin' | 'user';
  active?: boolean;
  deleted_at?: string | null; // Soft Delete timestamp
}

export interface CompanyTask {
  uuid?: string; // Supabase internal ID
  id: string; // Código da empresa (Col A)
  name: string; // Nome (Col B)
  cnpj: string; // CNPJ (Col C)
  regime: string; // Regime Federal (Col D)
  
  // Departamento Fiscal
  respFiscal: string; // Col F
  statusFiscal: StatusFiscal; // Col G
  
  // Departamento Contábil - BALANCETE
  respContabil: string; // Col I (Balancete)
  statusContabil: StatusContabil; // Col J (Balancete)
  
  // Departamento Contábil - BALANÇO (NOVO)
  respBalanco: string; // Col K
  statusBalanco: StatusBalanco; // Col L

  // Distribuição e EFD
  respLucro: string; // Col N (Shifted)
  statusLucro: StatusLucro; // Col O (Shifted)
  respReinf: string; // Col P (Shifted)
  statusReinf: StatusReinf; // Col Q (Shifted)
  
  // ECD
  respECD: string; // Col S (Shifted)
  statusECD: StatusECD; // Col T (Shifted)
  
  // ECF
  respECF: string; // Col U (Shifted)
  statusECF: StatusECF; // Col V (Shifted)

  // Prioridade (Col X)
  prioridade: Priority;
  
  // Auditoria (Col Y)
  lastEditor?: string;
  
  // Data de Vencimento (Col AB)
  dueDate?: string;

  // Controle interno para saber em qual linha do Google Sheets escrever
  rowIndex?: number; 
  
  // Soft Delete
  active?: boolean;
  deleted_at?: string | null;

  // Vigência (Yearly Cycles)
  ano?: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
}

// Definição das colunas possíveis para cada visualização do Kanban
export const COLUMNS_FISCAL: KanbanColumn[] = [
  { id: 'EM ABERTO', title: 'Em Aberto', color: 'bg-yellow-100' },
  { id: 'FINALIZADA', title: 'Finalizada', color: 'bg-green-100' }
];

// Usado para Balancete
export const COLUMNS_CONTABIL: KanbanColumn[] = [
  { id: 'EM ABERTO', title: 'Em Aberto', color: 'bg-yellow-100' },
  { id: 'FINALIZADA', title: 'Finalizada', color: 'bg-green-100' }
];

// Usado para Balanço
export const COLUMNS_BALANCO: KanbanColumn[] = [
  { id: 'EM ABERTO', title: 'Em Aberto', color: 'bg-yellow-100' },
  { id: 'FINALIZADA', title: 'Finalizada', color: 'bg-green-100' }
];

export const COLUMNS_LUCRO_REINF: KanbanColumn[] = [
  { id: 'PENDENTE', title: 'Pendente', color: 'bg-red-100' },
  { id: 'LUCRO LANÇADO', title: 'Lucro Lançado', color: 'bg-green-100' },
  { id: 'NÃO HÁ DISTRIBUIÇÃO', title: 'Não há Distribuição', color: 'bg-orange-100' }
];

export const COLUMNS_REINF: KanbanColumn[] = [
  { id: 'PENDENTE', title: 'Pendente', color: 'bg-red-100' },
  { id: 'EFD ENVIADA', title: 'EFD Enviada', color: 'bg-green-100' },
  { id: 'AGUARDANDO RETIFICAÇÃO', title: 'Aguardando Retificação', color: 'bg-orange-100' },
  { id: 'EFD RETIFICADA', title: 'EFD Retificada', color: 'bg-purple-100' }
];

export const COLUMNS_ECD: KanbanColumn[] = [
  { id: 'PENDENTE', title: 'Pendente', color: 'bg-red-100' },
  { id: 'ENVIADA', title: 'Enviada', color: 'bg-green-100' },
  { id: 'DISPENSADA', title: 'Dispensada', color: 'bg-zinc-100' }
];

// --- NOVOS TIPOS PARA DETALHES ---

export interface ChecklistItem {
    id: string;
    text: string;
    isDone: boolean;
}

export interface TaskComment {
    id: string; // ID local ou Composto
    timestamp: string;
    author: string;
    text: string;
    rowIndex?: number; // Para edição/exclusão
    reactions?: Record<string, string[]>; // { "👍": ["User1", "User2"], "✔️": ["User3"] }
    parentId?: string | null; // ID of the parent comment
}

export interface TaskDetail {
    id: string; // ID da empresa
    name?: string; // Nome da empresa (Nova Coluna B)
    description: string;
    checklist: ChecklistItem[];
}

export interface UserSettings {
    density: 'comfortable' | 'compact';
    autoRefresh: boolean;
    reduceMotion: boolean;
    defaultDepartment: Department;
    defaultYear?: string; // Novo campo
    defaultTab?: 'my_day' | 'my_obligations' | 'kanban' | 'reports' | 'team' | 'settings'; // Novo campo
    enableNotifications: boolean;
    notificationPreferences: {
        mentions: boolean;
        myTasks: boolean;
        general: boolean;
    };
    theme: 'light' | 'dark';
    adminMode: boolean;
    pinnedTasks?: string[];
    readDeadlineNotifications?: string[];
}

export interface AppNotification {
    id: string;         // ID Único
    recipient: string;  // Nome do destinatário
    sender: string;     // Quem enviou
    taskId: string;     // Tarefa relacionada
    message: string;    // Mensagem curta
    isRead: boolean;    // Se foi lida
    timestamp: string;  // Quando ocorreu
    rowIndex?: number;  // Para atualização
}

// --- HELPERS ---

export const isFiscalFinished = (status: string): boolean => {
    if (!status) return false;
    const s = status.toUpperCase();
    return ['FINALIZADA', 'ENVIADA', 'LUCRO LANÇADO', 'EFD ENVIADA', 'EFD RETIFICADA', 'DISPENSADA', 'NÃO SE APLICA', 'NÃO HÁ DISTRIBUIÇÃO'].includes(s);
};

// Calcula prioridade automática (Data de Vencimento) se não houver manual
export const getEffectivePriority = (task: CompanyTask): Priority => {
  // Se o admin setou uma prioridade manual (diferente de vazio), respeita ela
  if (task.prioridade && task.prioridade.trim() !== '') {
    return task.prioridade as Priority;
  }
  
  // Se não tem prioridade manual, calcula baseada na data
  if (task.dueDate) {
    const parts = task.dueDate.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      
      const due = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 3) return 'ALTA';
      if (diffDays <= 7) return 'MÉDIA';
      return 'BAIXA';
    }
  }
  
  return 'BAIXA'; // Default absoluto
};
