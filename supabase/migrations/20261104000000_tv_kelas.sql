-- Migration: Kelas rutin mingguan per layar unit (Kolam Renang, SSFC)
-- Created: 2026-11-04
-- Description: Kelas yang berulang tiap minggu (mis. Senam Aerobik Senin &
-- Rabu 07.00). Dikelola di halaman Agenda Kolam / Agenda SSFC dan tampil di
-- "Kelas hari ini" TV unit, digabung dengan agenda publik hari itu.
-- hari = indeks getDay(): 0 = Minggu … 6 = Sabtu. Aman dijalankan ulang.

CREATE TABLE IF NOT EXISTS tv_kelas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layar         text NOT NULL,                 -- slug tv_screens: 'kolam' | 'ssfc'
  nama          text NOT NULL,
  hari          smallint[] NOT NULL DEFAULT '{}',
  waktu_mulai   time NOT NULL,
  waktu_selesai time,
  pelatih       text,
  lokasi        text,
  aktif         boolean NOT NULL DEFAULT true, -- false = disembunyikan dari TV tanpa dihapus
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tv_kelas_layar_idx ON tv_kelas (layar);

ALTER TABLE tv_kelas ENABLE ROW LEVEL SECURITY;

-- TV adalah halaman publik; tulis hanya lewat API route (service role).
DROP POLICY IF EXISTS "Public read tv_kelas" ON tv_kelas;
DROP POLICY IF EXISTS "Service role write tv_kelas" ON tv_kelas;

CREATE POLICY "Public read tv_kelas"
  ON tv_kelas FOR SELECT USING (true);

CREATE POLICY "Service role write tv_kelas"
  ON tv_kelas FOR ALL USING (auth.role() = 'service_role');
