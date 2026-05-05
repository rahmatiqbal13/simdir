-- ============================================
-- CEK KOLOM TABEL (Jalankan ini dulu)
-- ============================================

-- Cek kolom di activity_log
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activity_log' 
ORDER BY ordinal_position;

-- Cek kolom di users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Cek kolom di agenda
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agenda' 
ORDER BY ordinal_position;
