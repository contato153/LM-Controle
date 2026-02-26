

// Configuration for interacting with the Google Sheets workbook.  The
// values above are perfectly safe to commit (they describe only the public
// spreadsheet structure), but they’re often overridden via environment
// variables when running in different contexts (local vs staging vs prod).
//
// Vercel’s build environment will read `VITE_...` vars automatically, so we
// provide sensible defaults here.  If you prefer, you can completely replace
// this file in your own checkout with hard‑coded values; it’s no longer
// ignored.

export const SHEET_CONFIG = {
  SPREADSHEET_ID:
    import.meta.env.VITE_SHEET_SPREADSHEET_ID ||
    '13WtzQH7HgtL7pCjJU43TpqaiO4DqTCbAiMsZhYYrrBE',

  SHEET_NAME_DEMANDAS:
    import.meta.env.VITE_SHEET_NAME_DEMANDAS || 'Demandas',
  RANGE_DEMANDAS:
    import.meta.env.VITE_SHEET_RANGE_DEMANDAS || 'Demandas!A2:AB',

  SHEET_NAME_COLABORADORES:
    import.meta.env.VITE_SHEET_NAME_COLABORADORES || 'Colaboradores',
  RANGE_COLABORADORES:
    import.meta.env.VITE_SHEET_RANGE_COLABORADORES || 'Colaboradores!A2:E',

  SHEET_NAME_LOG:
    import.meta.env.VITE_SHEET_NAME_LOG || 'LOG',
  RANGE_LOG:
    import.meta.env.VITE_SHEET_RANGE_LOG || 'LOG!A:D',

  SHEET_NAME_COMENTARIOS:
    import.meta.env.VITE_SHEET_NAME_COMENTARIOS || 'Comentarios',
  RANGE_COMENTARIOS:
    import.meta.env.VITE_SHEET_RANGE_COMENTARIOS || 'Comentarios!A:D',

  SHEET_NAME_DETALHES:
    import.meta.env.VITE_SHEET_NAME_DETALHES || 'Detalhes',
  RANGE_DETALHES:
    import.meta.env.VITE_SHEET_RANGE_DETALHES || 'Detalhes!A:D',

  SHEET_NAME_CONFIG:
    import.meta.env.VITE_SHEET_NAME_CONFIG || 'Configurações',
  RANGE_CONFIG:
    import.meta.env.VITE_SHEET_RANGE_CONFIG || 'Configurações!A:C',

  SHEET_NAME_NOTIF:
    import.meta.env.VITE_SHEET_NAME_NOTIF || 'Notificacao',
  RANGE_NOTIF:
    import.meta.env.VITE_SHEET_RANGE_NOTIF || 'Notificacao!A:G'
};