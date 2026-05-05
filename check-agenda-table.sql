-- Cek struktur tabel agenda
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'agenda' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Cek constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'agenda'::regclass;

-- Test insert manual
-- INSERT INTO agenda (judul, jenis, tanggal_mulai, tanggal_selesai, penyelenggara)
-- VALUES ('Test Agenda', 'internal', '2026-05-20', '2026-05-20', 'USC');
