-- Migration: Create pertanyaan_kritik_saran table for admin-managed custom questions per facility
-- Date: 2026-07-08

-- Table for storing custom questions per facility/unit usaha
CREATE TABLE IF NOT EXISTS pertanyaan_kritik_saran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fasilitas_name VARCHAR(100) NOT NULL,
    pertanyaan TEXT NOT NULL,
    tipe VARCHAR(20) DEFAULT 'rating' CHECK (tipe IN ('rating', 'teks')),
    urutan INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pertanyaan_fasilitas ON pertanyaan_kritik_saran(fasilitas_name);
CREATE INDEX IF NOT EXISTS idx_pertanyaan_active ON pertanyaan_kritik_saran(is_active);
CREATE INDEX IF NOT EXISTS idx_pertanyaan_urutan ON pertanyaan_kritik_saran(urutan);

-- RLS policies
ALTER TABLE pertanyaan_kritik_saran ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to make idempotent
DROP POLICY IF EXISTS "Allow public read active questions" ON pertanyaan_kritik_saran;
DROP POLICY IF EXISTS "Allow authenticated read all" ON pertanyaan_kritik_saran;
DROP POLICY IF EXISTS "Allow authenticated insert" ON pertanyaan_kritik_saran;
DROP POLICY IF EXISTS "Allow authenticated update" ON pertanyaan_kritik_saran;
DROP POLICY IF EXISTS "Allow authenticated delete" ON pertanyaan_kritik_saran;

-- Anyone can read active questions (for public form)
CREATE POLICY "Allow public read active questions" ON pertanyaan_kritik_saran
    FOR SELECT TO anon, authenticated USING (is_active = true);

-- Authenticated users can read all questions (for admin dashboard)
CREATE POLICY "Allow authenticated read all" ON pertanyaan_kritik_saran
    FOR SELECT TO authenticated USING (true);

-- Only authenticated users can insert/update/delete (admin/superadmin check in app layer)
CREATE POLICY "Allow authenticated insert" ON pertanyaan_kritik_saran
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON pertanyaan_kritik_saran
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete" ON pertanyaan_kritik_saran
    FOR DELETE TO authenticated USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_pertanyaan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pertanyaan ON pertanyaan_kritik_saran;
CREATE TRIGGER trigger_update_pertanyaan
    BEFORE UPDATE ON pertanyaan_kritik_saran
    FOR EACH ROW
    EXECUTE FUNCTION update_pertanyaan_timestamp();

-- Add pertanyaan_id column to kritik_saran_items for linking to custom questions
ALTER TABLE kritik_saran_items
    ADD COLUMN IF NOT EXISTS pertanyaan_id UUID REFERENCES pertanyaan_kritik_saran(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_items_pertanyaan_id ON kritik_saran_items(pertanyaan_id);
