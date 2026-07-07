-- Migration: Add aspek column to kritik_saran_items
-- Date: 2026-07-07
-- Aspek membantu membedakan kritik untuk sarana vs prasarana vs pelayanan

ALTER TABLE kritik_saran_items
  ADD COLUMN IF NOT EXISTS aspek VARCHAR(50) CHECK (aspek IN ('Sarana', 'Prasarana', 'Pelayanan', 'Kebersihan', 'Keamanan', 'Lainnya'));

-- Update existing rows to set default
UPDATE kritik_saran_items SET aspek = 'Lainnya' WHERE aspek IS NULL;
