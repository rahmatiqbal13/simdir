import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { friendlyDbError } from '@/lib/db-errors'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// PATCH /api/unit-usaha/[id] — ubah nama dan/atau status aktif
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const updates = {}
    if (body.nama !== undefined) {
      const nama = body.nama.trim()
      if (!nama) return NextResponse.json({ error: 'Nama unit usaha wajib diisi' }, { status: 400 })
      updates.nama = nama
    }
    if (body.aktif !== undefined) updates.aktif = body.aktif

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('unit_usaha')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err, { duplicateLabel: 'Nama unit usaha' }) }, { status: 500 })
  }
}
