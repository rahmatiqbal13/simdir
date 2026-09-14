-- ============================================
-- Metode Pembayaran (QR & Virtual Account) — daftar metode pembayaran
-- yang bisa dipilih saat membuat/edit invoice di E-Invoice. Dikelola dari
-- Pengaturan > Metode Pembayaran (/api/payment-methods). Referensi:
-- docs/superpowers/specs/2026-09-14-payment-methods-einvoice-design.md
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        varchar(10) NOT NULL CHECK (type IN ('qr', 'va')),
  label       text NOT NULL,
  image_url   text,        -- diisi kalau type = 'qr'
  bank_name   text,        -- diisi kalau type = 'va'
  va_number   text,        -- diisi kalau type = 'va'
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER trg_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_methods_updated_at();

-- RLS — hanya service role (dipakai app/api/payment-methods/*) yang boleh
-- baca/tulis. Akses per-role diatur di middleware.js (super_admin saja).
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage payment_methods" ON payment_methods;
CREATE POLICY "Service role manage payment_methods"
  ON payment_methods FOR ALL
  USING (auth.role() = 'service_role');

-- Kolom baru di invoices: metode pembayaran yang dipilih untuk invoice ini
-- (opsional). ON DELETE SET NULL — menghapus metode pembayaran tidak
-- pernah merusak invoice lama, cuma menghilangkan tampilannya saat dicetak
-- ulang.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL;

-- Defensif: migrasi 20260825010000_add_invoice_created_by_name.sql yang
-- menambahkan kolom ini mungkin belum pernah dijalankan di database ini —
-- pastikan ada dulu sebelum dipakai di invoice_summary di bawah, supaya
-- migrasi ini tidak gagal gara-gara migrasi lama yang terlewat.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Redefinisi penuh invoice_summary (mengikuti definisi terakhir di
-- 20260825010000_add_invoice_created_by_name.sql) + kolom metode
-- pembayaran. Semua caller yang sudah ada pakai `select('*')` jadi tidak
-- perlu perubahan query di sisi aplikasi.
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
    pm.va_number AS payment_method_va_number
FROM invoices i
JOIN customers c ON i.customer_id = c.id
LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id;
