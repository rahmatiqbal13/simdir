import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TV_LAYAR_UNIT, sanitizeJadwal } from '@/lib/tvLayar'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/

// PATCH /api/tv-screens/[slug] — simpan jadwal per hari, status, catatan, running text
export async function PATCH(request, { params }) {
  try {
    const { slug } = await params
    if (!TV_LAYAR_UNIT.includes(slug)) {
      return NextResponse.json({ error: 'Layar tidak dikenal' }, { status: 404 })
    }
    const body = await request.json()

    const row = { slug, updated_at: new Date().toISOString() }
    for (const k of ['jam_buka', 'jam_tutup']) {
      if (body[k] !== undefined) {
        if (body[k] && !TIME_RE.test(body[k])) {
          return NextResponse.json({ error: 'Format jam harus HH:MM' }, { status: 400 })
        }
        row[k] = body[k] || null
      }
    }
    if (body.jadwal !== undefined) {
      row.jadwal = body.jadwal === null ? null : sanitizeJadwal(body.jadwal)
      if (body.jadwal !== null && !row.jadwal) {
        return NextResponse.json({ error: 'Jadwal tidak valid — hari yang buka wajib punya jam buka & tutup' }, { status: 400 })
      }
    }
    if (body.tutup_sementara !== undefined) row.tutup_sementara = !!body.tutup_sementara
    if (body.catatan !== undefined) row.catatan = String(body.catatan || '').slice(0, 200) || null
    if (body.running_text !== undefined) row.running_text = String(body.running_text || '').slice(0, 2000) || null

    const { data, error } = await getServiceClient()
      .from('tv_screens')
      .upsert(row)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan' }, { status: 500 })
  }
}
