-- ============================================
-- MIGRATION: Setup Many-to-Many for Pencairan-Program
-- ============================================

-- 1. Create junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS pencairan_program (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pencairan_id UUID REFERENCES pencairan_dana(id) ON DELETE CASCADE,
    program_kerja_id UUID REFERENCES program_kerja(id) ON DELETE CASCADE,
    jumlah_alokasi DECIMAL(15,2) NOT NULL DEFAULT 0,
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pencairan_id, program_kerja_id)
);

-- 2. Enable RLS
ALTER TABLE pencairan_program ENABLE ROW LEVEL SECURITY;

-- 3. Create policy
DROP POLICY IF EXISTS "Allow all" ON pencairan_program;
CREATE POLICY "Allow all" ON pencairan_program FOR ALL USING (true) WITH CHECK (true);

-- 4. Grant permissions
GRANT ALL ON pencairan_program TO anon;
GRANT ALL ON pencairan_program TO authenticated;
GRANT ALL ON pencairan_program TO postgres;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_pencairan_program_pencairan ON pencairan_program(pencairan_id);
CREATE INDEX IF NOT EXISTS idx_pencairan_program_program ON pencairan_program(program_kerja_id);

-- 6. Success message
SELECT 'Junction table pencairan_program created successfully' as status;
