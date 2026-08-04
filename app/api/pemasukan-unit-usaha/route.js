import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { friendlyDbError } from '@/lib/db-errors'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const SELECT_COLUMNS = '*, unit_usaha:unit_usaha_id(id, nama)'

// GET /api/pemasukan-unit-usaha?tahun=2026&unit_usaha_id=xxx
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tahun = searchParams.get('tahun')
    const unitUsahaId = searchParams.get('unit_usaha_id')

    const supabase = getServiceClient()
    let query = supabase.from('pemasukan_unit_usaha').select(SELECT_COLUMNS).order('tahun').order('bulan')
    if (tahun) query = query.eq('tahun', tahun)
    if (unitUsahaId) query = query.eq('unit_usaha_id', unitUsahaId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/pemasukan-unit-usaha — upsert realisasi bulanan. Ditolak kalau
// baris untuk unit+tahun+bulan itu sudah dikunci (locked).
export async function POST(request) {
  try {
    const body = await request.json()
    const { unit_usaha_id, tahun, bulan, jumlah, keterangan } = body
    if (!unit_usaha_id || !tahun || !bulan || jumlah === undefined) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { data: existing } = await supabase
      .from('pemasukan_unit_usaha')
      .select('locked')
      .eq('unit_usaha_id', unit_usaha_id)
      .eq('tahun', tahun)
      .eq('bulan', bulan)
      .maybeSingle()

    if (existing?.locked) {
      return NextResponse.json({ error: 'Bulan ini sudah dikunci. Tidak dapat mengedit data.' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('pemasukan_unit_usaha')
      .upsert(
        { unit_usaha_id, tahun, bulan, jumlah, keterangan: keterangan || null },
        { onConflict: 'unit_usaha_id,tahun,bulan' }
      )
      .select(SELECT_COLUMNS)
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err) }, { status: 500 })
  }
}
