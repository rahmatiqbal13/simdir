-- Migration: Jadwal operasional per hari untuk layar unit (Kolam, SSFC)
-- Created: 2026-10-30
-- Description: jadwal = array 7 elemen, indeks 0 = Minggu … 6 = Sabtu:
--   { "status": "buka" | "libur" | "tutup_sementara", "buka": "06:00", "tutup": "21:00" }
-- null = pakai jam_buka/jam_tutup untuk semua hari (perilaku lama).
-- Aman dijalankan ulang.

ALTER TABLE tv_screens ADD COLUMN IF NOT EXISTS jadwal jsonb;
