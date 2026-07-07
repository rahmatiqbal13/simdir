-- Migration: Fix invoice number generation race condition
-- Created: 2026-07-07
-- Description: generate_invoice_number() read the current MAX(sequence) and
-- computed MAX+1 without any locking. Two invoices created concurrently in
-- the same month could compute the same nomor_invoice, and the second INSERT
-- would fail on the UNIQUE constraint instead of getting the next number.
-- Fix: take a transaction-scoped advisory lock keyed by year+month before
-- reading the max, so concurrent inserts for the same month serialize around
-- the numbering step. The lock is released automatically at commit/rollback.

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    month_str TEXT;
    sequence_num INTEGER;
    new_number TEXT;
    lock_key BIGINT;
BEGIN
    year_str := TO_CHAR(NEW.tanggal_invoice, 'YYYY');
    month_str := TO_CHAR(NEW.tanggal_invoice, 'MM');

    -- Serialize numbering per year+month so concurrent transactions can't
    -- both read the same MAX() before either one commits.
    lock_key := ('x' || md5('invoice_seq_' || year_str || month_str))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(lock_key);

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
