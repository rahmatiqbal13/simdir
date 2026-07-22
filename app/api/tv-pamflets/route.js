import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { compressImage } from '@/lib/image'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Helper: extract YouTube info from various URL formats
function parseYouTubeUrl(url) {
  if (!url) return null
  
  // Playlist URL: https://www.youtube.com/playlist?list=PLxxx
  const playlistMatch = url.match(/[?&]list=([^&]+)/)
  if (playlistMatch) {
    return {
      type: 'youtube',
      kind: 'playlist',
      id: playlistMatch[1],
      embedUrl: `https://www.youtube.com/embed?listType=playlist&list=${playlistMatch[1]}`,
    }
  }
  
  // Single video URL: https://www.youtube.com/watch?v=xxx
  const videoMatch = url.match(/[?&]v=([^&]+)/)
  if (videoMatch) {
    return {
      type: 'youtube',
      kind: 'single',
      id: videoMatch[1],
      embedUrl: `https://www.youtube.com/embed/${videoMatch[1]}`,
    }
  }
  
  // Short URL: https://youtu.be/xxx
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/)
  if (shortMatch) {
    return {
      type: 'youtube',
      kind: 'single',
      id: shortMatch[1],
      embedUrl: `https://www.youtube.com/embed/${shortMatch[1]}`,
    }
  }
  
  return null
}

// GET /api/tv-pamflets — list active pamflets (public, no auth needed)
export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('tv_pamflets')
      .select('id, title, src_url, type, duration, order_num')
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

// POST /api/tv-pamflets — upload new pamflet (image) or add YouTube link
export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || ''
    const supabase = getServiceClient()
    
    // Determine if this is a YouTube link (JSON) or image upload (FormData)
    if (contentType.includes('application/json')) {
      // ========== YOUTUBE LINK ==========
      const body = await request.json()
      const title = (body.title || '').trim()
      const url = (body.url || '').trim()
      const duration = Math.max(5, Math.min(60, parseInt(body.duration || '15', 10)))
      
      if (!title || !url) {
        return NextResponse.json({ error: 'Judul dan URL YouTube wajib diisi' }, { status: 400 })
      }
      
      const ytInfo = parseYouTubeUrl(url)
      if (!ytInfo) {
        return NextResponse.json({ error: 'URL YouTube tidak valid. Gunakan format: https://www.youtube.com/playlist?list=XXX atau https://www.youtube.com/watch?v=XXX' }, { status: 400 })
      }
      
      // Get next order
      const { data: maxData } = await supabase
        .from('tv_pamflets')
        .select('order_num')
        .order('order_num', { ascending: false })
        .limit(1)
      
      const nextOrder = (maxData?.[0]?.order_num ?? -1) + 1
      
      const { data: record, error: dbError } = await supabase
        .from('tv_pamflets')
        .insert({
          title,
          src_url: ytInfo.embedUrl,
          type: 'youtube',
          storage_path: null,
          duration,
          order_num: nextOrder,
          is_active: true,
        })
        .select()
        .single()
      
      if (dbError) throw dbError
      return NextResponse.json(record, { status: 201 })
      
    } else {
      // ========== IMAGE UPLOAD ==========
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

      const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '')
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const storagePath = `pamflets/${timestamp}-${random}.${ext}`

      const arrayBuffer = await file.arrayBuffer()
      const buffer = await compressImage(Buffer.from(arrayBuffer), file.type, { maxWidth: 1920, quality: 80 })

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
        .insert({
          title,
          src_url: publicUrl,
          type: 'image',
          storage_path: storagePath,
          duration,
          order_num: nextOrder,
          is_active: true,
        })
        .select()
        .single()

      if (dbError) {
        await supabase.storage.from('tv-pamflets').remove([storagePath])
        throw dbError
      }

      return NextResponse.json(record, { status: 201 })
    }
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan' }, { status: 500 })
  }
}
