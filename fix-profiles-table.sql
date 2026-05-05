-- ============================================
-- FIX: Tambah Kolom yang Kurang ke Tabel Profiles
-- ============================================

-- Tambah kolom username jika belum ada
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Tambah kolom is_active jika belum ada
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update kolom yang sudah ada agar tidak NULL
ALTER TABLE public.profiles 
ALTER COLUMN username SET NOT NULL;

-- ============================================
-- INSERT/UPDATE USER
-- ============================================

-- Insert ke users
INSERT INTO public.users (
    id, 
    username, 
    email, 
    password, 
    full_name, 
    role, 
    is_active
) VALUES (
    '1646e3e6-58bd-487a-aafb-82e5eda8b393',
    'administrator',
    'admin@direktorat.ac.id',
    'admin123',
    'Administrator',
    'super_admin',
    true
)
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- Insert ke profiles (sekarang dengan kolom username)
INSERT INTO public.profiles (
    id,
    username,
    email,
    full_name,
    role,
    is_active
) VALUES (
    '1646e3e6-58bd-487a-aafb-82e5eda8b393',
    'administrator',
    'admin@direktorat.ac.id',
    'Administrator',
    'super_admin',
    true
)
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- Verifikasi
SELECT 'Users table:' as table_name;
SELECT * FROM public.users WHERE id = '1646e3e6-58bd-487a-aafb-82e5eda8b393';

SELECT 'Profiles table:' as table_name;
SELECT * FROM public.profiles WHERE id = '1646e3e6-58bd-487a-aafb-82e5eda8b393';
