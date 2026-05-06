import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { mockSupabase, shouldUseMock } from './mock-client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function supabaseServer() {
  // Gunakan mock client jika env tidak tersedia
  if (shouldUseMock() || !supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️  Using mock Supabase server client')
    return mockSupabase
  }

  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch (error) {
          // Handle error
        }
      },
    },
  })
}
