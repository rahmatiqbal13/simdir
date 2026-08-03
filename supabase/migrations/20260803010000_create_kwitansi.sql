-- ============================================
-- E-Kwitansi (kuitansi pembayaran) — modul terpisah dari E-Invoice, tapi
-- bisa opsional dikaitkan ke satu invoice (invoice_id, nullable — kwitansi
-- juga bisa berdiri sendiri tanpa invoice).
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

CREATE TABLE IF NOT EXISTS kwitansi (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_kwitansi    VARCHAR(50) UNIQUE NOT NULL,
  tanggal           DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_id        UUID REFERENCES invoices(id) ON DELETE SET NULL,
  terima_dari       TEXT NOT NULL,
  jumlah            DECIMAL(15,2) NOT NULL CHECK (jumlah >= 0),
  untuk_pembayaran  TEXT NOT NULL,
  penerima          TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kwitansi_invoice_id ON kwitansi(invoice_id);
CREATE INDEX IF NOT EXISTS idx_kwitansi_tanggal ON kwitansi(tanggal);

-- Auto-generate nomor_kwitansi (format KW/2026/07/0001), mengikuti pola
-- yang sama persis dengan generate_invoice_number() — termasuk advisory
-- lock per bulan supaya dua kwitansi yang dibuat bersamaan di bulan yang
-- sama tidak pernah mendapat nomor urut yang sama (lihat migrasi
-- 20260707000000_fix_invoice_number_race.sql untuk kenapa lock ini perlu).
CREATE OR REPLACE FUNCTION generate_kwitansi_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    month_str TEXT;
    sequence_num INTEGER;
    lock_key BIGINT;
BEGIN
    year_str := TO_CHAR(NEW.tanggal, 'YYYY');
    month_str := TO_CHAR(NEW.tanggal, 'MM');

    lock_key := ('x' || md5('kwitansi_seq_' || year_str || month_str))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(lock_key);

    SELECT COALESCE(MAX(CAST(SUBSTRING(nomor_kwitansi FROM '....$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM kwitansi
    WHERE nomor_kwitansi LIKE 'KW/' || year_str || '/' || month_str || '/%';

    NEW.nomor_kwitansi := 'KW/' || year_str || '/' || month_str || '/' || LPAD(sequence_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_kwitansi_number ON kwitansi;
CREATE TRIGGER trg_generate_kwitansi_number
  BEFORE INSERT ON kwitansi
  FOR EACH ROW
  WHEN (NEW.nomor_kwitansi IS NULL OR NEW.nomor_kwitansi = '')
  EXECUTE FUNCTION generate_kwitansi_number();

CREATE OR REPLACE FUNCTION set_kwitansi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kwitansi_updated_at ON kwitansi;
CREATE TRIGGER trg_kwitansi_updated_at
  BEFORE UPDATE ON kwitansi
  FOR EACH ROW
  EXECUTE FUNCTION set_kwitansi_updated_at();

-- RLS — hanya service role (dipakai app/api/kwitansi/*) yang boleh baca/
-- tulis. Akses per-role (super_admin) diatur di middleware.js, mengikuti
-- pola tamu/program_kerja_pui, bukan pola lama e-invoice (RLS
-- 'authenticated' + browser langsung).
ALTER TABLE kwitansi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage kwitansi" ON kwitansi;
CREATE POLICY "Service role manage kwitansi"
  ON kwitansi FOR ALL
  USING (auth.role() = 'service_role');
