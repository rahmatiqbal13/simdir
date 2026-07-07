-- =====================================================
-- MIGRATION: Add diskon and biaya_pengiriman columns to invoices
-- Tanggal: 2026-07-07
-- Deskripsi: Menambah kolom diskon_nilai dan biaya_pengiriman
--            agar dapat disimpan dan ditampilkan di invoice
-- =====================================================

-- Tambah kolom diskon (jika belum ada)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS diskon_nilai DECIMAL(15,2) DEFAULT 0;

-- Tambah kolom biaya pengiriman (jika belum ada)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS biaya_pengiriman DECIMAL(15,2) DEFAULT 0;

-- Update trigger calculate_invoice_totals untuk menghitung diskon & pengiriman
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL(15,2);
    v_ppn_nilai DECIMAL(15,2);
    v_diskon_nilai DECIMAL(15,2);
    v_biaya_pengiriman DECIMAL(15,2);
    v_total DECIMAL(15,2);
    v_invoice_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;
    
    -- Hitung subtotal dari items
    SELECT COALESCE(SUM(total), 0) INTO v_subtotal
    FROM invoice_items
    WHERE invoice_id = v_invoice_id;
    
    -- Ambil nilai pajak, diskon, pengiriman dari invoices
    SELECT 
        COALESCE(ppn_nilai, 0),
        COALESCE(diskon_nilai, 0),
        COALESCE(biaya_pengiriman, 0)
    INTO v_ppn_nilai, v_diskon_nilai, v_biaya_pengiriman
    FROM invoices
    WHERE id = v_invoice_id;
    
    -- Hitung total
    v_total := v_subtotal + v_ppn_nilai - v_diskon_nilai + v_biaya_pengiriman;
    
    -- Update invoice
    UPDATE invoices
    SET 
        subtotal = v_subtotal,
        total = v_total,
        updated_at = NOW()
    WHERE id = v_invoice_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Hapus view lama (drop dulu karena struktur kolom berubah)
DROP VIEW IF EXISTS invoice_summary;

-- Buat ulang view invoice_summary dengan kolom baru
CREATE VIEW invoice_summary AS
SELECT 
    i.id,
    i.nomor_invoice,
    i.tanggal_invoice,
    i.tanggal_jatuh_tempo,
    i.status,
    i.subtotal,
    i.ppn_persen,
    i.ppn_nilai,
    i.diskon_nilai,
    i.biaya_pengiriman,
    i.total,
    i.catatan,
    c.id AS customer_id,
    c.kode_pelanggan,
    c.nama_pelanggan,
    c.email AS customer_email,
    c.telepon AS customer_telepon,
    c.alamat AS customer_alamat,
    c.npwp AS customer_npwp,
    (SELECT COALESCE(SUM(jumlah), 0) FROM invoice_payments WHERE invoice_id = i.id) AS total_dibayar,
    (i.total - (SELECT COALESCE(SUM(jumlah), 0) FROM invoice_payments WHERE invoice_id = i.id)) AS sisa_pembayaran,
    CASE 
        WHEN i.status = 'lunas' THEN 0
        WHEN i.tanggal_jatuh_tempo < CURRENT_DATE THEN CURRENT_DATE - i.tanggal_jatuh_tempo
        ELSE 0
    END AS hari_terlambat
FROM invoices i
JOIN customers c ON i.customer_id = c.id;

SELECT 'Kolom diskon_nilai dan biaya_pengiriman berhasil ditambahkan' AS status;
