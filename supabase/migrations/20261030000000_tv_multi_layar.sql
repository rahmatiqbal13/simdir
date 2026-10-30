-- Migration: TV multi-layar (Gedung USC, Kolam Renang, SSFC)
-- Created: 2026-10-30
-- Description: Satu halaman TV dipakai di beberapa lokasi. Pamflet bisa
-- ditargetkan ke layar tertentu (target_layar kosong = tampil di semua TV),
-- dan tiap layar unit punya info operasional sendiri (jam buka, status,
-- running text) yang bisa diubah admin tanpa deploy.

-- 1. Target layar per pamflet. '{}' = semua layar (perilaku lama).
ALTER TABLE tv_pamflets ADD COLUMN IF NOT EXISTS target_layar text[] NOT NULL DEFAULT '{}';

-- 2. Info operasional per layar
CREATE TABLE IF NOT EXISTS tv_screens (
  slug          text PRIMARY KEY,               -- 'kolam' | 'ssfc' (cocok dengan URL /agenda/tv/<slug>)
  jam_buka      time,                           -- null = status buka/tutup tidak ditampilkan
  jam_tutup     time,
  tutup_sementara boolean NOT NULL DEFAULT false, -- override manual (perawatan, cuaca, dll.)
  catatan       text,                           -- alasan tutup / info singkat di kartu status
  running_text  text,                           -- satu info per baris, tampil di ticker bawah
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE tv_screens ENABLE ROW LEVEL SECURITY;

-- TV adalah halaman publik; tulis hanya lewat API route (service role).
-- DROP dulu agar migrasi aman dijalankan ulang.
DROP POLICY IF EXISTS "Public read tv_screens" ON tv_screens;
DROP POLICY IF EXISTS "Service role write tv_screens" ON tv_screens;

CREATE POLICY "Public read tv_screens"
  ON tv_screens FOR SELECT USING (true);

CREATE POLICY "Service role write tv_screens"
  ON tv_screens FOR ALL USING (auth.role() = 'service_role');

INSERT INTO tv_screens (slug, jam_buka, jam_tutup) VALUES
  ('kolam', '06:00', '18:00'),
  ('ssfc',  '06:00', '21:00')
ON CONFLICT (slug) DO NOTHING;
