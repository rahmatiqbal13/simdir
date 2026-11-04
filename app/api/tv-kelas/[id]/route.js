import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sanitizeKelas } from '@/lib/tvLayar'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// PATCH /api/tv-kelas/[id] — ubah kelas rutin (field yang dikirim saja)
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    delete body.layar // kelas tidak dipindah antar layar
    const { row, error: invalid } = sanitizeKelas(body, true)
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

    const { data, error } = await getServiceClient()
      .from('tv_kelas')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan' }, { status: 500 })
  }
}

// DELETE /api/tv-kelas/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const { error } = await getServiceClient().from('tv_kelas').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menghapus' }, { status: 500 })
  }
}
