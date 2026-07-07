-- Migration: Create kritik_saran table for public feedback/criticism
-- Date: 2026-07-07

-- Table for storing public criticism and suggestions
CREATE TABLE IF NOT EXISTS kritik_saran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama VARCHAR(255),
    email VARCHAR(255),
    telepon VARCHAR(50),
    unit_kerja VARCHAR(255),
    kategori VARCHAR(50) NOT NULL CHECK (kategori IN ('Fasilitas', 'Pelayanan', 'Kegiatan', 'Lainnya')),
    isi TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_anonim BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'baru' CHECK (status IN ('baru', 'dibaca', 'ditanggapi')),
    tanggapan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_kritik_saran_status ON kritik_saran(status);
CREATE INDEX IF NOT EXISTS idx_kritik_saran_created ON kritik_saran(created_at DESC);

-- RLS: Allow public insert (no auth needed for submitting feedback)
ALTER TABLE kritik_saran ENABLE ROW LEVEL SECURITY;

-- Public can insert (for the form)
CREATE POLICY "Allow public insert" ON kritik_saran
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Only authenticated users can select/update (for dashboard)
CREATE POLICY "Allow authenticated select" ON kritik_saran
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated update" ON kritik_saran
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_kritik_saran_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_kritik_saran ON kritik_saran;
CREATE TRIGGER trigger_update_kritik_saran
    BEFORE UPDATE ON kritik_saran
    FOR EACH ROW
    EXECUTE FUNCTION update_kritik_saran_timestamp();
