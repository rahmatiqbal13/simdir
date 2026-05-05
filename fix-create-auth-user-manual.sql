-- ============================================
-- FIX: Buat user di Supabase Auth dan Profiles
-- ============================================
-- Jalankan ini di Supabase SQL Editor untuk membuat user adminiqbal

-- Cek apakah user sudah ada di auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'adminiqbal@usc.ac.id';

-- Jika tidak ada, buat manual:
-- Note: Password akan di-hash oleh Supabase

-- Cara 1: Via Supabase Dashboard (Recommended)
-- 1. Buka Supabase Dashboard → Authentication → Users
-- 2. Klik "Add User" atau "Invite User"
-- 3. Masukkan: adminiqbal@usc.ac.id
-- 4. Password: usc@_140451
-- 5. Confirm email: Yes

-- Cara 2: Via SQL (hanya jika Anda tahu password hash)
-- Ini contoh query, tapi sebaiknya pakai Dashboard

-- Cek struktur profiles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public';

-- Pastikan profiles sudah ada untuk user ini
INSERT INTO profiles (id, username, email, full_name, role, is_active)
SELECT 
  id,
  'adminiqbal',
  email,
  'Admin Iqbal',
  'super_admin',
  true
FROM auth.users 
WHERE email = 'adminiqbal@usc.ac.id'
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- ============================================
-- ALTERNATIF: Disable trigger jika bermasalah
-- ============================================
-- Jika error "Database error saving new user" persist,
-- coba disable trigger sementara:

-- DISABLE TRIGGER:
-- ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Buat user via Dashboard, lalu ENABLE lagi:
-- ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
