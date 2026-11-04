import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TV_LAYAR_UNIT, sanitizeKelas } from '@/lib/tvLayar'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/tv-kelas?layar=kolam — kelas rutin satu layar (public, dipakai TV)
export async function GET(request) {
  try {
    const layar = new URL(request.url).searchParams.get('layar')
    let query = getServiceClient().from('tv_kelas').select('*')
      .order('waktu_mulai', { ascending: true })
      .order('nama', { ascending: true })
    if (layar) {
      if (!TV_LAYAR_UNIT.includes(layar)) return NextResponse.json([])
      query = query.eq('layar', layar)
    }
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch {
    // TV tetap jalan tanpa kelas rutin
    return NextResponse.json([])
  }
}

// POST /api/tv-kelas — tambah kelas rutin
export async function POST(request) {
  try {
    const { row, error: invalid } = sanitizeKelas(await request.json())
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

    const { data, error } = await getServiceClient()
      .from('tv_kelas')
      .insert(row)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan' }, { status: 500 })
  }
}
