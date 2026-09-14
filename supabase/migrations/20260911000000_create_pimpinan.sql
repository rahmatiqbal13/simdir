-- ============================================
-- Data Pimpinan — daftar nama & jabatan pimpinan yang dikelola lewat
-- Pengaturan > Data Pimpinan, dipakai sebagai sumber dropdown "Kepada"
-- di Memo Pimpinan dan "Dihadiri Pimpinan > Nama Pimpinan" di Kelola
-- Agenda. Sebelumnya daftar ini hardcode di lib/constants/pimpinan.js
-- (butuh deploy ulang untuk mengubah) — sekarang dikelola dari database.
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

CREATE TABLE IF NOT EXISTS pimpinan (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama        text NOT NULL,
  jabatan     text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_pimpinan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pimpinan_updated_at ON pimpinan;
CREATE TRIGGER trg_pimpinan_updated_at
  BEFORE UPDATE ON pimpinan
  FOR EACH ROW
  EXECUTE FUNCTION set_pimpinan_updated_at();

-- RLS — hanya service role (dipakai app/api/pimpinan/*) yang boleh baca/
-- tulis. Akses per-role diatur di middleware.js: GET boleh super_admin/
-- admin/pimpinan (siapa pun yang bisa mengisi form agenda/memo), tulis
-- (POST/PUT/DELETE) cuma super_admin lewat halaman Pengaturan.
ALTER TABLE pimpinan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage pimpinan" ON pimpinan;
CREATE POLICY "Service role manage pimpinan"
  ON pimpinan FOR ALL
  USING (auth.role() = 'service_role');

-- Seed dari daftar lama (lib/constants/pimpinan.js) supaya dropdown yang
-- sudah ada (memo, agenda) tidak kosong begitu migrasi ini jalan — admin
-- lalu mengedit nama/jabatan yang sebenarnya lewat Pengaturan > Data
-- Pimpinan. Kalau baris ini sudah pernah ditambahkan (migrasi dijalankan
-- dua kali), tidak akan dobel karena dicek dulu.
INSERT INTO pimpinan (nama, jabatan)
SELECT v.nama, NULL
FROM (VALUES
  ('Rektor Unesa'),
  ('Wakil Rektor I'),
  ('Wakil Rektor II'),
  ('Wakil Rektor III'),
  ('Direktur USC'),
  ('Gubernur Jawa Timur'),
  ('Walikota Surabaya'),
  ('Kepala Dinas')
) AS v(nama)
WHERE NOT EXISTS (SELECT 1 FROM pimpinan WHERE pimpinan.nama = v.nama);
