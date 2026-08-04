import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySession } from '@/lib/session'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function getActorUsername(request) {
  try {
    const cookie = request.cookies.get('simdir_session_local')?.value
    if (!cookie) return null
    const session = await verifySession(cookie)
    return session?.username || session?.email || null
  } catch {
    return null
  }
}

// POST /api/pemasukan-unit-usaha/[id]/lock — kunci baris agar tidak bisa
// diedit/dihapus lagi (dipakai setelah realisasi bulan itu final).
export async function POST(request, { params }) {
  try {
    const { id } = await params
    const actorUsername = await getActorUsername(request)

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('pemasukan_unit_usaha')
      .update({ locked: true, locked_at: new Date().toISOString(), locked_by: actorUsername })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
      throw error
    }
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal mengunci data' }, { status: 500 })
  }
}
