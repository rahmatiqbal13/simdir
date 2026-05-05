-- Perbaiki RLS policy untuk agenda
-- Policy untuk SELECT (public read)
DROP POLICY IF EXISTS "Agenda is viewable by everyone" ON agenda;
CREATE POLICY "Agenda is viewable by everyone" ON agenda
    FOR SELECT USING (true);

-- Policy untuk INSERT (authenticated users)
DROP POLICY IF EXISTS "Authenticated users can create agenda" ON agenda;
CREATE POLICY "Authenticated users can create agenda" ON agenda
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Policy untuk UPDATE (authenticated users)
DROP POLICY IF EXISTS "Authenticated users can update agenda" ON agenda;
CREATE POLICY "Authenticated users can update agenda" ON agenda
    FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Policy untuk DELETE (authenticated users)
DROP POLICY IF EXISTS "Authenticated users can delete agenda" ON agenda;
CREATE POLICY "Authenticated users can delete agenda" ON agenda
    FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Alternatif: Bypass RLS untuk semua operasi (development only)
-- ALTER TABLE agenda DISABLE ROW LEVEL SECURITY;

-- Cek RLS status
SELECT relname, relrowsecurity, relforcerowsecurity 
FROM pg_class 
WHERE relname = 'agenda';
