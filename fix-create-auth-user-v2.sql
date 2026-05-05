-- ============================================
-- FIX: Create auth user for existing user in users table
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create auth user for adminiqbal
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

-- Create identity for the user (with provider_id)
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at
)
SELECT 
    '2331dc87-84c3-4e56-950c-6da6769f3ba7'::UUID,
    '2331dc87-84c3-4e56-950c-6da6769f3ba7'::UUID,
    '{"sub":"2331dc87-84c3-4e56-950c-6da6769f3ba7","email":"adminiqbal@usc.ac.id"}'::jsonb,
    'email',
    '2331dc87-84c3-4e56-950c-6da6769f3ba7',  -- provider_id
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = '2331dc87-84c3-4e56-950c-6da6769f3ba7'::UUID
);

-- ============================================
-- Verify
-- ============================================
SELECT * FROM auth.users WHERE email = 'adminiqbal@usc.ac.id';
SELECT * FROM auth.identities WHERE user_id = '2331dc87-84c3-4e56-950c-6da6769f3ba7'::UUID;
