-- ============================================
-- FIX: Hapus Foreign Key Constraint & Ubah ke TEXT
-- ============================================

-- 1. Hapus foreign key constraint jika ada
ALTER TABLE program_kerja 
DROP CONSTRAINT IF EXISTS program_kerja_unit_kerja_id_fkey;

-- 2. Ubah tipe data kolom unit_kerja_id dari UUID ke TEXT
ALTER TABLE program_kerja 
ALTER COLUMN unit_kerja_id TYPE TEXT;

-- 3. Verifikasi perubahan
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'program_kerja' 
AND column_name = 'unit_kerja_id';

-- 4. Cek constraint yang tersisa
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'program_kerja'::regclass;
