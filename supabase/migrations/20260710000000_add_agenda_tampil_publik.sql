-- Migration: Add agenda tampil_publik visibility flag
-- Created: 2026-07-10
-- Description: Distinguishes agenda that are safe to show on the public TV
-- display (/agenda/tv) from internal-only agenda, which only appear on the
-- unauthenticated internal display (/agenda/tv-internal). Defaults to false
-- for both existing rows and new rows — nothing is public until a staff
-- member explicitly marks it, per the approved design.

ALTER TABLE agenda ADD COLUMN IF NOT EXISTS tampil_publik BOOLEAN NOT NULL DEFAULT false;
