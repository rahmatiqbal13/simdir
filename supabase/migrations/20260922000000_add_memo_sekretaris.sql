-- ============================================
-- Tambah penanda tangan Sekretaris pada memo — nota dinas cetak sekarang
-- punya 3 tanda tangan: Pembuat Memo, Sekretaris, dan Pimpinan (kolom
-- `kepada`). Nullable supaya memo lama tetap valid; kalau kosong, kolom
-- tanda tangan sekretaris dicetak dengan garis titik-titik.
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

ALTER TABLE memo
  ADD COLUMN IF NOT EXISTS sekretaris TEXT;
