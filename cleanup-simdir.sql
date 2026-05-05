-- ============================================
-- CLEANUP SCRIPT - Hapus Semua Tabel SIMDIR
-- ============================================
-- Script ini untuk membersihkan database yang tercampur
-- Jalankan ini di SQL Editor Supabase jika ingin menghapus
-- semua data dan tabel SIMDIR dari project Supabase

-- ============================================
-- 1. HAPUS TRIGGERS (urut dari yang bergantung)
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_agenda_updated_at ON agenda;
DROP TRIGGER IF EXISTS update_program_kerja_updated_at ON program_kerja;
DROP TRIGGER IF EXISTS update_activity_log_updated_at ON activity_log;

-- ============================================
-- 2. HAPUS FUNCTIONS
-- ============================================
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================
-- 3. HAPUS TABEL (urut dari yang memiliki foreign key)
-- ============================================
-- Hapus tabel yang memiliki foreign key dulu
DROP TABLE IF EXISTS spj CASCADE;
DROP TABLE IF EXISTS biaya_variabel CASCADE;
DROP TABLE IF EXISTS pencairan_dana CASCADE;
DROP TABLE IF EXISTS program_kerja CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS agenda CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS unit_kerja CASCADE;

-- ============================================
-- 4. HAPUS INDEXES (sudah otomatis terhapus dengan CASCADE,
-- tapi tetap dicantumkan untuk kejelasan)
-- ============================================
-- Indexes sudah terhapus bersama tabel

-- ============================================
-- 5. HAPUS POLICIES (jika masih ada)
-- ============================================
-- Policies sudah terhapus bersama tabel (karena ENABLE ROW LEVEL SECURITY)

-- ============================================
-- 6. HAPUS DATA DARI auth.users (opsional - hati-hati!)
-- ============================================
-- Uncomment baris di bawah jika ingin menghapus semua user dari auth
-- WARNING: Ini akan menghapus SEMUA user authentication!
-- DELETE FROM auth.users WHERE email LIKE '%@usc.ac.id';

-- ============================================
-- SELESAI
-- ============================================
SELECT 'Cleanup SIMDIR selesai!' AS status;
