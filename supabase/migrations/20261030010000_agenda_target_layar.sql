-- Migration: Layar TV per agenda
-- Created: 2026-10-30
-- Description: Agenda publik bisa dipilih tampil di layar TV tertentu.
-- '{}' = otomatis (perilaku lama): TV Gedung USC selalu, TV unit (Kolam/SSFC)
-- bila penyelenggaranya unit tersebut. Aman dijalankan ulang.

ALTER TABLE agenda ADD COLUMN IF NOT EXISTS target_layar text[] NOT NULL DEFAULT '{}';
