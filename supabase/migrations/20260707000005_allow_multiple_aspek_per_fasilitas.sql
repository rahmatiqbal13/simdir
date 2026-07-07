-- Migration: Allow multiple aspek per fasilitas in kritik_saran_items
-- Date: 2026-07-07

-- Drop old unique constraint on (kritik_saran_id, fasilitas)
ALTER TABLE kritik_saran_items
  DROP CONSTRAINT IF EXISTS kritik_saran_items_kritik_fasilitas_unique;

-- Add new unique constraint on (kritik_saran_id, fasilitas, aspek)
-- This allows: 1 fasilitas to have multiple aspek entries
ALTER TABLE kritik_saran_items
  ADD CONSTRAINT kritik_saran_items_kritik_fasilitas_aspek_unique
  UNIQUE (kritik_saran_id, fasilitas, aspek);
