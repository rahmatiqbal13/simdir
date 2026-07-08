import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { getLocalUserByUsername, getLocalUserByEmail } from '@/lib/local-users'
import { signSession } from '@/lib/session'

// ============================================
// Simple in-memory rate limiter
// 10 percobaan per IP per 15 menit
// ============================================
const loginAttempts = new Map()
const RATE_WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

function isRateLimited(ip) {
  const now = Date.now()
  const rec = loginAttempts.get(ip)
  if (!rec || now - rec.windowStart > RATE_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now })
    return false
  }
  rec.count++
  return rec.count > MAX_ATTEMPTS
}

export async function POST(request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const identifier = body.identifier?.trim()
    const password = body.password

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Username/email dan password harus diisi' },
        { status: 400 }
      )
    }

    const isEmail = identifier.includes('@')
    let userData = null

    // Coba Supabase RPC dulu
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    let supabase = null

    if (supabaseUrl && supabaseKey) {
      try {
        supabase = createClient(supabaseUrl, supabaseKey)
        const rpcName = isEmail ? 'get_user_by_email' : 'get_user_by_username'
        const rpcParam = isEmail ? { p_email: identifier } : { p_username: identifier }
        const { data } = await supabase.rpc(rpcName, rpcParam)
        if (data?.length > 0) userData = data[0]
      } catch {}
    }

    // Fallback ke local users jika Supabase tidak tersedia
    if (!userData) {
      const local = isEmail
        ? getLocalUserByEmail(identifier)
        : getLocalUserByUsername(identifier)
      if (local.length > 0) userData = local[0]
    }

    const genericError = isEmail
      ? 'Email atau password salah'
      : 'Username atau password salah'

    if (!userData) {
      return NextResponse.json({ error: genericError }, { status: 401 })
    }

    if (!userData.is_active) {
      return NextResponse.json(
        { error: 'Akun Anda telah dinonaktifkan' },
        { status: 403 }
      )
    }

    // Verifikasi password — support bcrypt hash dan plain text (transisi migrasi)
    const storedPassword = userData.password?.trim() || ''
    const inputPassword = password.trim()

    let passwordValid = false
    if (storedPassword.startsWith('$2')) {
      passwordValid = await bcrypt.compare(inputPassword, storedPassword)
    } else {
      // Legacy plain text — harus dimigrasikan ke bcrypt
      passwordValid = storedPassword === inputPassword
    }

    if (!passwordValid) {
      return NextResponse.json({ error: genericError }, { status: 401 })
    }

    // Buat session payload
    const sessionPayload = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      role: userData.role,
    }

    // Cookie yang dipakai server (middleware) untuk otorisasi HARUS ditandatangani
    // agar tidak bisa dipalsukan begitu saja dari client (lihat lib/session.js).
    const signedSession = await signSession(sessionPayload)

    // Payload ringan untuk localStorage (hanya dipakai untuk tampilan nama/role
    // di UI, bukan sebagai sumber otorisasi — jadi tidak perlu ditandatangani).
    const displayPayload = Buffer.from(JSON.stringify(sessionPayload)).toString('base64')

    const response = NextResponse.json({
      success: true,
      session: displayPayload,
      user: { role: userData.role, username: userData.username, email: userData.email },
    })

    // Set httpOnly cookie (tidak bisa dibaca JavaScript)
    response.cookies.set('simdir_session_local', signedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
      path: '/',
    })

    // Update last_login (non-critical, tidak boleh block response)
    if (supabase) {
      supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id)
        .then(() => {})
        .catch(() => {})
    }

    return response
  } catch (err) {
    console.error('Login route error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
