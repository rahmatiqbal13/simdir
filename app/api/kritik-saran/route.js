import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Daftar fasilitas yang tersedia — mudah ditambah nanti
const ALLOWED_FACILITIES = [
  'Achilles Gym Hub',
  'Kolam Renang Unesa',
  'Driving Golf Unesa',
]

// GET /api/kritik-saran — list all feedback with items (auth required)
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    // Cap dinaikkan dari 100 ke 2000 — halaman Laporan butuh SELURUH data
    // untuk menghitung statistik skala Likert yang akurat, bukan cuma 100
    // entri terakhir (lihat bug serupa yang pernah ditemukan di /api/tamu).
    const limit = Math.min(2000, parseInt(searchParams.get('limit') || '50', 10))
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('kritik_saran')
      .select('*, items:kritik_saran_items(*)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/kritik-saran — submit multi-facility feedback (public)
export async function POST(request) {
  try {
    const body = await request.json()

    // Validation
    if (!body.jenis_kelamin || !['Laki-laki', 'Perempuan'].includes(body.jenis_kelamin)) {
      return NextResponse.json(
        { error: 'Jenis kelamin wajib dipilih (Laki-laki atau Perempuan)' },
        { status: 400 }
      )
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Minimal pilih 1 fasilitas dan berikan rating & penjelasan' },
        { status: 400 }
      )
    }

    // Validate each item
    for (const item of body.items) {
      if (!item.fasilitas || !item.fasilitas.trim()) {
        return NextResponse.json(
          { error: `Fasilitas wajib diisi untuk setiap item` },
          { status: 400 }
        )
      }

      const tipe = item.tipe || 'rating'

      if (tipe === 'pilihan_ganda') {
        if (!item.jawaban_pilihan || !item.jawaban_pilihan.trim()) {
          return NextResponse.json(
            { error: `Pilihan untuk "${item.aspek || item.fasilitas}" wajib diisi` },
            { status: 400 }
          )
        }
      } else if (tipe === 'checkbox') {
        let jawabanArr = []
        if (item.jawaban_pilihan) {
          try { jawabanArr = JSON.parse(item.jawaban_pilihan) } catch {}
        }
        if (!Array.isArray(jawabanArr) || jawabanArr.length === 0) {
          return NextResponse.json(
            { error: `Pilihan untuk "${item.aspek || item.fasilitas}" wajib dipilih minimal 1` },
            { status: 400 }
          )
        }
      } else if (tipe === 'teks') {
        if (!item.penjelasan || !item.penjelasan.trim()) {
          return NextResponse.json(
            { error: `Penjelasan untuk "${item.aspek || item.fasilitas}" wajib diisi` },
            { status: 400 }
          )
        }
      } else {
        // Default: rating
        if (!item.rating || item.rating < 1 || item.rating > 5) {
          return NextResponse.json(
            { error: `Rating untuk "${item.aspek || item.fasilitas}" wajib diisi (1-5)` },
            { status: 400 }
          )
        }
        if (!item.penjelasan || !item.penjelasan.trim()) {
          return NextResponse.json(
            { error: `Penjelasan untuk "${item.aspek || item.fasilitas}" wajib diisi` },
            { status: 400 }
          )
        }
      }
    }

    const supabase = getServiceClient()

    // Calculate overall rating (average of rating items only)
    const ratingItems = body.items.filter(i => i.rating && i.rating >= 1 && i.rating <= 5)
    const avgRating = ratingItems.length > 0
      ? Math.round(ratingItems.reduce((sum, item) => sum + item.rating, 0) / ratingItems.length)
      : null

    // Insert parent record
    const { data: parent, error: parentError } = await supabase
      .from('kritik_saran')
      .insert({
        nama: body.is_anonim ? null : (body.nama || null),
        email: body.is_anonim ? null : (body.email || null),
        telepon: body.is_anonim ? null : (body.telepon || null),
        unit_kerja: body.unit_kerja || null,
        jenis_kelamin: body.jenis_kelamin,
        kategori: body.items.map(i => i.fasilitas).join(', '),
        isi: body.items.map(i => {
          let jawaban = i.penjelasan || ''
          if (i.jawaban_pilihan) {
            try {
              const arr = JSON.parse(i.jawaban_pilihan)
              if (Array.isArray(arr)) jawaban = arr.join(', ')
              else jawaban = i.jawaban_pilihan
            } catch {
              jawaban = i.jawaban_pilihan
            }
          }
          return `[${i.fasilitas}] ${jawaban}`
        }).join('\n\n'),
        is_anonim: body.is_anonim || false,
        status: 'baru',
        total_items: body.items.length,
        overall_rating: avgRating,
      })
      .select()
      .single()

    if (parentError) throw parentError

    // Insert items
    const itemRecords = body.items.map(item => ({
      kritik_saran_id: parent.id,
      fasilitas: item.fasilitas,
      aspek: item.aspek || 'Lainnya',
      rating: item.rating || null,
      penjelasan: item.penjelasan ? item.penjelasan.trim() : null,
      jawaban_pilihan: item.jawaban_pilihan ? item.jawaban_pilihan.trim() : null,
      pertanyaan_id: item.pertanyaan_id || null,
    }))

    const { error: itemsError } = await supabase
      .from('kritik_saran_items')
      .insert(itemRecords)

    if (itemsError) throw itemsError

    return NextResponse.json(
      { 
        success: true, 
        data: { ...parent, items: itemRecords },
        message: `Kritik & saran berhasil dikirim (${body.items.length} fasilitas). Terima kasih!` 
      },
      { status: 201 }
    )
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Gagal mengirim kritik & saran' },
      { status: 500 }
    )
  }
}

// PATCH /api/kritik-saran — update status/tanggapan (auth required)
export async function PATCH(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const id = body.id

    if (!id) {
      return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const updateData = {}
    if (body.status) updateData.status = body.status
    if (body.tanggapan !== undefined) updateData.tanggapan = body.tanggapan

    const { data, error } = await supabase
      .from('kritik_saran')
      .update(updateData)
      .eq('id', id)
      .select('*, items:kritik_saran_items(*)')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Gagal mengupdate' },
      { status: 500 }
    )
  }
}

// DELETE /api/kritik-saran?id=xxx — delete feedback (auth required, super_admin only)
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

    const { error } = await supabase
      .from('kritik_saran')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Kritik & saran berhasil dihapus' })
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Gagal menghapus' },
      { status: 500 }
    )
  }
}
