-- Migration: Opsi tampilkan penyelenggara di layar TV
-- Created: 2026-11-03
-- Description: false = nama penyelenggara disembunyikan di TV publik/unit
-- (TV Internal tetap menampilkan). Aman dijalankan ulang.

ALTER TABLE agenda ADD COLUMN IF NOT EXISTS tampil_penyelenggara boolean NOT NULL DEFAULT true;
