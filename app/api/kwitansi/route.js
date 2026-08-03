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

// GET /api/kwitansi — daftar kwitansi. Dilindungi middleware (role
// super_admin, sama seperti halaman /e-kwitansi).
export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('kwitansi')
      .select(SELECT_COLUMNS)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/kwitansi — tambah kwitansi baru. nomor_kwitansi dibuat otomatis
// oleh trigger DB (generate_kwitansi_number), jangan dikirim dari client.
export async function POST(request) {
  try {
    const body = await request.json()
    const terimaDari = (body.terima_dari || '').trim()
    const untukPembayaran = (body.untuk_pembayaran || '').trim()
    const tanggal = body.tanggal || new Date().toISOString().split('T')[0]
    const jumlah = Number(body.jumlah)

    if (!terimaDari) return NextResponse.json({ error: 'Nama/instansi yang membayar wajib diisi' }, { status: 400 })
    if (!untukPembayaran) return NextResponse.json({ error: 'Keterangan pembayaran wajib diisi' }, { status: 400 })
    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      return NextResponse.json({ error: 'Jumlah uang harus berupa angka lebih besar dari 0' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('kwitansi')
      .insert([{
        tanggal,
        invoice_id: body.invoice_id || null,
        terima_dari: terimaDari,
        jumlah,
        untuk_pembayaran: untukPembayaran,
        penerima: (body.penerima || '').trim() || null,
      }])
      .select(SELECT_COLUMNS)
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err, { duplicateLabel: 'Nomor kwitansi' }) }, { status: 500 })
  }
}
