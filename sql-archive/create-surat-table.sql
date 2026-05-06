-- ============================================
-- TABEL: SURAT (Surat Masuk & Keluar)
-- ============================================

-- Tabel untuk surat masuk dan keluar dengan tipe field
CREATE TABLE IF NOT EXISTS surat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('masuk', 'keluar')), -- masuk atau keluar
    nomor_surat VARCHAR(100) NOT NULL,
    perihal TEXT NOT NULL,
    jenis VARCHAR(20) CHECK (jenis IN ('undangan', 'permohonan', 'pemberitahuan', 'lainnya')),
    
    -- Fields untuk surat masuk
    asal VARCHAR(255), -- pengirim surat masuk
    tertuju VARCHAR(255), -- ditujukan kepada
    tanggal_surat DATE, -- tanggal surat dibuat
    tanggal_diterima DATE, -- tanggal surat diterima
    
    -- Fields untuk surat keluar
    tujuan VARCHAR(255), -- penerima surat keluar
    tanggal_keluar DATE, -- tanggal surat dikirim
    unit_kerja_peminta VARCHAR(100), -- unit yang meminta surat
    pemohon VARCHAR(100), -- nama pemohon
    penanda_tangan VARCHAR(100), -- nama penanda tangan
    
    -- Common fields
    lampiran BOOLEAN DEFAULT false,
    file_lampiran TEXT, -- URL atau path file lampiran
    keterangan TEXT,
    status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'arsip', 'batal')),
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_surat_tipe ON surat(tipe);
CREATE INDEX IF NOT EXISTS idx_surat_nomor ON surat(nomor_surat);
CREATE INDEX IF NOT EXISTS idx_surat_jenis ON surat(jenis);
CREATE INDEX IF NOT EXISTS idx_surat_tanggal_masuk ON surat(tanggal_diterima) WHERE tipe = 'masuk';
CREATE INDEX IF NOT EXISTS idx_surat_tanggal_keluar ON surat(tanggal_keluar) WHERE tipe = 'keluar';

-- Enable RLS
ALTER TABLE surat ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow all" ON surat;
CREATE POLICY "Allow all" ON surat FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON surat TO anon;
GRANT ALL ON surat TO authenticated;
GRANT ALL ON surat TO postgres;

-- Verify
SELECT 'Tabel surat berhasil dibuat' as status;
