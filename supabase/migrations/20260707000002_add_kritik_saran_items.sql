-- Migration: Add kritik_saran_items table for multi-category feedback
-- Date: 2026-07-07

-- Remove columns moved to items table (keep backward compat via nullable)
ALTER TABLE kritik_saran 
  ALTER COLUMN kategori DROP NOT NULL,
  ALTER COLUMN isi DROP NOT NULL;

-- Add columns to parent table for summary
ALTER TABLE kritik_saran 
  ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5);

-- Create items table (1:N relationship)
CREATE TABLE IF NOT EXISTS kritik_saran_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kritik_saran_id UUID NOT NULL REFERENCES kritik_saran(id) ON DELETE CASCADE,
    kategori VARCHAR(50) NOT NULL CHECK (kategori IN ('Fasilitas', 'Pelayanan', 'Kegiatan', 'Lainnya')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    penjelasan TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(kritik_saran_id, kategori)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_kritik_id ON kritik_saran_items(kritik_saran_id);
CREATE INDEX IF NOT EXISTS idx_items_kategori ON kritik_saran_items(kategori);

-- RLS policies for items
ALTER TABLE kritik_saran_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert items" ON kritik_saran_items
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated select items" ON kritik_saran_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated update items" ON kritik_saran_items
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
