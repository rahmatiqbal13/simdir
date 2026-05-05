-- ============================================
-- FIX: RLS Policies for Pencairan Dana Table
-- ============================================

-- Enable RLS
ALTER TABLE pencairan_dana ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Pencairan dana viewable by authenticated" ON pencairan_dana;
DROP POLICY IF EXISTS "Pencairan dana manageable by authenticated" ON pencairan_dana;
DROP POLICY IF EXISTS "Allow all" ON pencairan_dana;

-- Create permissive policy for all operations (development)
CREATE POLICY "Allow all" ON pencairan_dana
    FOR ALL USING (true) WITH CHECK (true);

-- Verify
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'pencairan_dana';
