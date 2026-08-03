import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_STATUS = ['belum_berjalan', 'akan_berlangsung', 'berlangsung', 'selesai']

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/program-kerja — daftar program kerja PUI, opsional ?unit_kerja_id=
// Dilindungi middleware (role super_admin/admin/pimpinan, sama seperti /kelola-program-kerja)
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)
    const unitKerjaId = searchParams.get('unit_kerja_id')

    let query = supabase
      .from('program_kerja_pui')
      .select('*, unit_kerja(nama, kode)')
      .order('created_at', { ascending: false })

    if (unitKerjaId) query = query.eq('unit_kerja_id', unitKerjaId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/program-kerja — tambah program kerja baru
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const unitKerjaId = body.unit_kerja_id
    const namaProgram = (body.nama_program || '').trim()
    const status = body.status || 'belum_berjalan'

    if (!unitKerjaId) {
      return NextResponse.json({ error: 'Unit/PUI wajib diisi' }, { status: 400 })
    }
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

    let nominalSpj = null
    if (body.nominal_spj !== undefined && body.nominal_spj !== null && body.nominal_spj !== '') {
      nominalSpj = Number(body.nominal_spj)
      if (!Number.isFinite(nominalSpj) || nominalSpj < 0) {
        return NextResponse.json({ error: 'Nominal SPJ harus berupa angka positif' }, { status: 400 })
      }
    }

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('program_kerja_pui')
      .insert([{
        unit_kerja_id: unitKerjaId,
        nama_program: namaProgram,
        deskripsi: (body.deskripsi || '').trim() || null,
        anggaran,
        status,
        tanggal_mulai: body.tanggal_mulai || null,
        tanggal_selesai: body.tanggal_selesai || null,
        nominal_spj: nominalSpj,
      }])
      .select('*, unit_kerja(nama, kode)')
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan data' }, { status: 500 })
  }
}
