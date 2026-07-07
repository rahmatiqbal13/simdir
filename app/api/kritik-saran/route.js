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
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10))
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
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Minimal pilih 1 fasilitas dan berikan rating & penjelasan' },
        { status: 400 }
      )
    }

    const ALLOWED_ASPEK = ['Sarana', 'Prasarana', 'Pelayanan', 'Kebersihan', 'Keamanan', 'Lainnya']

    // Validate each item
    for (const item of body.items) {
      if (!ALLOWED_FACILITIES.includes(item.fasilitas)) {
        return NextResponse.json(
          { error: `Fasilitas "${item.fasilitas}" tidak valid` },
          { status: 400 }
        )
      }
      if (!item.rating || item.rating < 1 || item.rating > 5) {
        return NextResponse.json(
          { error: `Rating untuk ${item.fasilitas} wajib diisi (1-5)` },
          { status: 400 }
        )
      }
      if (!item.penjelasan || !item.penjelasan.trim()) {
        return NextResponse.json(
          { error: `Penjelasan untuk ${item.fasilitas} wajib diisi` },
          { status: 400 }
        )
      }
      if (item.aspek && !ALLOWED_ASPEK.includes(item.aspek)) {
        return NextResponse.json(
          { error: `Aspek "${item.aspek}" tidak valid` },
          { status: 400 }
        )
      }
    }

    const supabase = getServiceClient()

    // Calculate overall rating (average)
    const avgRating = Math.round(
      body.items.reduce((sum, item) => sum + item.rating, 0) / body.items.length
    )

    // Insert parent record
    const { data: parent, error: parentError } = await supabase
      .from('kritik_saran')
      .insert({
        nama: body.is_anonim ? null : (body.nama || null),
        email: body.is_anonim ? null : (body.email || null),
        telepon: body.is_anonim ? null : (body.telepon || null),
        unit_kerja: body.unit_kerja || null,
        kategori: body.items.map(i => i.fasilitas).join(', '),
        isi: body.items.map(i => `[${i.fasilitas}] ${i.penjelasan}`).join('\n\n'),
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
      rating: item.rating,
      penjelasan: item.penjelasan.trim(),
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
