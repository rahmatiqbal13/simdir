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

// PATCH /api/pemasukan-unit-usaha/[id] — edit jumlah/keterangan (ditolak bila locked)
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const { jumlah, keterangan } = await request.json()

    const supabase = getServiceClient()

    const { data: existing } = await supabase
      .from('pemasukan_unit_usaha')
      .select('locked')
      .eq('id', id)
      .single()

    if (existing?.locked) {
      return NextResponse.json({ error: 'Bulan ini sudah dikunci. Tidak dapat mengedit data.' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('pemasukan_unit_usaha')
      .update({ jumlah, keterangan: keterangan || null })
      .eq('id', id)
      .select(SELECT_COLUMNS)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err) }, { status: 500 })
  }
}

// DELETE /api/pemasukan-unit-usaha/[id] — ditolak bila locked
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()

    const { data: existing } = await supabase
      .from('pemasukan_unit_usaha')
      .select('locked')
      .eq('id', id)
      .single()

    if (existing?.locked) {
      return NextResponse.json({ error: 'Bulan ini sudah dikunci. Tidak dapat menghapus data.' }, { status: 403 })
    }

    const { error } = await supabase.from('pemasukan_unit_usaha').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err) }, { status: 500 })
  }
}
