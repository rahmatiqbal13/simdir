-- ============================================
-- CHECK AND FIX USER DATA
-- ============================================

-- 1. Lihat semua users untuk verifikasi
SELECT id, username, email, full_name, role, is_active, password
FROM users 
ORDER BY created_at DESC;

-- 2. Update user richard@usc.ac.id jika ada
UPDATE users 
SET username = 'richard',
    full_name = 'Richard Keuangan',
    password = 'keuangan@_123',
    updated_at = NOW()
WHERE email = 'richard@usc.ac.id';

-- 3. Jika richard belum ada, insert baru
INSERT INTO users (username, email, password, full_name, role, is_active)
VALUES ('richard', 'richard@usc.ac.id', 'keuangan@_123', 'Richard Keuangan', 'admin_keuangan', true)
ON CONFLICT (email) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    password = EXCLUDED.password,
    updated_at = NOW();

-- 4. Verifikasi hasil
SELECT id, username, email, full_name, role, is_active, password
FROM users 
WHERE email = 'richard@usc.ac.id' OR username = 'richard';

-- 5. Hapus user test/budi.santoso jika tidak diperlukan
-- DELETE FROM users WHERE username = 'budi.santoso' AND email = 'budi@usc.ac.id';

-- 6. Lihat total users
SELECT COUNT(*) as total_users FROM users;
SELECT role, COUNT(*) as count FROM users GROUP BY role;
