-- ============================================
-- SUPABASE SETUP - Database & Auth Fix
-- Jalankan semua script ini di Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. DROP EXISTING TABLES (Hati-hati: akan hapus data!)
-- ============================================
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================
-- 2. CREATE USERS TABLE
-- ============================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin_keuangan', 'admin', 'pimpinan')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 3. CREATE PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin_keuangan', 'admin', 'pimpinan')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. ENABLE RLS
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES FOR PROFILES
-- ============================================
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Super admin can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- ============================================
-- 6. CREATE FUNCTIONS FOR LOGIN (Bypass RLS)
-- ============================================
CREATE OR REPLACE FUNCTION get_user_by_username(p_username VARCHAR)
RETURNS TABLE (
    id UUID,
    username VARCHAR,
    email VARCHAR,
    password VARCHAR,
    full_name VARCHAR,
    role VARCHAR,
    is_active BOOLEAN,
    last_login TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.email,
        u.password,
        u.full_name,
        u.role,
        u.is_active,
        u.last_login
    FROM users u
    WHERE u.username = p_username;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_by_email(p_email VARCHAR)
RETURNS TABLE (
    id UUID,
    username VARCHAR,
    email VARCHAR,
    password VARCHAR,
    full_name VARCHAR,
    role VARCHAR,
    is_active BOOLEAN,
    last_login TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.email,
        u.password,
        u.full_name,
        u.role,
        u.is_active,
        u.last_login
    FROM users u
    WHERE u.email = p_email;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION get_user_by_username(VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION get_user_by_email(VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION get_user_by_username(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_email(VARCHAR) TO authenticated;

-- ============================================
-- 8. INSERT DEFAULT USERS
-- ============================================
INSERT INTO public.users (id, username, email, password, full_name, role, is_active)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'adminiqbal', 'adminiqbal@usc.ac.id', 'usc@_140451', 'Admin Iqbal', 'super_admin', true),
    ('550e8400-e29b-41d4-a716-446655440001', 'keuangan', 'keuangan@usc.ac.id', 'keuangan123', 'Admin Keuangan', 'admin_keuangan', true),
    ('550e8400-e29b-41d4-a716-446655440002', 'operator', 'operator@usc.ac.id', 'operator123', 'Operator', 'admin', true),
    ('550e8400-e29b-41d4-a716-446655440003', 'pimpinan', 'pimpinan@usc.ac.id', 'pimpinan123', 'Pimpinan', 'pimpinan', true)
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- ============================================
-- 9. CREATE TRIGGER FOR NEW AUTH USERS
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 10. CREATE OTHER TABLES (Agenda, dll)
-- ============================================
DROP TABLE IF EXISTS public.agenda CASCADE;

CREATE TABLE public.agenda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time_start TIME,
    time_end TIME,
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.agenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on agenda"
    ON public.agenda FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Users table created successfully' as status;
SELECT COUNT(*) as user_count FROM public.users;
SELECT username, email, role, is_active FROM public.users;
