-- Migration: Fix invoice triggers
-- Created: 2026-05-20
-- Description: Fix calculate_invoice_totals trigger to work with new structure

-- Drop the old trigger first
DROP TRIGGER IF EXISTS trg_invoice_items_calculate ON invoice_items;

-- Drop the old function
DROP FUNCTION IF EXISTS calculate_invoice_totals();

-- Create new function that doesn't auto-calculate (we calculate in app now)
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Just return the row, no auto-calculation
    -- Calculation is now done in the application
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Note: We're not recreating the trigger as auto-calculation 
-- is now handled by the application, not the database
