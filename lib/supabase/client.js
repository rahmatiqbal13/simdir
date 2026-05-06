import { createClient } from '@supabase/supabase-js';
import { mockSupabase, shouldUseMock } from './mock-client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase;

// Gunakan mock client jika environment tidak tersedia
if (shouldUseMock()) {
  console.warn('⚠️  Using mock Supabase client - Add real credentials to .env.local for production');
  supabase = mockSupabase;
} else if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase URL or Key not configured');
  supabase = mockSupabase;
} else {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export { supabase };
