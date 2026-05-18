import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/tv-pamflets — list active pamflets (public, no auth needed)
export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('tv_pamflets')
      .select('id, title, src_url, duration, order_num')
      .eq('is_active', true)
      .order('order_num', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch {
    // Return empty array on error so TV display still works
    return NextResponse.json([])
  }
}

// POST /api/tv-pamflets — upload new pamflet
export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const title = (formData.get('title') || '').trim()
    const duration = Math.max(5, Math.min(60, parseInt(formData.get('duration') || '15', 10)))

    if (!file || !title) {
      return NextResponse.json({ error: 'File dan judul wajib diisi' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format file harus JPG, PNG, atau WebP' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file maksimal 5MB' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '')
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const storagePath = `pamflets/${timestamp}-${random}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('tv-pamflets')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('tv-pamflets')
      .getPublicUrl(storagePath)

    const { data: maxData } = await supabase
      .from('tv_pamflets')
      .select('order_num')
      .order('order_num', { ascending: false })
      .limit(1)

    const nextOrder = (maxData?.[0]?.order_num ?? -1) + 1

    const { data: record, error: dbError } = await supabase
      .from('tv_pamflets')
      .insert({ title, src_url: publicUrl, storage_path: storagePath, duration, order_num: nextOrder, is_active: true })
      .select()
      .single()

    if (dbError) {
      await supabase.storage.from('tv-pamflets').remove([storagePath])
      throw dbError
    }

    return NextResponse.json(record, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal mengupload pamflet' }, { status: 500 })
  }
}
