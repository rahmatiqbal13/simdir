import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { friendlyDbError } from '@/lib/db-errors'

const SELECT_COLUMNS = '*, rab_items(*)'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function validateBody(body) {
  const namaKegiatan = (body.nama_kegiatan || '').trim()
  const namaPenanggungJawab = (body.nama_penanggung_jawab || '').trim()
  const tahunAnggaran = Number(body.tahun_anggaran)
  const items = Array.isArray(body.items) ? body.items : []

  if (!namaKegiatan) return { error: 'Nama kegiatan wajib diisi' }
  if (!namaPenanggungJawab) return { error: 'Nama penanggung jawab wajib diisi' }
  if (!Number.isFinite(tahunAnggaran) || tahunAnggaran < 2000) {
    return { error: 'Tahun anggaran wajib diisi dengan angka yang valid' }
  }
  if (items.length === 0) return { error: 'RAB wajib punya minimal 1 item' }
  for (const it of items) {
    if (!String(it.kategori || '').trim()) return { error: 'Setiap item wajib punya kategori' }
    if (!String(it.uraian || '').trim()) return { error: 'Setiap item wajib punya uraian' }
    if (!(Number(it.volume) > 0)) return { error: 'Volume setiap item wajib lebih besar dari 0' }
  }

  return {
    namaKegiatan,
    namaPenanggungJawab,
    tahunAnggaran,
    tanggal: body.tanggal || new Date().toISOString().split('T')[0],
    namaPenyusun: (body.nama_penyusun || '').trim() || null,
    items: items.map((it, index) => ({
      kategori: String(it.kategori).trim(),
      uraian: String(it.uraian).trim(),
      volume: Number(it.volume),
      satuan: (it.satuan || '').trim() || null,
      harga_satuan: Number(it.harga_satuan) || 0,
      urutan: index,
    })),
  }
}

// GET /api/rab — daftar RAB. Dilindungi middleware (role super_admin).
export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('rab')
      .select(SELECT_COLUMNS)
      .order('created_at', { ascending: false })
      .order('urutan', { referencedTable: 'rab_items' })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/rab — buat RAB baru. nomor_rab dibuat otomatis oleh trigger DB
// (generate_rab_number), jangan dikirim dari client.
export async function POST(request) {
  try {
    const body = await request.json()
    const validated = validateBody(body)
    if (validated.error) return NextResponse.json({ error: validated.error }, { status: 400 })

    const supabase = getServiceClient()
    const { data: rabRow, error: rabError } = await supabase
      .from('rab')
      .insert([{
        nama_kegiatan: validated.namaKegiatan,
        tahun_anggaran: validated.tahunAnggaran,
        tanggal: validated.tanggal,
        nama_penyusun: validated.namaPenyusun,
        nama_penanggung_jawab: validated.namaPenanggungJawab,
      }])
      .select()
      .single()
    if (rabError) throw rabError

    const { error: itemsError } = await supabase
      .from('rab_items')
      .insert(validated.items.map((it) => ({ ...it, rab_id: rabRow.id })))
    if (itemsError) {
      // Bersihkan header yang sudah terlanjur dibuat kalau insert item
      // gagal, supaya tidak ada RAB "kosong" tanpa item tersisa di database.
      await supabase.from('rab').delete().eq('id', rabRow.id)
      throw itemsError
    }

    const { data: full, error: fetchError } = await supabase
      .from('rab')
      .select(SELECT_COLUMNS)
      .eq('id', rabRow.id)
      .order('urutan', { referencedTable: 'rab_items' })
      .single()
    if (fetchError) throw fetchError

    return NextResponse.json(full, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err, { duplicateLabel: 'Nomor RAB' }) }, { status: 500 })
  }
}
