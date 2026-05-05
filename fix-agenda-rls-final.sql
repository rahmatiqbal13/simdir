-- ============================================
-- FIX RLS AGENDA - Disable atau Perbaiki Policy
-- ============================================

-- PILIHAN 1: Disable RLS (untuk development/testing)
-- Uncomment baris di bawah ini jika ingin disable RLS
-- ALTER TABLE agenda DISABLE ROW LEVEL SECURITY;

-- PILIHAN 2: Enable RLS dengan policy yang benar (Recommended)
-- Jalankan semua query di bawah ini:

-- 1. Hapus semua policy lama
DROP POLICY IF EXISTS "Agenda is viewable by everyone" ON agenda;
DROP POLICY IF EXISTS "Authenticated users can create agenda" ON agenda;
DROP POLICY IF EXISTS "Authenticated users can update agenda" ON agenda;
DROP POLICY IF EXISTS "Authenticated users can delete agenda" ON agenda;

-- 2. Enable RLS
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;

-- 3. Buat policy baru
-- SELECT: Semua orang bisa lihat
CREATE POLICY "Agenda is viewable by everyone" ON agenda
    FOR SELECT USING (true);

-- INSERT: Semua authenticated user bisa insert
CREATE POLICY "Anyone can insert agenda" ON agenda
    FOR INSERT WITH CHECK (true);

-- UPDATE: Semua authenticated user bisa update
CREATE POLICY "Anyone can update agenda" ON agenda
    FOR UPDATE USING (true);

-- DELETE: Semua authenticated user bisa delete
CREATE POLICY "Anyone can delete agenda" ON agenda
    FOR DELETE USING (true);

-- 4. Grant permissions
GRANT ALL ON agenda TO anon;
GRANT ALL ON agenda TO authenticated;
GRANT ALL ON agenda TO postgres;

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
WHERE tablename = 'agenda';
