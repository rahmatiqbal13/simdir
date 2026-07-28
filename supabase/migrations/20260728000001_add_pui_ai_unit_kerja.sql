-- ============================================
-- Tambah unit kerja PUI AI
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

INSERT INTO unit_kerja (nama, kode, is_active)
VALUES ('PUI AI', 'pui-ai', true)
ON CONFLICT (kode) DO NOTHING;
