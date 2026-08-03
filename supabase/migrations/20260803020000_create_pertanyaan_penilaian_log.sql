-- ============================================
-- Log audit untuk pertanyaan_kritik_saran (pertanyaan penilaian fasilitas)
-- — mencatat siapa menambah/menghapus pertanyaan, kapan, dan apa isinya.
-- Halaman kelola pertanyaan sekarang bisa diakses admin (bukan cuma
-- super_admin), tapi log ini sengaja HANYA bisa dibaca super_admin — lihat
-- middleware.js prefix '/kelola-penilaian/pertanyaan/log' dan
-- '/api/pertanyaan-kritik-saran/log'.
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

CREATE TABLE IF NOT EXISTS pertanyaan_penilaian_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action            VARCHAR(20) NOT NULL CHECK (action IN ('create', 'delete')),
  -- pertanyaan_id BUKAN foreign key — sengaja disimpan sebagai snapshot,
  -- bukan referensi hidup, supaya log tetap lengkap & bisa dibaca meski
  -- baris pertanyaan aslinya sudah dihapus (justru itu yang paling penting
  -- dicatat: aksi hapus).
  pertanyaan_id     UUID,
  fasilitas_name    TEXT NOT NULL,
  pertanyaan_text   TEXT NOT NULL,
  -- Snapshot identitas aktor (bukan FK ke users) — log tetap terbaca utuh
  -- meski akun aktornya kelak dihapus/diubah.
  actor_id          UUID,
  actor_username    TEXT,
  actor_role        TEXT,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pertanyaan_penilaian_log_created_at ON pertanyaan_penilaian_log(created_at DESC);

-- RLS — service role saja (dipakai app/api/pertanyaan-kritik-saran/*).
-- Akses baca dibatasi super_admin di level middleware.js + API route,
-- bukan di sini, mengikuti pola tabel-tabel lain yang sudah dibuat sesi ini.
ALTER TABLE pertanyaan_penilaian_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage pertanyaan_penilaian_log" ON pertanyaan_penilaian_log;
CREATE POLICY "Service role manage pertanyaan_penilaian_log"
  ON pertanyaan_penilaian_log FOR ALL
  USING (auth.role() = 'service_role');
