import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function PublicLayout({ children }) {
  return children
}