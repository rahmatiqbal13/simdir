-- ============================================
-- TAMBAHKAN USER EXISTING KE DATABASE
-- ============================================

-- User dari Supabase Auth yang sudah ada
INSERT INTO public.users (
    id, 
    username, 
    email, 
    password, 
    full_name, 
    role, 
    is_active
) VALUES (
    '1646e3e6-58bd-487a-aafb-82e5eda8b393',  -- User UID dari Auth
    'administrator',                          -- Username
    'admin@direktorat.ac.id',                 -- Email
    'admin123',                               -- Password (ganti sesuai kebutuhan)
    'Administrator',                          -- Full name
    'super_admin',                            -- Role
    true                                      -- Active
)
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- Buat juga profilenya
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
SELECT * FROM public.users WHERE id = '1646e3e6-58bd-487a-aafb-82e5eda8b393';
SELECT * FROM public.profiles WHERE id = '1646e3e6-58bd-487a-aafb-82e5eda8b393';
