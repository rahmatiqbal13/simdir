import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/tv-screens — info operasional semua layar unit (public, dipakai TV)
export async function GET() {
  try {
    const { data, error } = await getServiceClient().from('tv_screens').select('*')
    if (error) throw error
    return NextResponse.json(data || [])
  } catch {
    // TV tetap jalan tanpa info operasional
    return NextResponse.json([])
  }
}
