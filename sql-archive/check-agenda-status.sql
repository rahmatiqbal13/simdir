-- ============================================
-- CHECK: Agenda Table Structure
-- ============================================

-- 1. Check table columns
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'agenda'
ORDER BY ordinal_position;

-- 2. Check RLS status
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'agenda';

-- 3. Check existing policies
SELECT 
    policyname,
    permissive,
    roles::text,
    cmd,
    qual::text
FROM pg_policies
WHERE tablename = 'agenda';
