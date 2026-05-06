-- ============================================
-- CHECK unit_kerja_id COLUMN
-- ============================================

-- Cek struktur tabel program_kerja
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'program_kerja'
ORDER BY ordinal_position;

-- Jika kolom unit_kerja_id tidak ada, jalankan:
-- ALTER TABLE program_kerja ADD COLUMN unit_kerja_id TEXT;

-- Cek data yang sudah ada
SELECT id, nama, id_rka, unit_kerja_id, pagu_anggaran, tahun
FROM program_kerja
ORDER BY created_at DESC
LIMIT 5;
