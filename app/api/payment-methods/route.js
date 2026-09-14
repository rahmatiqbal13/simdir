import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { compressImage } from '@/lib/image'

const BUCKET = 'app-settings'
const ALLOWED_QR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_QR_SIZE = 2 * 1024 * 1024
const SAFE_COLUMNS = 'id, type, label, image_url, bank_name, va_number, is_active, created_at'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function slugifyLabel(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'metode'
}

// GET /api/payment-methods — daftar semua metode pembayaran (QR & VA).
// Dilindungi middleware: super_admin saja.
export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('payment_methods')
      .select(SAFE_COLUMNS)
      .order('label', { ascending: true })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/payment-methods — tambah metode baru (tipe 'qr' atau 'va').
// multipart/form-data karena tipe 'qr' butuh upload file gambar.
export async function POST(request) {
  try {
    const formData = await request.formData()
    const type = (formData.get('type') || '').toString().trim()
    const label = (formData.get('label') || '').toString().trim()

    if (!['qr', 'va'].includes(type)) {
      return NextResponse.json({ error: 'Tipe metode pembayaran tidak valid' }, { status: 400 })
    }
    if (!label) {
      return NextResponse.json({ error: 'Label wajib diisi' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const record = { type, label, is_active: true }

    if (type === 'qr') {
      const imageFile = formData.get('image')
      if (!imageFile || !(imageFile instanceof Blob) || imageFile.size === 0) {
        return NextResponse.json({ error: 'Gambar QR wajib diupload' }, { status: 400 })
      }
      if (!ALLOWED_QR_TYPES.includes(imageFile.type)) {
        return NextResponse.json({ error: 'Format gambar harus JPG, PNG, atau WebP' }, { status: 400 })
      }
      if (imageFile.size > MAX_QR_SIZE) {
        return NextResponse.json({ error: 'Ukuran gambar maksimal 2MB' }, { status: 400 })
      }

      const ext = (imageFile.name?.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
      const path = `payment-qr/${Date.now()}-${slugifyLabel(label)}.${ext}`
      const arrayBuffer = await imageFile.arrayBuffer()
      const compressed = await compressImage(Buffer.from(arrayBuffer), imageFile.type, { maxWidth: 640, quality: 90 })
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, compressed, { contentType: imageFile.type, upsert: false })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
      record.image_url = publicUrl
    } else {
      const bankName = (formData.get('bank_name') || '').toString().trim()
      const vaNumber = (formData.get('va_number') || '').toString().trim()
      if (!bankName || !vaNumber) {
        return NextResponse.json({ error: 'Nama bank dan nomor VA wajib diisi' }, { status: 400 })
      }
      record.bank_name = bankName
      record.va_number = vaNumber
    }

    const { data, error } = await supabase
      .from('payment_methods')
      .insert(record)
      .select(SAFE_COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan metode pembayaran' }, { status: 500 })
  }
}
