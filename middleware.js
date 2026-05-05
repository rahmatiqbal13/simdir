import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const response = NextResponse.next({ request })
    response.headers.set('x-missing-supabase', 'true')
    return response
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  const { pathname } = request.nextUrl

  // Allow public routes
  if (pathname.startsWith('/login')) {
    return supabaseResponse
  }

  if (pathname === '/' || pathname.startsWith('/agenda')) {
    return supabaseResponse
  }

  // Check authentication for dashboard routes
  if (pathname.startsWith('/(dashboard)') || pathname.startsWith('/dashboard')) {
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
        
        // Get role from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        role = profile?.role || 'pimpinan'
      }
    } catch (supabaseErr) {
      console.log('Supabase auth check failed:', supabaseErr)
    }

    // ============================================
    // METODE 2: Cek Local Session (dari cookie)
    // ============================================
    if (!user) {
      const localSessionCookie = request.cookies.get('simdir_session_local')?.value
      if (localSessionCookie) {
        try {
          const localUser = JSON.parse(Buffer.from(localSessionCookie, 'base64').toString())
          user = { id: localUser.id, email: localUser.email }
          role = localUser.role
          isLocalMode = true
          console.log('Middleware: Using local session for', localUser.username)
        } catch (e) {
          console.error('Invalid local session cookie')
        }
      }
    }

    // ============================================
    // Redirect jika tidak ada user
    // ============================================
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // ============================================
    // Role-based access control
    // ============================================
    
    // Surat - only super_admin and pimpinan
    if (pathname.startsWith('/(dashboard)/surat') || pathname.startsWith('/dashboard/surat')) {
      if (!['super_admin', 'pimpinan'].includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Program Kerja - super_admin, admin_keuangan, pimpinan
    if (pathname.startsWith('/(dashboard)/program-kerja') || pathname.startsWith('/dashboard/program-kerja')) {
      if (!['super_admin', 'admin_keuangan', 'pimpinan'].includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Pencairan - super_admin, admin_keuangan, pimpinan
    if (pathname.startsWith('/(dashboard)/pencairan') || pathname.startsWith('/dashboard/pencairan')) {
      if (!['super_admin', 'admin_keuangan', 'pimpinan'].includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Laporan - super_admin, admin_keuangan only
    if (pathname.startsWith('/(dashboard)/laporan') || pathname.startsWith('/dashboard/laporan')) {
      if (!['super_admin', 'admin_keuangan'].includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Pengaturan - super_admin only
    if (pathname.startsWith('/(dashboard)/pengaturan') || pathname.startsWith('/dashboard/pengaturan')) {
      if (role !== 'super_admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Set header untuk menandai local mode
    if (isLocalMode) {
      supabaseResponse.headers.set('x-local-mode', 'true')
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
