-- ============================================================
-- SIMDIR: Buat Tabel SPJ Header & Detail
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- Tabel SPJ Header (baris induk per program kerja)
CREATE TABLE IF NOT EXISTS spj_header (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pencairan_id     UUID REFERENCES pencairan_dana(id) ON DELETE CASCADE,
  no_urut          INT,
  no_rba           TEXT DEFAULT '',
  uraian_kegiatan  TEXT DEFAULT '',
  jumlah_dana      NUMERIC(15,2) DEFAULT 0,
  unit_kerja       TEXT DEFAULT '',
  penerima         TEXT DEFAULT '',
  created_by       UUID,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Tabel SPJ Detail (rincian per baris induk)
CREATE TABLE IF NOT EXISTS spj_detail (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spj_header_id    UUID REFERENCES spj_header(id) ON DELETE CASCADE,
  nilai_anggaran   NUMERIC(15,2) DEFAULT 0,
  nomor_rka        TEXT DEFAULT '',   -- "No MAK" di UI
  uraian_kegiatan  TEXT DEFAULT '',   -- uraian kegiatan per detail
  id_spj           TEXT DEFAULT '',   -- ID SPJ opsional
  nominal          NUMERIC(15,2) DEFAULT 0,
  pph21            NUMERIC(15,2) DEFAULT 0,
  pph23            NUMERIC(15,2) DEFAULT 0,
  ppn              NUMERIC(15,2) DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_spj_header_pencairan ON spj_header(pencairan_id);
CREATE INDEX IF NOT EXISTS idx_spj_detail_header    ON spj_detail(spj_header_id);

-- Aktifkan Row Level Security
ALTER TABLE spj_header ENABLE ROW LEVEL SECURITY;
ALTER TABLE spj_detail ENABLE ROW LEVEL SECURITY;

-- Policy: semua user yang sudah login bisa baca/tulis
CREATE POLICY "spj_header_authenticated" ON spj_header
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "spj_detail_authenticated" ON spj_detail
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
