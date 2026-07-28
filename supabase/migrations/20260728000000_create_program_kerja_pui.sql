-- ============================================
-- Program Kerja PUI (Keolahragaan, Disabilitas, Seni Budaya)
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

-- Nama tabel sengaja "program_kerja_pui" (bukan "program_kerja") supaya
-- tidak bentrok dengan tabel program_kerja yang sudah dipakai modul
-- keuangan lain (lihat sql/schema/supabase-schema.sql + app/(dashboard)/laporan).
CREATE TABLE IF NOT EXISTS program_kerja_pui (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_kerja_id     uuid NOT NULL REFERENCES unit_kerja(id),
  nama_program      text NOT NULL,
  deskripsi         text,
  anggaran          numeric(15,2) NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'belum_berjalan'
                      CHECK (status IN ('belum_berjalan', 'akan_berlangsung', 'berlangsung', 'selesai')),
  tanggal_mulai     date,
  tanggal_selesai   date,
  nominal_spj       numeric(15,2),
  created_by        uuid REFERENCES profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Kolom link_dokumentasi/QR tidak jadi dipakai (dibatalkan pimpinan) — drop
-- kalau ada dari percobaan run migrasi versi sebelumnya.
ALTER TABLE program_kerja_pui DROP COLUMN IF EXISTS link_dokumentasi;

CREATE INDEX IF NOT EXISTS idx_program_kerja_pui_unit_kerja ON program_kerja_pui(unit_kerja_id);

-- Row Level Security — hanya service role (dipakai API route) yang boleh
-- baca/tulis. Akses per-role (super_admin/admin/pimpinan) diatur di
-- middleware.js, bukan di RLS, mengikuti pola tv-pamflets/tamu.
ALTER TABLE program_kerja_pui ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage program_kerja_pui" ON program_kerja_pui;
CREATE POLICY "Service role manage program_kerja_pui"
  ON program_kerja_pui FOR ALL
  USING (auth.role() = 'service_role');
