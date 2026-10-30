import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET /api/tv-version — sidik jari isi layar TV (agenda, pamflet, pengaturan
// layar, branding, versi deploy). Layar TV menanyakannya berkala dan memuat
// ulang diri saat nilainya berubah (lihat useTvAutoReload). Publik: hanya hash.
export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const [agenda, pamflet, screens, brand] = await Promise.all([
    supabase.from('agenda').select('*').order('id'),
    supabase.from('tv_pamflets').select('*').order('id'),
    supabase.from('tv_screens').select('*').order('slug'),
    supabase.storage.from('app-settings').download('branding.json').then(r => r.data?.text()).catch(() => null),
  ])
  if (agenda.error || pamflet.error) {
    return NextResponse.json({ error: 'Gagal membaca data' }, { status: 503 })
  }
  const v = createHash('sha1')
    .update(JSON.stringify([agenda.data, pamflet.data, screens.data, brand, process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || '']))
    .digest('hex')
  return NextResponse.json({ v }, { headers: { 'Cache-Control': 'no-store' } })
}
