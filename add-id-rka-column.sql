-- ============================================
-- ADD id_rka COLUMN TO program_kerja TABLE
-- ============================================

-- Cek apakah kolom id_rka sudah ada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'program_kerja' 
        AND column_name = 'id_rka'
    ) THEN
        ALTER TABLE program_kerja ADD COLUMN id_rka TEXT;
        RAISE NOTICE 'Kolom id_rka berhasil ditambahkan';
    ELSE
        RAISE NOTICE 'Kolom id_rka sudah ada';
    END IF;
END $$;

-- Cek struktur tabel
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'program_kerja'
ORDER BY ordinal_position;

-- Update data yang sudah ada (opsional - berikan id_rka default)
-- UPDATE program_kerja SET id_rka = 'RKA-' || EXTRACT(YEAR FROM created_at) || '-' || id::text
-- WHERE id_rka IS NULL;
