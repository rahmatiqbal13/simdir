import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { friendlyDbError } from '@/lib/db-errors'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/unit-usaha — daftar unit usaha. Dilindungi middleware (role
// super_admin + admin_keuangan, sama seperti halaman /pemasukan-unit-usaha).
export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('unit_usaha')
      .select('*')
      .order('nama')
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/unit-usaha — tambah unit usaha baru
export async function POST(request) {
  try {
    const body = await request.json()
    const nama = (body.nama || '').trim()
    if (!nama) return NextResponse.json({ error: 'Nama unit usaha wajib diisi' }, { status: 400 })

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('unit_usaha')
      .insert([{ nama, aktif: true }])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err, { duplicateLabel: 'Nama unit usaha' }) }, { status: 500 })
  }
}
