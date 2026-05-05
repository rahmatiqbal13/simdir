-- ============================================
-- FIX: Create auth user for existing user in users table
-- Run this in Supabase SQL Editor
-- ============================================

-- Function to create auth user with proper password hash
CREATE OR REPLACE FUNCTION create_auth_user(
    p_email VARCHAR,
    p_password VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Generate UUID for the new user
    v_user_id := gen_random_uuid();
    
    -- Insert into auth.users with proper password hashing
    -- Using crypt extension for password hashing
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        v_user_id,
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );
    
    -- Also insert into auth.identities for proper auth
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id, 'email', p_email),
        'email',
        NOW(),
        NOW()
    );
    
    RETURN v_user_id;
END;
$$;

-- ============================================
-- Create auth user for adminiqbal
-- ============================================

-- First, check if user already exists in auth.users
SELECT id, email FROM auth.users WHERE email = 'adminiqbal@usc.ac.id';

-- If not exists, create the auth user (uncomment below)
-- SELECT create_auth_user('adminiqbal@usc.ac.id', 'usc@_140451');

-- ============================================
-- Alternative: Simple insert if function doesn't work
-- ============================================

-- Enable pgcrypto extension if not enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Manual insert into auth.users
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) 
SELECT 
    '2331dc87-84c3-4e56-950c-6da6769f3ba7'::UUID,
    'adminiqbal@usc.ac.id',
    crypt('usc@_140451', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"adminiqbal"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'adminiqbal@usc.ac.id'
);

-- Insert into auth.identities
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at
)
SELECT 
    '2331dc87-84c3-4e56-950c-6da6769f3ba7'::UUID,
    '2331dc87-84c3-4e56-950c-6da6769f3ba7'::UUID,
    '{"sub":"2331dc87-84c3-4e56-950c-6da6769f3ba7","email":"adminiqbal@usc.ac.id"}'::jsonb,
    'email',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = '2331dc87-84c3-4e56-950c-6da6769f3ba7'::UUID
);

-- ============================================
-- Verify
-- ============================================
SELECT * FROM auth.users WHERE email = 'adminiqbal@usc.ac.id';
