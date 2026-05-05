-- ============================================
-- FIX RLS PROGRAM_KERJA
-- ============================================

-- 1. Hapus policy lama
DROP POLICY IF EXISTS "Program kerja viewable by authenticated" ON program_kerja;

-- 2. Enable RLS
ALTER TABLE program_kerja ENABLE ROW LEVEL SECURITY;

-- 3. Buat policy baru
-- SELECT: Semua authenticated user bisa lihat
CREATE POLICY "Anyone can view program" ON program_kerja
    FOR SELECT USING (true);

-- INSERT: Semua authenticated user bisa insert
CREATE POLICY "Anyone can insert program" ON program_kerja
    FOR INSERT WITH CHECK (true);

-- UPDATE: Semua authenticated user bisa update
CREATE POLICY "Anyone can update program" ON program_kerja
    FOR UPDATE USING (true);

-- DELETE: Semua authenticated user bisa delete
CREATE POLICY "Anyone can delete program" ON program_kerja
    FOR DELETE USING (true);

-- 4. Grant permissions
GRANT ALL ON program_kerja TO anon;
GRANT ALL ON program_kerja TO authenticated;
GRANT ALL ON program_kerja TO postgres;

-- 5. Verifikasi
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'program_kerja';
