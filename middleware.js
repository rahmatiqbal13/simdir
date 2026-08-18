import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { verifySession } from '@/lib/session'

// Role yang boleh mengakses tiap area. Dicek dengan pathname.startsWith(prefix) —
// PENTING: route group Next.js seperti `(dashboard)` TIDAK pernah muncul di
// pathname sungguhan, jadi prefix di sini harus berupa path asli (tanpa tanda kurung).
const ROLE_RULES = [
  { prefix: '/kelola-agenda', roles: ['super_admin', 'admin', 'pimpinan'] },
  { prefix: '/surat', roles: ['super_admin', 'pimpinan'] },
  // Laporan berisi analisis penilaian/kritik-saran — admin TIDAK dapat
  // akses (dibatasi hanya dashboard, kelola-agenda, kelola-tamu).
  { prefix: '/laporan', roles: ['super_admin'] },
  { prefix: '/pengaturan', roles: ['super_admin'] },
  { prefix: '/tv-pamflet', roles: ['super_admin'] },
  // Urutan di bawah ini SENGAJA dari yang paling spesifik ke paling umum
  // (ROLE_RULES.find() mengambil match pertama untuk pathname.startsWith,
  // jadi prefix yang lebih panjang wajib ditaruh lebih dulu):
  // - Log pertanyaan: super_admin saja.
  // - Kelola pertanyaan (tambah/ubah/hapus pertanyaan penilaian): super_admin saja.
  // - Kelola Penilaian (lihat hasil penilaian): boleh pimpinan juga.
  // admin TIDAK termasuk di ketiganya (dibatasi hanya dashboard,
  // kelola-agenda, kelola-tamu).
  { prefix: '/kelola-penilaian/pertanyaan/log', roles: ['super_admin'] },
  { prefix: '/kelola-penilaian/pertanyaan', roles: ['super_admin'] },
  { prefix: '/kelola-penilaian', roles: ['super_admin', 'pimpinan'] },
  // Prefix asli sebelumnya '/kelola-kritik-saran' tidak pernah cocok
  // dengan path halaman sungguhan ('/kelola-saran') — jadi selama ini
  // halaman itu tidak terlindungi middleware sama sekali (siapa pun yang
  // login bisa akses, bukan cuma super_admin/pimpinan seperti maksudnya).
  // Diperbaiki di sini. admin TIDAK termasuk (dibatasi hanya dashboard,
  // kelola-agenda, kelola-tamu).
  { prefix: '/kelola-saran', roles: ['super_admin', 'pimpinan'] },
  { prefix: '/kelola-tamu', roles: ['super_admin', 'admin', 'pimpinan'] },
  // admin TIDAK termasuk (dibatasi hanya dashboard, kelola-agenda, kelola-tamu).
  { prefix: '/kelola-program-kerja', roles: ['super_admin', 'pimpinan'] },
  // Catatan: /e-invoice sengaja TIDAK didaftarkan di sini — halaman itu
  // sudah ada sebelum konvensi middleware-role ini dan saat ini hanya
  // mensyaratkan login (proteksi role dilakukan di navConfig + client-side
  // saja). Tidak diubah di sini supaya tidak mengubah perilaku e-invoice
  // yang sudah ada sebagai efek samping dari menambah e-kwitansi.
  { prefix: '/e-kwitansi', roles: ['super_admin'] },
  // Pemasukan Unit Usaha (eks-sistem terpisah "SIREKAP", digabung ke sini) —
  // data finansial per unit usaha, jadi pakai role 'admin_keuangan' yang
  // memang sudah ada untuk urusan keuangan (lihat navConfig.jsx), plus
  // super_admin.
  { prefix: '/pemasukan-unit-usaha', roles: ['super_admin', 'admin_keuangan'] },
  // RAB (Rencana Anggaran Biaya) — dokumen perencanaan anggaran, super_admin saja.
  { prefix: '/rab', roles: ['super_admin'] },
]

// Endpoint yang memodifikasi data tv-pamflet lewat service-role key dan tidak
// punya pengecekan auth sendiri — harus ikut aturan role halaman /tv-pamflet.
const TV_PAMFLET_API_ROLES = ROLE_RULES.find((r) => r.prefix === '/tv-pamflet').roles

// Endpoint yang mengubah nama instansi/logo lewat service-role key — ikut
// aturan role halaman /pengaturan (super_admin saja).
const APP_SETTINGS_API_ROLES = ROLE_RULES.find((r) => r.prefix === '/pengaturan').roles

// Endpoint program kerja PUI lewat service-role key dan tidak punya
// pengecekan role sendiri — harus ikut aturan role halaman /kelola-program-kerja.
const PROGRAM_KERJA_API_ROLES = ROLE_RULES.find((r) => r.prefix === '/kelola-program-kerja').roles

// Endpoint CRUD user & unit kerja lewat service-role key — sebelumnya
// halaman ini memanggil Supabase RPC langsung dari browser dengan RLS yang
// cuma mensyaratkan auth.role()='authenticated' (lihat sql/fixes/fix-pengaturan-rls.sql),
// yang bisa dieksploitasi untuk eskalasi privilege oleh siapa pun yang
// authenticated ke Supabase, bukan cuma super_admin. Sekarang lewat API
// route ini yang tidak punya pengecekan role sendiri — harus ikut aturan
// role halaman /pengaturan (super_admin saja).
const USERS_API_ROLES = ROLE_RULES.find((r) => r.prefix === '/pengaturan').roles
const UNIT_KERJA_API_ROLES = ROLE_RULES.find((r) => r.prefix === '/pengaturan').roles

// Endpoint kwitansi lewat service-role key dan tidak punya pengecekan role
// sendiri — harus ikut aturan role halaman /e-kwitansi.
const KWITANSI_API_ROLES = ROLE_RULES.find((r) => r.prefix === '/e-kwitansi').roles

// Log audit pertanyaan penilaian — super_admin saja yang boleh membaca,
// walau yang menghasilkan log-nya (tambah/hapus pertanyaan) adalah admin.
const PERTANYAAN_LOG_API_ROLES = ROLE_RULES.find((r) => r.prefix === '/kelola-penilaian/pertanyaan/log').roles

// Endpoint unit-usaha/target-unit-usaha/pemasukan-unit-usaha lewat
// service-role key dan tidak punya pengecekan role sendiri — harus ikut
// aturan role halaman /pemasukan-unit-usaha.
const PEMASUKAN_UNIT_USAHA_API_ROLES = ROLE_RULES.find((r) => r.prefix === '/pemasukan-unit-usaha').roles

// Endpoint RAB lewat service-role key dan tidak punya pengecekan role
// sendiri — harus ikut aturan role halaman /rab.
const RAB_API_ROLES = ROLE_RULES.find((r) => r.prefix === '/rab').roles

function isPublicPath(pathname, method) {
  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/agenda')) {
    return true
  }
  // Public feedback form page only (exact path)
  if (pathname === '/kritik-saran' || pathname.startsWith('/kritik-saran?')) {
    return true
  }
  // Public facility rating form (exact path) — diakses dari QR code TV/agenda
  if (pathname === '/penilaian' || pathname.startsWith('/penilaian?')) {
    return true
  }
  // Public guest book form (exact path) — dipakai di kiosk/tablet resepsionis
  if (pathname === '/daftar-tamu' || pathname.startsWith('/daftar-tamu?')) {
    return true
  }
  // Halaman transparansi publik pendapatan unit usaha (path SENGAJA beda
  // dari prefix '/pemasukan-unit-usaha' yang mensyaratkan login, supaya
  // tidak ketiban aturan role modul admin-nya).
  if (pathname === '/pendapatan-unit-usaha' || pathname.startsWith('/pendapatan-unit-usaha?')) {
    return true
  }
  if (pathname.startsWith('/api/auth/')) return true
  // Dipakai oleh tampilan TV publik (/agenda/tv) — hanya method baca yang publik.
  if (pathname === '/api/tv-pamflets' && method === 'GET') return true
  // Nama instansi/logo ditampilkan di halaman publik (TV, agenda) — baca publik.
  if (pathname === '/api/app-settings' && method === 'GET') return true
  // Public feedback submission endpoint
  if (pathname === '/api/kritik-saran' && method === 'POST') return true
  // Public guest book submission endpoint
  if (pathname === '/api/tamu' && method === 'POST') return true
  // Public questions endpoint (for feedback form)
  if (pathname === '/api/pertanyaan-kritik-saran' && method === 'GET') return true
  // Ringkasan pendapatan unit usaha untuk halaman transparansi publik —
  // hanya total per unit (bukan breakdown bulanan), lihat komentar di
  // app/api/pendapatan-publik/route.js.
  if (pathname === '/api/pendapatan-publik' && method === 'GET') return true
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

  if (pathname.startsWith('/api/app-settings') && !APP_SETTINGS_API_ROLES.includes(role)) {
    return withSecurityHeaders(forbiddenResponse(request, pathname))
  }

  if (pathname.startsWith('/api/program-kerja') && !PROGRAM_KERJA_API_ROLES.includes(role)) {
    return withSecurityHeaders(forbiddenResponse(request, pathname))
  }

  if (pathname.startsWith('/api/users') && !USERS_API_ROLES.includes(role)) {
    return withSecurityHeaders(forbiddenResponse(request, pathname))
  }

  if (pathname.startsWith('/api/unit-kerja') && !UNIT_KERJA_API_ROLES.includes(role)) {
    return withSecurityHeaders(forbiddenResponse(request, pathname))
  }

  if (pathname.startsWith('/api/kwitansi') && !KWITANSI_API_ROLES.includes(role)) {
    return withSecurityHeaders(forbiddenResponse(request, pathname))
  }

  // Urutan spesifik→umum lagi: log dulu (super_admin saja), baru endpoint
  // CRUD pertanyaan secara umum (super_admin saja — admin dibatasi hanya
  // dashboard, kelola-agenda, kelola-tamu) — endpoint ini pakai service-role
  // key dan tidak punya pengecekan role sendiri.
  if (pathname.startsWith('/api/pertanyaan-kritik-saran/log') && !PERTANYAAN_LOG_API_ROLES.includes(role)) {
    return withSecurityHeaders(forbiddenResponse(request, pathname))
  }
  if (pathname.startsWith('/api/pertanyaan-kritik-saran') && role !== 'super_admin') {
    return withSecurityHeaders(forbiddenResponse(request, pathname))
  }

  if (
    (pathname.startsWith('/api/unit-usaha') ||
      pathname.startsWith('/api/target-unit-usaha') ||
      pathname.startsWith('/api/pemasukan-unit-usaha')) &&
    !PEMASUKAN_UNIT_USAHA_API_ROLES.includes(role)
  ) {
    return withSecurityHeaders(forbiddenResponse(request, pathname))
  }

  if (pathname.startsWith('/api/rab') && !RAB_API_ROLES.includes(role)) {
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
