import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { friendlyDbError } from '@/lib/db-errors'
import { slugToNomor } from '@/lib/utils/format'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/memo/[id] — satu memo. Parameter route bernama "id" tapi nilainya
// slug dari nomor (mis. "MEMO-2026-09-0001", lihat nomorToSlug/slugToNomor
// di lib/utils/format.js), bukan UUID.
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('memo')
      .select('*')
      .eq('nomor', slugToNomor(id))
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Memo tidak ditemukan' }, { status: 404 })
  }
}

// PUT /api/memo/[id] — update memo. nomor tidak pernah diubah setelah dibuat.
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const kepada = (body.kepada || '').trim()
    const dibuatOleh = (body.dibuat_oleh || '').trim()
    const perihal = (body.perihal || '').trim()
    const isi = (body.isi || '').trim()

    if (!kepada) return NextResponse.json({ error: 'Nama pimpinan (Kepada) wajib diisi' }, { status: 400 })
    if (!dibuatOleh) return NextResponse.json({ error: 'Nama pembuat wajib diisi' }, { status: 400 })
    if (!perihal) return NextResponse.json({ error: 'Perihal wajib diisi' }, { status: 400 })
    if (!isi) return NextResponse.json({ error: 'Isi memo wajib diisi' }, { status: 400 })
    if (!body.tanggal) return NextResponse.json({ error: 'Tanggal wajib diisi' }, { status: 400 })

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('memo')
      .update({ tanggal: body.tanggal, kepada, dibuat_oleh: dibuatOleh, perihal, isi })
      .eq('nomor', slugToNomor(id))
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err) }, { status: 500 })
  }
}

// DELETE /api/memo/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()
    const { error } = await supabase.from('memo').delete().eq('nomor', slugToNomor(id))
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err) }, { status: 500 })
  }
}
