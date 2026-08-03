import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { verifySession } from '@/lib/session'
import { friendlyDbError } from '@/lib/db-errors'

const ALLOWED_ROLES = ['super_admin', 'admin', 'admin_keuangan', 'pimpinan']
const SAFE_COLUMNS = 'id, username, email, full_name, role, unit_kerja, phone, is_active, last_login, created_at, updated_at'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Identitas pemanggil dari cookie sesi lokal — dipakai HANYA untuk mencegah
// admin mengunci diri sendiri (nonaktifkan/hapus/copot super_admin dari akun
// sendiri). Best-effort: kalau sesi login lewat Supabase Auth murni (bukan
// simdir_session_local), pengecekan ini dilewati begitu saja — bukan garis
// pertahanan keamanan utama, cuma pengaman UX dari kesalahan klik.
async function getCurrentUserId(request) {
  const cookie = request.cookies.get('simdir_session_local')?.value
  if (!cookie) return null
  const session = await verifySession(cookie)
  return session?.id || null
}

// PUT /api/users/[id] — update user (termasuk toggle status, ganti password opsional)
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const fullName = (body.nama || body.full_name || '').trim()
    const email = (body.email || '').trim()
    const role = body.role
    const isActive = body.is_active
    const password = body.password

    if (!fullName) return NextResponse.json({ error: 'Nama lengkap wajib diisi' }, { status: 400 })
    if (!email) return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 })
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })
    }

    const currentUserId = await getCurrentUserId(request)
    if (currentUserId && currentUserId === id) {
      if (role !== 'super_admin') {
        return NextResponse.json({ error: 'Tidak bisa mengubah role akun sendiri menjadi selain Super Admin' }, { status: 400 })
      }
      if (isActive === false) {
        return NextResponse.json({ error: 'Tidak bisa menonaktifkan akun sendiri' }, { status: 400 })
      }
    }

    const update = {
      full_name: fullName,
      email,
      role,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    }
    if (password && password.trim()) {
      if (password.trim().length < 8) {
        return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 })
      }
      update.password = await bcrypt.hash(password.trim(), 10)
    }

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', id)
      .select(SAFE_COLUMNS)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err, { duplicateLabel: 'Email' }) }, { status: 500 })
  }
}

// DELETE /api/users/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    const currentUserId = await getCurrentUserId(request)
    if (currentUserId && currentUserId === id) {
      return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err, { dependentLabel: 'data lain' }) }, { status: 500 })
  }
}
