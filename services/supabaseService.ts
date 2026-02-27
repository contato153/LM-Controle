import { supabase } from './supabaseClient';
import { CompanyTask, Collaborator, UserSettings, TaskComment, AppNotification, TaxRegime } from '../types';

// --- MAPPERS ---

const mapSupabaseToTask = (row: any): CompanyTask => ({
    uuid: row.id,
    id: row.codigo_externo,
    name: row.nome,
    cnpj: row.cnpj || '',
    regime: row.regime || '',
    
    respFiscal: row.resp_fiscal || '',
    statusFiscal: row.status_fiscal || 'EM ABERTO',
    
    respContabil: row.resp_contabil || '',
    statusContabil: row.status_contabil || 'EM ABERTO',
    
    respBalanco: row.resp_balanco || '',
    statusBalanco: row.status_balanco || 'EM ABERTO',
    
    respLucro: row.resp_lucro || '',
    statusLucro: row.status_lucro || 'PENDENTE',
    
    respReinf: row.resp_reinf || '',
    statusReinf: row.status_reinf || 'PENDENTE',
    
    respECD: row.resp_ecd || '',
    statusECD: row.status_ecd || 'PENDENTE',
    
    respECF: row.resp_ecf || '',
    statusECF: row.status_ecf || 'PENDENTE',
    
    prioridade: row.prioridade || '',
    lastEditor: row.ultimo_editor || '',
    dueDate: row.data_vencimento || '',
    
    rowIndex: row.row_index, // Optional, kept for compatibility if needed
    active: row.active !== false, // Default to true if null/undefined
    deleted_at: row.deleted_at,
    ano: row.ano || new Date().getFullYear().toString()
});

const mapTaskToSupabase = (task: CompanyTask) => ({
    codigo_externo: task.id,
    nome: task.name,
    cnpj: task.cnpj,
    regime: task.regime,
    
    resp_fiscal: task.respFiscal,
    status_fiscal: task.statusFiscal,
    
    resp_contabil: task.respContabil,
    status_contabil: task.statusContabil,
    
    resp_balanco: task.respBalanco,
    status_balanco: task.statusBalanco,
    
    resp_lucro: task.respLucro,
    status_lucro: task.statusLucro,
    
    resp_reinf: task.respReinf,
    status_reinf: task.statusReinf,
    
    resp_ecd: task.respECD,
    status_ecd: task.statusECD,
    
    resp_ecf: task.respECF,
    status_ecf: task.statusECF,
    
    prioridade: task.prioridade,
    ultimo_editor: task.lastEditor,
    data_vencimento: task.dueDate,
    active: task.active,
    ano: task.ano || new Date().getFullYear().toString()
});

// --- API OPERATIONS ---

// --- HELPER: RETRY LOGIC ---
const fetchWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        if (retries > 0) {
            console.warn(`Retrying fetch... Attempts left: ${retries}. Error:`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
};

export const fetchAllDataSupabase = async (year?: string): Promise<{
    tasks: CompanyTask[],
    collaborators: Collaborator[],
    logs: string[][],
    allComments: string[][]
}> => {
    if (!supabase) {
        console.error("Supabase client not initialized. Check your environment variables.");
        return { tasks: [], collaborators: [], logs: [], allComments: [] };
    }
    try {
        let tasksQuery = supabase.from('empresas').select('*').is('deleted_at', null).order('codigo_externo', { ascending: true });
        
        if (year) {
            tasksQuery = tasksQuery.eq('ano', year);
        }

        // Parallel Fetch with Retry
        const [tasksRes, collabsRes, logsRes, commentsRes]: any[] = await Promise.all([
            fetchWithRetry(() => tasksQuery),
            fetchWithRetry(() => supabase.from('colaboradores').select('*').is('deleted_at', null)),
            fetchWithRetry(() => supabase.from('registros').select('*').order('created_at', { ascending: false }).limit(100)),
            fetchWithRetry(() => supabase.from('comentarios').select('*'))
        ]);

        if (tasksRes.error) throw tasksRes.error;
        if (collabsRes.error) throw collabsRes.error;

        const tasks = (tasksRes.data || []).map(mapSupabaseToTask);
        
        const collaborators = (collabsRes.data || []).map((c: any) => ({
            uuid: c.id,
            id: c.codigo_externo || '',
            name: c.nome || '',
            department: c.department || '',
            permissions: c.permissions || [],
            lastSeen: c.last_seen || null,
            role: c.role || (c.is_admin ? 'admin' : 'user'),
            active: c.active !== false,
            deleted_at: c.deleted_at
        }));

        // Map logs to string[][] format expected by Context (Timestamp, Description, User, TaskID)
        const logs = (logsRes.data || []).map((l: any) => [
            new Date(l.created_at).toLocaleString('pt-BR'),
            l.descricao,
            l.usuario,
            l.empresa_id || ''
        ]);

        // Map comments to string[][] format expected by Context (TaskID, Timestamp, Author, Text)
        const allComments = (commentsRes.data || []).map((c: any) => [
            c.empresa_id,
            new Date(c.created_at).toLocaleString('pt-BR'),
            c.autor,
            c.texto
        ]);

        return { tasks, collaborators, logs, allComments };

    } catch (error) {
        console.error("Supabase Fetch Error:", error);
        return { tasks: [], collaborators: [], logs: [], allComments: [] };
    }
};

export const fetchTasksPaginatedSupabase = async (page: number, pageSize: number = 50, filters: any = {}): Promise<{ tasks: CompanyTask[], hasMore: boolean }> => {
    if (!supabase) return { tasks: [], hasMore: false };
    try {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        let query = supabase.from('empresas').select('*', { count: 'exact' }).is('deleted_at', null);

        // Filter by activeYear
        if (filters.activeYear) {
            query = query.eq('ano', filters.activeYear);
        }

        // Apply filters if needed
        if (filters.search) {
            query = query.or(`nome.ilike.%${filters.search}%,codigo_externo.ilike.%${filters.search}%,cnpj.ilike.%${filters.search}%`);
        }
        if (filters.regime) {
            query = query.eq('regime', filters.regime);
        }

        const { data, error, count } = await query
            .order('codigo_externo', { ascending: true })
            .range(from, to);

        if (error) throw error;

        const tasks = (data || []).map(mapSupabaseToTask);
        const hasMore = count ? (to < count - 1) : false;

        return { tasks, hasMore };
    } catch (error) {
        console.error("Fetch Paginated Tasks Error:", error);
        return { tasks: [], hasMore: false };
    }
};

// --- TRASH MANAGEMENT ---
export const fetchTrashSupabase = async (year?: string): Promise<{ tasks: CompanyTask[], collaborators: Collaborator[] }> => {
    if (!supabase) return { tasks: [], collaborators: [] };
    try {
        let tasksQuery = supabase.from('empresas').select('*').not('deleted_at', 'is', null);
        
        if (year) {
            tasksQuery = tasksQuery.eq('ano', year);
        }

        const [tasksRes, collabsRes]: any[] = await Promise.all([
            tasksQuery,
            supabase.from('colaboradores').select('*').not('deleted_at', 'is', null)
        ]);

        if (tasksRes.error) throw tasksRes.error;
        if (collabsRes.error) throw collabsRes.error;

        const tasks = (tasksRes.data || []).map(mapSupabaseToTask);
        const collaborators = (collabsRes.data || []).map((c: any) => ({
            uuid: c.id,
            id: c.codigo_externo || '',
            name: c.nome || '',
            department: c.department || '',
            permissions: c.permissions || [],
            lastSeen: c.last_seen || null,
            role: c.role || (c.is_admin ? 'admin' : 'user'),
            active: c.active !== false,
            deleted_at: c.deleted_at
        }));

        return { tasks, collaborators };
    } catch (error) {
        console.error("Fetch Trash Error:", error);
        return { tasks: [], collaborators: [] };
    }
};

export const softDeleteCompanySupabase = async (companyId: string, userName: string, year: string): Promise<void> => {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('empresas')
            .update({ deleted_at: new Date().toISOString() })
            .eq('codigo_externo', companyId)
            .eq('ano', year);
        
        if (error) throw error;
        await logChangeSupabase(`Empresa movida para lixeira`, userName, companyId, year);
    } catch (error) {
        console.error("Error soft deleting company:", error);
        throw error;
    }
};

export const restoreCompanySupabase = async (companyId: string, userName: string, year: string): Promise<void> => {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('empresas')
            .update({ deleted_at: null })
            .eq('codigo_externo', companyId)
            .eq('ano', year);
        
        if (error) throw error;
        await logChangeSupabase(`Empresa restaurada da lixeira`, userName, companyId, year);
    } catch (error) {
        console.error("Error restoring company:", error);
        throw error;
    }
};

export const softDeleteCollaboratorSupabase = async (collaboratorId: string): Promise<void> => {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('colaboradores')
            .update({ deleted_at: new Date().toISOString() })
            .eq('codigo_externo', collaboratorId);
        if (error) throw error;
    } catch (error) {
        console.error("Error soft deleting collaborator:", error);
        throw error;
    }
};

export const restoreCollaboratorSupabase = async (collaboratorId: string): Promise<void> => {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('colaboradores')
            .update({ deleted_at: null })
            .eq('codigo_externo', collaboratorId);
        if (error) throw error;
    } catch (error) {
        console.error("Error restoring collaborator:", error);
        throw error;
    }
};

// --- COMPANY MANAGEMENT ---

export const createCompanySupabase = async (company: CompanyTask, userName: string): Promise<void> => {
    if (!supabase) return;
    try {
        const dbData = mapTaskToSupabase(company);
        const { error } = await supabase.from('empresas').insert(dbData);
        if (error) throw error;
        await logChangeSupabase(`Empresa criada: ${company.name} (${company.id})`, userName, company.id, company.ano);
    } catch (error) {
        console.error("Error creating company:", error);
        throw error;
    }
};

export const bulkCreateCompaniesSupabase = async (companies: CompanyTask[], userName: string): Promise<void> => {
    if (!supabase) return;
    try {
        const dbData = companies.map(mapTaskToSupabase);
        const { error } = await supabase.from('empresas').insert(dbData);
        if (error) throw error;
        // Log generic (no specific year/id for bulk) or iterate?
        // For simplicity, log generic.
        await logChangeSupabase(`Importação em massa: ${companies.length} empresas criadas`, userName, undefined, companies[0]?.ano);
    } catch (error) {
        console.error("Error bulk creating companies:", error);
        throw error;
    }
};

export const updateCompanyDataSupabase = async (company: CompanyTask, userName: string): Promise<void> => {
    if (!supabase) return;
    try {
        const dbData = mapTaskToSupabase(company);
        const { error } = await supabase
            .from('empresas')
            .update(dbData)
            .eq(company.uuid ? 'id' : 'codigo_externo', company.uuid || company.id)
            .eq('ano', company.ano || new Date().getFullYear().toString());
        
        if (error) throw error;
        await logChangeSupabase(`Dados da empresa atualizados: ${company.name}`, userName, company.id, company.ano);
    } catch (error) {
        console.error("Error updating company:", error);
        throw error;
    }
};

export const toggleCompanyActiveSupabase = async (companyId: string, isActive: boolean, userName: string, year: string): Promise<void> => {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('empresas')
            .update({ active: isActive })
            .eq('codigo_externo', companyId)
            .eq('ano', year);
        
        if (error) throw error;
        
        const action = isActive ? 'reativada' : 'desativada';
        await logChangeSupabase(`Empresa ${action}`, userName, companyId, year);
    } catch (error) {
        console.error("Error toggling company status:", error);
        throw error;
    }
};

export const deleteCompanySupabase = async (companyId: string, userName: string, year: string): Promise<void> => {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('empresas')
            .delete()
            .eq('codigo_externo', companyId)
            .eq('ano', year);
        
        if (error) throw error;
        await logChangeSupabase(`Empresa excluída permanentemente`, userName, companyId, year);
    } catch (error) {
        console.error("Error deleting company:", error);
        throw error;
    }
};

export const updateTaskStatusSupabase = async (
    task: CompanyTask, 
    field: keyof CompanyTask, 
    newValue: string,
    editorInfo?: string
): Promise<void> => {
    if (!supabase) return;
    try {
        // Map field name to column name
        const fieldMap: Record<string, string> = {
            respFiscal: 'resp_fiscal',
            statusFiscal: 'status_fiscal',
            respContabil: 'resp_contabil',
            statusContabil: 'status_contabil',
            respBalanco: 'resp_balanco',
            statusBalanco: 'status_balanco',
            respLucro: 'resp_lucro',
            statusLucro: 'status_lucro',
            respReinf: 'resp_reinf',
            statusReinf: 'status_reinf',
            respECD: 'resp_ecd',
            statusECD: 'status_ecd',
            respECF: 'resp_ecf',
            statusECF: 'status_ecf',
            prioridade: 'prioridade',
            dueDate: 'data_vencimento'
        };

        const dbField = fieldMap[field as string];
        if (!dbField) return;

        const updateData: any = { [dbField]: newValue };
        if (editorInfo) {
            updateData.ultimo_editor = editorInfo;
        }

        const { error } = await supabase
            .from('empresas')
            .update(updateData)
            .eq('codigo_externo', task.id)
            .eq('ano', task.ano || new Date().getFullYear().toString());

        if (error) throw error;

        // Also log the change if editorInfo is provided
        if (editorInfo) {
            const userName = editorInfo.split(' em ')[0];
            const fieldMapFriendly: Record<string, string> = {
                respFiscal: 'Responsável Fiscal', 
                statusFiscal: 'Status Fiscal',
                respContabil: 'Responsável Contábil (Balancete)', 
                statusContabil: 'Status Contábil (Balancete)',
                respBalanco: 'Responsável Contábil (Balanço)',
                statusBalanco: 'Status Contábil (Balanço)',
                respLucro: 'Responsável Lucro',
                statusLucro: 'Status Lucro', 
                respReinf: 'Responsável Reinf',
                statusReinf: 'Status Reinf',
                respECD: 'Responsável ECD',
                statusECD: 'Status ECD', 
                respECF: 'Responsável ECF',
                statusECF: 'Status ECF', 
                prioridade: 'Prioridade', 
                regime: 'Regime', 
                cnpj: 'CNPJ',
                dueDate: 'Data de Vencimento', 
                name: 'Nome da Empresa'
            };
            const friendlyField = fieldMapFriendly[field as string] || field;
            await logChangeSupabase(`Alterou ${friendlyField} para "${newValue}"`, userName, task.id, task.ano);
        }

    } catch (error) {
        console.error("Supabase Update Error:", error);
        throw error;
    }
};

export const logChangeSupabase = async (description: string, userName: string, taskId?: string, year?: string): Promise<void> => {
    if (!supabase) return;
    try {
        await supabase.from('registros').insert({
            descricao: description,
            usuario: userName,
            empresa_id: taskId,
            ano: year || new Date().getFullYear().toString()
        });
    } catch (error) {
        console.error("Supabase Log Error:", error);
    }
};

// --- COMMENTS ---

export const fetchCommentsPaginatedSupabase = async (taskId: string, page: number, pageSize: number = 20, year?: string): Promise<{ comments: TaskComment[], hasMore: boolean }> => {
    if (!supabase) return { comments: [], hasMore: false };
    
    const from = page * pageSize;
    const to = from + pageSize - 1;

    // Fetch comments ordered by created_at DESC (newest first) to support chat-like pagination
    let query = supabase
        .from('comentarios')
        .select('*', { count: 'exact' })
        .eq('empresa_id', taskId)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (year) {
        query = query.eq('ano', year);
    }

    const { data, error, count } = await query;

    if (error || !data) return { comments: [], hasMore: false };

    const comments = data.map((c: any) => ({
        id: c.id,
        timestamp: new Date(c.created_at).toLocaleString('pt-BR'),
        author: c.autor,
        text: c.texto,
        originalTaskId: c.empresa_id,
        reactions: c.reactions || {},
        parentId: c.parent_id || null
    })).reverse(); // Reverse back to ASC for display

    const hasMore = count ? (to < count - 1) : false;
    return { comments, hasMore };
};

export const fetchCommentsSupabase = async (taskId: string, year?: string): Promise<TaskComment[]> => {
    if (!supabase) return [];
    let query = supabase
        .from('comentarios')
        .select('*')
        .eq('empresa_id', taskId)
        .order('created_at', { ascending: true });

    if (year) {
        query = query.eq('ano', year);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    return data.map((c: any) => ({
        id: c.id,
        timestamp: new Date(c.created_at).toLocaleString('pt-BR'),
        author: c.autor,
        text: c.texto,
        originalTaskId: c.empresa_id,
        reactions: c.reactions || {},
        parentId: c.parent_id || null
    }));
};

export const saveCommentSupabase = async (taskId: string, author: string, message: string, parentId?: string | null, year?: string): Promise<void> => {
    if (!supabase) return;
    await supabase.from('comentarios').insert({
        empresa_id: taskId,
        autor: author,
        texto: message,
        parent_id: parentId || null,
        reactions: {},
        ano: year || new Date().getFullYear().toString()
    });
};

export const toggleCommentReactionSupabase = async (commentId: string, emoji: string, userName: string): Promise<void> => {
    if (!supabase) return;
    
    // First fetch current reactions
    const { data, error } = await supabase
        .from('comentarios')
        .select('reactions')
        .eq('id', commentId)
        .single();
        
    if (error || !data) return;
    
    const currentReactions: Record<string, string[]> = data.reactions || {};
    const users = currentReactions[emoji] || [];
    
    let newUsers;
    if (users.includes(userName)) {
        newUsers = users.filter((u: string) => u !== userName);
    } else {
        newUsers = [...users, userName];
    }
    
    const newReactions = { ...currentReactions, [emoji]: newUsers };
    
    await supabase
        .from('comentarios')
        .update({ reactions: newReactions })
        .eq('id', commentId);
};

// --- USER SETTINGS ---

export const getUserSettingsSupabase = async (userId: string): Promise<UserSettings | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('configuracoes_usuario')
        .select('configuracao')
        .eq('user_id', userId)
        .single();

    if (error || !data) return null;
    return data.configuracao as UserSettings;
};

export const saveUserSettingsSupabase = async (userId: string, userName: string, settings: UserSettings): Promise<void> => {
    if (!supabase) return;
    // Upsert
    const { error } = await supabase
        .from('configuracoes_usuario')
        .upsert({
            user_id: userId,
            nome: userName,
            configuracao: settings,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

    if (error) console.error("Error saving settings:", error);
};

// --- NOTIFICATIONS ---

export const fetchNotificationsSupabase = async (userName: string, year: string): Promise<AppNotification[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('destinatario', userName)
        .eq('lida', false)
        .eq('ano', year)
        .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((n: any) => ({
        id: n.id,
        recipient: n.destinatario,
        sender: n.remetente,
        taskId: n.empresa_id,
        message: n.mensagem,
        isRead: n.lida,
        timestamp: n.timestamp,
        rowIndex: 0 // Not applicable for Supabase
    }));
};

export const sendNotificationSupabase = async (notification: Omit<AppNotification, 'rowIndex'>): Promise<void> => {
    if (!supabase) return;
    await supabase.from('notificacoes').insert({
        id: notification.id,
        destinatario: notification.recipient,
        remetente: notification.sender,
        empresa_id: notification.taskId,
        mensagem: notification.message,
        lida: notification.isRead,
        timestamp: notification.timestamp
    });
};

export const markNotificationAsReadSupabase = async (id: string): Promise<void> => {
    if (!supabase) return;
    await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id);
};

export const markAllNotificationsAsReadSupabase = async (userName: string): Promise<void> => {
    if (!supabase) return;
    await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('destinatario', userName)
        .eq('lida', false);
};

// --- DETAILS ---

export const fetchTaskDetailSupabase = async (taskId: string, year?: string): Promise<any | null> => {
    if (!supabase) return null;
    let query = supabase
        .from('detalhes')
        .select('*')
        .eq('id', taskId);

    if (year) {
        query = query.eq('ano', year);
    }

    const { data, error } = await query.maybeSingle(); // Use maybeSingle as there might be multiple if no year filter (though we should always pass year)

    if (error || !data) return null;

    return {
        id: data.id,
        name: data.nome,
        description: data.descricao,
        checklist: data.checklist || []
    };
};

export const saveTaskDetailSupabase = async (detail: any, year?: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase
        .from('detalhes')
        .upsert({
            id: detail.id,
            nome: detail.name,
            descricao: detail.description,
            checklist: detail.checklist,
            updated_at: new Date().toISOString(),
            ano: year || new Date().getFullYear().toString()
        }, { onConflict: 'id,ano' }); // Composite key

    if (error) console.error("Error saving detail:", error);
};

export const fetchLogsPaginatedSupabase = async (taskId: string, page: number, pageSize: number = 20, year?: string): Promise<{ logs: string[][], hasMore: boolean, totalCount: number }> => {
    if (!supabase) return { logs: [], hasMore: false, totalCount: 0 };
    
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
        .from('registros')
        .select('*', { count: 'exact' });

    if (taskId) {
        query = query.eq('empresa_id', taskId);
    }

    if (year) {
        query = query.eq('ano', year);
    }

    query = query.order('created_at', { ascending: false })
        .range(from, to);

    const { data, error, count } = await query;

    if (error || !data) return { logs: [], hasMore: false, totalCount: 0 };

    const logs = data.map((l: any) => [
        new Date(l.created_at).toLocaleString('pt-BR'),
        l.descricao,
        l.usuario,
        l.empresa_id || ''
    ]);

    const hasMore = count ? (to < count - 1) : false;
    return { logs, hasMore, totalCount: count || 0 };
};

export const fetchLogsSupabase = async (taskId?: string): Promise<string[][]> => {
    if (!supabase) return [];
    let query = supabase.from('registros').select('*').order('created_at', { ascending: false });
    if (taskId) {
        query = query.eq('empresa_id', taskId);
    } else {
        query = query.limit(100);
    }
    
    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((l: any) => [
        new Date(l.created_at).toLocaleString('pt-BR'),
        l.descricao,
        l.usuario,
        l.empresa_id || ''
    ]);
};

export const updateCommentSupabase = async (id: string, text: string): Promise<void> => {
    if (!supabase) return;
    await supabase.from('comentarios').update({ texto: text }).eq('id', id);
};

export const deleteCommentSupabase = async (id: string): Promise<void> => {
    if (!supabase) return;
    await supabase.from('comentarios').delete().eq('id', id);
};

export const createCollaboratorSupabase = async (collaborator: Collaborator): Promise<void> => {
    if (!supabase) return;
    try {
        const { error } = await supabase.from('colaboradores').insert({
            codigo_externo: collaborator.id,
            nome: collaborator.name,
            department: collaborator.department,
            permissions: collaborator.permissions,
            role: collaborator.role || 'user'
        });
        if (error) throw error;
    } catch (error) {
        console.error("Error creating collaborator:", error);
        throw error;
    }
};

export const updateCollaboratorSupabase = async (collaborator: Collaborator): Promise<void> => {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('colaboradores')
            .update({
                codigo_externo: collaborator.id,
                nome: collaborator.name,
                department: collaborator.department,
                permissions: collaborator.permissions,
                role: collaborator.role
            })
            .eq(collaborator.uuid ? 'id' : 'codigo_externo', collaborator.uuid || collaborator.id);
        if (error) throw error;
    } catch (error) {
        console.error("Error updating collaborator:", error);
        throw error;
    }
};

export const toggleCollaboratorActiveSupabase = async (collaboratorId: string, isActive: boolean): Promise<void> => {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('colaboradores')
            .update({ active: isActive })
            .eq('codigo_externo', collaboratorId);
        if (error) throw error;
    } catch (error) {
        console.error("Error toggling collaborator status:", error);
        throw error;
    }
};

export const deleteCollaboratorSupabase = async (collaboratorId: string): Promise<void> => {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('colaboradores')
            .delete()
            .eq('codigo_externo', collaboratorId);
        if (error) throw error;
    } catch (error) {
        console.error("Error deleting collaborator:", error);
        throw error;
    }
};

let isUpdatingPresence = false;
export const updateUserPresenceSupabase = async (userId: string): Promise<void> => {
    if (!supabase || !userId || isUpdatingPresence) return;
    isUpdatingPresence = true;
    try {
        const { error } = await supabase
            .from('colaboradores')
            .update({ last_seen: new Date().toISOString() })
            .eq('codigo_externo', userId);
        
        if (error) {
            // PGRST204: Column not found
            if (error.code === 'PGRST204') {
                console.warn("Coluna 'last_seen' não encontrada no Supabase. Por favor, execute o SQL de migração.");
                return;
            }
            throw error;
        }
    } catch (e: any) {
        // Suppress "Failed to fetch" or LockManager errors for heartbeat
        const msg = e.message || '';
        if (msg.includes('LockManager') || msg.includes('Failed to fetch') || e.name === 'TypeError') {
            console.warn("Supabase heartbeat suppressed due to lock/network issue:", msg);
        } else {
            console.error("Erro ao atualizar presença no Supabase:", e);
        }
    } finally {
        isUpdatingPresence = false;
    }
};

export const fetchAvailableYearsSupabase = async (): Promise<string[]> => {
    if (!supabase) return ['2026'];
    try {
        const { data, error } = await supabase
            .from('empresas')
            .select('ano')
            .not('ano', 'is', null);
            
        if (error) throw error;
        
        const years: string[] = Array.from(new Set((data || []).map((d: any) => d.ano))).sort().reverse() as string[];
        return years.length > 0 ? years : ['2026'];
    } catch (error) {
        console.error("Error fetching available years:", error);
        return ['2026'];
    }
};

export const startNewYearCycleSupabase = async (sourceYear: string, targetYear: string, userName: string): Promise<void> => {
    if (!supabase) return;
    try {
        // 1. Fetch active companies from source year
        const { data: sourceCompanies, error: fetchError } = await supabase
            .from('empresas')
            .select('*')
            .eq('ano', sourceYear)
            .is('deleted_at', null);

        if (fetchError) throw fetchError;
        if (!sourceCompanies || sourceCompanies.length === 0) {
            throw new Error(`Nenhuma empresa encontrada no ano de origem (${sourceYear}).`);
        }

        // 2. Check if target year already has data (prevent duplicates)
        const { count, error: countError } = await supabase
            .from('empresas')
            .select('*', { count: 'exact', head: true })
            .eq('ano', targetYear);

        if (countError) throw countError;
        if (count && count > 0) {
            throw new Error(`O ano de destino (${targetYear}) já possui dados. Não é possível iniciar um novo ciclo.`);
        }

        // 3. Prepare new companies with reset statuses
        const newCompanies = sourceCompanies.map((company: any) => {
            // Remove ID to let Supabase generate a new UUID
            const { id, created_at, updated_at, ...rest } = company;
            
            return {
                ...rest,
                ano: targetYear,
                // Reset Statuses
                status_fiscal: 'EM ABERTO',
                status_contabil: 'EM ABERTO',
                status_balanco: 'EM ABERTO',
                status_lucro: 'PENDENTE',
                status_reinf: 'PENDENTE',
                status_ecd: 'PENDENTE',
                status_ecf: 'PENDENTE',
                // Reset Responsibles? User didn't specify, but usually responsibles stay. 
                // "não podem ser excluídos só resetados" usually refers to status.
                // Reset Last Editor
                ultimo_editor: `Sistema (Ciclo ${targetYear})`,
                // Keep static info (CNPJ, Name, Regime, Responsibles)
            };
        });

        // 4. Insert in batches (Supabase limit is usually high, but let's be safe)
        const { error: insertError } = await supabase
            .from('empresas')
            .insert(newCompanies);

        if (insertError) throw insertError;

        // 5. Duplicate Details (resetting checklists)
        const { data: sourceDetails } = await supabase
            .from('detalhes')
            .select('*')
            .eq('ano', sourceYear);

        if (sourceDetails && sourceDetails.length > 0) {
            const newDetails = sourceDetails.map((detail: any) => ({
                id: detail.id, // Keep same ID (company ID)
                nome: detail.nome,
                descricao: detail.descricao,
                checklist: (detail.checklist || []).map((item: any) => ({ ...item, isDone: false })),
                ano: targetYear
            }));

            const { error: detailsError } = await supabase.from('detalhes').insert(newDetails);
            if (detailsError) console.error("Error duplicating details:", detailsError);
        }

        await logChangeSupabase(`Novo ciclo anual iniciado: ${sourceYear} -> ${targetYear}`, userName, '', targetYear);

    } catch (error) {
        console.error("Error starting new year cycle:", error);
        throw error;
    }
};

export const deleteYearCycleSupabase = async (year: string, userName: string): Promise<void> => {
    if (!supabase) return;
    try {
        // 1. Delete companies for the target year
        const { error: companiesError } = await supabase
            .from('empresas')
            .delete()
            .eq('ano', year);

        if (companiesError) throw companiesError;

        // 2. Delete details for the target year
        const { error: detailsError } = await supabase
            .from('detalhes')
            .delete()
            .eq('ano', year);

        if (detailsError) console.error("Error deleting details:", detailsError);

        // 3. Delete logs for the target year
        const { error: logsError } = await supabase
            .from('registros')
            .delete()
            .eq('ano', year);

        if (logsError) console.error("Error deleting logs:", logsError);

        // 4. Delete comments for the target year
        const { error: commentsError } = await supabase
            .from('comentarios')
            .delete()
            .eq('ano', year);

        if (commentsError) console.error("Error deleting comments:", commentsError);

        await logChangeSupabase(`Ciclo anual excluído: ${year}`, userName);

    } catch (error) {
        console.error("Error deleting year cycle:", error);
        throw error;
    }
};

export const verifySecurityPasswordSupabase = async (password: string): Promise<boolean> => {
    if (!supabase) return false;
    try {
        const { data, error } = await supabase
            .from('configuracoes_sistema')
            .select('valor')
            .eq('chave', 'security_password')
            .single();
            
        if (error || !data) {
            console.error("Security password not found in database. Please ensure 'configuracoes_sistema' table exists.");
            return false;
        }
        
        // Case-sensitive comparison
        return data.valor === password;
    } catch (error) {
        console.error("Error verifying security password:", error);
        return false;
    }
};

// --- TAX REGIMES ---

export const fetchTaxRegimesSupabase = async (): Promise<TaxRegime[]> => {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from('tax_regimes')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        return (data || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            created_at: r.created_at,
            created_by: r.created_by
        }));
    } catch (error) {
        console.error("Error fetching tax regimes:", error);
        return [];
    }
};

export const createTaxRegimeSupabase = async (name: string, userName: string): Promise<TaxRegime | null> => {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from('tax_regimes')
            .insert({ name, created_by: userName })
            .select()
            .single();

        if (error) throw error;
        
        await logChangeSupabase(`Novo regime tributário criado: ${name}`, userName);
        
        return {
            id: data.id,
            name: data.name,
            created_at: data.created_at,
            created_by: data.created_by
        };
    } catch (error) {
        console.error("Error creating tax regime:", error);
        throw error;
    }
};

export const deleteTaxRegimeSupabase = async (id: string, name: string, userName: string): Promise<void> => {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('tax_regimes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        await logChangeSupabase(`Regime tributário excluído: ${name}`, userName);
    } catch (error) {
        console.error("Error deleting tax regime:", error);
        throw error;
    }
};
