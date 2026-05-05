-- ============================================
-- FIX: Complete RLS for all SIMDIR tables
-- ============================================

-- Fix Pencairan Dana
ALTER TABLE pencairan_dana ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON pencairan_dana;
DROP POLICY IF EXISTS "Pencairan dana viewable by authenticated" ON pencairan_dana;
CREATE POLICY "Allow all" ON pencairan_dana FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON pencairan_dana TO anon;
GRANT ALL ON pencairan_dana TO authenticated;
GRANT ALL ON pencairan_dana TO postgres;

-- Fix SPJ
ALTER TABLE spj ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON spj;
DROP POLICY IF EXISTS "SPJ viewable by authenticated" ON spj;
CREATE POLICY "Allow all" ON spj FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON spj TO anon;
GRANT ALL ON spj TO authenticated;
GRANT ALL ON spj TO postgres;

-- Fix Program Kerja
ALTER TABLE program_kerja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON program_kerja;
DROP POLICY IF EXISTS "Program kerja viewable by authenticated" ON program_kerja;
CREATE POLICY "Allow all" ON program_kerja FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON program_kerja TO anon;
GRANT ALL ON program_kerja TO authenticated;
GRANT ALL ON program_kerja TO postgres;

-- Fix Biaya Variabel
ALTER TABLE biaya_variabel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON biaya_variabel;
CREATE POLICY "Allow all" ON biaya_variabel FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON biaya_variabel TO anon;
GRANT ALL ON biaya_variabel TO authenticated;
GRANT ALL ON biaya_variabel TO postgres;

-- Fix Agenda
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON agenda;
DROP POLICY IF EXISTS "Agenda is viewable by everyone" ON agenda;
CREATE POLICY "Allow all" ON agenda FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON agenda TO anon;
GRANT ALL ON agenda TO authenticated;
GRANT ALL ON agenda TO postgres;

-- Verify
SELECT tablename, COUNT(*) as policy_count 
FROM pg_policies 
WHERE tablename IN ('pencairan_dana', 'spj', 'program_kerja', 'biaya_variabel', 'agenda')
GROUP BY tablename;
