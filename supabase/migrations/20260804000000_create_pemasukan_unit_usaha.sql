-- ============================================
-- Pemasukan Unit Usaha — modul pencatatan pemasukan bulanan per unit usaha
-- (dulunya sistem terpisah "SIREKAP", sekarang digabung ke SIMDIR).
-- Nama tabel sengaja dibedakan dari `unit_kerja` (yang dipakai untuk
-- struktur organisasi/direktorat) — `unit_usaha` di sini artinya unit
-- bisnis seperti Kolam Renang, Achilles Gym Hub, dll.
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

CREATE TABLE IF NOT EXISTS unit_usaha (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama       VARCHAR(255) NOT NULL UNIQUE,
  aktif      BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS target_unit_usaha (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_usaha_id  UUID NOT NULL REFERENCES unit_usaha(id) ON DELETE CASCADE,
  tahun          INTEGER NOT NULL,
  target_tahunan BIGINT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(unit_usaha_id, tahun)
);

CREATE TABLE IF NOT EXISTS pemasukan_unit_usaha (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_usaha_id UUID NOT NULL REFERENCES unit_usaha(id) ON DELETE CASCADE,
  tahun         INTEGER NOT NULL,
  bulan         INTEGER NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
  jumlah        BIGINT NOT NULL DEFAULT 0,
  keterangan    TEXT,
  locked        BOOLEAN NOT NULL DEFAULT false,
  locked_at     TIMESTAMPTZ,
  locked_by     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(unit_usaha_id, tahun, bulan)
);

CREATE INDEX IF NOT EXISTS idx_pemasukan_unit_usaha_tahun ON pemasukan_unit_usaha(tahun);
CREATE INDEX IF NOT EXISTS idx_pemasukan_unit_usaha_locked ON pemasukan_unit_usaha(locked);
CREATE INDEX IF NOT EXISTS idx_target_unit_usaha_tahun ON target_unit_usaha(tahun);

CREATE OR REPLACE FUNCTION set_target_unit_usaha_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_target_unit_usaha_updated_at ON target_unit_usaha;
CREATE TRIGGER trg_target_unit_usaha_updated_at
  BEFORE UPDATE ON target_unit_usaha
  FOR EACH ROW
  EXECUTE FUNCTION set_target_unit_usaha_updated_at();

CREATE OR REPLACE FUNCTION set_pemasukan_unit_usaha_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pemasukan_unit_usaha_updated_at ON pemasukan_unit_usaha;
CREATE TRIGGER trg_pemasukan_unit_usaha_updated_at
  BEFORE UPDATE ON pemasukan_unit_usaha
  FOR EACH ROW
  EXECUTE FUNCTION set_pemasukan_unit_usaha_updated_at();

-- RLS — hanya service role (dipakai app/api/unit-usaha, /api/target-unit-usaha,
-- /api/pemasukan-unit-usaha) yang boleh baca/tulis. Akses per-role
-- (super_admin, admin_keuangan) diatur di middleware.js, mengikuti pola
-- e-kwitansi — bukan pola lama e-invoice (RLS 'authenticated' + browser
-- langsung, yang pernah jadi celah privilege escalation, lihat migrasi
-- 20260803000000_lockdown_users_unitkerja_privesc.sql).
ALTER TABLE unit_usaha ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_unit_usaha ENABLE ROW LEVEL SECURITY;
ALTER TABLE pemasukan_unit_usaha ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage unit_usaha" ON unit_usaha;
CREATE POLICY "Service role manage unit_usaha"
  ON unit_usaha FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manage target_unit_usaha" ON target_unit_usaha;
CREATE POLICY "Service role manage target_unit_usaha"
  ON target_unit_usaha FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manage pemasukan_unit_usaha" ON pemasukan_unit_usaha;
CREATE POLICY "Service role manage pemasukan_unit_usaha"
  ON pemasukan_unit_usaha FOR ALL
  USING (auth.role() = 'service_role');
