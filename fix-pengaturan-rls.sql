-- ============================================
-- FIX RLS FOR USERS AND UNIT_KERJA TABLES
-- ============================================

-- Fix RLS for users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Superadmin can view all users" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Authenticated users can view users" ON users;
DROP POLICY IF EXISTS "Authenticated users can insert users" ON users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON users;
DROP POLICY IF EXISTS "Authenticated users can delete users" ON users;

-- Create new permissive policies
CREATE POLICY "Authenticated users can view users" ON users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert users" ON users
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update users" ON users
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete users" ON users
    FOR DELETE USING (auth.role() = 'authenticated');

-- Fix RLS for unit_kerja table
ALTER TABLE unit_kerja DISABLE ROW LEVEL SECURITY;
ALTER TABLE unit_kerja ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Unit kerja is viewable by everyone" ON unit_kerja;
DROP POLICY IF EXISTS "Authenticated users can view unit_kerja" ON unit_kerja;
DROP POLICY IF EXISTS "Authenticated users can insert unit_kerja" ON unit_kerja;
DROP POLICY IF EXISTS "Authenticated users can update unit_kerja" ON unit_kerja;
DROP POLICY IF EXISTS "Authenticated users can delete unit_kerja" ON unit_kerja;

-- Create new permissive policies
CREATE POLICY "Authenticated users can view unit_kerja" ON unit_kerja
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert unit_kerja" ON unit_kerja
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update unit_kerja" ON unit_kerja
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete unit_kerja" ON unit_kerja
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- RPC FUNCTIONS (Alternative approach)
-- ============================================

-- Function to get all users
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
    id UUID,
    username VARCHAR,
    email VARCHAR,
    full_name VARCHAR,
    role VARCHAR,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.role,
        u.is_active,
        u.created_at
    FROM users u
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all unit_kerja
CREATE OR REPLACE FUNCTION get_all_unit_kerja()
RETURNS TABLE (
    id UUID,
    nama VARCHAR,
    kode VARCHAR,
    deskripsi TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY SELECT 
        uk.id,
        uk.nama,
        uk.kode,
        uk.deskripsi,
        uk.is_active,
        uk.created_at
    FROM unit_kerja uk
    ORDER BY uk.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add user
CREATE OR REPLACE FUNCTION add_user(
    p_username VARCHAR,
    p_email VARCHAR,
    p_password VARCHAR,
    p_full_name VARCHAR,
    p_role VARCHAR
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO users (username, email, password, full_name, role, is_active)
    VALUES (p_username, p_email, p_password, p_full_name, p_role, true)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user
CREATE OR REPLACE FUNCTION update_user(
    p_id UUID,
    p_full_name VARCHAR,
    p_email VARCHAR,
    p_role VARCHAR,
    p_is_active BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET full_name = p_full_name,
        email = p_email,
        role = p_role,
        is_active = p_is_active,
        updated_at = NOW()
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle user status
CREATE OR REPLACE FUNCTION toggle_user_status(
    p_id UUID,
    p_is_active BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET is_active = p_is_active,
        updated_at = NOW()
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete user
CREATE OR REPLACE FUNCTION delete_user(p_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM users WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add unit_kerja
CREATE OR REPLACE FUNCTION add_unit_kerja(
    p_nama VARCHAR,
    p_kode VARCHAR,
    p_deskripsi TEXT
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO unit_kerja (nama, kode, deskripsi, is_active)
    VALUES (p_nama, p_kode, p_deskripsi, true)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update unit_kerja
CREATE OR REPLACE FUNCTION update_unit_kerja(
    p_id UUID,
    p_nama VARCHAR,
    p_kode VARCHAR,
    p_deskripsi TEXT,
    p_is_active BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    UPDATE unit_kerja 
    SET nama = p_nama,
        kode = p_kode,
        deskripsi = p_deskripsi,
        is_active = p_is_active
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle unit_kerja status
CREATE OR REPLACE FUNCTION toggle_unit_kerja_status(
    p_id UUID,
    p_is_active BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    UPDATE unit_kerja 
    SET is_active = p_is_active
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete unit_kerja
CREATE OR REPLACE FUNCTION delete_unit_kerja(p_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM unit_kerja WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users() TO anon;
GRANT EXECUTE ON FUNCTION get_all_unit_kerja() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_unit_kerja() TO anon;
GRANT EXECUTE ON FUNCTION add_user(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user(UUID, VARCHAR, VARCHAR, VARCHAR, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_user_status(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_unit_kerja(VARCHAR, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_unit_kerja(UUID, VARCHAR, VARCHAR, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_unit_kerja_status(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_unit_kerja(UUID) TO authenticated;
