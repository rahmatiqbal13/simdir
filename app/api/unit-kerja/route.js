import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { friendlyDbError } from '@/lib/db-errors'

const SAFE_COLUMNS = 'id, nama, kode, deskripsi, is_active, created_at'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/unit-kerja — daftar unit kerja. Dilindungi middleware (role
// super_admin, sama seperti halaman /pengaturan/unit-kerja).
export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('unit_kerja')
      .select(SAFE_COLUMNS)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/unit-kerja — tambah unit kerja baru
export async function POST(request) {
  try {
    const body = await request.json()
    const nama = (body.nama || '').trim()
    const kode = (body.singkatan || body.kode || '').trim()
    const deskripsi = (body.deskripsi || '').trim() || null

    if (!nama) return NextResponse.json({ error: 'Nama unit kerja wajib diisi' }, { status: 400 })
    if (!kode) return NextResponse.json({ error: 'Singkatan wajib diisi' }, { status: 400 })

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('unit_kerja')
      .insert([{ nama, kode, deskripsi, is_active: body.is_active ?? true }])
      .select(SAFE_COLUMNS)
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err, { duplicateLabel: 'Nama/singkatan unit kerja' }) }, { status: 500 })
  }
}
