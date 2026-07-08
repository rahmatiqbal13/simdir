-- Migration: Add multiple choice (pilihan ganda) support
-- Date: 2026-07-08

-- 1. Update tipe CHECK to include 'pilihan_ganda'
ALTER TABLE pertanyaan_kritik_saran
    DROP CONSTRAINT IF EXISTS pertanyaan_kritik_saran_tipe_check;

ALTER TABLE pertanyaan_kritik_saran
    ADD CONSTRAINT pertanyaan_kritik_saran_tipe_check
    CHECK (tipe IN ('rating', 'teks', 'pilihan_ganda'));

-- 2. Add opsi_pilihan column (JSONB array of strings)
ALTER TABLE pertanyaan_kritik_saran
    ADD COLUMN IF NOT EXISTS opsi_pilihan JSONB DEFAULT NULL;

-- 3. Add jawaban_pilihan column to items table
ALTER TABLE kritik_saran_items
    ADD COLUMN IF NOT EXISTS jawaban_pilihan VARCHAR(255) DEFAULT NULL;

-- 4. Relax rating & penjelasan constraints for non-rating types
ALTER TABLE kritik_saran_items
    DROP CONSTRAINT IF EXISTS kritik_saran_items_rating_check;

ALTER TABLE kritik_saran_items
    ADD CONSTRAINT kritik_saran_items_rating_check
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

ALTER TABLE kritik_saran_items
    ALTER COLUMN rating DROP NOT NULL;

ALTER TABLE kritik_saran_items
    ALTER COLUMN penjelasan DROP NOT NULL;
