-- ============================================
-- Izinkan baca publik program_kerja_pui (untuk /agenda/tv-internal)
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

-- Sama seperti policy "Agenda is viewable by everyone" pada tabel agenda —
-- halaman TV internal tidak pakai login, jadi butuh baca langsung lewat
-- Supabase client (anon key), bukan lewat /api/program-kerja yang
-- mensyaratkan auth header + role.
DROP POLICY IF EXISTS "Public read program_kerja_pui" ON program_kerja_pui;
CREATE POLICY "Public read program_kerja_pui"
  ON program_kerja_pui FOR SELECT
  USING (true);
