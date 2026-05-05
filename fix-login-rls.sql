-- ============================================
-- FIX: RLS Policy untuk Login
-- ============================================
-- Jalankan script ini di Supabase SQL Editor

-- 1. Disable RLS temporary untuk testing (opsional - hanya untuk debug)
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. Solusi yang lebih baik: Buat function yang bypass RLS untuk login
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
SECURITY DEFINER -- Bypass RLS
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

-- 3. Buat function untuk get user by email
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
SECURITY DEFINER -- Bypass RLS
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

-- 4. Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION get_user_by_username(VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION get_user_by_email(VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION get_user_by_username(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_email(VARCHAR) TO authenticated;

-- 5. Alternative: Allow anonymous select on users table for login (less secure but simpler)
-- DROP POLICY IF EXISTS "Allow anonymous login queries" ON users;
-- CREATE POLICY "Allow anonymous login queries" ON users
--     FOR SELECT USING (true);

-- ============================================
-- Test functions
-- ============================================
-- SELECT * FROM get_user_by_username('adminiqbal');
-- SELECT * FROM get_user_by_email('adminiqbal@usc.ac.id');
