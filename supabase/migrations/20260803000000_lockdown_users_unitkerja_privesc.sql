-- ============================================
-- TUTUP LUBANG PRIVILEGE ESCALATION: users & unit_kerja
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================
--
-- LATAR BELAKANG (lihat sql/fixes/fix-pengaturan-rls.sql dan
-- sql/archive/fix-login-rls.sql, keduanya digantikan oleh migrasi ini):
--
-- 1. RLS pada tabel `users`/`unit_kerja` hanya mensyaratkan
--    auth.role() = 'authenticated' — bukan role 'super_admin' aplikasi.
--    RPC seperti add_user/update_user/delete_user/add_unit_kerja/dst
--    adalah SECURITY DEFINER TANPA pengecekan role sama sekali di dalamnya,
--    dan dipanggil langsung dari browser (anon key) oleh UsersContext.jsx/
--    UnitKerjaContext.jsx. Siapa pun yang berhasil mendapat sesi Supabase
--    Auth asli (lihat "best-effort signInWithPassword" di app/login/page.jsx)
--    — bukan cuma super_admin — bisa memanggil mis. update_user() dengan
--    p_role='super_admin' untuk menaikkan role akun sendiri, atau
--    delete_user()/delete_unit_kerja() untuk menghapus data siapa pun.
--
-- 2. LEBIH PARAH: get_user_by_username()/get_user_by_email() (dipakai
--    login) mengembalikan KOLOM PASSWORD (hash bcrypt) dan di-GRANT ke
--    `anon` — visitor yang bahkan tidak login sama sekali bisa memanggil
--    get_user_by_username('admin') dari console browser dan mendapatkan
--    hash password user mana pun untuk di-brute-force offline.
--
-- PERBAIKAN: semua operasi users/unit_kerja sekarang lewat API route
-- Next.js (app/api/users, app/api/unit-kerja) yang pakai service-role key
-- di server dan dilindungi middleware.js (role super_admin) — pola yang
-- sama seperti /api/tamu, /api/program-kerja. Browser tidak lagi perlu
-- (dan tidak boleh) memanggil RPC-RPC di bawah ini sama sekali.
--
-- ⚠️ PENTING sebelum menjalankan: pastikan environment variable
-- SUPABASE_SERVICE_ROLE_KEY sudah diatur (dipakai app/api/auth/login/route.js
-- untuk login, dan semua route app/api/* yang baru). Tanpa itu, login akan
-- rusak setelah REVOKE di bawah karena route login tidak lagi bisa fallback
-- ke anon key untuk memanggil get_user_by_email/get_user_by_username.

-- 1. Cabut akses publik ke RPC login yang membocorkan hash password.
--    Tetap ada untuk dipanggil dari server (service_role selalu bisa
--    bypass GRANT/RLS, jadi login lewat app/api/auth/login/route.js tetap
--    berfungsi normal).
REVOKE EXECUTE ON FUNCTION get_user_by_username(VARCHAR) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_user_by_email(VARCHAR) FROM anon, authenticated;

-- 2. Hapus seluruh RPC CRUD users/unit_kerja yang tidak lagi dipanggil dari
--    mana pun di aplikasi (sudah diganti API route service-role) — dihapus
--    total, bukan cuma dicabut grant-nya, supaya tidak ada risiko ke-GRANT
--    lagi secara tidak sengaja di kemudian hari.
DROP FUNCTION IF EXISTS get_all_users();
DROP FUNCTION IF EXISTS get_all_unit_kerja();
DROP FUNCTION IF EXISTS add_user(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS update_user(UUID, VARCHAR, VARCHAR, VARCHAR, BOOLEAN);
DROP FUNCTION IF EXISTS update_user_with_password(UUID, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, VARCHAR);
DROP FUNCTION IF EXISTS toggle_user_status(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS delete_user(UUID);
DROP FUNCTION IF EXISTS add_unit_kerja(VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS update_unit_kerja(UUID, VARCHAR, VARCHAR, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS toggle_unit_kerja_status(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS delete_unit_kerja(UUID);

-- 3. Kunci RLS tabel `users`/`unit_kerja` ke service_role saja — sama
--    seperti pola yang sudah dipakai `tamu`/`program_kerja_pui`. Akses per-
--    role (super_admin) diatur di middleware.js, bukan di RLS.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view users" ON users;
DROP POLICY IF EXISTS "Authenticated users can insert users" ON users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON users;
DROP POLICY IF EXISTS "Authenticated users can delete users" ON users;
DROP POLICY IF EXISTS "Superadmin can view all users" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;

DROP POLICY IF EXISTS "Service role manage users" ON users;
CREATE POLICY "Service role manage users"
  ON users FOR ALL
  USING (auth.role() = 'service_role');

-- unit_kerja beda dari `users`: nama/kode unit BUKAN data sensitif (sudah
-- tampil publik lewat join di beberapa tempat lain, mis. panel TV Program
-- Kerja PUI), dan `laporan/page.jsx:695` masih query tabel ini langsung
-- dari browser (SELECT read-only, untuk dropdown filter) — jadi SELECT
-- tetap dibiarkan seperti kebijakan lama (authenticated), yang dikunci
-- lebih ketat di sini HANYA insert/update/delete-nya (itulah yang tadinya
-- bisa dieksploitasi lewat RPC tanpa cek role).
ALTER TABLE unit_kerja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view unit_kerja" ON unit_kerja;
DROP POLICY IF EXISTS "Authenticated users can insert unit_kerja" ON unit_kerja;
DROP POLICY IF EXISTS "Authenticated users can update unit_kerja" ON unit_kerja;
DROP POLICY IF EXISTS "Authenticated users can delete unit_kerja" ON unit_kerja;
DROP POLICY IF EXISTS "Unit kerja is viewable by everyone" ON unit_kerja;

CREATE POLICY "Authenticated users can view unit_kerja" ON unit_kerja
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manage unit_kerja" ON unit_kerja;
CREATE POLICY "Service role write unit_kerja"
  ON unit_kerja FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role update unit_kerja"
  ON unit_kerja FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service role delete unit_kerja"
  ON unit_kerja FOR DELETE USING (auth.role() = 'service_role');
