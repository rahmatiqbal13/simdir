-- Migration: Remove aspek check constraint on kritik_saran_items
-- Date: 2026-07-08

-- 1. Drop the old check constraint that only allowed default aspect names
ALTER TABLE kritik_saran_items
    DROP CONSTRAINT IF EXISTS kritik_saran_items_aspek_check;

-- 2. Increase column length to accommodate custom question text
ALTER TABLE kritik_saran_items
    ALTER COLUMN aspek TYPE VARCHAR(255);
