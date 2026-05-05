-- ============================================
-- BACKUP DATA SIMDIR (Opsional)
-- ============================================
-- Script ini untuk membackup data penting sebelum cleanup
-- Hasil backup akan dalam format JSON-like

-- Backup data users
SELECT json_agg(row_to_json(users)) AS users_backup 
FROM users;

-- Backup data agenda
SELECT json_agg(row_to_json(agenda)) AS agenda_backup 
FROM agenda;

-- Backup data program_kerja
SELECT json_agg(row_to_json(program_kerja)) AS program_kerja_backup 
FROM program_kerja;

-- Backup data unit_kerja
SELECT json_agg(row_to_json(unit_kerja)) AS unit_kerja_backup 
FROM unit_kerja;

-- Backup data pencairan_dana
SELECT json_agg(row_to_json(pencairan_dana)) AS pencairan_dana_backup 
FROM pencairan_dana;

-- ============================================
-- CARA MENGGUNAKAN:
-- 1. Jalankan script ini di SQL Editor Supabase
-- 2. Copy hasil JSON untuk setiap tabel
-- 3. Simpan ke file .json untuk backup
-- 4. Setelah cleanup, data bisa di-restore manual
-- ============================================
