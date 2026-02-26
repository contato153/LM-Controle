import { fetchAllDataBatch, getAccessToken, fetchWithRetry } from './sheetService';
import { supabase } from './supabaseClient';
import { SHEET_CONFIG } from '../config/sheetConfig';
import { ADMIN_IDS } from '../config/app';

export interface MigrationOptions {
    tasks: boolean;
    collaborators: boolean;
    comments: boolean;
    logs: boolean;
    details: boolean;
    notifications: boolean;
    userConfig: boolean;
}

export const migrateFromSheetsToSupabase = async (
    onProgress: (msg: string) => void,
    options: MigrationOptions = {
        tasks: true,
        collaborators: true,
        comments: true,
        logs: true,
        details: true,
        notifications: true,
        userConfig: true
    }
): Promise<void> => {
    if (!supabase) {
        onProgress("Erro: Cliente Supabase não inicializado. Verifique as chaves no .env.");
        return;
    }
    try {
        onProgress("Iniciando migração... Buscando dados da planilha...");
        
        // 1. Fetch all data from Sheets
        const { tasks, collaborators, logs, allComments } = await fetchAllDataBatch();
        const token = await getAccessToken();
        
        if (!tasks.length && !collaborators.length) {
            onProgress("Nenhum dado encontrado na planilha ou erro de conexão.");
            return;
        }

        onProgress(`Encontrados: ${tasks.length} empresas, ${collaborators.length} colaboradores.`);
        const chunkSize = 100;

        // 2. Migrate Collaborators
        if (options.collaborators) {
            onProgress("Migrando colaboradores...");
            const collabData = collaborators.map(c => ({
                codigo_externo: c.id,
                nome: c.name,
                departamento: c.department,
                role: ADMIN_IDS.includes(c.id) ? 'admin' : 'user'
            }));

            const { error: collabError } = await supabase
                .from('colaboradores')
                .upsert(collabData, { onConflict: 'codigo_externo' });

            if (collabError) throw new Error(`Erro ao migrar colaboradores: ${collabError.message}`);
        }

        // 3. Migrate Companies (Tasks)
        if (options.tasks) {
            onProgress("Migrando empresas (pode demorar)...");
            
            for (let i = 0; i < tasks.length; i += chunkSize) {
                const chunk = tasks.slice(i, i + chunkSize);
                const taskData = chunk.map(t => ({
                    codigo_externo: t.id,
                    nome: t.name,
                    cnpj: t.cnpj,
                    regime: t.regime,
                    resp_fiscal: t.respFiscal,
                    status_fiscal: t.statusFiscal,
                    resp_contabil: t.respContabil,
                    status_contabil: t.statusContabil,
                    resp_balanco: t.respBalanco,
                    status_balanco: t.statusBalanco,
                    resp_lucro: t.respLucro,
                    status_lucro: t.statusLucro,
                    resp_reinf: t.respReinf,
                    status_reinf: t.statusReinf,
                    resp_ecd: t.respECD,
                    status_ecd: t.statusECD,
                    resp_ecf: t.respECF,
                    status_ecf: t.statusECF,
                    prioridade: t.prioridade,
                    ultimo_editor: t.lastEditor,
                    data_vencimento: t.dueDate,
                    ano: '2026'
                }));

                const { error: taskError } = await supabase
                    .from('empresas')
                    .upsert(taskData, { onConflict: 'codigo_externo,ano' });

                if (taskError) throw new Error(`Erro ao migrar empresas (lote ${i}): ${taskError.message}`);
                onProgress(`Migrado lote ${i + 1}-${Math.min(i + chunkSize, tasks.length)} de ${tasks.length}`);
            }
        }

        // 4. Migrate Comments
        if (options.comments && allComments.length > 0) {
            onProgress("Migrando comentários...");
            // Pula apenas a primeira linha (Menu). Dados começam na linha 2.
            const commentRows = allComments.slice(1); 
            const commentData = commentRows.map(c => ({
                empresa_id: c[0],
                created_at: parseSheetDate(c[1]), 
                autor: c[2],
                texto: c[3]
            })).filter(c => c.empresa_id && c.texto);

            for (let i = 0; i < commentData.length; i += chunkSize) {
                const chunk = commentData.slice(i, i + chunkSize);
                const { error: commentError } = await supabase
                    .from('comentarios')
                    .insert(chunk);
                
                if (commentError) console.warn(`Erro parcial comentários: ${commentError.message}`);
            }
        }

        // 5. Migrate Logs (Registros)
        if (options.logs && logs.length > 0) {
            onProgress("Migrando registros de log...");
            // Pula apenas a primeira linha (Menu). Dados começam na linha 2.
            const logRows = logs.slice(1);
            const logData = logRows.map(l => ({
                created_at: parseSheetDate(l[0]),
                descricao: l[1],
                usuario: l[2],
                empresa_id: l[3] || null
            })).filter(l => l.descricao && l.usuario);

            for (let i = 0; i < logData.length; i += chunkSize) {
                const chunk = logData.slice(i, i + chunkSize);
                const { error: logError } = await supabase
                    .from('registros')
                    .insert(chunk);
                
                if (logError) console.warn(`Erro parcial registros: ${logError.message}`);
            }
        }

        // 6. Migrate Detalhes
        if (options.details) {
            onProgress("Migrando detalhes e checklists...");
            const detailsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${SHEET_CONFIG.RANGE_DETALHES}`;
            const detailsResponse = await fetchWithRetry(detailsUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const detailsData = await detailsResponse.json();
            const detailsRows = detailsData.values || [];
            
            // Pula apenas a primeira linha (Menu). Dados começam na linha 2.
            const dataRows = detailsRows.slice(1);

            const detailData = dataRows.map((row: any) => {
                if (!row[0]) return null;
                let checklist = [];
                try {
                    checklist = row[3] ? JSON.parse(row[3]) : [];
                } catch (e) {
                    checklist = [];
                }
                return {
                    id: row[0],
                    nome: row[1] || '',
                    descricao: row[2] || '',
                    checklist: checklist,
                    ano: '2026'
                };
            }).filter(Boolean);

            if (detailData.length > 0) {
                const { error: detailError } = await supabase
                    .from('detalhes')
                    .upsert(detailData, { onConflict: 'id,ano' });
                if (detailError) console.warn(`Erro migrar detalhes: ${detailError.message}`);
            }
        }

        // 7. Migrate Notificações
        if (options.notifications) {
            onProgress("Migrando notificações...");
            const notifUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${SHEET_CONFIG.RANGE_NOTIF}`;
            const notifResponse = await fetchWithRetry(notifUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const notifData = await notifResponse.json();
            const notifRows = notifData.values || [];
            
            // Pula apenas a primeira linha (Menu). Dados começam na linha 2.
            const dataRows = notifRows.slice(1);

            const notificationData = dataRows.map((row: any) => {
                if (!row[0]) return null;
                return {
                    id: row[0],
                    destinatario: row[1],
                    remetente: row[2],
                    empresa_id: row[3],
                    mensagem: row[4],
                    lida: row[5] === 'TRUE',
                    timestamp: row[6]
                };
            }).filter(Boolean);

            if (notificationData.length > 0) {
                const { error: notifError } = await supabase
                    .from('notificacoes')
                    .upsert(notificationData, { onConflict: 'id' });
                if (notifError) console.warn(`Erro migrar notificações: ${notifError.message}`);
            }
        }

        // 8. Migrar Configurações de Usuário
        if (options.userConfig) {
            onProgress("Migrando configurações de usuário...");
            const configUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${SHEET_CONFIG.RANGE_CONFIG}`;
            const configResponse = await fetchWithRetry(configUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const configData = await configResponse.json();
            const configRows = configData.values || [];
            
            // Pula apenas a primeira linha (Menu). Dados começam na linha 2.
            const dataRows = configRows.slice(1);

            const userConfigData = dataRows.map((row: any) => {
                if (!row[0]) return null;
                let config = {};
                try {
                    config = row[2] ? JSON.parse(row[2]) : {};
                } catch (e) {
                    config = {};
                }
                return {
                    user_id: row[0],
                    nome: row[1] || '',
                    configuracao: config
                };
            }).filter(Boolean);

            if (userConfigData.length > 0) {
                const { error: configError } = await supabase
                    .from('configuracoes_usuario')
                    .upsert(userConfigData, { onConflict: 'user_id' });
                if (configError) console.warn(`Erro migrar configurações: ${configError.message}`);
            }
        }

        onProgress("Migração concluída com sucesso!");

    } catch (error: any) {
        console.error("Migration Error:", error);
        onProgress(`Erro fatal na migração: ${error.message}`);
        throw error;
    }
};

// Helper to parse "DD/MM/YYYY HH:mm:ss" to ISO
const parseSheetDate = (dateStr: string): string => {
    try {
        if (!dateStr) return new Date().toISOString();
        const [datePart, timePart] = dateStr.includes(',') ? dateStr.split(', ') : dateStr.split(' ');
        if (!datePart) return new Date().toISOString();
        
        const [day, month, year] = datePart.split('/');
        let hour = 0, minute = 0, second = 0;
        
        if (timePart) {
            const parts = timePart.split(':');
            hour = parseInt(parts[0] || '0');
            minute = parseInt(parts[1] || '0');
            second = parseInt(parts[2] || '0');
        }
        
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour, minute, second).toISOString();
    } catch (e) {
        return new Date().toISOString();
    }
};
