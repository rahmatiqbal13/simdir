-- ============================================
-- FIX: Agenda 500 Error - Ensure RLS is properly configured
-- ============================================

-- 1. Check if agenda table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'agenda') THEN
        RAISE EXCEPTION 'Tabel agenda tidak ditemukan!';
    END IF;
END $$;

-- 2. Enable RLS (idempotent)
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;

-- 3. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Agenda is viewable by everyone" ON agenda;
DROP POLICY IF EXISTS "Anyone can insert agenda" ON agenda;
DROP POLICY IF EXISTS "Anyone can update agenda" ON agenda;
DROP POLICY IF EXISTS "Anyone can delete agenda" ON agenda;
DROP POLICY IF EXISTS "Allow all" ON agenda;
DROP POLICY IF EXISTS "Agenda viewable by authenticated" ON agenda;
DROP POLICY IF EXISTS "Agenda manageable by authenticated" ON agenda;

-- 4. Create simple permissive policies
CREATE POLICY "Allow all operations" ON agenda
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- 5. Grant permissions to all roles
GRANT ALL ON agenda TO anon;
GRANT ALL ON agenda TO authenticated;
GRANT ALL ON agenda TO postgres;
GRANT ALL ON agenda TO service_role;

-- 6. Verify setup
SELECT 
    'RLS Enabled' as check_type,
    relrowsecurity::text as status
FROM pg_class 
WHERE relname = 'agenda'

UNION ALL

SELECT 
    'Policy Count' as check_type,
    COUNT(*)::text as status
FROM pg_policies 
WHERE tablename = 'agenda';
