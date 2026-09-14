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

// PUT /api/pimpinan/[id] — update entri pimpinan (termasuk toggle status)
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const nama = (body.nama || '').trim()
    const jabatan = (body.jabatan || '').trim() || null

    if (!nama) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('pimpinan')
      .update({ nama, jabatan, is_active: body.is_active })
      .eq('id', id)
      .select(SAFE_COLUMNS)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err) }, { status: 500 })
  }
}

// DELETE /api/pimpinan/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()
    const { error } = await supabase.from('pimpinan').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err) }, { status: 500 })
  }
}
