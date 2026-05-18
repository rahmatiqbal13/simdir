-- ============================================
-- TV Pamflets Setup
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

-- 1. Buat tabel tv_pamflets
CREATE TABLE IF NOT EXISTS tv_pamflets (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title         text NOT NULL,
  src_url       text NOT NULL,
  storage_path  text NOT NULL,
  duration      integer NOT NULL DEFAULT 15,
  order_num     integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- 2. Row Level Security
ALTER TABLE tv_pamflets ENABLE ROW LEVEL SECURITY;

-- Siapa pun bisa baca (TV Display adalah halaman publik)
CREATE POLICY "Public read tv_pamflets"
  ON tv_pamflets FOR SELECT USING (true);

-- Hanya service role yang bisa write (API route menggunakan service key)
CREATE POLICY "Service role write tv_pamflets"
  ON tv_pamflets FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 3. Buat Storage Bucket
-- Lakukan di: Supabase Dashboard → Storage → New bucket
--   Nama bucket : tv-pamflets
--   Public      : YES (centang "Public bucket")
-- ============================================

-- Atau lewat SQL (jika Supabase mendukung):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('tv-pamflets', 'tv-pamflets', true)
-- ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies (jalankan setelah bucket dibuat)
CREATE POLICY "Public read tv-pamflets storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tv-pamflets');

CREATE POLICY "Service role manage tv-pamflets storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'tv-pamflets' AND auth.role() = 'service_role');
