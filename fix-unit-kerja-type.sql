-- ============================================
-- FIX: Ubah unit_kerja_id dari UUID ke TEXT
-- ============================================

-- Cek tipe data kolom unit_kerja_id
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'program_kerja' AND column_name = 'unit_kerja_id';

-- Jika tipe datanya UUID, ubah ke TEXT:
ALTER TABLE program_kerja 
ALTER COLUMN unit_kerja_id TYPE TEXT;

-- Verifikasi perubahan
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'program_kerja' AND column_name = 'unit_kerja_id';
