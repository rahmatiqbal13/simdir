-- Migration: Add invoice created_by_name
-- Created: 2026-08-25
-- Description: invoices has no record of who created it. A FK to auth.users
-- wouldn't cover users authenticated via the app's local-session cookie
-- (their identity lives in public.profiles, not auth.users), so store a
-- plain denormalized display name captured at creation time instead — no
-- FK, no cross-table join needed to show "who created this invoice".
-- IMPORTANT: new columns must be appended at the end of this SELECT list —
-- CREATE OR REPLACE VIEW cannot reorder or insert columns in the middle of
-- an existing view's column list.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by_name TEXT;

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
    i.created_by_name
FROM invoices i
JOIN customers c ON i.customer_id = c.id;
