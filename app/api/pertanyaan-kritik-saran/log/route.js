import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/pertanyaan-kritik-saran/log — riwayat tambah/hapus pertanyaan
// penilaian. Dilindungi middleware (super_admin SAJA — lebih ketat dari
// /api/pertanyaan-kritik-saran yang boleh diakses admin juga).
export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('pertanyaan_penilaian_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat log' }, { status: 500 })
  }
}
