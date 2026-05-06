-- ============================================
-- FIX RLS FOR VERCEL DEPLOYMENT
-- Jalankan ini di Supabase SQL Editor jika data tidak muncul di Vercel
-- ============================================

-- 1. Fix RLS untuk tabel agenda
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON agenda;
CREATE POLICY "Allow all" ON agenda FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON agenda TO anon;
GRANT ALL ON agenda TO authenticated;

-- 2. Fix RLS untuk tabel program_kerja
ALTER TABLE program_kerja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON program_kerja;
CREATE POLICY "Allow all" ON program_kerja FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON program_kerja TO anon;
GRANT ALL ON program_kerja TO authenticated;

-- 3. Fix RLS untuk tabel unit_kerja
ALTER TABLE unit_kerja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON unit_kerja;
CREATE POLICY "Allow all" ON unit_kerja FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON unit_kerja TO anon;
GRANT ALL ON unit_kerja TO authenticated;

-- 4. Fix RLS untuk tabel pencairan_dana
ALTER TABLE pencairan_dana ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON pencairan_dana;
CREATE POLICY "Allow all" ON pencairan_dana FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON pencairan_dana TO anon;
GRANT ALL ON pencairan_dana TO authenticated;

-- 5. Fix RLS untuk tabel pencairan_program
ALTER TABLE pencairan_program ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON pencairan_program;
CREATE POLICY "Allow all" ON pencairan_program FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON pencairan_program TO anon;
GRANT ALL ON pencairan_program TO authenticated;

-- 6. Fix RLS untuk tabel users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON users;
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON users TO anon;
GRANT ALL ON users TO authenticated;

-- 7. Fix RLS untuk tabel profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON profiles;
CREATE POLICY "Allow all" ON profiles FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON profiles TO anon;
GRANT ALL ON profiles TO authenticated;

-- 8. Fix RLS untuk tabel surat
ALTER TABLE surat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON surat;
CREATE POLICY "Allow all" ON surat FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON surat TO anon;
GRANT ALL ON surat TO authenticated;

-- 9. Fix RLS untuk tabel biaya_variabel
ALTER TABLE biaya_variabel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON biaya_variabel;
CREATE POLICY "Allow all" ON biaya_variabel FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON biaya_variabel TO anon;
GRANT ALL ON biaya_variabel TO authenticated;

-- 10. Fix RLS untuk tabel rka
ALTER TABLE IF EXISTS rka ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON rka;
CREATE POLICY "Allow all" ON rka FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON rka TO anon;
GRANT ALL ON rka TO authenticated;

-- 11. Fix permissions untuk views laporan
GRANT SELECT ON laporan_serapan_program TO anon;
GRANT SELECT ON laporan_serapan_program TO authenticated;
GRANT SELECT ON laporan_serapan_unit TO anon;
GRANT SELECT ON laporan_serapan_unit TO authenticated;
GRANT SELECT ON laporan_statistik_agenda TO anon;
GRANT SELECT ON laporan_statistik_agenda TO authenticated;
GRANT SELECT ON laporan_statistik_surat TO anon;
GRANT SELECT ON laporan_statistik_surat TO authenticated;
GRANT SELECT ON laporan_detail_pencairan TO anon;
GRANT SELECT ON laporan_detail_pencairan TO authenticated;

-- 12. Enable realtime untuk tabel penting (opsional)
ALTER PUBLICATION supabase_realtime ADD TABLE agenda;
ALTER PUBLICATION supabase_realtime ADD TABLE program_kerja;
ALTER PUBLICATION supabase_realtime ADD TABLE pencairan_dana;

-- Verify
SELECT 'RLS Fixed for Vercel Deployment' as status;
