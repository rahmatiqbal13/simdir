-- ============================================
-- COMPREHENSIVE FIX FOR VERCEL DEPLOYMENT
-- Jalankan SEMUA query ini di Supabase SQL Editor
-- ============================================

-- 1. CEK DAN TAMBAH KOLOM created_at JIKA BELUM ADA

-- Untuk tabel surat
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'surat' AND column_name = 'created_at') THEN
        ALTER TABLE surat ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END
$$;

-- Untuk tabel pencairan_dana
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pencairan_dana' AND column_name = 'created_at') THEN
        ALTER TABLE pencairan_dana ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END
$$;

-- Untuk tabel pencairan_program
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pencairan_program' AND column_name = 'created_at') THEN
        ALTER TABLE pencairan_program ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END
$$;

-- 2. ENABLE RLS DAN BUAT POLICY UNTUK SEMUA TABEL

-- Tabel users
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON users;
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON users TO anon;
GRANT ALL ON users TO authenticated;

-- Tabel profiles
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON profiles;
CREATE POLICY "Allow all" ON profiles FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON profiles TO anon;
GRANT ALL ON profiles TO authenticated;

-- Tabel unit_kerja
ALTER TABLE IF EXISTS unit_kerja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON unit_kerja;
CREATE POLICY "Allow all" ON unit_kerja FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON unit_kerja TO anon;
GRANT ALL ON unit_kerja TO authenticated;

-- Tabel program_kerja
ALTER TABLE IF EXISTS program_kerja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON program_kerja;
CREATE POLICY "Allow all" ON program_kerja FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON program_kerja TO anon;
GRANT ALL ON program_kerja TO authenticated;

-- Tabel agenda
ALTER TABLE IF EXISTS agenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON agenda;
CREATE POLICY "Allow all" ON agenda FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON agenda TO anon;
GRANT ALL ON agenda TO authenticated;

-- Tabel surat
ALTER TABLE IF EXISTS surat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON surat;
CREATE POLICY "Allow all" ON surat FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON surat TO anon;
GRANT ALL ON surat TO authenticated;

-- Tabel pencairan_dana
ALTER TABLE IF EXISTS pencairan_dana ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON pencairan_dana;
CREATE POLICY "Allow all" ON pencairan_dana FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON pencairan_dana TO anon;
GRANT ALL ON pencairan_dana TO authenticated;

-- Tabel pencairan_program
ALTER TABLE IF EXISTS pencairan_program ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON pencairan_program;
CREATE POLICY "Allow all" ON pencairan_program FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON pencairan_program TO anon;
GRANT ALL ON pencairan_program TO authenticated;

-- Tabel biaya_variabel
ALTER TABLE IF EXISTS biaya_variabel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON biaya_variabel;
CREATE POLICY "Allow all" ON biaya_variabel FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON biaya_variabel TO anon;
GRANT ALL ON biaya_variabel TO authenticated;

-- Tabel activity_log
ALTER TABLE IF EXISTS activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON activity_log;
CREATE POLICY "Allow all" ON activity_log FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON activity_log TO anon;
GRANT ALL ON activity_log TO authenticated;

-- Tabel rka (jika ada)
ALTER TABLE IF EXISTS rka ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON rka;
CREATE POLICY "Allow all" ON rka FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON rka TO anon;
GRANT ALL ON rka TO authenticated;

-- Tabel spj (jika ada)
ALTER TABLE IF EXISTS spj ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON spj;
CREATE POLICY "Allow all" ON spj FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON spj TO anon;
GRANT ALL ON spj TO authenticated;

-- 3. GRANT PERMISSIONS UNTUK VIEWS
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

-- 4. ENABLE REALTIME (opsional tapi direkomendasikan)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE agenda;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END
$$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE program_kerja;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END
$$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE pencairan_dana;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END
$$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE surat;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END
$$;

-- 5. VERIFY KOLOM created_at ADA DI SEMUA TABEL
SELECT 
    table_name, 
    column_name 
FROM information_schema.columns 
WHERE table_name IN ('surat', 'pencairan_dana', 'pencairan_program', 'program_kerja', 'agenda', 'unit_kerja', 'users', 'profiles')
    AND column_name = 'created_at'
ORDER BY table_name;

-- 6. Success message
SELECT 'Comprehensive fix completed for Vercel deployment' as status;
