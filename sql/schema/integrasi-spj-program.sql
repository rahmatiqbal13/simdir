-- ============================================================
-- SIMDIR: Integrasi SPJ dengan Program Kerja - Auto Update Dana
-- ============================================================

-- 1. Tambah kolom dana_terpakai di tabel program_kerja
ALTER TABLE program_kerja 
ADD COLUMN IF NOT EXISTS dana_terpakai DECIMAL(15,2) DEFAULT 0;

-- 2. Tambah kolom sisa_pagu (optional - bisa juga dihitung di query)
-- ALTER TABLE program_kerja 
-- ADD COLUMN IF NOT EXISTS sisa_pagu DECIMAL(15,2) DEFAULT pagu_anggaran;

-- 3. Function untuk menghitung total dana terpakai per program
CREATE OR REPLACE FUNCTION calculate_dana_terpakai(p_program_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    v_total DECIMAL(15,2) := 0;
BEGIN
    -- Hitung total nominal SPJ untuk program ini
    -- Melalui: spj_detail -> spj_header -> pencairan_dana -> pencairan_program
    SELECT COALESCE(SUM(sd.nominal), 0)
    INTO v_total
    FROM spj_detail sd
    INNER JOIN spj_header sh ON sd.spj_header_id = sh.id
    INNER JOIN pencairan_dana pd ON sh.pencairan_id = pd.id
    INNER JOIN pencairan_program pp ON pd.id = pp.pencairan_id
    WHERE pp.program_kerja_id = p_program_id
    AND pd.status IN ('terbit', 'selesai');  -- Hanya pencairan yang sudah terbit/selesai
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- 4. Function untuk update dana_terpakai di program_kerja
CREATE OR REPLACE FUNCTION update_program_dana_terpakai(p_program_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total DECIMAL(15,2);
BEGIN
    -- Hitung total dana terpakai
    v_total := calculate_dana_terpakai(p_program_id);
    
    -- Update kolom dana_terpakai
    UPDATE program_kerja
    SET dana_terpakai = v_total,
        updated_at = NOW()
    WHERE id = p_program_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger function yang dipanggil saat SPJ detail di-insert/update/delete
CREATE OR REPLACE FUNCTION trigger_update_dana_terpakai()
RETURNS TRIGGER AS $$
DECLARE
    v_program_id UUID;
BEGIN
    -- Dapatkan program_id dari spj_header yang bersangkutan
    -- Melalui relasi: spj_header -> pencairan_dana -> pencairan_program
    
    IF TG_OP = 'DELETE' THEN
        -- Untuk DELETE, gunakan OLD
        FOR v_program_id IN 
            SELECT DISTINCT pp.program_kerja_id
            FROM pencairan_program pp
            INNER JOIN pencairan_dana pd ON pp.pencairan_id = pd.id
            INNER JOIN spj_header sh ON pd.id = sh.pencairan_id
            WHERE sh.id = OLD.spj_header_id
        LOOP
            PERFORM update_program_dana_terpakai(v_program_id);
        END LOOP;
        RETURN OLD;
    ELSE
        -- Untuk INSERT/UPDATE, gunakan NEW
        FOR v_program_id IN 
            SELECT DISTINCT pp.program_kerja_id
            FROM pencairan_program pp
            INNER JOIN pencairan_dana pd ON pp.pencairan_id = pd.id
            INNER JOIN spj_header sh ON pd.id = sh.pencairan_id
            WHERE sh.id = NEW.spj_header_id
        LOOP
            PERFORM update_program_dana_terpakai(v_program_id);
        END LOOP;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Buat trigger pada tabel spj_detail
DROP TRIGGER IF EXISTS trg_update_dana_terpakai ON spj_detail;
CREATE TRIGGER trg_update_dana_terpakai
    AFTER INSERT OR UPDATE OR DELETE ON spj_detail
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_dana_terpakai();

-- 7. Trigger juga untuk tabel spj_header (jika pencairan berubah)
CREATE OR REPLACE FUNCTION trigger_update_dana_terpakai_header()
RETURNS TRIGGER AS $$
DECLARE
    v_program_id UUID;
BEGIN
    -- Update semua program yang terkait dengan pencairan ini
    IF TG_OP = 'DELETE' THEN
        FOR v_program_id IN 
            SELECT DISTINCT pp.program_kerja_id
            FROM pencairan_program pp
            WHERE pp.pencairan_id = OLD.pencairan_id
        LOOP
            PERFORM update_program_dana_terpakai(v_program_id);
        END LOOP;
        RETURN OLD;
    ELSE
        FOR v_program_id IN 
            SELECT DISTINCT pp.program_kerja_id
            FROM pencairan_program pp
            WHERE pp.pencairan_id = NEW.pencairan_id
        LOOP
            PERFORM update_program_dana_terpakai(v_program_id);
        END LOOP;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_dana_terpakai_header ON spj_header;
CREATE TRIGGER trg_update_dana_terpakai_header
    AFTER INSERT OR UPDATE OR DELETE ON spj_header
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_dana_terpakai_header();

-- 8. Function untuk manual recalculate semua program (bisa dipanggil dari backend)
CREATE OR REPLACE FUNCTION recalculate_all_program_dana()
RETURNS VOID AS $$
DECLARE
    v_program_id UUID;
BEGIN
    FOR v_program_id IN SELECT id FROM program_kerja
    LOOP
        PERFORM update_program_dana_terpakai(v_program_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 9. View untuk melihat ringkasan dana per program
CREATE OR REPLACE VIEW view_program_dana AS
SELECT 
    pk.id,
    pk.nama,
    pk.id_rka,
    pk.unit_kerja_id,
    pk.pagu_anggaran,
    pk.dana_terpakai,
    (pk.pagu_anggaran - pk.dana_terpakai) AS sisa_pagu,
    CASE 
        WHEN pk.pagu_anggaran > 0 
        THEN ROUND((pk.dana_terpakai / pk.pagu_anggaran) * 100, 2)
        ELSE 0 
    END AS persentase_terpakai,
    pk.tahun,
    pk.status
FROM program_kerja pk;

-- 10. Index untuk performa query dana
CREATE INDEX IF NOT EXISTS idx_program_kerja_dana ON program_kerja(dana_terpakai);

-- ============================================
-- INSTRUKSI PENGGUNAAN:
-- ============================================
-- 1. Jalankan SQL ini di Supabase Dashboard → SQL Editor
-- 2. Setelah dijalankan, otomatis:
--    - Setiap insert/update/delete di spj_detail akan update dana_terpakai
--    - Setiap insert/update/delete di spj_header akan update dana_terpakai
--    - Dana terpakai dihitung dari semua SPJ dengan status 'terbit' atau 'selesai'
--
-- 3. Untuk recalculate manual semua program, jalankan:
--    SELECT recalculate_all_program_dana();
--
-- 4. Untuk cek sisa pagu suatu program, query:
--    SELECT * FROM view_program_dana WHERE id = 'uuid-program';
-- ============================================
