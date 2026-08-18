-- ============================================
-- RAB (Rencana Anggaran Biaya) — modul dokumen perencanaan anggaran,
-- berdiri sendiri (tidak terkait Program Kerja PUI/E-Invoice/E-Kwitansi/
-- Unit Kerja). Lihat docs/superpowers/specs/2026-08-18-rab-feature-design.md
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

CREATE TABLE IF NOT EXISTS rab (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor_rab             varchar(50) UNIQUE NOT NULL,
  nama_kegiatan         text NOT NULL,
  tahun_anggaran        integer NOT NULL,
  tanggal               date NOT NULL DEFAULT CURRENT_DATE,
  nama_penyusun         text,
  nama_penanggung_jawab text NOT NULL,
  created_by            uuid REFERENCES profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rab_items (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rab_id        uuid NOT NULL REFERENCES rab(id) ON DELETE CASCADE,
  kategori      text NOT NULL,
  uraian        text NOT NULL,
  volume        numeric(10,2) NOT NULL DEFAULT 1,
  satuan        text,
  harga_satuan  numeric(15,2) NOT NULL DEFAULT 0,
  total         numeric(15,2) GENERATED ALWAYS AS (volume * harga_satuan) STORED,
  urutan        integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rab_items_rab_id ON rab_items(rab_id);

-- Auto-generate nomor_rab (format RAB/2026/08/0001), pola identik dengan
-- generate_kwitansi_number()/generate_invoice_number() — advisory lock per
-- bulan supaya dua RAB yang dibuat bersamaan di bulan yang sama tidak
-- pernah dapat nomor urut yang sama.
CREATE OR REPLACE FUNCTION generate_rab_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    month_str TEXT;
    sequence_num INTEGER;
    lock_key BIGINT;
BEGIN
    year_str := TO_CHAR(NEW.tanggal, 'YYYY');
    month_str := TO_CHAR(NEW.tanggal, 'MM');

    lock_key := ('x' || md5('rab_seq_' || year_str || month_str))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(lock_key);

    SELECT COALESCE(MAX(CAST(SUBSTRING(nomor_rab FROM '....$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM rab
    WHERE nomor_rab LIKE 'RAB/' || year_str || '/' || month_str || '/%';

    NEW.nomor_rab := 'RAB/' || year_str || '/' || month_str || '/' || LPAD(sequence_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_rab_number ON rab;
CREATE TRIGGER trg_generate_rab_number
  BEFORE INSERT ON rab
  FOR EACH ROW
  WHEN (NEW.nomor_rab IS NULL OR NEW.nomor_rab = '')
  EXECUTE FUNCTION generate_rab_number();

CREATE OR REPLACE FUNCTION set_rab_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rab_updated_at ON rab;
CREATE TRIGGER trg_rab_updated_at
  BEFORE UPDATE ON rab
  FOR EACH ROW
  EXECUTE FUNCTION set_rab_updated_at();

-- RLS — hanya service role (dipakai app/api/rab/*) yang boleh baca/tulis.
-- Akses per-role (super_admin) diatur di middleware.js, mengikuti pola
-- program_kerja_pui/kwitansi.
ALTER TABLE rab ENABLE ROW LEVEL SECURITY;
ALTER TABLE rab_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage rab" ON rab;
CREATE POLICY "Service role manage rab"
  ON rab FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manage rab_items" ON rab_items;
CREATE POLICY "Service role manage rab_items"
  ON rab_items FOR ALL
  USING (auth.role() = 'service_role');
