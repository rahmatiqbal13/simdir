-- Migration: Add checkbox (pilihan multiple) support to pertanyaan_kritik_saran
-- Date: 2026-07-08

-- 1. Update tipe CHECK to include 'checkbox'
ALTER TABLE pertanyaan_kritik_saran
    DROP CONSTRAINT IF EXISTS pertanyaan_kritik_saran_tipe_check;

ALTER TABLE pertanyaan_kritik_saran
    ADD CONSTRAINT pertanyaan_kritik_saran_tipe_check
    CHECK (tipe IN ('rating', 'teks', 'pilihan_ganda', 'checkbox'));

-- 2. jawaban_pilihan already exists as VARCHAR(255). For checkbox, we'll store a JSON string array.
-- No schema change needed for items table — jawaban_pilihan can hold JSON string like '["A","B"]'.
