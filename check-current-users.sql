-- ============================================
-- CHECK CURRENT USERS DATA
-- ============================================

-- Lihat semua users
SELECT 
    id, 
    username, 
    email, 
    full_name, 
    role, 
    is_active, 
    password,
    created_at
FROM users 
ORDER BY created_at DESC;

-- Cek apakah richard sudah ada
SELECT 'User richard exists:' as check_result, COUNT(*) as count 
FROM users 
WHERE username = 'richard' OR email = 'richard@usc.ac.id';

-- Cek apakah budi.santoso masih ada
SELECT 'User budi exists:' as check_result, COUNT(*) as count 
FROM users 
WHERE username = 'budi.santoso' OR email = 'budi@usc.ac.id';
