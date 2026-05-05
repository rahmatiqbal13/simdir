-- ============================================
-- FUNCTIONS
-- ============================================

-- Function untuk update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function untuk sync auth.users ke profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (new.id, new.email, 'admin');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

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

-- Trigger untuk sync user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- INDEXES (Hanya untuk kolom yang pasti ada)
-- ============================================

-- Indexes untuk agenda (kolom: id, judul, tanggal_mulai, tanggal_selesai, lokasi, penyelenggara, deskripsi, created_by, created_at, updated_at)
CREATE INDEX IF NOT EXISTS idx_agenda_tanggal ON agenda(tanggal_mulai, tanggal_selesai);
CREATE INDEX IF NOT EXISTS idx_agenda_penyelenggara ON agenda(penyelenggara);
CREATE INDEX IF NOT EXISTS idx_agenda_created_by ON agenda(created_by);

-- Indexes untuk users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Indexes untuk activity_log (GANTI 'created_by' DENGAN KOLOM YANG ADA)
-- Opsi 1: Jika kolomnya 'id'
-- CREATE INDEX IF NOT EXISTS idx_activity_log_id ON activity_log(id);

-- Opsi 2: Jika kolomnya 'user_id'
-- CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);

-- Opsi 3: Jika kolomnya 'actor_id'
-- CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON activity_log(actor_id);

-- Opsi 4: Index hanya pada created_at (pasti ada)
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);

-- Indexes untuk tabel lain
CREATE INDEX IF NOT EXISTS idx_program_kerja_unit ON program_kerja(unit_kerja_id);
CREATE INDEX IF NOT EXISTS idx_pencairan_program ON pencairan_dana(program_kerja_id);
CREATE INDEX IF NOT EXISTS idx_spj_pencairan ON spj(pencairan_id);

-- ============================================
-- GRANTS
-- ============================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================
-- ENABLE RLS
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agenda') THEN
        ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'program_kerja') THEN
        ALTER TABLE program_kerja ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pencairan_dana') THEN
        ALTER TABLE pencairan_dana ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'spj') THEN
        ALTER TABLE spj ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_log') THEN
        ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;
