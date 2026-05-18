import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// DELETE /api/tv-pamflets/[id] — hapus pamflet dari storage dan DB
export async function DELETE(request, { params }) {
  try {
    const { id } = params
    const supabase = getServiceClient()

    const { data: record, error: fetchError } = await supabase
      .from('tv_pamflets')
      .select('storage_path')
      .eq('id', id)
      .single()

    if (fetchError || !record) {
      return NextResponse.json({ error: 'Pamflet tidak ditemukan' }, { status: 404 })
    }

    if (record.storage_path) {
      await supabase.storage.from('tv-pamflets').remove([record.storage_path])
    }

    const { error: dbError } = await supabase.from('tv_pamflets').delete().eq('id', id)
    if (dbError) throw dbError

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menghapus pamflet' }, { status: 500 })
  }
}

// PATCH /api/tv-pamflets/[id] — update title, duration, atau order
export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const supabase = getServiceClient()

    const updates = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.duration !== undefined) updates.duration = Math.max(5, Math.min(60, body.duration))
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.order_num !== undefined) updates.order_num = body.order_num

    const { data, error } = await supabase
      .from('tv_pamflets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
