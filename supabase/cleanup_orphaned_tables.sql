-- =================================================================
-- SIMDIR – Supabase Cleanup Script
-- Jalankan di Supabase SQL Editor (Settings > SQL Editor)
-- =================================================================

-- BAGIAN 1: DROP TABEL ORPHANED
-- Tabel ini tidak lagi punya halaman/route/hook yang menggunakannya
-- =================================================================

-- 1a. Tabel `surat` — halaman /surat sudah dihapus, SuratContext sudah dihapus
DROP TABLE IF EXISTS surat CASCADE;

-- 1b. Tabel `spj` — hanya dipakai di hook useSPJ yang sudah dihapus
DROP TABLE IF EXISTS spj CASCADE;


-- =================================================================
-- CATATAN PENTING: tabel `program_kerja`
-- -----------------------------------------------------------------
-- Halaman /program-kerja dan context ProgramKerjaContext sudah dihapus,
-- TETAPI halaman /laporan masih melakukan join berikut:
--
--   pencairan_dana → pencairan_program → program_kerja
--
-- Jika program_kerja di-DROP CASCADE, maka:
--   • pencairan_program (junction table) ikut terhapus
--   • laporan tidak bisa lagi menampilkan alokasi per program
--   • view `laporan_serapan_program` (jika ada) juga ikut drop
--
-- Pilihan:
--   A) Biarkan program_kerja tetap ada — data historis masih bisa tampil di
--      laporan walaupun tidak ada UI untuk mengelolanya. (REKOMENDASI)
--   B) Hapus program_kerja CASCADE dan update halaman laporan agar tidak
--      join ke program_kerja lagi, lalu hapus kolom pencairan_program.
--
-- Untuk menjalankan opsi B, uncomment blok di bawah ini:
-- =================================================================

/*
-- OPSI B: Drop program_kerja beserta dependensinya
DROP TABLE IF EXISTS pencairan_program CASCADE;  -- junction table
DROP TABLE IF EXISTS program_kerja CASCADE;       -- ini juga drop laporan_serapan_program jika itu VIEW
DROP TABLE IF EXISTS pencairan_dana CASCADE;      -- HANYA jika laporan tidak perlu data pencairan lagi
*/


-- =================================================================
-- BAGIAN 2: DROP FUNGSI RPC YANG TIDAK DIPAKAI
-- =================================================================

DROP FUNCTION IF EXISTS update_program_dana_terpakai(UUID, NUMERIC);
DROP FUNCTION IF EXISTS recalculate_all_program_dana();


-- =================================================================
-- BAGIAN 3: BUAT TABEL BARU — `saran`
-- Untuk fitur Kritik, Saran, dan Permohonan Kelas/Kegiatan
-- =================================================================

CREATE TABLE IF NOT EXISTS saran (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jenis                TEXT NOT NULL CHECK (jenis IN ('kritik', 'saran', 'permohonan_kelas', 'permohonan_kegiatan')),
  fasilitas            TEXT NOT NULL,

  -- untuk kritik & saran
  judul                TEXT,
  isi                  TEXT,

  -- untuk permohonan kelas/kegiatan
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

-- RLS: public boleh INSERT, hanya service_role yang boleh SELECT/UPDATE/DELETE
ALTER TABLE saran ENABLE ROW LEVEL SECURITY;

-- Drop policy lama jika sudah pernah dibuat (agar script bisa dijalankan ulang)
DROP POLICY IF EXISTS "public insert saran" ON saran;
DROP POLICY IF EXISTS "service select saran" ON saran;
DROP POLICY IF EXISTS "service update saran" ON saran;
DROP POLICY IF EXISTS "service delete saran" ON saran;

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


-- =================================================================
-- RINGKASAN HASIL EKSEKUSI YANG DIHARAPKAN:
-- -----------------------------------------------------------------
-- ✓ DROP TABLE surat         — halaman /surat sudah dihapus
-- ✓ DROP TABLE spj           — hook useSPJ sudah dihapus
-- ✓ DROP FUNCTION rpc lama   — tidak ada kode yang memanggilnya
-- ✓ CREATE TABLE saran       — untuk fitur Kritik & Saran baru
--
-- ✗ TIDAK drop program_kerja — laporan masih join ke tabel ini
--   (Uncomment Opsi B jika ingin dihapus dan hapus join di laporan)
-- =================================================================
