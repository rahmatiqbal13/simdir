-- ============================================
-- FIX RLS BIAYA_VARIABEL
-- ============================================

-- 1. Disable RLS untuk development (uncomment jika perlu)
-- ALTER TABLE biaya_variabel DISABLE ROW LEVEL SECURITY;

-- 2. Enable RLS dengan policy permissive
ALTER TABLE biaya_variabel ENABLE ROW LEVEL SECURITY;

-- 3. Hapus policy lama
DROP POLICY IF EXISTS "Biaya variabel viewable by authenticated" ON biaya_variabel;

-- 4. Buat policy baru
CREATE POLICY "Allow all operations on biaya_variabel" ON biaya_variabel
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Grant permissions
GRANT ALL ON biaya_variabel TO anon;
GRANT ALL ON biaya_variabel TO authenticated;
GRANT ALL ON biaya_variabel TO postgres;

-- Verifikasi
SELECT 
    relname,
    relrowsecurity,
    relforcerowsecurity
FROM pg_class 
WHERE relname = 'biaya_variabel';
