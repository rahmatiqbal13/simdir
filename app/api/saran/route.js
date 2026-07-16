import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const JENIS_ALLOWED = ['kritik', 'saran', 'permohonan_kelas', 'permohonan_kegiatan']

// POST /api/saran — submit kritik, saran, atau permohonan (public)
export async function POST(request) {
  try {
    const body = await request.json()

    if (!body.jenis || !JENIS_ALLOWED.includes(body.jenis)) {
      return NextResponse.json({ error: 'Jenis tidak valid' }, { status: 400 })
    }
    if (!body.fasilitas?.trim()) {
      return NextResponse.json({ error: 'Fasilitas wajib dipilih' }, { status: 400 })
    }
    if (!body.jenis_kelamin || !['Laki-laki', 'Perempuan'].includes(body.jenis_kelamin)) {
      return NextResponse.json({ error: 'Jenis kelamin wajib dipilih' }, { status: 400 })
    }

    const isPermohonan = body.jenis === 'permohonan_kelas' || body.jenis === 'permohonan_kegiatan'

    if (isPermohonan) {
      if (!body.nama_kelas_kegiatan?.trim()) {
        return NextResponse.json({ error: 'Nama kelas/kegiatan wajib diisi' }, { status: 400 })
      }
      if (!body.tanggal_diinginkan) {
        return NextResponse.json({ error: 'Tanggal yang diinginkan wajib diisi' }, { status: 400 })
      }
    } else {
      if (!body.judul?.trim()) {
        return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 })
      }
      const isiLen = body.isi?.trim()?.length || 0
      if (isiLen < 20) {
        return NextResponse.json({ error: 'Isi pesan minimal 20 karakter' }, { status: 400 })
      }
      if (isiLen > 2000) {
        return NextResponse.json({ error: 'Isi pesan maksimal 2000 karakter' }, { status: 400 })
      }
    }

    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('saran')
      .insert({
        jenis:               body.jenis,
        fasilitas:           body.fasilitas.trim(),
        judul:               isPermohonan ? null : body.judul?.trim(),
        isi:                 isPermohonan ? null : body.isi?.trim(),
        nama_kelas_kegiatan: isPermohonan ? body.nama_kelas_kegiatan.trim() : null,
        tanggal_diinginkan:  isPermohonan ? body.tanggal_diinginkan : null,
        estimasi_peserta:    isPermohonan && body.estimasi_peserta ? parseInt(body.estimasi_peserta) : null,
        catatan:             body.catatan?.trim() || null,
        nama:                body.is_anonim ? null : (body.nama?.trim() || null),
        email:               body.is_anonim ? null : (body.email?.trim() || null),
        telepon:             body.is_anonim ? null : (body.telepon?.trim() || null),
        unit_kerja:          body.unit_kerja?.trim() || null,
        jenis_kelamin:       body.jenis_kelamin,
        is_anonim:           body.is_anonim || false,
        status:              'baru',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal mengirim' }, { status: 500 })
  }
}

// GET /api/saran — list all (auth required)
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const jenis  = searchParams.get('jenis')
    const limit  = Math.min(100, parseInt(searchParams.get('limit') || '50', 10))
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('saran')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (jenis)  query = query.eq('jenis', jenis)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat' }, { status: 500 })
  }
}

// PATCH /api/saran — update status / tanggapan (auth required)
export async function PATCH(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

    const supabase = getServiceClient()
    const updateData = { updated_at: new Date().toISOString() }
    if (body.status)               updateData.status = body.status
    if (body.tanggapan !== undefined) updateData.tanggapan = body.tanggapan

    const { data, error } = await supabase
      .from('saran')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal mengupdate' }, { status: 500 })
  }
}

// DELETE /api/saran?id=xxx (auth required, super_admin only)
export async function DELETE(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

    const supabase = getServiceClient()
    const { error } = await supabase.from('saran').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menghapus' }, { status: 500 })
  }
}
