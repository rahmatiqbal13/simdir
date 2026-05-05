-- ============================================
-- SCHEMA DATABASE SIMDIR USC
-- ============================================

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- ============================================
-- TABEL: USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'teknisi_keuangan')),
    unit_kerja VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Superadmin can see all users
CREATE POLICY "Superadmin can view all users" ON users
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM users WHERE role = 'super_admin'
    ));

-- Policy: Users can view their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- ============================================
-- TABEL: PROFILES (untuk Supabase Auth integration)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'teknisi_keuangan')),
    unit_kerja VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- TABEL: AGENDA
-- ============================================
CREATE TABLE IF NOT EXISTS agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul VARCHAR(255) NOT NULL,
    jenis VARCHAR(20) NOT NULL CHECK (jenis IN ('internal', 'eksternal', 'pimpinan')),
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    waktu_mulai TIME,
    waktu_selesai TIME,
    lokasi VARCHAR(255),
    link_meeting TEXT,
    penyelenggara VARCHAR(255) NOT NULL,
    unit_kerja VARCHAR(100),
    deskripsi TEXT,
    disposisi VARCHAR(255),
    pic VARCHAR(100),
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'upcoming_soon', 'ongoing', 'completed')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on agenda
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agenda is viewable by everyone" ON agenda
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create agenda" ON agenda
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update agenda" ON agenda
    FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- TABEL: UNIT_KERJA
-- ============================================
CREATE TABLE IF NOT EXISTS unit_kerja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama VARCHAR(100) NOT NULL UNIQUE,
    kode VARCHAR(20) UNIQUE,
    deskripsi TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE unit_kerJA ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Unit kerja is viewable by everyone" ON unit_kerja
    FOR SELECT USING (true);

-- ============================================
-- TABEL: PROGRAM_KERJA
-- ============================================
CREATE TABLE IF NOT EXISTS program_kerja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama VARCHAR(255) NOT NULL,
    unit_kerja_id UUID REFERENCES unit_kerja(id),
    sumber_dana VARCHAR(50) CHECK (sumber_dana IN ('UKT', 'UU', 'lainnya')),
    pagu_anggaran DECIMAL(15,2) DEFAULT 0,
    tahun INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'selesai', 'dibatalkan')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE program_kerja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Program kerja viewable by authenticated" ON program_kerja
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- TABEL: BIAYA_VARIABEL
-- ============================================
CREATE TABLE IF NOT EXISTS biaya_variabel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_kerja_id UUID REFERENCES program_kerja(id) ON DELETE CASCADE,
    nama_variabel VARCHAR(255) NOT NULL,
    jumlah INTEGER DEFAULT 1,
    satuan VARCHAR(50),
    harga_satuan DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(15,2) GENERATED ALWAYS AS (jumlah * harga_satuan) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE biaya_variabel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Biaya variabel viewable by authenticated" ON biaya_variabel
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- TABEL: PENCAIRAN_DANA
-- ============================================
CREATE TABLE IF NOT EXISTS pencairan_dana (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_pencairan VARCHAR(50) UNIQUE NOT NULL,
    program_kerja_id UUID REFERENCES program_kerja(id),
    jumlah DECIMAL(15,2) NOT NULL,
    tanggal_pencairan DATE DEFAULT CURRENT_DATE,
    keterangan TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'terbit', 'selesai')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE pencairan_dana ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pencairan dana viewable by authenticated" ON pencairan_dana
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- TABEL: SPJ
-- ============================================
CREATE TABLE IF NOT EXISTS spj (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_spj VARCHAR(50) UNIQUE NOT NULL,
    pencairan_id UUID REFERENCES pencairan_dana(id),
    total_spj DECIMAL(15,2) DEFAULT 0,
    pph21 DECIMAL(15,2) DEFAULT 0,
    pph23 DECIMAL(15,2) DEFAULT 0,
    ppn DECIMAL(15,2) DEFAULT 0,
    total_pajak DECIMAL(15,2) GENERATED ALWAYS AS (pph21 + pph23 + ppn) STORED,
    selisih DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'terbit', 'selesai')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE spj ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SPJ viewable by authenticated" ON spj
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- TABEL: ACTIVITY_LOG
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity log viewable by superadmin" ON activity_log
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM users WHERE role = 'super_admin'
    ));

-- ============================================
-- INSERT DEFAULT SUPERADMIN
-- ============================================

-- Insert superadmin user
INSERT INTO users (username, email, password, full_name, role, is_active)
VALUES (
    'adminiqbal', 
    'adminiqbal@usc.ac.id', 
    'usc@_140451', 
    'Admin Iqbal', 
    'super_admin',
    true
)
ON CONFLICT (username) DO NOTHING;

-- Insert default unit kerja
INSERT INTO unit_kerja (nama, kode) VALUES
('USC', 'usc'),
('PUI Keolahragaan', 'pui-olah'),
('PUI Disabilitas', 'pui-dis'),
('PUI Seni Budaya', 'pui-seni'),
('Kolam Renang', 'kolam'),
('Driving Golf', 'golf'),
('ULABK', 'ulabk'),
('SSFC', 'ssfc'),
('PUIPT Seni Budaya Majapahitan', 'puipt-seni'),
('PUIPT DIC', 'puipt-dic'),
('PUIPT SERC', 'puipt-serc')
ON CONFLICT (nama) DO NOTHING;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function untuk update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger untuk users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger untuk agenda
DROP TRIGGER IF EXISTS update_agenda_updated_at ON agenda;
CREATE TRIGGER update_agenda_updated_at
    BEFORE UPDATE ON agenda
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger untuk program_kerja
DROP TRIGGER IF EXISTS update_program_kerja_updated_at ON program_kerja;
CREATE TRIGGER update_program_kerja_updated_at
    BEFORE UPDATE ON program_kerja
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function untuk sync auth.users ke profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (new.id, new.email, 'admin');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger untuk sync user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_agenda_tanggal ON agenda(tanggal_mulai, tanggal_selesai);
CREATE INDEX IF NOT EXISTS idx_agenda_jenis ON agenda(jenis);
CREATE INDEX IF NOT EXISTS idx_agenda_status ON agenda(status);
CREATE INDEX IF NOT EXISTS idx_program_kerja_unit ON program_kerja(unit_kerja_id);
CREATE INDEX IF NOT EXISTS idx_pencairan_program ON pencairan_dana(program_kerja_id);
CREATE INDEX IF NOT EXISTS idx_spj_pencairan ON spj(pencairan_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);

-- ============================================
-- GRANTS
-- ============================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- SEED DATA KOSONG (Opsional - untuk testing)
-- ============================================

-- Uncomment baris di bawah ini jika ingin menambahkan data testing
-- INSERT INTO agenda (judul, jenis, tanggal_mulai, tanggal_selesai, penyelenggara, status)
-- VALUES ('Rapat Koordinasi', 'internal', CURRENT_DATE, CURRENT_DATE, 'USC', 'upcoming');
