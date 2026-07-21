import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const ALLOWED_KEPERLUAN = ['kunjungan_kerja', 'studi_banding', 'kerja_sama', 'wawancara_media', 'lainnya']

// GET /api/tamu — daftar tamu yang tercatat (butuh login, dilindungi middleware)
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(200, parseInt(searchParams.get('limit') || '100', 10))
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const { data, error } = await supabase
      .from('tamu')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/tamu — isi buku tamu (publik, tanpa login — dipakai di kiosk/tablet resepsionis)
export async function POST(request) {
  try {
    const body = await request.json()

    const namaLengkap = (body.nama_lengkap || '').trim()
    const instansi = (body.instansi || '').trim()
    const telepon = (body.telepon || '').trim()
    const email = (body.email || '').trim()
    const keperluan = body.keperluan
    const unitDituju = (body.unit_dituju || '').trim()

    if (!namaLengkap) {
      return NextResponse.json({ error: 'Nama lengkap wajib diisi' }, { status: 400 })
    }
    if (!instansi) {
      return NextResponse.json({ error: 'Instansi/asal wajib diisi' }, { status: 400 })
    }
    if (!telepon && !email) {
      return NextResponse.json({ error: 'No. HP atau email wajib diisi (minimal salah satu)' }, { status: 400 })
    }
    if (!ALLOWED_KEPERLUAN.includes(keperluan)) {
      return NextResponse.json({ error: 'Keperluan kunjungan wajib dipilih' }, { status: 400 })
    }
    if (!unitDituju) {
      return NextResponse.json({ error: 'Unit/fasilitas yang dituju wajib diisi' }, { status: 400 })
    }

    const jumlahRombongan = Math.max(1, parseInt(body.jumlah_rombongan, 10) || 1)

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('tamu')
      .insert([{
        nama_lengkap: namaLengkap,
        instansi,
        telepon: telepon || null,
        email: email || null,
        keperluan,
        keperluan_detail: (body.keperluan_detail || '').trim() || null,
        unit_dituju: unitDituju,
        nama_ditemui: (body.nama_ditemui || '').trim() || null,
        jumlah_rombongan: jumlahRombongan,
        tanda_tangan: body.tanda_tangan || null,
      }])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan data' }, { status: 500 })
  }
}

// DELETE /api/tamu?id=... — hapus entri (butuh login, dilindungi middleware)
export async function DELETE(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { error } = await supabase.from('tamu').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menghapus data' }, { status: 500 })
  }
}
