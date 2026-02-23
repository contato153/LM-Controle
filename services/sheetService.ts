

import { CompanyTask, Collaborator, TaskDetail, ChecklistItem, UserSettings, TaskComment, AppNotification } from '../types';
import { GOOGLE_CREDENTIALS } from '../config/credentials';
import { SHEET_CONFIG } from '../config/sheetConfig';

// Mapeamento das Colunas da Planilha (0-based index) ATUALIZADO
// INSERÇÃO: K e L (Balanço). Tudo após J foi deslocado +2.
// DATA DE VENCIMENTO: AB (Index 27)
const COL_INDEX = {
  ID: 0,            // A
  NAME: 1,          // B
  CNPJ: 2,          // C
  REGIME: 3,        // D
  // E (4) - Separador
  RESP_FISCAL: 5,   // F
  STATUS_FISCAL: 6, // G
  // H (7) - Separador
  RESP_CONTABIL: 8, // I (Balancete)
  STATUS_CONTABIL: 9, // J (Balancete)
  
  RESP_BALANCO: 10,  // K (NOVO)
  STATUS_BALANCO: 11, // L (NOVO)
  
  // M (12) - Separador (Era K/10)
  RESP_LUCRO: 13,   // N (Era L/11)
  STATUS_LUCRO: 14, // O (Era M/12)
  RESP_REINF: 15,   // P (Era N/13)
  STATUS_REINF: 16, // Q (Era O/14)
  
  // R (17) - Separador
  RESP_ECD: 18,     // S (Era Q/16)
  STATUS_ECD: 19,   // T (Era R/17)
  RESP_ECF: 20,     // U (Era S/18)
  STATUS_ECF: 21,   // V (Era T/19)
  
  // W (22) - Separador
  PRIORIDADE: 23,   // X (Era V/21)
  LAST_EDITOR: 24,  // Y (Era W/22)
  
  // Z (25) - Separador
  // AA (26) - Separador
  DUE_DATE: 27      // AB (Nova coluna para Data de Vencimento)
};

// --- AUTHENTICATION HELPERS (REAL JWT FLOW) ---

// Converte string Base64Url para ArrayBuffer
function str2ab(str: string) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

// Codifica para Base64Url (formato JWT)
function base64UrlEncode(str: string) {
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Importa a chave privada PEM para uso na Web Crypto API
async function importPrivateKey(pem: string) {
    // Remove cabeçalhos, rodapés e quebras de linha
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = pem
        .replace(pemHeader, "")
        .replace(pemFooter, "")
        .replace(/\n/g, "")
        .replace(/\s/g, "");
    
    const binaryDerString = atob(pemContents);
    const binaryDer = str2ab(binaryDerString);

    return window.crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: { name: "SHA-256" },
        },
        false,
        ["sign"]
    );
}

// Cria e assina o JWT
async function createJWT() {
    const header = {
        alg: "RS256",
        typ: "JWT"
    };

    const now = Math.floor(Date.now() / 1000);
    const oneHour = 3600;

    const claimSet = {
        iss: GOOGLE_CREDENTIALS.client_email,
        scope: "https://www.googleapis.com/auth/spreadsheets",
        aud: GOOGLE_CREDENTIALS.token_uri,
        exp: now + oneHour,
        iat: now
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
    const unsignedToken = `${encodedHeader}.${encodedClaimSet}`;

    const privateKey = await importPrivateKey(GOOGLE_CREDENTIALS.private_key);
    
    const signatureBuffer = await window.crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        privateKey,
        str2ab(unsignedToken)
    );

    // Converte assinatura buffer para string binária para base64
    let binary = '';
    const bytes = new Uint8Array(signatureBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    
    const signature = base64UrlEncode(binary);
    return `${unsignedToken}.${signature}`;
}

let cachedToken: string | null = null;
let tokenExpiry: number = 0;
let tokenRequestPromise: Promise<string> | null = null;

// Obtém o token de acesso real trocando o JWT (Singleton Promise pattern)
async function getAccessToken() {
    // Se temos token válido, usa ele
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    // Se já existe uma requisição em andamento, retorna a promise dela
    if (tokenRequestPromise) {
        return tokenRequestPromise;
    }

    // Cria nova requisição
    tokenRequestPromise = (async () => {
        try {
            console.log("[Auth] Gerando novo token de acesso...");
            const jwt = await createJWT();
            
            const response = await fetch(GOOGLE_CREDENTIALS.token_uri, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    assertion: jwt
                }),
                cache: 'no-store'
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(`Falha na autenticação: ${err.error_description || err.error}`);
            }

            const data = await response.json();
            cachedToken = data.access_token;
            tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Expira 1 min antes do real
            console.log("[Auth] Token gerado com sucesso!");
            return cachedToken as string;

        } catch (error) {
            console.error("[Auth Error]", error);
            throw error;
        } finally {
            tokenRequestPromise = null;
        }
    })();

    return tokenRequestPromise;
}

// --- API HELPERS ---

// Helper com Retry Exponencial para lidar com erro 429
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 2000): Promise<Response> {
    let lastError: any;
    
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            
            // Sucesso
            if (res.ok) return res;

            // Erro de Rate Limit (429) ou Erro de Servidor (5xx)
            if (res.status === 429 || res.status >= 500) {
                console.warn(`[API] Erro ${res.status}. Tentativa ${i + 1} de ${retries}. Aguardando ${delay}ms...`);
                // Se for a última tentativa, retorna a resposta (com erro) para ser tratada pelo chamador
                if (i === retries - 1) return res;
                
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Backoff exponencial
                continue;
            }
            
            // Outros erros (400, 401, 403, 404...) não adianta tentar de novo imediatamente
            return res;

        } catch (err) {
            // Erro de rede (offline, dns, etc)
            console.warn(`[Network] Falha na requisição. Tentativa ${i + 1} de ${retries}.`, err);
            lastError = err;
            if (i === retries - 1) break;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
    throw lastError || new Error(`Falha na requisição após ${retries} tentativas.`);
}

// --- CORE: DATA INTEGRITY HELPER ---

/**
 * Busca o índice real da linha de um item pelo seu ID na coluna A.
 * Isso previne erros caso a planilha tenha sido ordenada ou linhas excluídas
 * externamente após o carregamento inicial dos dados.
 */
async function findRowIndexById(sheetName: string, id: string): Promise<number | null> {
    try {
        const token = await getAccessToken();
        // Busca apenas a coluna A para ser rápido
        // encodeURIComponent é importante para nomes de abas com espaços ou caracteres especiais
        const range = `${encodeURIComponent(sheetName)}!A:A`; 
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${range}`;
        
        const response = await fetchWithRetry(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store'
        });

        if (!response.ok) return null;

        const data = await response.json();
        const values = data.values as string[][];

        if (!values) return null;

        // values[i][0] contém o ID. O índice do array + 1 é a linha do Excel (1-based).
        const index = values.findIndex(row => row[0]?.trim() === id.trim());

        if (index === -1) return null;

        return index + 1; // Retorna 1-based index para uso em ranges A1
    } catch (error) {
        console.error(`[Integrity Check] Erro ao buscar índice para ID ${id} na aba ${sheetName}:`, error);
        return null;
    }
}


// --- API OPERATIONS ---

// --- NEW BATCH FETCH (OPTIMIZED) ---
export const fetchAllDataBatch = async (): Promise<{
    tasks: CompanyTask[],
    collaborators: Collaborator[],
    logs: string[][],
    allComments: string[][]
}> => {
    try {
        const token = await getAccessToken();
        
        // Define ranges in order: 0=Tasks, 1=Collaborators, 2=Logs, 3=Comments
        const ranges = [
            SHEET_CONFIG.RANGE_DEMANDAS,
            SHEET_CONFIG.RANGE_COLABORADORES,
            SHEET_CONFIG.RANGE_LOG,
            SHEET_CONFIG.RANGE_COMENTARIOS
        ];

        // Build URL manually to handle multiple 'ranges' parameters
        const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values:batchGet`;
        const params = new URLSearchParams();
        ranges.forEach(r => params.append('ranges', r));
        
        const url = `${baseUrl}?${params.toString()}`;

        const response = await fetchWithRetry(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store'
        });

        if (!response.ok) {
             throw new Error(`Erro na API Batch: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const valueRanges = data.valueRanges || [];

        // Parse Tasks (Index 0)
        const tasks = valueRanges[0] && valueRanges[0].values 
            ? parseSheetRows(valueRanges[0].values) 
            : [];

        // Parse Collaborators (Index 1)
        const collaborators = valueRanges[1] && valueRanges[1].values 
            ? parseCollaborators(valueRanges[1].values)
            : [];
        
        // Parse Logs (Index 2)
        const logs = valueRanges[2] && valueRanges[2].values 
            ? valueRanges[2].values 
            : [];

        // Parse Comments (Index 3)
        const allComments = valueRanges[3] && valueRanges[3].values
            ? valueRanges[3].values
            : [];

        return { tasks, collaborators, logs, allComments };

    } catch (error) {
        console.error("Erro CRÍTICO no Batch Request:", error);
        return { tasks: [], collaborators: [], logs: [], allComments: [] };
    }
}

export const fetchCollaborators = async (): Promise<Collaborator[]> => {
    try {
        const token = await getAccessToken();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${SHEET_CONFIG.RANGE_COLABORADORES}`;
        
        const response = await fetchWithRetry(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store'
        });

        if (!response.ok) throw new Error(`Erro colaboradores: ${response.status} ${response.statusText}`);

        const data = await response.json();
        return parseCollaborators(data.values);

    } catch (error) {
        console.error("Erro colaboradores:", error);
        return [];
    }
}

// NOVA FUNÇÃO: BUSCAR LOGS PARA DEFINIR EDITOR
export const fetchLogs = async (): Promise<string[][]> => {
    try {
        const token = await getAccessToken();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${SHEET_CONFIG.RANGE_LOG}`;
        
        const response = await fetchWithRetry(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store'
        });

        if (!response.ok) return [];

        const data = await response.json();
        return data.values || [];
    } catch (e) {
        console.error("Erro fetchLogs:", e);
        return [];
    }
}

// --- PARSERS ---

// Extracted Collaborator Parser
const parseCollaborators = (rows: any[]): Collaborator[] => {
    if (!rows) return [];
    return rows.map((row: any[]) => {
        const id = row[0] || '';
        const name = row[1] || '';
        
        // Tentativa de identificar o departamento corretamente.
        let department = row[2] ? row[2].trim() : '';
        if ((!department || department.includes('@')) && row[3]) {
            department = row[3].trim();
        }

        return {
            id,
            name,
            department
        };
    }).filter((c: Collaborator) => c.name);
}

// Converte as linhas da API
const parseSheetRows = (rows: any[]): CompanyTask[] => {
  if (!rows) return [];
  // Importante: rowIndex começa em 2 porque range é A2. 
  // O índice 0 do array rows corresponde à linha 2 do Excel.
  return rows.map((row, index) => ({
    id: row[COL_INDEX.ID] || '',
    name: row[COL_INDEX.NAME] || '',
    cnpj: row[COL_INDEX.CNPJ] || '',
    regime: row[COL_INDEX.REGIME] || '',
    
    respFiscal: row[COL_INDEX.RESP_FISCAL] || '',
    statusFiscal: row[COL_INDEX.STATUS_FISCAL] || 'EM ABERTO',
    
    // Contábil = Balancete
    respContabil: row[COL_INDEX.RESP_CONTABIL] || '',
    statusContabil: row[COL_INDEX.STATUS_CONTABIL] || 'EM ABERTO',
    
    // Novo: Balanço
    respBalanco: row[COL_INDEX.RESP_BALANCO] || '',
    statusBalanco: row[COL_INDEX.STATUS_BALANCO] || 'EM ABERTO',
    
    respLucro: row[COL_INDEX.RESP_LUCRO] || '',
    statusLucro: row[COL_INDEX.STATUS_LUCRO] || 'PENDENTE',
    
    respReinf: row[COL_INDEX.RESP_REINF] || '',
    statusReinf: row[COL_INDEX.STATUS_REINF] || 'PENDENTE',
    
    respECD: row[COL_INDEX.RESP_ECD] || '',
    statusECD: row[COL_INDEX.STATUS_ECD] || 'PENDENTE',
    
    statusECF: row[COL_INDEX.STATUS_ECF] || 'PENDENTE',
    respECF: row[COL_INDEX.RESP_ECF] || '',
    
    prioridade: row[COL_INDEX.PRIORIDADE] || '', // Changed default to empty string to allow auto-calc
    lastEditor: row[COL_INDEX.LAST_EDITOR] || '',
    
    // Coluna AB (27)
    dueDate: row[COL_INDEX.DUE_DATE] || '',

    rowIndex: index + 2 
  }))
  .filter(t => t.id && t.id.trim() !== '' && t.id.toLowerCase() !== 'código' && t.name.toLowerCase() !== 'nome');
};

// ATUALIZAÇÃO DA PLANILHA (REAL) - VERSÃO ROBUSTA (BatchUpdate com Lookup)
export const updateTaskStatus = async (
  task: CompanyTask, 
  field: keyof CompanyTask, 
  newValue: string,
  editorInfo?: string // Nome + Data Formatada
): Promise<void> => {
  
  // Mapeia o campo para a Letra da Coluna (Atualizado para o novo layout com inserção de K e L)
  let colLetter = '';
  switch(field) {
    case 'respFiscal': colLetter = 'F'; break;
    case 'statusFiscal': colLetter = 'G'; break;
    
    case 'respContabil': colLetter = 'I'; break; // Balancete
    case 'statusContabil': colLetter = 'J'; break; // Balancete
    
    case 'respBalanco': colLetter = 'K'; break; // Balanço (NOVO)
    case 'statusBalanco': colLetter = 'L'; break; // Balanço (NOVO)
    
    case 'respLucro': colLetter = 'N'; break; // Deslocado (Era L)
    case 'statusLucro': colLetter = 'O'; break; // Deslocado (Era M)
    
    case 'respReinf': colLetter = 'P'; break; // Deslocado (Era N)
    case 'statusReinf': colLetter = 'Q'; break; // Deslocado (Era O)
    
    case 'respECD': colLetter = 'S'; break; // Deslocado (Era Q)
    case 'statusECD': colLetter = 'T'; break; // Deslocado (Era R)
    
    case 'respECF': colLetter = 'U'; break; // Deslocado (Era S)
    case 'statusECF': colLetter = 'V'; break; // Deslocado (Era T)
    
    case 'prioridade': colLetter = 'X'; break; // Deslocado (Era V)
    case 'dueDate': colLetter = 'AB'; break; // Nova Coluna
    // lastEditor será Y (Era W)
    default: break; 
  }

  try {
    // 1. Busca Segura: Encontrar a linha atual da tarefa na planilha
    // Ignoramos task.rowIndex pois a planilha pode ter sido ordenada externamente.
    const realRowIndex = await findRowIndexById(SHEET_CONFIG.SHEET_NAME_DEMANDAS, task.id);
    
    if (!realRowIndex) {
        throw new Error(`Erro de Integridade: A empresa ID ${task.id} não foi encontrada na planilha 'Demandas'. Atualize a página.`);
    }

    const token = await getAccessToken();
    const dataToUpdate = [];

    // 2. Adiciona o campo principal se houver colLetter válida
    if (colLetter) {
        dataToUpdate.push({
            range: `${SHEET_CONFIG.SHEET_NAME_DEMANDAS}!${colLetter}${realRowIndex}`,
            values: [[newValue]]
        });
    }

    // 3. Adiciona o editor se fornecido (Agora Coluna Y)
    if (editorInfo) {
        dataToUpdate.push({
            range: `${SHEET_CONFIG.SHEET_NAME_DEMANDAS}!Y${realRowIndex}`,
            values: [[editorInfo]]
        });
    }

    if (dataToUpdate.length === 0) return;

    // Usa batchUpdate para garantir que ambas as atualizações ocorram
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values:batchUpdate`;
    
    const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            valueInputOption: "USER_ENTERED",
            data: dataToUpdate
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Erro BatchUpdate: ${JSON.stringify(err)}`);
    }

    console.log(`Sucesso: Dados da tarefa ${task.id} atualizados na linha ${realRowIndex}.`);

  } catch (error) {
    console.error("Falha na atualização:", error);
    alert("Erro ao salvar alterações. Verifique sua conexão ou se a empresa ainda existe na planilha.");
  }
};

// NOVA FUNÇÃO: LOG NA ABA 'LOG' - ATUALIZADA PARA INCLUIR TASK ID
export const logChange = async (description: string, userName: string, taskId?: string): Promise<void> => {
    try {
        const token = await getAccessToken();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${SHEET_CONFIG.RANGE_LOG}:append?valueInputOption=USER_ENTERED`;
        
        const timestamp = new Date().toLocaleString('pt-BR');
        
        // Colunas: Data/Hora (A), Descrição (B), Nome (C), Task ID (D)
        const values = [[timestamp, description, userName, taskId || '']];

        const response = await fetchWithRetry(url, {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values })
        });

        if (!response.ok) {
            console.error("Erro ao salvar LOG");
        } else {
            console.log("LOG salvo com sucesso.");
        }
    } catch (e) {
        console.error("Falha ao registrar log:", e);
    }
};

// --- FUNÇÕES DE COMENTÁRIOS (NOVA ABA) ---

export const fetchComments = async (taskId: string): Promise<TaskComment[]> => {
    try {
        const token = await getAccessToken();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${SHEET_CONFIG.RANGE_COMENTARIOS}`;
        
        const response = await fetchWithRetry(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store'
        });

        if (!response.ok) return [];

        const data = await response.json();
        const rows = data.values || [];
        
        // Filtrar linhas que tenham o ID da task na coluna A (index 0)
        // Colunas: ID Tarefa (A/0), Data/Hora (B/1), Autor (C/2), Mensagem (D/3)
        return rows
            .map((row: string[], index: number) => ({
                id: `${taskId}-${index}`,
                timestamp: row[1] || '',
                author: row[2] || 'Anônimo',
                text: row[3] || '',
                rowIndex: index + 1, // API 1-based index (considering no header or A1 notation)
                originalTaskId: row[0]
            }))
            .filter((c: any) => c.originalTaskId === taskId && c.text && c.text.trim() !== '') // IMPORTANTE: Filtra linhas limpas/vazias
            .map(({ originalTaskId, ...rest }: any) => rest);
    } catch (e) {
        console.error("Erro fetchComments:", e);
        return [];
    }
};

export const saveComment = async (taskId: string, author: string, message: string): Promise<void> => {
    try {
        const token = await getAccessToken();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${SHEET_CONFIG.RANGE_COMENTARIOS}:append?valueInputOption=USER_ENTERED`;
        
        const timestamp = new Date().toLocaleString('pt-BR');
        
        // Colunas: ID Tarefa (A), Data/Hora (B), Autor (C), Mensagem (D)
        const values = [[taskId, timestamp, author, message]];

        await fetchWithRetry(url, {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values })
        });
        
    } catch (e) {
        console.error("Falha ao salvar comentário:", e);
        throw e;
    }
};

export const updateComment = async (rowIndex: number, newMessage: string): Promise<void> => {
    try {
        const token = await getAccessToken();
        // Mensagem está na coluna D (índice 4 no Sheets -> A,B,C,D)
        const range = `${SHEET_CONFIG.SHEET_NAME_COMENTARIOS}!D${rowIndex}`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;

        await fetchWithRetry(url, {
            method: 'PUT',
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [[newMessage]]
            })
        });
    } catch (e) {
        console.error("Erro ao atualizar comentário:", e);
        throw e;
    }
};

export const deleteComment = async (rowIndex: number): Promise<void> => {
    try {
        const token = await getAccessToken();
        // IMPORTANTE: REVERSÃO PARA 'CLEAR' EM VEZ DE DELETAR LINHA
        // Limpa o conteúdo da linha (A..D)
        const range = `${SHEET_CONFIG.SHEET_NAME_COMENTARIOS}!A${rowIndex}:D${rowIndex}`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${range}:clear`;

        // O endpoint :clear requer um POST e um corpo JSON vazio.
        await fetchWithRetry(url, {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
    } catch (e) {
        console.error("Erro ao limpar comentário:", e);
        throw e;
    }
};

// --- FUNÇÕES DE CONFIGURAÇÃO DE USUÁRIO (NOVA) ---

export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
    try {
        const token = await getAccessToken();
        // IMPORTANTE: encodeURIComponent no range para garantir que acentos (Configurações) passem na URL
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_CONFIG.RANGE_CONFIG)}`;
        
        const response = await fetchWithRetry(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store'
        });

        if (!response.ok) return null;

        const data = await response.json();
        const rows = data.values || [];
        
        // Col A = User ID, Col B = Nome, Col C = JSON
        const row = rows.find((r: string[]) => r[0] === userId);
        
        // Agora o JSON está na coluna C (índice 2)
        if (!row || !row[2]) return null;

        try {
            return JSON.parse(row[2]) as UserSettings;
        } catch (e) {
            console.error("Erro ao parsear JSON de configurações", e);
            return null;
        }
    } catch (error) {
        console.error("Erro ao buscar configurações:", error);
        return null;
    }
};

export const saveUserSettings = async (userId: string, userName: string, settings: UserSettings): Promise<void> => {
    try {
        const token = await getAccessToken();
        
        // Verifica se usuário já tem linha
        // IMPORTANTE: encodeURIComponent no range
        const rangeCheck = `${SHEET_CONFIG.SHEET_NAME_CONFIG}!A:A`;
        const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(rangeCheck)}`;
        
        const checkResponse = await fetchWithRetry(checkUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const checkData = await checkResponse.json();
        const ids = checkData.values ? checkData.values.map((v: string[]) => v[0]) : [];
        const rowIndex = ids.indexOf(userId);

        const settingsJson = JSON.stringify(settings);

        if (rowIndex !== -1) {
            // Atualizar linha existente
            // Atualiza Coluna B (Nome) e Coluna C (JSON)
            // A API é 1-based, então rowIndex + 1
            const range = `${SHEET_CONFIG.SHEET_NAME_CONFIG}!B${rowIndex + 1}:C${rowIndex + 1}`;
            const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
            
            await fetchWithRetry(updateUrl, {
                method: 'PUT',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: [[userName, settingsJson]]
                })
            });
        } else {
            // Criar nova linha (Append)
            // Escreve A=ID, B=Nome, C=JSON
            const rangeAppend = `${SHEET_CONFIG.SHEET_NAME_CONFIG}!A:C`;
            const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(rangeAppend)}:append?valueInputOption=USER_ENTERED`;
            
            await fetchWithRetry(appendUrl, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: [[userId, userName, settingsJson]]
                })
            });
        }
        console.log("Configurações salvas.");

    } catch (error) {
        console.error("Erro ao salvar configurações:", error);
    }
};

// --- FUNÇÕES DE DETALHES (SIDE PEEK) ---

export const fetchTaskDetail = async (taskId: string): Promise<TaskDetail | null> => {
    try {
        const token = await getAccessToken();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${SHEET_CONFIG.RANGE_DETALHES}`;
        
        const response = await fetchWithRetry(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store'
        });

        if (!response.ok) return null;

        const data = await response.json();
        const rows = data.values || [];
        
        // Procura a linha com o ID correspondente
        const row = rows.find((r: string[]) => r[0] === taskId);

        if (!row) return null;

        // Estrutura Nova: A=ID, B=Nome, C=Descrição, D=Checklist
        const name = row[1] || '';
        const description = row[2] || '';
        let checklist: ChecklistItem[] = [];

        if (row[3]) {
            try {
                checklist = JSON.parse(row[3]);
            } catch (e) {
                console.warn("Erro ao parsear checklist JSON", e);
                checklist = [];
            }
        }

        return { id: taskId, name, description, checklist };

    } catch (error) {
        console.error("Erro ao buscar detalhes:", error);
        return null;
    }
};

export const saveTaskDetail = async (detail: TaskDetail): Promise<void> => {
    try {
        const token = await getAccessToken();
        
        // Lookup dinâmico: encontra a linha baseada no ID (Coluna A)
        // Isso é seguro contra reordenação
        const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${SHEET_CONFIG.SHEET_NAME_DETALHES}!A:A`;
        const checkResponse = await fetchWithRetry(checkUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const checkData = await checkResponse.json();
        const ids = checkData.values ? checkData.values.map((v: string[]) => v[0]) : [];
        const rowIndex = ids.indexOf(detail.id);

        const checklistJson = JSON.stringify(detail.checklist);
        // Garante que o nome seja string (pode vir undefined se não carregar a task)
        const companyName = detail.name || ''; 

        if (rowIndex !== -1) {
            // Atualizar linha existente (RowIndex + 1 pois API é 1-based)
            // Atualiza Colunas B, C e D
            const range = `${SHEET_CONFIG.SHEET_NAME_DETALHES}!B${rowIndex + 1}:D${rowIndex + 1}`;
            const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;
            
            await fetchWithRetry(updateUrl, {
                method: 'PUT',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: [[companyName, detail.description, checklistJson]]
                })
            });
        } else {
            // Criar nova linha (Append)
            // Escreve ID, Nome, Descrição, Checklist
            const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${SHEET_CONFIG.SHEET_NAME_DETALHES}!A:D:append?valueInputOption=USER_ENTERED`;
            
            await fetchWithRetry(appendUrl, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: [[detail.id, companyName, detail.description, checklistJson]]
                })
            });
        }
        console.log("Detalhes salvos com sucesso.");

    } catch (error) {
        console.error("Erro ao salvar detalhes:", error);
    }
};

// --- FUNÇÕES DE NOTIFICAÇÕES (NOVA ABA 'Notificacao') ---

export const fetchNotifications = async (recipientName: string): Promise<AppNotification[]> => {
    try {
        const token = await getAccessToken();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${SHEET_CONFIG.RANGE_NOTIF}`;
        
        const response = await fetchWithRetry(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store'
        });

        if (!response.ok) return [];

        const data = await response.json();
        const rows = data.values || [];
        
        // Estrutura: A=ID, B=Recipient, C=Sender, D=TaskID, E=Msg, F=IsRead, G=Timestamp
        return rows
            .map((row: string[], index: number) => ({
                id: row[0],
                recipient: row[1],
                sender: row[2],
                taskId: row[3],
                message: row[4],
                isRead: row[5] === 'TRUE',
                timestamp: row[6],
                rowIndex: index + 1 // +1 pois Sheet é 1-based
            }))
            .filter((n: AppNotification) => n.recipient === recipientName);

    } catch (e) {
        console.error("Erro fetchNotifications:", e);
        return [];
    }
};

export const sendNotification = async (notification: Omit<AppNotification, 'rowIndex'>): Promise<void> => {
    try {
        const token = await getAccessToken();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${SHEET_CONFIG.RANGE_NOTIF}:append?valueInputOption=USER_ENTERED`;
        
        // Estrutura: A=ID, B=Recipient, C=Sender, D=TaskID, E=Msg, F=IsRead, G=Timestamp
        const values = [[
            notification.id,
            notification.recipient,
            notification.sender,
            notification.taskId,
            notification.message,
            notification.isRead ? 'TRUE' : 'FALSE',
            notification.timestamp
        ]];

        await fetchWithRetry(url, {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values })
        });
        
    } catch (e) {
        console.error("Falha ao enviar notificação:", e);
    }
};

export const markNotificationAsRead = async (rowIndex: number): Promise<void> => {
    try {
        // NOTA: Para ser 100% seguro em abas que podem ser deletadas/ordenadas, 
        // o ideal seria passar o ID da notificação e fazer lookup.
        // No entanto, assumimos aqui que a aba de Notificação é um Log append-only que raramente é reordenado manualmente.
        // Se necessário robustez total, aplicar o mesmo padrão de findRowIndexById aqui, usando Coluna A (ID Notificação).
        
        const token = await getAccessToken();
        // Coluna F é 'IsRead'
        const range = `${SHEET_CONFIG.SHEET_NAME_NOTIF}!F${rowIndex}`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;

        await fetchWithRetry(url, {
            method: 'PUT',
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [['TRUE']]
            })
        });
    } catch (e) {
        console.error("Erro ao marcar notificação como lida:", e);
    }
};
