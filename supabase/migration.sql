-- 1. Tabela de Empresas (Empresas e suas obrigações por ano)
CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_externo TEXT NOT NULL,
    nome TEXT NOT NULL,
    cnpj TEXT,
    regime TEXT,
    
    -- Responsáveis
    resp_fiscal TEXT,
    resp_contabil TEXT,
    resp_balanco TEXT,
    resp_lucro TEXT,
    resp_reinf TEXT,
    resp_ecd TEXT,
    resp_ecf TEXT,
    
    -- Status
    status_fiscal TEXT DEFAULT 'EM ABERTO',
    status_contabil TEXT DEFAULT 'EM ABERTO',
    status_balanco TEXT DEFAULT 'EM ABERTO',
    status_lucro TEXT DEFAULT 'PENDENTE',
    status_reinf TEXT DEFAULT 'PENDENTE',
    status_ecd TEXT DEFAULT 'PENDENTE',
    status_ecf TEXT DEFAULT 'PENDENTE',
    
    prioridade TEXT,
    ultimo_editor TEXT,
    data_vencimento TEXT,
    active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP WITH TIME ZONE,
    ano TEXT DEFAULT '2026',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_externo TEXT UNIQUE NOT NULL, -- Geralmente o e-mail ou ID do Auth
    nome TEXT NOT NULL,
    email TEXT UNIQUE,
    department TEXT,
    active BOOLEAN DEFAULT true,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Registros (Logs de Auditoria)
CREATE TABLE IF NOT EXISTS registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao TEXT NOT NULL,
    usuario TEXT NOT NULL,
    empresa_id TEXT,
    ano TEXT DEFAULT '2026',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Comentários
CREATE TABLE IF NOT EXISTS comentarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id TEXT NOT NULL,
    autor TEXT NOT NULL,
    texto TEXT NOT NULL,
    reactions JSONB DEFAULT '{}'::jsonb,
    parent_id UUID REFERENCES comentarios(id) ON DELETE CASCADE,
    ano TEXT DEFAULT '2026',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Detalhes (Checklists e Descrições extras)
CREATE TABLE IF NOT EXISTS detalhes (
    id TEXT NOT NULL, -- codigo_externo da empresa
    ano TEXT NOT NULL,
    nome TEXT,
    descricao TEXT,
    checklist JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, ano)
);

-- 6. Tabela de Configurações do Usuário (Tema, Densidade, Notificações Lidas)
CREATE TABLE IF NOT EXISTS configuracoes_usuario (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT,
    configuracao JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabela de Notificações
CREATE TABLE IF NOT EXISTS notificacoes (
    id TEXT PRIMARY KEY, -- Pode ser UUID ou string customizada (ex: deadline-ID)
    destinatario TEXT NOT NULL,
    remetente TEXT NOT NULL,
    empresa_id TEXT,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT false,
    timestamp TEXT, -- Formato string pt-BR como usado no app
    ano TEXT DEFAULT '2026',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Índices para Performance
CREATE INDEX IF NOT EXISTS idx_empresas_ano ON empresas(ano);
CREATE INDEX IF NOT EXISTS idx_empresas_codigo_ano ON empresas(codigo_externo, ano);
CREATE INDEX IF NOT EXISTS idx_registros_ano ON registros(ano);
CREATE INDEX IF NOT EXISTS idx_comentarios_empresa ON comentarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario ON notificacoes(destinatario);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);

-- 9. Políticas de RLS (Row Level Security) para Configurações
ALTER TABLE configuracoes_usuario ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem para evitar erros de duplicidade
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Usuários podem ver suas próprias configurações" ON configuracoes_usuario;
    DROP POLICY IF EXISTS "Usuários podem inserir suas próprias configurações" ON configuracoes_usuario;
    DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias configurações" ON configuracoes_usuario;
END $$;

CREATE POLICY "Usuários podem ver suas próprias configurações" 
ON configuracoes_usuario FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias configurações" 
ON configuracoes_usuario FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias configurações" 
ON configuracoes_usuario FOR UPDATE 
USING (auth.uid() = user_id);

-- 10. Garantir que colunas novas existam em tabelas que podem já estar criadas
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='colaboradores' AND column_name='last_seen') THEN
        ALTER TABLE colaboradores ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
