import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { verifySession } from '@/lib/session'

// Role yang boleh mengakses tiap area. Dicek dengan pathname.startsWith(prefix) —
// PENTING: route group Next.js seperti `(dashboard)` TIDAK pernah muncul di
// pathname sungguhan, jadi prefix di sini harus berupa path asli (tanpa tanda kurung).
const ROLE_RULES = [
  { prefix: '/kelola-agenda', roles: ['super_admin', 'admin', 'pimpinan'] },
  { prefix: '/surat', roles: ['super_admin', 'pimpinan'] },
  { prefix: '/program-kerja', roles: ['super_admin', 'admin_keuangan', 'pimpinan'] },
  { prefix: '/pencairan', roles: ['super_admin', 'admin_keuangan', 'pimpinan'] },
  { prefix: '/laporan', roles: ['super_admin'] },
  { prefix: '/pengaturan', roles: ['super_admin'] },
  { prefix: '/tv-pamflet', roles: ['super_admin', 'admin'] },
  { prefix: '/kelola-kritik-saran', roles: ['super_admin', 'admin', 'pimpinan'] },
]

// Endpoint yang memodifikasi data tv-pamflet lewat service-role key dan tidak
// punya pengecekan auth sendiri — harus ikut aturan role halaman /tv-pamflet.
const TV_PAMFLET_API_ROLES = ROLE_RULES.find((r) => r.prefix === '/tv-pamflet').roles

function isPublicPath(pathname, method) {
  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/agenda')) {
    return true
  }
  // Public feedback form page only (exact path)
  if (pathname === '/kritik-saran' || pathname.startsWith('/kritik-saran?')) {
    return true
  }
  if (pathname.startsWith('/api/auth/')) return true
  // Dipakai oleh tampilan TV publik (/agenda/tv) — hanya method baca yang publik.
  if (pathname === '/api/tv-pamflets' && method === 'GET') return true
  // Public feedback submission endpoint
  if (pathname === '/api/kritik-saran' && method === 'POST') return true
  // Public questions endpoint (for feedback form)
  if (pathname === '/api/pertanyaan-kritik-saran' && method === 'GET') return true
  return false
}

function withSecurityHeaders(response) {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return response
}

function denyResponse(request, pathname) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.redirect(new URL('/login', request.url))
}

function forbiddenResponse(request, pathname) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.redirect(new URL('/dashboard', request.url))
}

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const response = NextResponse.next({ request })
    response.headers.set('x-missing-supabase', 'true')
    return withSecurityHeaders(response)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  if (isPublicPath(pathname, request.method)) {
    return withSecurityHeaders(supabaseResponse)
  }

  // ============================================
  // Semua route selain di atas WAJIB login.
  // ============================================
  let user = null
  let role = null
  let isLocalMode = false

  // ============================================
  // METODE 1: Cek Supabase Auth
  // ============================================
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      user = authUser

      // Get role from profile (sesuaikan dengan struktur tabel yang ada)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, nama')  // menggunakan 'nama' bukan 'full_name'
        .eq('id', user.id)
        .single()

      role = profile?.role || 'staff'
    }
  } catch {
    // Supabase tidak tersedia, lanjut ke local session
  }

  // ============================================
  // METODE 2: Cek Local Session (dari cookie, ditandatangani JWT)
  // ============================================
  if (!user) {
    const localSessionCookie = request.cookies.get('simdir_session_local')?.value
    if (localSessionCookie) {
      const localUser = await verifySession(localSessionCookie)
      if (localUser) {
        user = { id: localUser.id, email: localUser.email }
        role = localUser.role
        isLocalMode = true
      }
    }
  }

  // ============================================
  // Tolak jika tidak ada user
  // ============================================
  if (!user) {
    return withSecurityHeaders(denyResponse(request, pathname))
  }

  // ============================================
  // Role-based access control
  // ============================================
  const rule = ROLE_RULES.find((r) => pathname.startsWith(r.prefix))
  if (rule && !rule.roles.includes(role)) {
    return withSecurityHeaders(forbiddenResponse(request, pathname))
  }

  if (pathname.startsWith('/api/tv-pamflets') && !TV_PAMFLET_API_ROLES.includes(role)) {
    return withSecurityHeaders(forbiddenResponse(request, pathname))
  }

  if (isLocalMode) {
    supabaseResponse.headers.set('x-local-mode', 'true')
  }

  return withSecurityHeaders(supabaseResponse)
}

export const config = {
  matcher: [
    // PWA static assets (sw.js, manifest.json, workbox-*.js, offline.html,
    // browserconfig.xml) must be excluded here, not just from isPublicPath —
    // the browser fetches them directly and will not follow a redirect to
    // /login, so letting middleware touch them at all breaks SW
    // registration and manifest parsing for every visitor, logged in or not.
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|workbox-.*.js|offline.html|browserconfig.xml|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
