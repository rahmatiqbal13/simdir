-- ============================================
-- UPDATE: Sesuaikan dengan struktur tabel yang ada
-- ============================================

-- Lihat struktur tabel profiles saat ini
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- INSERT USER ke tabel users (struktur sudah sesuai)
-- ============================================
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

-- ============================================
-- INSERT USER ke tabel profiles (gunakan kolom yang ada)
-- ============================================
-- Catatan: profiles hanya punya: id, nama, role, is_active, unit_kerja_id, created_at

INSERT INTO public.profiles (
    id,
    nama,  -- menggunakan kolom 'nama' yang sudah ada
    role,
    is_active
) VALUES (
    '1646e3e6-58bd-487a-aafb-82e5eda8b393',
    'Administrator',
    'super_admin',
    true
)
ON CONFLICT (id) DO UPDATE SET
    nama = EXCLUDED.nama,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- Verifikasi
SELECT 'Users table:' as table_name;
SELECT * FROM public.users WHERE id = '1646e3e6-58bd-487a-aafb-82e5eda8b393';

SELECT 'Profiles table:' as table_name;
SELECT * FROM public.profiles WHERE id = '1646e3e6-58bd-487a-aafb-82e5eda8b393';
