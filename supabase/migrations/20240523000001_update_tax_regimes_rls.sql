-- Drop existing policies
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON tax_regimes;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON tax_regimes;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON tax_regimes;

-- Disable RLS because the app uses custom authentication
ALTER TABLE tax_regimes DISABLE ROW LEVEL SECURITY;
