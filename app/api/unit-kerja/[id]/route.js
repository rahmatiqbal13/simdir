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

// PUT /api/unit-kerja/[id] — update unit kerja (termasuk toggle status)
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const nama = (body.nama || '').trim()
    const kode = (body.singkatan || body.kode || '').trim()
    const deskripsi = (body.deskripsi || '').trim() || null

    if (!nama) return NextResponse.json({ error: 'Nama unit kerja wajib diisi' }, { status: 400 })
    if (!kode) return NextResponse.json({ error: 'Singkatan wajib diisi' }, { status: 400 })

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('unit_kerja')
      .update({ nama, kode, deskripsi, is_active: body.is_active })
      .eq('id', id)
      .select(SAFE_COLUMNS)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err, { duplicateLabel: 'Nama/singkatan unit kerja' }) }, { status: 500 })
  }
}

// DELETE /api/unit-kerja/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()
    const { error } = await supabase.from('unit_kerja').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err, { dependentLabel: 'program kerja, agenda, atau data lain' }) }, { status: 500 })
  }
}
