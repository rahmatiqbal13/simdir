import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { friendlyDbError } from '@/lib/db-errors'

const SELECT_COLUMNS = '*, invoice:invoice_id(id, nomor_invoice)'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/kwitansi/[id] — satu kwitansi (dipakai halaman detail/edit/print)
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('kwitansi')
      .select(SELECT_COLUMNS)
      .eq('id', id)
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Kwitansi tidak ditemukan' }, { status: 404 })
  }
}

// PUT /api/kwitansi/[id] — update kwitansi. nomor_kwitansi tidak pernah
// diubah setelah dibuat (kwitansi adalah dokumen final begitu diterbitkan).
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const terimaDari = (body.terima_dari || '').trim()
    const untukPembayaran = (body.untuk_pembayaran || '').trim()
    const jumlah = Number(body.jumlah)

    if (!terimaDari) return NextResponse.json({ error: 'Nama/instansi yang membayar wajib diisi' }, { status: 400 })
    if (!untukPembayaran) return NextResponse.json({ error: 'Keterangan pembayaran wajib diisi' }, { status: 400 })
    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      return NextResponse.json({ error: 'Jumlah uang harus berupa angka lebih besar dari 0' }, { status: 400 })
    }
    if (!body.tanggal) return NextResponse.json({ error: 'Tanggal wajib diisi' }, { status: 400 })

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('kwitansi')
      .update({
        tanggal: body.tanggal,
        invoice_id: body.invoice_id || null,
        terima_dari: terimaDari,
        jumlah,
        untuk_pembayaran: untukPembayaran,
        penerima: (body.penerima || '').trim() || null,
      })
      .eq('id', id)
      .select(SELECT_COLUMNS)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err) }, { status: 500 })
  }
}

// DELETE /api/kwitansi/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()
    const { error } = await supabase.from('kwitansi').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err) }, { status: 500 })
  }
}
