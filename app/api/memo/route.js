import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { friendlyDbError } from '@/lib/db-errors'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/memo — daftar memo. Dilindungi middleware (super_admin + pimpinan
// boleh baca; tulis cuma super_admin — lihat middleware.js).
export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('memo')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/memo — tambah memo baru. nomor dibuat otomatis oleh trigger DB
// (generate_memo_number), jangan dikirim dari client.
export async function POST(request) {
  try {
    const body = await request.json()
    const kepada = (body.kepada || '').trim()
    const dibuatOleh = (body.dibuat_oleh || '').trim()
    const perihal = (body.perihal || '').trim()
    const isi = (body.isi || '').trim()
    const tanggal = body.tanggal || new Date().toISOString().split('T')[0]

    if (!kepada) return NextResponse.json({ error: 'Nama pimpinan (Kepada) wajib diisi' }, { status: 400 })
    if (!dibuatOleh) return NextResponse.json({ error: 'Nama pembuat wajib diisi' }, { status: 400 })
    if (!perihal) return NextResponse.json({ error: 'Perihal wajib diisi' }, { status: 400 })
    if (!isi) return NextResponse.json({ error: 'Isi memo wajib diisi' }, { status: 400 })

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('memo')
      .insert([{ tanggal, kepada, dibuat_oleh: dibuatOleh, perihal, isi }])
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err, { duplicateLabel: 'Nomor memo' }) }, { status: 500 })
  }
}
