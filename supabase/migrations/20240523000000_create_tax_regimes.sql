-- Create tax_regimes table
CREATE TABLE IF NOT EXISTS tax_regimes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT
);

-- Insert default regimes
INSERT INTO tax_regimes (name) VALUES 
('LUCRO REAL'),
('LUCRO PRESUMIDO'),
('SIMPLES NACIONAL'),
('IMUNE/ISENTA')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE tax_regimes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read
CREATE POLICY "Allow read access for authenticated users" ON tax_regimes
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow admins to insert/delete
-- Assuming there's a way to check for admin, or for now allow authenticated users to manage if the app handles admin check
CREATE POLICY "Allow insert for authenticated users" ON tax_regimes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated users" ON tax_regimes
    FOR DELETE USING (auth.role() = 'authenticated');
