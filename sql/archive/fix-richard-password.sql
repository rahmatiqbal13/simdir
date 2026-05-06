-- ============================================
-- FIX PASSWORD FOR RICHARD USER
-- ============================================

-- Update password untuk user richard@usc.ac.id
UPDATE users 
SET password = 'keuangan@_123',
    updated_at = NOW()
WHERE email = 'richard@usc.ac.id';

-- Jika tidak ketemu dengan email, coba dengan username
UPDATE users 
SET password = 'keuangan@_123',
    updated_at = NOW()
WHERE username = 'richard';

-- Cek apakah update berhasil
SELECT id, username, email, full_name, role, is_active, password
FROM users 
WHERE email = 'richard@usc.ac.id' OR username = 'richard';

-- ============================================
-- UPDATE RPC FUNCTION TO HANDLE PASSWORD CORRECTLY
-- ============================================

-- Function to update user with password (updated version)
CREATE OR REPLACE FUNCTION update_user_with_password(
    p_id UUID,
    p_full_name VARCHAR,
    p_email VARCHAR,
    p_role VARCHAR,
    p_is_active BOOLEAN,
    p_password VARCHAR DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    IF p_password IS NOT NULL AND p_password != '' THEN
        UPDATE users 
        SET full_name = p_full_name,
            email = p_email,
            role = p_role,
            is_active = p_is_active,
            password = p_password,
            updated_at = NOW()
        WHERE id = p_id;
    ELSE
        UPDATE users 
        SET full_name = p_full_name,
            email = p_email,
            role = p_role,
            is_active = p_is_active,
            updated_at = NOW()
        WHERE id = p_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_with_password(UUID, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, VARCHAR) TO authenticated;

-- Function to add user with correct password
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

GRANT EXECUTE ON FUNCTION add_user(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;

-- ============================================
-- VERIFY ALL USERS
-- ============================================
SELECT id, username, email, full_name, role, is_active, password
FROM users 
ORDER BY created_at DESC
LIMIT 10;
