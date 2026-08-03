import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySession } from '@/lib/session'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Identitas aktor dari cookie sesi lokal (bukan dari header Authorization
// yang dikirim client — itu bisa dikarang bebas). Kalau login lewat
// Supabase Auth murni (bukan simdir_session_local), log tetap tercatat
// tapi kolom actor_* jadi null — tidak menghalangi aksi tetap sukses.
async function getActor(request) {
  try {
    const cookie = request.cookies.get('simdir_session_local')?.value
    if (!cookie) return { id: null, username: null, role: null }
    const session = await verifySession(cookie)
    return {
      id: session?.id || null,
      username: session?.username || session?.email || null,
      role: session?.role || null,
    }
  } catch {
    return { id: null, username: null, role: null }
  }
}

async function writeLog(supabase, { action, pertanyaan_id, fasilitas_name, pertanyaan_text, actor }) {
  try {
    await supabase.from('pertanyaan_penilaian_log').insert({
      action,
      pertanyaan_id,
      fasilitas_name,
      pertanyaan_text,
      actor_id: actor.id,
      actor_username: actor.username,
      actor_role: actor.role,
    })
  } catch (err) {
    // Kegagalan menulis log TIDAK boleh menggagalkan aksi utama (tambah/
    // hapus pertanyaan sudah terjadi) — cukup dicatat ke console server.
    console.error('Gagal menulis pertanyaan_penilaian_log:', err)
  }
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

    const actor = await getActor(request)
    await writeLog(supabase, {
      action: 'create',
      pertanyaan_id: data.id,
      fasilitas_name: data.fasilitas_name,
      pertanyaan_text: data.pertanyaan,
      actor,
    })

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

    // Ambil snapshot dulu SEBELUM dihapus — begitu baris dihapus, isinya
    // tidak bisa dibaca lagi untuk dicatat ke log.
    const { data: existing } = await supabase
      .from('pertanyaan_kritik_saran')
      .select('fasilitas_name, pertanyaan')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('pertanyaan_kritik_saran')
      .delete()
      .eq('id', id)

    if (error) throw error

    if (existing) {
      const actor = await getActor(request)
      await writeLog(supabase, {
        action: 'delete',
        pertanyaan_id: id,
        fasilitas_name: existing.fasilitas_name,
        pertanyaan_text: existing.pertanyaan,
        actor,
      })
    }

    return NextResponse.json({ success: true, message: 'Pertanyaan berhasil dihapus' })
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Gagal menghapus pertanyaan' },
      { status: 500 }
    )
  }
}
