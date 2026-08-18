import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { friendlyDbError } from '@/lib/db-errors'
import { slugToNomor } from '@/lib/utils/format'

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

// GET /api/rab/[id] — satu RAB (dipakai halaman detail/edit/print). "id"
// di URL adalah slug dari nomor_rab (mis. "RAB-2026-08-0001", lihat
// lib/utils/format.js nomorToSlug/slugToNomor) — bukan UUID mentah.
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('rab')
      .select(SELECT_COLUMNS)
      .eq('nomor_rab', slugToNomor(id))
      .order('urutan', { referencedTable: 'rab_items' })
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'RAB tidak ditemukan' }, { status: 404 })
  }
}

// PUT /api/rab/[id] — update header + ganti seluruh item (hapus semua item
// lama, insert item baru) — replace-all, bukan diff per-item, karena
// seluruh form RAB memang disubmit sekaligus dari client.
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const validated = validateBody(body)
    if (validated.error) return NextResponse.json({ error: validated.error }, { status: 400 })

    const supabase = getServiceClient()
    const { data: existing, error: findError } = await supabase
      .from('rab')
      .select('id')
      .eq('nomor_rab', slugToNomor(id))
      .single()
    if (findError) throw findError

    const { error: updateError } = await supabase
      .from('rab')
      .update({
        nama_kegiatan: validated.namaKegiatan,
        tahun_anggaran: validated.tahunAnggaran,
        tanggal: validated.tanggal,
        nama_penyusun: validated.namaPenyusun,
        nama_penanggung_jawab: validated.namaPenanggungJawab,
      })
      .eq('id', existing.id)
    if (updateError) throw updateError

    const { data: oldItems, error: oldItemsError } = await supabase
      .from('rab_items')
      .select('id')
      .eq('rab_id', existing.id)
    if (oldItemsError) throw oldItemsError

    const { error: insertItemsError } = await supabase
      .from('rab_items')
      .insert(validated.items.map((it) => ({ ...it, rab_id: existing.id })))
    if (insertItemsError) throw insertItemsError

    const oldItemIds = (oldItems || []).map((it) => it.id)
    if (oldItemIds.length > 0) {
      const { error: deleteItemsError } = await supabase
        .from('rab_items')
        .delete()
        .in('id', oldItemIds)
      if (deleteItemsError) throw deleteItemsError
    }

    const { data: full, error: fetchError } = await supabase
      .from('rab')
      .select(SELECT_COLUMNS)
      .eq('id', existing.id)
      .order('urutan', { referencedTable: 'rab_items' })
      .single()
    if (fetchError) throw fetchError

    return NextResponse.json(full)
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err, { duplicateLabel: 'Nomor RAB' }) }, { status: 500 })
  }
}

// DELETE /api/rab/[id] — hapus RAB (rab_items ikut terhapus via ON DELETE CASCADE).
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()
    const { error } = await supabase
      .from('rab')
      .delete()
      .eq('nomor_rab', slugToNomor(id))
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err) }, { status: 500 })
  }
}
