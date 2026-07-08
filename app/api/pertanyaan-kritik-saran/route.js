import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/pertanyaan-kritik-saran — list questions (public for active, auth for all)
export async function GET(request) {
  try {
    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)
    const fasilitas = searchParams.get('fasilitas')
    const activeOnly = searchParams.get('active') !== 'false'

    let query = supabase
      .from('pertanyaan_kritik_saran')
      .select('*')
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: true })

    if (fasilitas) {
      query = query.eq('fasilitas_name', fasilitas)
    }

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) throw error

    // Group by facility for convenience
    const grouped = {}
    ;(data || []).forEach(q => {
      if (!grouped[q.fasilitas_name]) grouped[q.fasilitas_name] = []
      grouped[q.fasilitas_name].push(q)
    })

    return NextResponse.json({ questions: data || [], grouped })
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Gagal memuat pertanyaan' },
      { status: 500 }
    )
  }
}

// POST /api/pertanyaan-kritik-saran — create new question (auth required)
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.fasilitas_name || !body.pertanyaan?.trim()) {
      return NextResponse.json(
        { error: 'Fasilitas dan pertanyaan wajib diisi' },
        { status: 400 }
      )
    }

    const tipe = body.tipe || 'rating'
    if (tipe === 'pilihan_ganda' || tipe === 'checkbox') {
      const opsi = body.opsi_pilihan
      if (!Array.isArray(opsi) || opsi.length < 2) {
        return NextResponse.json(
          { error: 'Pilihan ganda/checkbox memerlukan minimal 2 opsi' },
          { status: 400 }
        )
      }
    }

    const supabase = getServiceClient()

    const insertData = {
      fasilitas_name: body.fasilitas_name.trim(),
      pertanyaan: body.pertanyaan.trim(),
      tipe,
      urutan: body.urutan || 0,
      is_active: body.is_active !== false,
    }

    if ((tipe === 'pilihan_ganda' || tipe === 'checkbox') && body.opsi_pilihan) {
      insertData.opsi_pilihan = body.opsi_pilihan
    }

    const { data, error } = await supabase
      .from('pertanyaan_kritik_saran')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Gagal membuat pertanyaan' },
      { status: 500 }
    )
  }
}

// PUT /api/pertanyaan-kritik-saran — update question (auth required)
export async function PUT(request) {
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

    const updateData = {}
    if (body.pertanyaan !== undefined) updateData.pertanyaan = body.pertanyaan.trim()
    if (body.tipe !== undefined) updateData.tipe = body.tipe
    if (body.urutan !== undefined) updateData.urutan = body.urutan
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.fasilitas_name !== undefined) updateData.fasilitas_name = body.fasilitas_name.trim()
    if (body.opsi_pilihan !== undefined) {
      updateData.opsi_pilihan = Array.isArray(body.opsi_pilihan) && body.opsi_pilihan.length > 0
        ? body.opsi_pilihan
        : null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diupdate' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('pertanyaan_kritik_saran')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Gagal mengupdate pertanyaan' },
      { status: 500 }
    )
  }
}

// DELETE /api/pertanyaan-kritik-saran?id=xxx — delete question (auth required)
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
      .from('pertanyaan_kritik_saran')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Pertanyaan berhasil dihapus' })
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Gagal menghapus pertanyaan' },
      { status: 500 }
    )
  }
}
