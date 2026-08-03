import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { friendlyDbError } from '@/lib/db-errors'

const ALLOWED_ROLES = ['super_admin', 'admin', 'admin_keuangan', 'pimpinan']

// Kolom yang boleh dikirim ke client — TIDAK PERNAH termasuk `password`
// (hash bcrypt sekalipun tidak perlu sampai ke browser).
const SAFE_COLUMNS = 'id, username, email, full_name, role, unit_kerja, phone, is_active, last_login, created_at, updated_at'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/users — daftar user. Dilindungi middleware (role super_admin,
// sama seperti halaman /pengaturan/users).
export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('users')
      .select(SAFE_COLUMNS)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/users — tambah user baru
export async function POST(request) {
  try {
    const body = await request.json()
    const username = (body.username || body.email?.split('@')[0] || '').trim()
    const email = (body.email || '').trim()
    const fullName = (body.nama || body.full_name || '').trim()
    const role = body.role || ''
    const password = body.password || ''

    if (!username) return NextResponse.json({ error: 'Username wajib diisi' }, { status: 400 })
    if (!email) return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 })
    if (!fullName) return NextResponse.json({ error: 'Nama lengkap wajib diisi' }, { status: 400 })
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('users')
      .insert([{
        username,
        email,
        password: hashedPassword,
        full_name: fullName,
        role,
        is_active: body.is_active ?? true,
      }])
      .select(SAFE_COLUMNS)
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err, { duplicateLabel: 'Username/email' }) }, { status: 500 })
  }
}
