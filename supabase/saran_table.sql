-- Tabel untuk Kritik, Saran, dan Permohonan dari pengguna
CREATE TABLE IF NOT EXISTS saran (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jenis                TEXT NOT NULL CHECK (jenis IN ('kritik', 'saran', 'permohonan_kelas', 'permohonan_kegiatan')),
  fasilitas            TEXT NOT NULL,
  -- untuk kritik & saran
  judul                TEXT,
  isi                  TEXT,
  -- untuk permohonan
  nama_kelas_kegiatan  TEXT,
  tanggal_diinginkan   DATE,
  estimasi_peserta     INTEGER,
  catatan              TEXT,
  -- identitas pengirim
  nama                 TEXT,
  email                TEXT,
  telepon              TEXT,
  unit_kerja           TEXT,
  jenis_kelamin        TEXT NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
  is_anonim            BOOLEAN DEFAULT FALSE,
  -- admin
  status               TEXT DEFAULT 'baru' CHECK (status IN ('baru', 'dibaca', 'diproses', 'selesai', 'ditolak')),
  tanggapan            TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk filter yang sering digunakan
CREATE INDEX IF NOT EXISTS saran_status_idx  ON saran (status);
CREATE INDEX IF NOT EXISTS saran_jenis_idx   ON saran (jenis);
CREATE INDEX IF NOT EXISTS saran_created_idx ON saran (created_at DESC);

-- Trigger auto-update updated_at
CREATE OR REPLACE FUNCTION update_saran_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS saran_updated_at_trigger ON saran;
CREATE TRIGGER saran_updated_at_trigger
  BEFORE UPDATE ON saran
  FOR EACH ROW EXECUTE FUNCTION update_saran_updated_at();

-- RLS: public boleh INSERT, hanya service role yang boleh SELECT/UPDATE/DELETE
ALTER TABLE saran ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public insert saran"
  ON saran FOR INSERT
  WITH CHECK (true);

CREATE POLICY "service select saran"
  ON saran FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "service update saran"
  ON saran FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "service delete saran"
  ON saran FOR DELETE
  USING (auth.role() = 'service_role');
