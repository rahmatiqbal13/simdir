-- ============================================
-- Migration: Add type column to tv_pamflets for YouTube support
-- Date: 2026-07-08
-- ============================================

-- 1. Tambah kolom type (image | youtube)
ALTER TABLE tv_pamflets 
  ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'image';

-- 2. Storage path boleh null untuk YouTube (tidak ada file di storage)
ALTER TABLE tv_pamflets 
  ALTER COLUMN storage_path DROP NOT NULL;

-- 3. Pastikan storage_path tetap required untuk type='image'
-- (Di-handle di aplikasi layer, tidak perlu DB constraint)

-- 4. Update existing records jadi type='image'
UPDATE tv_pamflets SET type = 'image' WHERE type IS NULL OR type = '';

-- 5. Index untuk query by type
CREATE INDEX IF NOT EXISTS idx_tv_pamflets_type ON tv_pamflets(type);
