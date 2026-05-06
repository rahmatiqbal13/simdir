-- ============================================
-- FIX PASSWORD ISSUES FOR USERS
-- ============================================

-- Update password untuk user richard@usc.ac.id
-- Password yang benar: keuangan@_123
UPDATE users 
SET password = 'keuangan@_123',
    updated_at = NOW()
WHERE email = 'richard@usc.ac.id';

-- Jika tidak ada, cek username
UPDATE users 
SET password = 'keuangan@_123',
    updated_at = NOW()
WHERE username = 'richard';

-- Update RLS untuk memungkinkan update password
DROP POLICY IF EXISTS "Authenticated users can update users" ON users;
DROP POLICY IF EXISTS "Authenticated users can update users with password" ON users;

CREATE POLICY "Authenticated users can update users" ON users
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Function to update user with password
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

-- ============================================
-- VERIFY USERS
-- ============================================
SELECT id, username, email, full_name, role, is_active, LEFT(password, 20) as password_preview
FROM users 
ORDER BY created_at DESC;
