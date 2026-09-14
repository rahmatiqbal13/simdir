import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { compressImage } from '@/lib/image'

const BUCKET = 'app-settings'
const ALLOWED_QR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_QR_SIZE = 2 * 1024 * 1024
const SAFE_COLUMNS = 'id, type, label, image_url, bank_name, va_number, whatsapp_number, whatsapp_name, is_active, created_at'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function slugifyLabel(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'metode'
}

// Menghapus file lama dari storage berdasarkan public URL-nya — sama
// dengan pola orphan-cleanup di app/api/app-settings/route.js.
function removeStorageFile(supabase, publicUrl) {
  const marker = `/${BUCKET}/`
  const idx = publicUrl ? publicUrl.indexOf(marker) : -1
  if (idx === -1) return Promise.resolve()
  const path = publicUrl.slice(idx + marker.length)
  return supabase.storage.from(BUCKET).remove([path]).catch(() => {})
}

// PUT /api/payment-methods/[id] — update label/is_active, dan data sesuai
// tipe (gambar baru untuk qr, atau bank_name/va_number untuk va). Tipe
// ('qr'/'va') sendiri tidak pernah berubah setelah dibuat.
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()

    const { data: current, error: fetchError } = await supabase
      .from('payment_methods')
      .select(SAFE_COLUMNS)
      .eq('id', id)
      .single()
    if (fetchError || !current) {
      return NextResponse.json({ error: 'Metode pembayaran tidak ditemukan' }, { status: 404 })
    }

    const formData = await request.formData()
    const label = (formData.get('label') || '').toString().trim()
    const isActiveRaw = formData.get('is_active')
    if (!label) {
      return NextResponse.json({ error: 'Label wajib diisi' }, { status: 400 })
    }

    const update = {
      label,
      is_active: isActiveRaw === null ? current.is_active : isActiveRaw === 'true',
    }

    if (current.type === 'qr') {
      const imageFile = formData.get('image')
      if (imageFile && imageFile instanceof Blob && imageFile.size > 0) {
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
        await removeStorageFile(supabase, current.image_url)
        update.image_url = publicUrl
      }
    } else {
      const bankName = (formData.get('bank_name') || '').toString().trim()
      const vaNumber = (formData.get('va_number') || '').toString().trim()
      if (!bankName || !vaNumber) {
        return NextResponse.json({ error: 'Nama bank dan nomor VA wajib diisi' }, { status: 400 })
      }
      update.bank_name = bankName
      update.va_number = vaNumber
      update.whatsapp_number = (formData.get('whatsapp_number') || '').toString().trim() || null
      update.whatsapp_name = (formData.get('whatsapp_name') || '').toString().trim() || null
    }

    const { data, error } = await supabase
      .from('payment_methods')
      .update(update)
      .eq('id', id)
      .select(SAFE_COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memperbarui metode pembayaran' }, { status: 500 })
  }
}

// DELETE /api/payment-methods/[id] — hapus baris + file storage-nya kalau
// tipe qr. Invoice yang masih mereferensikan id ini otomatis jadi NULL
// (ON DELETE SET NULL di kolom invoices.payment_method_id).
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()

    const { data: current } = await supabase
      .from('payment_methods')
      .select('image_url')
      .eq('id', id)
      .single()

    const { error } = await supabase.from('payment_methods').delete().eq('id', id)
    if (error) throw error

    if (current?.image_url) await removeStorageFile(supabase, current.image_url)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menghapus metode pembayaran' }, { status: 500 })
  }
}
