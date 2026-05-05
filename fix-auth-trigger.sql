-- ============================================
-- FIX: Remove problematic auth trigger causing 500 error on signup
-- ============================================

-- Drop the trigger that's causing 500 errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Also drop the function if no longer needed
-- DROP FUNCTION IF EXISTS public.handle_new_user();

-- Alternative: Fix the trigger by ensuring profiles table exists
-- (Uncomment below if you want to keep the trigger)
/*
-- Create profiles table if not exists
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Recreate the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (new.id, new.email, 'admin')
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
*/
