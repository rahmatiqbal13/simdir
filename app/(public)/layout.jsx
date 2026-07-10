import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const metadata = {
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default async function PublicLayout({ children }) {
  return children
}