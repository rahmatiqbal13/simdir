-- ============================================================
-- FIX: Integrasi SPJ dengan Program Kerja - Perhitungan Per Program
-- ============================================================

-- ============================================================
-- OPSI 1: Proporsional Berdasarkan Alokasi Pencairan (RECOMMENDED)
-- ============================================================
-- Jika 1 pencairan Rp 100jt untuk 2 program (A: 60jt, B: 40jt)
-- Dan SPJ total Rp 80jt
-- Maka Program A terpakai: 60% x 80jt = 48jt
--      Program B terpakai: 40% x 80jt = 32jt

CREATE OR REPLACE FUNCTION calculate_dana_terpakai_proporsional(p_program_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    v_total DECIMAL(15,2) := 0;
BEGIN
    -- Hitung berdasarkan proporsi alokasi di pencairan_program
    SELECT COALESCE(SUM(
        (pp.jumlah_alokasi / NULLIF(pd.jumlah, 0)) * COALESCE(spj_total.total_spj, 0)
    ), 0)
    INTO v_total
    FROM pencairan_program pp
    INNER JOIN pencairan_dana pd ON pp.pencairan_id = pd.id
    LEFT JOIN (
        -- Subquery: hitung total SPJ per pencairan
        SELECT 
            sh.pencairan_id,
            SUM(sd.nominal) as total_spj
        FROM spj_detail sd
        INNER JOIN spj_header sh ON sd.spj_header_id = sh.id
        GROUP BY sh.pencairan_id
    ) spj_total ON pd.id = spj_total.pencairan_id
    WHERE pp.program_kerja_id = p_program_id
    AND pd.status IN ('terbit', 'selesai');
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- OPSI 2: SPJ Langsung Tertaut ke Program (MOST ACCURATE)
-- ============================================================
-- Tambah kolom program_kerja_id di spj_header untuk tautan langsung

-- Step 1: Tambah kolom relasi langsung (jika belum ada)
ALTER TABLE spj_header 
ADD COLUMN IF NOT EXISTS program_kerja_id UUID REFERENCES program_kerja(id);

-- Step 2: Function hitung berdasarkan relasi langsung
CREATE OR REPLACE FUNCTION calculate_dana_terpakai_langsung(p_program_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    v_total DECIMAL(15,2) := 0;
BEGIN
    -- Hitung dari SPJ yang langsung tertaut ke program ini
    SELECT COALESCE(SUM(sd.nominal), 0)
    INTO v_total
    FROM spj_detail sd
    INNER JOIN spj_header sh ON sd.spj_header_id = sh.id
    INNER JOIN pencairan_dana pd ON sh.pencairan_id = pd.id
    WHERE sh.program_kerja_id = p_program_id
    AND pd.status IN ('terbit', 'selesai');
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Trigger untuk auto-set program_kerja_id saat insert SPJ header
CREATE OR REPLACE FUNCTION trigger_set_program_kerja_id()
RETURNS TRIGGER AS $$
DECLARE
    v_program_id UUID;
BEGIN
    -- Jika program_kerja_id belum diisi, ambil dari pencairan_program (yang pertama)
    IF NEW.program_kerja_id IS NULL THEN
        SELECT pp.program_kerja_id INTO v_program_id
        FROM pencairan_program pp
        WHERE pp.pencairan_id = NEW.pencairan_id
        LIMIT 1;
        
        NEW.program_kerja_id := v_program_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_program_kerja_id ON spj_header;
CREATE TRIGGER trg_set_program_kerja_id
    BEFORE INSERT ON spj_header
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_program_kerja_id();

-- ============================================================
-- UPDATE FUNCTION UTAMA (Pilih salah satu opsi)
-- ============================================================

-- Opsi A: Gunakan perhitungan proporsional
CREATE OR REPLACE FUNCTION update_program_dana_terpakai(p_program_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total DECIMAL(15,2);
BEGIN
    v_total := calculate_dana_terpakai_proporsional(p_program_id);
    
    UPDATE program_kerja
    SET dana_terpakai = v_total,
        updated_at = NOW()
    WHERE id = p_program_id;
END;
$$ LANGUAGE plpgsql;

-- Opsi B: Gunakan perhitungan langsung (uncomment jika ingin pakai)
-- CREATE OR REPLACE FUNCTION update_program_dana_terpakai(p_program_id UUID)
-- RETURNS VOID AS $$
-- DECLARE
--     v_total DECIMAL(15,2);
-- BEGIN
--     v_total := calculate_dana_terpakai_langsung(p_program_id);
--     
--     UPDATE program_kerja
--     SET dana_terpakai = v_total,
--         updated_at = NOW()
--     WHERE id = p_program_id;
-- END;
-- $$ LANGUAGE plpgsql;

-- ============================================================
-- FIX DATA YANG SUDAH ADA
-- ============================================================

-- Update program_kerja_id di spj_header yang sudah ada (ambil dari pencairan_program)
UPDATE spj_header sh
SET program_kerja_id = subq.program_kerja_id
FROM (
    SELECT DISTINCT ON (pp.pencairan_id)
        pp.pencairan_id,
        pp.program_kerja_id
    FROM pencairan_program pp
    ORDER BY pp.pencairan_id, pp.jumlah_alokasi DESC
) subq
WHERE sh.pencairan_id = subq.pencairan_id
AND sh.program_kerja_id IS NULL;

-- Recalculate semua dana_terpakai dengan logika baru
SELECT recalculate_all_program_dana();

-- ============================================================
-- VIEW YANG LEBIH DETAIL
-- ============================================================

CREATE OR REPLACE VIEW view_program_dana_detail AS
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
    -- Detail pencairan
    COALESCE(pencairan_detail.total_pencairan, 0) AS total_pencairan,
    COALESCE(pencairan_detail.jumlah_pencairan, 0) AS jumlah_pencairan,
    pk.tahun,
    pk.status
FROM program_kerja pk
LEFT JOIN (
    SELECT 
        pp.program_kerja_id,
        SUM(pp.jumlah_alokasi) AS total_pencairan,
        COUNT(pp.pencairan_id) AS jumlah_pencairan
    FROM pencairan_program pp
    INNER JOIN pencairan_dana pd ON pp.pencairan_id = pd.id
    WHERE pd.status IN ('terbit', 'selesai')
    GROUP BY pp.program_kerja_id
) pencairan_detail ON pk.id = pencairan_detail.program_kerja_id;

-- ============================================================
-- VERIFIKASI HASIL
-- ============================================================

-- Lihat detail perhitungan untuk debugging
SELECT 
    pk.id,
    pk.nama,
    pk.pagu_anggaran,
    pk.dana_terpakai,
    (pk.pagu_anggaran - pk.dana_terpakai) AS sisa_pagu,
    -- Detail pencairan terkait
    STRING_AGG(
        pd.nomor_pencairan || ': ' || 
        'Alokasi=' || TO_CHAR(pp.jumlah_alokasi, 'FM999,999,999') ||
        ' (' || ROUND((pp.jumlah_alokasi / NULLIF(pd.jumlah, 0)) * 100, 1) || '%)',
        '; '
    ) AS detail_pencairan
FROM program_kerja pk
LEFT JOIN pencairan_program pp ON pk.id = pp.program_kerja_id
LEFT JOIN pencairan_dana pd ON pp.pencairan_id = pd.id
WHERE pd.status IN ('terbit', 'selesai')
GROUP BY pk.id, pk.nama, pk.pagu_anggaran, pk.dana_terpakai
ORDER BY pk.dana_terpakai DESC
LIMIT 10;
