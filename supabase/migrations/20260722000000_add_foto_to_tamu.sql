-- ============================================
-- Tambah kolom foto ke tabel tamu + setup storage bucket
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

-- 1. Tambah kolom foto_path (path di storage bucket, bukan URL publik —
--    supaya bisa dihapus dan di-generate ulang signed URL-nya)
ALTER TABLE tamu ADD COLUMN IF NOT EXISTS foto_path text;

-- ============================================
-- 2. Buat Storage Bucket
-- Lakukan di: Supabase Dashboard → Storage → New bucket
--   Nama bucket : tamu-foto
--   Public      : NO (private — foto tamu adalah data pribadi, akses
--                 hanya lewat signed URL yang di-generate di endpoint
--                 admin yang sudah dilindungi auth)
-- ============================================

-- 3. Storage policies (jalankan setelah bucket dibuat)
-- Hanya service role (dipakai API route) yang boleh baca/tulis — tidak ada
-- policy "public read" seperti bucket tv-pamflets/app-settings, karena
-- bucket ini memang private.
CREATE POLICY "Service role manage tamu-foto storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'tamu-foto' AND auth.role() = 'service_role');
