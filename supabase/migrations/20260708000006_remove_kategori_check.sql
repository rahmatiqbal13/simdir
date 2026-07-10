-- Migration: Remove kategori check constraint on kritik_saran
-- Date: 2026-07-08

ALTER TABLE kritik_saran
    DROP CONSTRAINT IF EXISTS kritik_saran_kategori_check;

ALTER TABLE kritik_saran
    ALTER COLUMN kategori TYPE VARCHAR(255);
