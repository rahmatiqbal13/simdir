-- =============================================
-- SIMDIR - Supabase Database Schema
-- Copy paste this entire file to Supabase SQL Editor
-- Run in order from top to bottom
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- MASTER DATA: Unit Kerja
-- =============================================
CREATE TABLE unit_kerja (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  singkatan TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Initial data Unit Kerja
INSERT INTO unit_kerja (nama, singkatan) VALUES
  ('Unesa Science Center', 'USC'),
  ('PUI Keolahragaan', 'PUI-Olahraga'),
  ('PUI Disabilitas', 'PUI-Disabilitas'),
  ('PUI Seni Budaya', 'PUI-Seni'),
  ('Kolam Renang', 'KR'),
  ('Driving Golf', 'Golf'),
  ('Unit Laboratorium Bahasa dan Keterampilan', 'ULABK'),
  ('SSFC', 'SSFC');

-- =============================================
-- PROFILES (extends Supabase Auth)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin_keuangan', 'admin', 'pimpinan')),
  is_active BOOLEAN DEFAULT true,
  unit_kerja_id UUID REFERENCES unit_kerja(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- AGENDA
-- =============================================
CREATE TABLE agenda (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  judul TEXT NOT NULL,
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE,
  lokasi TEXT,
  penyelenggara TEXT,
  deskripsi TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agenda_updated_at BEFORE UPDATE ON agenda
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- SURAT
-- =============================================
CREATE TABLE surat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jenis TEXT NOT NULL CHECK (jenis IN ('masuk', 'keluar')),
  nomor_surat TEXT NOT NULL,
  tanggal DATE NOT NULL,
  asal_tujuan TEXT NOT NULL,
  perihal TEXT NOT NULL,
  file_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PROGRAM KERJA (RKA)
-- =============================================
CREATE TABLE program_kerja (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_rka TEXT,
  kode_program TEXT,
  nama_program_utama TEXT,
  kode_kegiatan TEXT,
  nama_kegiatan TEXT,
  kode_rincian_output TEXT,
  nama_rincian_output TEXT,
  kode_komponen_input TEXT,
  nama_komponen_input TEXT,
  kode_detail_aktivitas TEXT,
  nama_program TEXT NOT NULL,
  unit_kerja_id UUID REFERENCES unit_kerja(id),
  tahun_anggaran INTEGER NOT NULL,
  pagu_anggaran NUMERIC(15,2) NOT NULL DEFAULT 0,
  pelaksanaan_tipe TEXT DEFAULT 'bulan' CHECK (pelaksanaan_tipe IN ('tanggal', 'bulan')),
  tanggal_pelaksanaan DATE,
  bulan_mulai TEXT,
  bulan_selesai TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER program_kerja_updated_at BEFORE UPDATE ON program_kerja
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- RINCIAN ANGGARAN GROUP (Kelompok Akun)
-- =============================================
CREATE TABLE rincian_anggaran_group (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_kerja_id UUID REFERENCES program_kerja(id) ON DELETE CASCADE,
  kode_akun TEXT NOT NULL,
  nama_group TEXT NOT NULL,
  unit_kerja_id UUID REFERENCES unit_kerja(id),
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RINCIAN ANGGARAN ITEM
-- =============================================
CREATE TABLE rincian_anggaran_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES rincian_anggaran_group(id) ON DELETE CASCADE,
  uraian TEXT NOT NULL,
  volume NUMERIC(15,2) DEFAULT 0,
  satuan TEXT,
  harga_satuan NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PENCAIRAN DANA (Header)
-- =============================================
CREATE TABLE pencairan_dana (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_pencairan TEXT NOT NULL,
  program_kerja_id UUID REFERENCES program_kerja(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  keterangan TEXT,
  file_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER pencairan_dana_updated_at BEFORE UPDATE ON pencairan_dana
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- PENCAIRAN DANA ITEM (Kegiatan dalam batch)
-- =============================================
CREATE TABLE pencairan_dana_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pencairan_id UUID REFERENCES pencairan_dana(id) ON DELETE CASCADE,
  rincian_anggaran_item_id UUID REFERENCES rincian_anggaran_item(id),
  jumlah NUMERIC(15,2) NOT NULL DEFAULT 0,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SPJ HEADER (Baris Induk)
-- =============================================
CREATE TABLE spj_header (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pencairan_id UUID REFERENCES pencairan_dana(id) ON DELETE CASCADE,
  no_urut INTEGER,
  no_rba TEXT,
  uraian_kegiatan TEXT NOT NULL,
  jumlah_dana NUMERIC(15,2),
  unit_kerja_id UUID REFERENCES unit_kerja(id),
  penerima TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER spj_header_updated_at BEFORE UPDATE ON spj_header
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- SPJ DETAIL (Baris Detail)
-- =============================================
CREATE TABLE spj_detail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spj_header_id UUID REFERENCES spj_header(id) ON DELETE CASCADE,
  nilai_anggaran NUMERIC(15,2),
  nomor_rka TEXT,
  id_spj TEXT,
  nominal NUMERIC(15,2),
  pph21 NUMERIC(15,2) DEFAULT 0,
  pph23 NUMERIC(15,2) DEFAULT 0,
  ppn NUMERIC(15,2) DEFAULT 0,
  unit_kerja_id UUID REFERENCES unit_kerja(id),
  penerima TEXT,
  status_kembali BOOLEAN DEFAULT false,
  tanggal_kembali TIMESTAMPTZ,
  dikembalikan_oleh UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER spj_detail_updated_at BEFORE UPDATE ON spj_detail
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- AUDIT LOG
-- =============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  aksi TEXT NOT NULL,
  modul TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- KONFIGURASI LAPORAN
-- =============================================
CREATE TABLE config_laporan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kop_surat_url TEXT,
  nama_instansi TEXT DEFAULT 'Universitas Negeri Surabaya',
  nama_unit TEXT DEFAULT 'Direktorat Unesa Science Center',
  alamat TEXT DEFAULT 'Jl. Kampus Unesa Lidah Wetan Surabaya 60213',
  email TEXT DEFAULT 'sportscenter@unesa.ac.id',
  website TEXT DEFAULT 'www.usc.unesa.ac.id',
  jabatan_tanda_tangan TEXT DEFAULT 'Direktur',
  unit_tanda_tangan TEXT DEFAULT 'Direktorat Unesa Science Center',
  nama_pejabat TEXT DEFAULT 'Dr. Mochamad Purnomo, S.Pd., M.Kes.',
  nip_pejabat TEXT DEFAULT '198101222005011004',
  kota TEXT DEFAULT 'Surabaya',
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO config_laporan (id) VALUES (uuid_generate_v4());

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE unit_kerja ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE surat ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_kerja ENABLE ROW LEVEL SECURITY;
ALTER TABLE rincian_anggaran_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE rincian_anggaran_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE pencairan_dana ENABLE ROW LEVEL SECURITY;
ALTER TABLE pencairan_dana_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE spj_header ENABLE ROW LEVEL SECURITY;
ALTER TABLE spj_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_laporan ENABLE ROW LEVEL SECURITY;

-- UNIT KERJA policies
CREATE POLICY "Public can read unit_kerja"
  ON unit_kerja FOR SELECT
  USING (true);

CREATE POLICY "Super admin can manage unit_kerja"
  ON unit_kerja FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- PROFILES policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Super admin can manage all profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- AGENDA policies
CREATE POLICY "Public can read agenda"
  ON agenda FOR SELECT
  USING (true);

CREATE POLICY "Admin and above can insert agenda"
  ON agenda FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admin and above can update agenda"
  ON agenda FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admin and above can delete agenda"
  ON agenda FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- SURAT policies
CREATE POLICY "Super admin and pimpinan can read surat"
  ON surat FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'pimpinan')
    )
  );

CREATE POLICY "Super admin can manage surat"
  ON surat FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- PROGRAM KERJA policies
CREATE POLICY "Keuangan role and above can read program_kerja"
  ON program_kerja FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin_keuangan', 'pimpinan')
    )
  );

CREATE POLICY "Keuangan role and above can manage program_kerja"
  ON program_kerja FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin_keuangan')
    )
  );

-- RINCIAN ANGGARAN GROUP policies
CREATE POLICY "Keuangan role can manage rincian_anggaran_group"
  ON rincian_anggaran_group FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin_keuangan')
    )
  );

-- RINCIAN ANGGARAN ITEM policies
CREATE POLICY "Keuangan role can manage rincian_anggaran_item"
  ON rincian_anggaran_item FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin_keuangan')
    )
  );

-- PENCAIRAN DANA policies
CREATE POLICY "Keuangan role and above can read pencairan_dana"
  ON pencairan_dana FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin_keuangan', 'pimpinan')
    )
  );

CREATE POLICY "Keuangan role can manage pencairan_dana"
  ON pencairan_dana FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin_keuangan')
    )
  );

-- PENCAIRAN DANA ITEM policies
CREATE POLICY "Keuangan role can manage pencairan_dana_item"
  ON pencairan_dana_item FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin_keuangan')
    )
  );

-- SPJ HEADER policies
CREATE POLICY "Keuangan role and above can read spj_header"
  ON spj_header FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin_keuangan', 'pimpinan')
    )
  );

CREATE POLICY "Keuangan role can manage spj_header"
  ON spj_header FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin_keuangan')
    )
  );

-- SPJ DETAIL policies
CREATE POLICY "Keuangan role and above can read spj_detail"
  ON spj_detail FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin_keuangan', 'pimpinan')
    )
  );

CREATE POLICY "Keuangan role can manage spj_detail"
  ON spj_detail FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin_keuangan')
    )
  );

-- AUDIT LOG policies
CREATE POLICY "Super admin can read audit_log"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Auth users can insert audit_log"
  ON audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- CONFIG LAPORAN policies
CREATE POLICY "Super admin can manage config_laporan"
  ON config_laporan FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Everyone can read config_laporan"
  ON config_laporan FOR SELECT
  USING (true);

-- =============================================
-- HELPER FUNCTION: Auto create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nama, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'pimpinan')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- VIEWS FOR CALCULATIONS
-- =============================================

-- View for agenda status computation (H-4 rule)
CREATE OR REPLACE VIEW agenda_status_view AS
SELECT
  id,
  judul,
  tanggal_mulai,
  tanggal_selesai,
  CASE
    WHEN now() < tanggal_mulai - INTERVAL '4 days' THEN 'akan_datang'
    WHEN now() < tanggal_mulai THEN 'akan_datang_segera'
    WHEN now() <= tanggal_selesai THEN 'berlangsung'
    ELSE 'selesai'
  END as status_computed
FROM agenda;

-- =============================================
-- SEED DATA (Optional - for testing)
-- =============================================
-- Uncomment below to insert sample data

-- INSERT INTO profiles (id, nama, role) VALUES
--   (auth.uid()::uuid, 'Admin User', 'super_admin');