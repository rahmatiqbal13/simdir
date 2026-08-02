import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { compressImage } from '@/lib/image'

const FOTO_BUCKET = 'tamu-foto'

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

    // Tanpa limit/offset secara default — halaman admin melakukan
    // pencarian, filter, dan pagination di sisi klien atas seluruh data
    // (sama seperti /api/saran, /api/kritik-saran), supaya statistik
    // "Total Tamu" dan pencarian tidak diam-diam kehilangan data lama
    // begitu jumlah tamu melewati satu batas tersembunyi.
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    let query = supabase
      .from('tamu')
      .select('*')
      .order('created_at', { ascending: false })

    if (limitParam) {
      const limit = Math.min(1000, parseInt(limitParam, 10) || 1000)
      const offset = parseInt(offsetParam || '0', 10)
      query = query.range(offset, offset + limit - 1)
    }

    const { data, error } = await query

    if (error) throw error

    const rows = data || []
    const paths = rows.filter((r) => r.foto_path).map((r) => r.foto_path)
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage.from(FOTO_BUCKET).createSignedUrls(paths, 3600)
      const urlByPath = new Map((signed || []).map((s) => [s.path, s.signedUrl]))
      for (const row of rows) {
        if (row.foto_path) row.foto_url = urlByPath.get(row.foto_path) || null
      }
    }

    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/tamu — isi buku tamu (publik, tanpa login — dipakai di kiosk/tablet resepsionis)
export async function POST(request) {
  try {
    const formData = await request.formData()

    const namaLengkap = (formData.get('nama_lengkap') || '').trim()
    const instansi = (formData.get('instansi') || '').trim()
    const telepon = (formData.get('telepon') || '').trim()
    const email = (formData.get('email') || '').trim()
    const keperluan = formData.get('keperluan')
    const unitDituju = (formData.get('unit_dituju') || '').trim()
    const tandaTangan = formData.get('tanda_tangan')
    const fotoFile = formData.get('foto')
    const supabase = getServiceClient()

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

    let fotoPath = null
    if (fotoFile && fotoFile instanceof Blob && fotoFile.size > 0) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(fotoFile.type)) {
        return NextResponse.json({ error: 'Format foto harus JPG, PNG, atau WebP' }, { status: 400 })
      }
      if (fotoFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Ukuran foto maksimal 5MB' }, { status: 400 })
      }

      const ext = (fotoFile.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const storagePath = `foto/${timestamp}-${random}.${ext}`

      const arrayBuffer = await fotoFile.arrayBuffer()
      const compressed = await compressImage(Buffer.from(arrayBuffer), fotoFile.type, { maxWidth: 1000, quality: 82 })

      const { error: uploadError } = await supabase.storage
        .from(FOTO_BUCKET)
        .upload(storagePath, compressed, { contentType: fotoFile.type, upsert: false })
      if (uploadError) throw uploadError

      fotoPath = storagePath
    }

    const jumlahRombongan = Math.max(1, parseInt(formData.get('jumlah_rombongan'), 10) || 1)

    const { data, error } = await supabase
      .from('tamu')
      .insert([{
        nama_lengkap: namaLengkap,
        instansi,
        telepon: telepon || null,
        email: email || null,
        keperluan,
        keperluan_detail: (formData.get('keperluan_detail') || '').trim() || null,
        unit_dituju: unitDituju,
        nama_ditemui: (formData.get('nama_ditemui') || '').trim() || null,
        jumlah_rombongan: jumlahRombongan,
        tanda_tangan: tandaTangan || null,
        foto_path: fotoPath,
      }])
      .select()
      .single()

    if (error) {
      if (fotoPath) await supabase.storage.from(FOTO_BUCKET).remove([fotoPath])
      throw error
    }
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
    const { data: existing } = await supabase.from('tamu').select('foto_path').eq('id', id).single()

    const { error } = await supabase.from('tamu').delete().eq('id', id)
    if (error) throw error

    if (existing?.foto_path) {
      await supabase.storage.from(FOTO_BUCKET).remove([existing.foto_path])
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menghapus data' }, { status: 500 })
  }
}
