-- ============================================
-- VIEWS UNTUK LAPORAN (SUPER_ADMIN ONLY)
-- ============================================

-- View: Rekap Serapan Dana per Program Kerja
CREATE OR REPLACE VIEW laporan_serapan_program AS
SELECT 
    pk.id,
    pk.nama,
    pk.tahun,
    pk.unit_kerja_id,
    uk.nama AS unit_kerja,
    pk.pagu_anggaran AS pagu,
    COALESCE(SUM(pd.jumlah_alokasi), 0) AS total_spj,
    pk.pagu_anggaran - COALESCE(SUM(pd.jumlah_alokasi), 0) AS sisa,
    CASE 
        WHEN pk.pagu_anggaran > 0 THEN ROUND((COALESCE(SUM(pd.jumlah_alokasi), 0) / pk.pagu_anggaran) * 100, 2)
        ELSE 0 
    END AS persen_serapan
FROM program_kerja pk
LEFT JOIN pencairan_program pd ON pd.program_kerja_id = pk.id
LEFT JOIN pencairan_dana pcd ON pcd.id = pd.pencairan_id
LEFT JOIN unit_kerja uk ON uk.id::text = pk.unit_kerja_id
GROUP BY pk.id, pk.nama, pk.tahun, pk.unit_kerja_id, uk.nama, pk.pagu_anggaran;

-- View: Rekap Serapan per Unit Kerja
CREATE OR REPLACE VIEW laporan_serapan_unit AS
SELECT 
    uk.id,
    uk.nama AS unit_kerja,
    uk.kode,
    COUNT(DISTINCT pk.id) AS jumlah_program,
    COALESCE(SUM(pk.pagu_anggaran), 0) AS total_pagu,
    COALESCE(SUM(pd.jumlah_alokasi), 0) AS total_spj,
    COALESCE(SUM(pk.pagu_anggaran), 0) - COALESCE(SUM(pd.jumlah_alokasi), 0) AS sisa,
    CASE 
        WHEN COALESCE(SUM(pk.pagu_anggaran), 0) > 0 
        THEN ROUND((COALESCE(SUM(pd.jumlah_alokasi), 0) / COALESCE(SUM(pk.pagu_anggaran), 0)) * 100, 2)
        ELSE 0 
    END AS persen_serapan
FROM unit_kerja uk
LEFT JOIN program_kerja pk ON pk.unit_kerja_id = uk.id::text
LEFT JOIN pencairan_program pd ON pd.program_kerja_id = pk.id
LEFT JOIN pencairan_dana pcd ON pcd.id = pd.pencairan_id
GROUP BY uk.id, uk.nama, uk.kode;

-- View: Statistik Agenda (gunakan tanggal_mulai)
CREATE OR REPLACE VIEW laporan_statistik_agenda AS
SELECT 
    DATE_TRUNC('month', tanggal_mulai) AS bulan,
    TO_CHAR(DATE_TRUNC('month', tanggal_mulai), 'YYYY-MM') AS periode,
    COUNT(*) AS total_agenda,
    COUNT(*) FILTER (WHERE status = 'completed') AS selesai,
    COUNT(*) FILTER (WHERE status = 'ongoing') AS sedang_berlangsung,
    COUNT(*) FILTER (WHERE status IN ('upcoming', 'upcoming_soon')) AS akan_datang
FROM agenda
GROUP BY DATE_TRUNC('month', tanggal_mulai)
ORDER BY bulan DESC;

-- View: Statistik Surat
CREATE OR REPLACE VIEW laporan_statistik_surat AS
SELECT 
    tipe,
    DATE_TRUNC('month', COALESCE(tanggal_diterima, tanggal_keluar, created_at)) AS bulan,
    TO_CHAR(DATE_TRUNC('month', COALESCE(tanggal_diterima, tanggal_keluar, created_at)), 'YYYY-MM') AS periode,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE jenis = 'undangan') AS undangan,
    COUNT(*) FILTER (WHERE jenis = 'permohonan') AS permohonan,
    COUNT(*) FILTER (WHERE jenis = 'pemberitahuan') AS pemberitahuan,
    COUNT(*) FILTER (WHERE jenis = 'lainnya') AS lainnya
FROM surat
GROUP BY tipe, DATE_TRUNC('month', COALESCE(tanggal_diterima, tanggal_keluar, created_at))
ORDER BY bulan DESC;

-- View: Detail Pencairan dengan Program
CREATE OR REPLACE VIEW laporan_detail_pencairan AS
SELECT 
    pcd.id,
    pcd.nomor_pencairan,
    pcd.tanggal_pencairan,
    pcd.jumlah AS nominal,
    pcd.keterangan,
    pcd.status,
    pk.nama AS program_kerja,
    pk.tahun,
    uk.nama AS unit_kerja,
    pd.jumlah_alokasi,
    pcd.created_at
FROM pencairan_dana pcd
JOIN pencairan_program pd ON pd.pencairan_id = pcd.id
JOIN program_kerja pk ON pk.id = pd.program_kerja_id
JOIN unit_kerja uk ON uk.id::text = pk.unit_kerja_id;

-- Grant permissions
GRANT SELECT ON laporan_serapan_program TO authenticated;
GRANT SELECT ON laporan_serapan_program TO anon;
GRANT SELECT ON laporan_serapan_unit TO authenticated;
GRANT SELECT ON laporan_serapan_unit TO anon;
GRANT SELECT ON laporan_statistik_agenda TO authenticated;
GRANT SELECT ON laporan_statistik_agenda TO anon;
GRANT SELECT ON laporan_statistik_surat TO authenticated;
GRANT SELECT ON laporan_statistik_surat TO anon;
GRANT SELECT ON laporan_detail_pencairan TO authenticated;
GRANT SELECT ON laporan_detail_pencairan TO anon;

-- Verify
SELECT 'Views laporan berhasil diperbarui' as status;
