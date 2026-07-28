import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_STATUS = ['belum_berjalan', 'akan_berlangsung', 'berlangsung', 'selesai']

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// PUT /api/program-kerja/[id] — update program kerja (termasuk ubah status & nominal SPJ)
export async function PUT(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const namaProgram = (body.nama_program || '').trim()
    const status = body.status || 'belum_berjalan'

    if (!namaProgram) {
      return NextResponse.json({ error: 'Nama program wajib diisi' }, { status: 400 })
    }
    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
    }

    const anggaran = Number(body.anggaran)
    if (!Number.isFinite(anggaran) || anggaran < 0) {
      return NextResponse.json({ error: 'Anggaran harus berupa angka positif' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('program_kerja_pui')
      .update({
        nama_program: namaProgram,
        deskripsi: (body.deskripsi || '').trim() || null,
        anggaran,
        status,
        tanggal_mulai: body.tanggal_mulai || null,
        tanggal_selesai: body.tanggal_selesai || null,
        nominal_spj: body.nominal_spj !== undefined && body.nominal_spj !== '' ? Number(body.nominal_spj) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, unit_kerja(nama, kode)')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan data' }, { status: 500 })
  }
}

// DELETE /api/program-kerja/[id]
export async function DELETE(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getServiceClient()
    const { error } = await supabase.from('program_kerja_pui').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menghapus data' }, { status: 500 })
  }
}
