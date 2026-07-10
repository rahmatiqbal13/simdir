-- Migration: Add jenis_kelamin column to kritik_saran
-- Date: 2026-07-08

ALTER TABLE kritik_saran
    ADD COLUMN IF NOT EXISTS jenis_kelamin VARCHAR(20) CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan'));
