import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'app-settings'
const SETTINGS_FILE = 'branding.json'
const DEFAULTS = { brand_name: 'Direktorat Unesa Science Center', logo_url: null }

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/app-settings — public, read-only. Used by the TV kiosk and any
// page that displays the instansi's brand name/logo.
export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase.storage.from(BUCKET).download(SETTINGS_FILE)
    if (error) throw error
    const text = await data.text()
    return NextResponse.json({ ...DEFAULTS, ...JSON.parse(text) })
  } catch {
    // Belum pernah disimpan, atau bucket/file belum ada — pakai default.
    return NextResponse.json(DEFAULTS)
  }
}

// PUT /api/app-settings — ganti nama instansi dan/atau logo.
// Dilindungi oleh middleware (role super_admin, sama seperti /pengaturan).
export async function PUT(request) {
  try {
    const supabase = getServiceClient()
    const formData = await request.formData()
    const brandName = (formData.get('brand_name') || '').trim()
    const logoFile = formData.get('logo')

    if (!brandName) {
      return NextResponse.json({ error: 'Nama instansi wajib diisi' }, { status: 400 })
    }

    // Baca setting saat ini supaya logo_url lama tidak hilang kalau admin
    // hanya mengubah nama tanpa upload logo baru.
    let current = DEFAULTS
    try {
      const { data: currentFile } = await supabase.storage.from(BUCKET).download(SETTINGS_FILE)
      if (currentFile) current = { ...DEFAULTS, ...JSON.parse(await currentFile.text()) }
    } catch {}

    let logoUrl = current.logo_url

    if (logoFile && logoFile instanceof Blob && logoFile.size > 0) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
      if (!allowedTypes.includes(logoFile.type)) {
        return NextResponse.json({ error: 'Format logo harus JPG, PNG, WebP, atau SVG' }, { status: 400 })
      }
      if (logoFile.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'Ukuran logo maksimal 2MB' }, { status: 400 })
      }

      const ext = (logoFile.name?.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
      const path = `logo-${Date.now()}.${ext}`
      const arrayBuffer = await logoFile.arrayBuffer()
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, Buffer.from(arrayBuffer), { contentType: logoFile.type, upsert: false })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
      logoUrl = publicUrl
    }

    const updated = { brand_name: brandName, logo_url: logoUrl }
    const { error: saveError } = await supabase.storage
      .from(BUCKET)
      .upload(SETTINGS_FILE, Buffer.from(JSON.stringify(updated, null, 2)), { contentType: 'application/json', upsert: true })
    if (saveError) throw saveError

    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan pengaturan' }, { status: 500 })
  }
}
