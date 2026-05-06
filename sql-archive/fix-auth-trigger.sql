-- ============================================
-- FIX: Perbaiki Trigger Auth User
-- ============================================
-- Jalankan ini di Supabase SQL Editor

-- 1. Cek struktur tabel profiles terlebih dahulu
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Update function handle_new_user untuk handle NOT NULL columns
-- atau skip insert jika data tidak lengkap
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Coba insert ke profiles, tapi handle error gracefully
    BEGIN
        INSERT INTO public.profiles (id, email, username, full_name, role)
        VALUES (
            new.id, 
            new.email, 
            COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
            COALESCE(new.raw_user_meta_data->>'nama', new.email),
            COALESCE(new.raw_user_meta_data->>'role', 'admin')
        );
    EXCEPTION WHEN OTHERS THEN
        -- Log error tapi jangan gagalkan proses auth
        RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
    END;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Pastikan trigger ada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Cek apakah user sudah ada di auth.users
SELECT id, email, created_at, confirmed_at 
FROM auth.users 
WHERE email = 'adminiqbal@usc.ac.id';

-- 5. Jika user belum ada, coba buat manual via SQL (password akan di-hash)
-- ATAU gunakan Dashboard seperti yang saya instruksikan sebelumnya

-- 6. Alternatif: Disable trigger sementara jika perlu buat user via Dashboard
-- ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
-- (Buat user via Dashboard di sini)
-- ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- ============================================
-- CARA PALING MUDAH: Buat profiles manual
-- ============================================
-- Setelah buat user via Dashboard, jalankan ini:

-- Cek apakah user sudah ada di auth.users
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = 'adminiqbal@usc.ac.id';
    
    IF v_user_id IS NOT NULL THEN
        -- Insert atau update profiles
        INSERT INTO profiles (id, username, email, full_name, role, is_active)
        VALUES (
            v_user_id,
            'adminiqbal',
            'adminiqbal@usc.ac.id',
            'Admin Iqbal',
            'super_admin',
            true
        )
        ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active;
            
        RAISE NOTICE 'Profile created/updated for user %', v_user_id;
    ELSE
        RAISE NOTICE 'User adminiqbal@usc.ac.id not found in auth.users';
    END IF;
END $$;

-- Verifikasi
SELECT u.id, u.email, p.username, p.full_name, p.role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'adminiqbal@usc.ac.id';
