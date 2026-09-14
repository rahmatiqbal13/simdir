-- ============================================
-- Tambah info konfirmasi WhatsApp untuk metode pembayaran tipe Virtual
-- Account — nomor & nama PIC yang dituju untuk kirim bukti transfer,
-- ditampilkan di kalimat otomatis Catatan dan di blok "Info Pembayaran"
-- pada invoice (detail & cetak). Opsional — kolom boleh kosong untuk
-- metode yang tidak butuh konfirmasi manual via WhatsApp.
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_name TEXT;

-- Redefinisi penuh invoice_summary (mengikuti definisi di
-- 20260914000000_create_payment_methods.sql) + 2 kolom WhatsApp.
CREATE OR REPLACE VIEW invoice_summary AS
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
    END AS hari_terlambat,
    i.created_by_name,
    i.payment_method_id,
    pm.type AS payment_method_type,
    pm.label AS payment_method_label,
    pm.image_url AS payment_method_qr_url,
    pm.bank_name AS payment_method_bank_name,
    pm.va_number AS payment_method_va_number,
    pm.whatsapp_number AS payment_method_whatsapp_number,
    pm.whatsapp_name AS payment_method_whatsapp_name
FROM invoices i
JOIN customers c ON i.customer_id = c.id
LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id;
