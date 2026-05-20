-- Migration: E-Invoice Tables
-- Created: 2026-05-20
-- Description: Create tables for digital invoice system

-- =====================================================
-- TABEL: customers (Data Pelanggan)
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_pelanggan VARCHAR(20) UNIQUE NOT NULL,
    nama_pelanggan VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telepon VARCHAR(50),
    alamat TEXT,
    npwp VARCHAR(50),
    jenis_pelanggan VARCHAR(50) DEFAULT 'perorangan', -- perorangan, perusahaan, instansi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =====================================================
-- TABEL: invoices (Data Invoice)
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_invoice VARCHAR(50) UNIQUE NOT NULL,
    
    -- Informasi Pelanggan
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    
    -- Tanggal
    tanggal_invoice DATE NOT NULL DEFAULT CURRENT_DATE,
    tanggal_jatuh_tempo DATE NOT NULL,
    
    -- Status Invoice
    status VARCHAR(50) DEFAULT 'dibuat', -- dibuat, dikirim, disetujui, segera, jatuh_tempo, lunas
    
    -- Informasi Pembayaran
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    ppn_persen DECIMAL(5,2) DEFAULT 11.00, -- PPN 11%
    ppn_nilai DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Informasi Tambahan
    catatan TEXT,
    terms_conditions TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Index untuk pencarian
    CONSTRAINT valid_status CHECK (status IN ('dibuat', 'dikirim', 'disetujui', 'segera', 'jatuh_tempo', 'lunas'))
);

-- =====================================================
-- TABEL: invoice_items (Item/Detail Invoice)
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Detail Item
    deskripsi TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    satuan VARCHAR(50) DEFAULT 'pcs',
    harga_satuan DECIMAL(15,2) NOT NULL DEFAULT 0,
    diskon_persen DECIMAL(5,2) DEFAULT 0,
    diskon_nilai DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Urutan item
    urutan INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABEL: invoice_payments (Riwayat Pembayaran)
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Detail Pembayaran
    tanggal_pembayaran DATE NOT NULL,
    jumlah DECIMAL(15,2) NOT NULL,
    metode_pembayaran VARCHAR(100), -- transfer, cash, cek, dll
    referensi VARCHAR(255), -- nomor referensi bank, nomor cek, dll
    catatan TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_tanggal ON invoices(tanggal_invoice);
CREATE INDEX IF NOT EXISTS idx_invoices_nomor ON invoices(nomor_invoice);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function untuk generate nomor invoice otomatis
-- Format: INV/TAHUN/BULAN/SEQUENCE (contoh: INV/2026/05/0001)
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    month_str TEXT;
    sequence_num INTEGER;
    new_number TEXT;
BEGIN
    year_str := TO_CHAR(NEW.tanggal_invoice, 'YYYY');
    month_str := TO_CHAR(NEW.tanggal_invoice, 'MM');
    
    -- Get the next sequence number for this month
    SELECT COALESCE(MAX(CAST(SUBSTRING(nomor_invoice FROM '....$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM invoices
    WHERE nomor_invoice LIKE 'INV/' || year_str || '/' || month_str || '/%';
    
    -- Format: INV/2026/05/0001
    new_number := 'INV/' || year_str || '/' || month_str || '/' || LPAD(sequence_num::TEXT, 4, '0');
    
    NEW.nomor_invoice := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk auto-generate nomor invoice
CREATE TRIGGER trg_generate_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    WHEN (NEW.nomor_invoice IS NULL OR NEW.nomor_invoice = '')
    EXECUTE FUNCTION generate_invoice_number();

-- Function untuk update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk auto-update timestamp
CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function untuk hitung total invoice
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL(15,2);
    v_ppn_nilai DECIMAL(15,2);
    v_total DECIMAL(15,2);
BEGIN
    -- Calculate subtotal from items
    SELECT COALESCE(SUM(total), 0)
    INTO v_subtotal
    FROM invoice_items
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Get PPN percentage from invoice
    SELECT COALESCE(ppn_persen, 11)
    INTO NEW.ppn_persen
    FROM invoices
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Calculate PPN
    v_ppn_nilai := ROUND(v_subtotal * (NEW.ppn_persen / 100), 2);
    
    -- Calculate total
    v_total := v_subtotal + v_ppn_nilai;
    
    -- Update invoice
    UPDATE invoices
    SET subtotal = v_subtotal,
        ppn_nilai = v_ppn_nilai,
        total = v_total,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk auto-calculate totals when items change
CREATE TRIGGER trg_invoice_items_calculate
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

-- Function untuk update status jatuh tempo
CREATE OR REPLACE FUNCTION update_invoice_overdue_status()
RETURNS VOID AS $$
BEGIN
    UPDATE invoices
    SET status = 'jatuh_tempo'
    WHERE status NOT IN ('lunas', 'jatuh_tempo')
      AND tanggal_jatuh_tempo < CURRENT_DATE;
      
    UPDATE invoices
    SET status = 'segera'
    WHERE status NOT IN ('lunas', 'jatuh_tempo', 'segera')
      AND tanggal_jatuh_tempo <= CURRENT_DATE + INTERVAL '3 days'
      AND tanggal_jatuh_tempo >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- Policies for customers
CREATE POLICY "Allow all access to authenticated users" ON customers
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for invoices
CREATE POLICY "Allow all access to authenticated users" ON invoices
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for invoice_items
CREATE POLICY "Allow all access to authenticated users" ON invoice_items
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for invoice_payments
CREATE POLICY "Allow all access to authenticated users" ON invoice_payments
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- VIEWS
-- =====================================================

-- View untuk laporan invoice dengan detail
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

-- =====================================================
-- INITIAL DATA (Optional)
-- =====================================================

-- Insert default customer if no customers exist
-- This can be removed if not needed
INSERT INTO customers (kode_pelanggan, nama_pelanggan, email, jenis_pelanggan)
SELECT 'CUST001', 'Pelanggan Default', 'pelanggan@example.com', 'perorangan'
WHERE NOT EXISTS (SELECT 1 FROM customers LIMIT 1);
