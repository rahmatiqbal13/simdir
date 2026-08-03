import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function PublicLayout({ children }) {
  return children
}