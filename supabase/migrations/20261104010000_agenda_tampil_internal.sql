-- Migration: Opsi tampilkan agenda di TV Internal
-- Created: 2026-11-04
-- Description: false = agenda disembunyikan dari /agenda/tv-internal.
-- Default true (perilaku lama: semua agenda tampil di TV Internal).
-- Aman dijalankan ulang.

ALTER TABLE agenda ADD COLUMN IF NOT EXISTS tampil_internal boolean NOT NULL DEFAULT true;
