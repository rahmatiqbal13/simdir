-- ============================================
-- UPDATE PASSWORD OPERATOR
-- ============================================

-- Update password di tabel users
UPDATE public.users 
SET password = 'operatorusc@_123',
    updated_at = NOW()
WHERE username = 'operator' 
   OR email = 'operator@usc.ac.id';

-- Verifikasi
SELECT username, email, role, is_active 
FROM public.users 
WHERE username = 'operator';
