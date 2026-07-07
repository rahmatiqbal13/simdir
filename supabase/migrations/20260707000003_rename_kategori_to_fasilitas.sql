-- Migration: Rename kategori to fasilitas, update constraints
-- Date: 2026-07-07

-- Step 1: Drop old constraints
ALTER TABLE kritik_saran_items 
  DROP CONSTRAINT IF EXISTS kritik_saran_items_kategori_check,
  DROP CONSTRAINT IF EXISTS kritik_saran_items_kritik_saran_id_kategori_key;

-- Step 2: Rename column
ALTER TABLE kritik_saran_items RENAME COLUMN kategori TO fasilitas;

-- Step 3: Alter column type to be more flexible for facility names
ALTER TABLE kritik_saran_items ALTER COLUMN fasilitas TYPE VARCHAR(100);

-- Step 4: Add new unique constraint
ALTER TABLE kritik_saran_items 
  ADD CONSTRAINT kritik_saran_items_kritik_fasilitas_unique 
  UNIQUE (kritik_saran_id, fasilitas);

-- Step 5: Update parent table to store comma-separated facilities
ALTER TABLE kritik_saran 
  ALTER COLUMN kategori TYPE VARCHAR(255);
