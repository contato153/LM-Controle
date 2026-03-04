

export const SHEET_CONFIG = {
  // ID extraído do link fornecido: https://docs.google.com/spreadsheets/d/13WtzQH7HgtL7pCjJU43TpqaiO4DqTCbAiMsZhYYrrBE/edit
  SPREADSHEET_ID: '13WtzQH7HgtL7pCjJU43TpqaiO4DqTCbAiMsZhYYrrBE',
  
  // Abas e Intervalos
  SHEET_NAME_DEMANDAS: 'Demandas',
  // ALTERADO: Aumentando o range de leitura até AB para pegar a Data de Vencimento
  RANGE_DEMANDAS: 'Demandas!A2:AB', 
  
  SHEET_NAME_COLABORADORES: 'Colaboradores',
  RANGE_COLABORADORES: 'Colaboradores!A2:E', // Lê ID, Nome e tenta capturar Departamento mesmo se houver colunas extras

  // Nova aba de LOG
  SHEET_NAME_LOG: 'LOG',
  RANGE_LOG: 'LOG!A:D', // Data/Hora (A), Descrição (B), Nome Colaborador (C), ID Tarefa (D)

  // Nova aba de Comentários (Chat)
  SHEET_NAME_COMENTARIOS: 'Comentarios',
  RANGE_COMENTARIOS: 'Comentarios!A:D', // ID Tarefa (A), Data/Hora (B), Autor (C), Mensagem (D)

  // Nova aba de Detalhes (Side Peek)
  SHEET_NAME_DETALHES: 'Detalhes',
  RANGE_DETALHES: 'Detalhes!A:D', // ID (A), Nome (B), Descrição (C), Checklist JSON (D)

  // Nova aba de Configurações
  SHEET_NAME_CONFIG: 'Configurações',
  RANGE_CONFIG: 'Configurações!A:C', // ID Usuario (A), Nome (B), JSON Config (C)

  // Nova aba de Notificações
  SHEET_NAME_NOTIF: 'Notificacao',
  RANGE_NOTIF: 'Notificacao!A:G' // ID (A), Destinatario (B), Remetente (C), TaskID (D), Msg (E), IsRead (F), Timestamp (G)
};