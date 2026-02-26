-- Add 'ano' column to tables
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ano TEXT DEFAULT '2026';
ALTER TABLE registros ADD COLUMN IF NOT EXISTS ano TEXT DEFAULT '2026';
ALTER TABLE comentarios ADD COLUMN IF NOT EXISTS ano TEXT DEFAULT '2026';
ALTER TABLE detalhes ADD COLUMN IF NOT EXISTS ano TEXT DEFAULT '2026';

-- Update existing records to 2026 (if they were null)
UPDATE empresas SET ano = '2026' WHERE ano IS NULL;
UPDATE registros SET ano = '2026' WHERE ano IS NULL;
UPDATE comentarios SET ano = '2026' WHERE ano IS NULL;
UPDATE detalhes SET ano = '2026' WHERE ano IS NULL;

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_empresas_ano ON empresas(ano);
CREATE INDEX IF NOT EXISTS idx_registros_ano ON registros(ano);
CREATE INDEX IF NOT EXISTS idx_comentarios_ano ON comentarios(ano);
CREATE INDEX IF NOT EXISTS idx_detalhes_ano ON detalhes(ano);

-- Update Unique Constraints
-- Ensure companies are unique by (codigo_externo, ano)
ALTER TABLE empresas DROP CONSTRAINT IF EXISTS empresas_codigo_externo_key;
DROP INDEX IF EXISTS empresas_codigo_externo_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_codigo_ano ON empresas(codigo_externo, ano);

-- Ensure details are unique by (id, ano)
ALTER TABLE detalhes DROP CONSTRAINT IF EXISTS detalhes_pkey;
ALTER TABLE detalhes ADD PRIMARY KEY (id, ano);
