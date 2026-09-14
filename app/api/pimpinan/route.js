import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { friendlyDbError } from '@/lib/db-errors'

const SAFE_COLUMNS = 'id, nama, jabatan, is_active, created_at'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/pimpinan — daftar pimpinan. Dilindungi middleware: super_admin,
// admin, dan pimpinan boleh baca (siapa pun yang bisa mengisi form agenda/
// memo yang punya dropdown pimpinan), tulis cuma super_admin.
export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('pimpinan')
      .select(SAFE_COLUMNS)
      .order('nama', { ascending: true })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/pimpinan — tambah entri pimpinan baru
export async function POST(request) {
  try {
    const body = await request.json()
    const nama = (body.nama || '').trim()
    const jabatan = (body.jabatan || '').trim() || null

    if (!nama) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('pimpinan')
      .insert([{ nama, jabatan, is_active: true }])
      .select(SAFE_COLUMNS)
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err) }, { status: 500 })
  }
}
