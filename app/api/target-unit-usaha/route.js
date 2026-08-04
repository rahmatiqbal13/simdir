import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { friendlyDbError } from '@/lib/db-errors'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/target-unit-usaha?tahun=2026
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tahun = searchParams.get('tahun')

    const supabase = getServiceClient()
    let query = supabase.from('target_unit_usaha').select('*').order('unit_usaha_id')
    if (tahun) query = query.eq('tahun', tahun)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data target' }, { status: 500 })
  }
}

// POST /api/target-unit-usaha — upsert target tahunan per unit+tahun
export async function POST(request) {
  try {
    const body = await request.json()
    const { unit_usaha_id, tahun, target_tahunan } = body
    if (!unit_usaha_id || !tahun || target_tahunan === undefined) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('target_unit_usaha')
      .upsert(
        { unit_usaha_id, tahun, target_tahunan },
        { onConflict: 'unit_usaha_id,tahun' }
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err) }, { status: 500 })
  }
}
