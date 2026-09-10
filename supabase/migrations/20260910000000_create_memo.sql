-- ============================================
-- Memo Pimpinan — modul nota dinas ringan, berdiri sendiri (tidak terkait
-- E-Invoice/E-Kwitansi/RAB/Agenda). super_admin membuat memo, mencetaknya
-- sebagai nota dinas A4, lalu minta tanda tangan basah ke pimpinan. Tidak
-- ada tanda tangan digital, workflow status, atau field jawaban.
-- Lihat docs/superpowers/specs/2026-09-10-memo-pimpinan-design.md
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

CREATE TABLE IF NOT EXISTS memo (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor        varchar(50) UNIQUE NOT NULL,
  tanggal      date NOT NULL DEFAULT CURRENT_DATE,
  kepada       text NOT NULL,
  dibuat_oleh  text NOT NULL,
  perihal      text NOT NULL,
  isi          text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memo_tanggal ON memo(tanggal);

-- Auto-generate nomor (format MEMO/2026/09/0001), pola identik dengan
-- generate_kwitansi_number()/generate_rab_number() — advisory lock per
-- bulan supaya dua memo yang dibuat bersamaan di bulan yang sama tidak
-- pernah dapat nomor urut yang sama.
CREATE OR REPLACE FUNCTION generate_memo_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    month_str TEXT;
    sequence_num INTEGER;
    lock_key BIGINT;
BEGIN
    year_str := TO_CHAR(NEW.tanggal, 'YYYY');
    month_str := TO_CHAR(NEW.tanggal, 'MM');

    lock_key := ('x' || md5('memo_seq_' || year_str || month_str))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(lock_key);

    SELECT COALESCE(MAX(CAST(SUBSTRING(nomor FROM '....$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM memo
    WHERE nomor LIKE 'MEMO/' || year_str || '/' || month_str || '/%';

    NEW.nomor := 'MEMO/' || year_str || '/' || month_str || '/' || LPAD(sequence_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_memo_number ON memo;
CREATE TRIGGER trg_generate_memo_number
  BEFORE INSERT ON memo
  FOR EACH ROW
  WHEN (NEW.nomor IS NULL OR NEW.nomor = '')
  EXECUTE FUNCTION generate_memo_number();

CREATE OR REPLACE FUNCTION set_memo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_memo_updated_at ON memo;
CREATE TRIGGER trg_memo_updated_at
  BEFORE UPDATE ON memo
  FOR EACH ROW
  EXECUTE FUNCTION set_memo_updated_at();

-- RLS — hanya service role (dipakai app/api/memo/*) yang boleh baca/tulis.
-- Akses per-role (super_admin tulis, pimpinan baca) diatur di middleware.js,
-- mengikuti pola kwitansi/rab.
ALTER TABLE memo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage memo" ON memo;
CREATE POLICY "Service role manage memo"
  ON memo FOR ALL
  USING (auth.role() = 'service_role');
