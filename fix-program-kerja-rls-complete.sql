-- ============================================
-- FIX RLS PROGRAM_KERJA - VERSI LENGKAP
-- ============================================

-- PILIHAN 1: Disable RLS sementara (untuk development)
-- Uncomment baris di bawah ini
ALTER TABLE program_kerja DISABLE ROW LEVEL SECURITY;

-- PILIHAN 2: Enable dengan policy permissive (untuk production)
-- Uncomment semua query di bawah ini jika ingin pakai RLS:

-- 1. Enable RLS
-- ALTER TABLE program_kerja ENABLE ROW LEVEL SECURITY;

-- 2. Force RLS untuk semua user termasuk postgres
-- ALTER TABLE program_kerja FORCE ROW LEVEL SECURITY;

-- 3. Hapus semua policy lama
-- DROP POLICY IF EXISTS "Program kerja viewable by authenticated" ON program_kerja;
-- DROP POLICY IF EXISTS "Anyone can view program" ON program_kerja;
-- DROP POLICY IF EXISTS "Anyone can insert program" ON program_kerja;
-- DROP POLICY IF EXISTS "Anyone can update program" ON program_kerja;
-- DROP POLICY IF EXISTS "Anyone can delete program" ON program_kerja;

-- 4. Buat policy untuk semua operasi
-- CREATE POLICY "Allow all operations on program_kerja" ON program_kerja
--     FOR ALL USING (true) WITH CHECK (true);

-- 5. Grant permissions lengkap
-- GRANT ALL ON program_kerja TO anon;
-- GRANT ALL ON program_kerja TO authenticated;
-- GRANT ALL ON program_kerja TO postgres;
-- GRANT ALL ON program_kerja TO service_role;

-- 6. Grant sequence jika ada
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verifikasi status
SELECT 
    relname,
    relrowsecurity,
    relforcerowsecurity
FROM pg_class 
WHERE relname = 'program_kerja';
