-- ============================================
-- CEK DAN FIX DATA USERS - RICHARD
-- ============================================

-- Langkah 1: Lihat dulu semua users yang ada
SELECT id, username, email, full_name, role, is_active, password
FROM users 
ORDER BY created_at DESC;

-- Langkah 2: Update user dengan email richard@usc.ac.id
-- Pastikan username dan password benar
UPDATE users 
SET username = 'richard',
    full_name = 'Richard Admin Keuangan',
    password = 'keuangan@_123',
    role = 'admin_keuangan',
    is_active = true,
    updated_at = NOW()
WHERE email = 'richard@usc.ac.id';

-- Langkah 3: Jika tidak ada yang terupdate (richard belum ada), insert baru
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'richard@usc.ac.id') THEN
        INSERT INTO users (username, email, password, full_name, role, is_active)
        VALUES ('richard', 'richard@usc.ac.id', 'keuangan@_123', 'Richard Admin Keuangan', 'admin_keuangan', true);
    END IF;
END $$;

-- Langkah 4: Verifikasi final
SELECT '=== DATA RICHARD ===' as info;
SELECT id, username, email, full_name, role, is_active, password
FROM users 
WHERE email = 'richard@usc.ac.id';

SELECT '=== SEMUA USERS ===' as info;
SELECT id, username, email, full_name, role, is_active
FROM users 
ORDER BY created_at DESC;
