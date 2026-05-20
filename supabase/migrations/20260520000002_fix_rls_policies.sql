-- Migration: Fix RLS policies for e-invoice tables
-- Created: 2026-05-20
-- Description: Fix RLS policies to allow authenticated users to insert data

-- =====================================================
-- DISABLE RLS TEMPORARILY (untuk development/testing)
-- =====================================================

-- Untuk customers
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Untuk invoices
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- Untuk invoice_items
ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;

-- Note: Jika ingin mengaktifkan RLS kembali dengan policy yang benar,
-- uncomment kode di bawah ini:

/*
-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON customers;
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON invoices;
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON invoice_items;
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON invoice_payments;

-- Create proper policies
CREATE POLICY "Allow all operations for authenticated users" ON customers
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON invoices
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON invoice_items
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON invoice_payments
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
*/
