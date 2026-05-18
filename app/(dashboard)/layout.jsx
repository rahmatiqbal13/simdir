'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { UsersProvider } from '@/context/UsersContext'
import { UnitKerjaProvider } from '@/context/UnitKerjaContext'
import MobileBottomNav from '@/app/components/MobileBottomNav'

const navItems = {
  super_admin: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/kelola-agenda', label: 'Kelola Agenda', icon: 'calendar' },
    { href: '/tv-pamflet', label: 'TV Pamflet', icon: 'tv' },
    { href: '/surat', label: 'Surat Masuk & Keluar', icon: 'mail' },
    { href: '/program-kerja', label: 'Program Kerja', icon: 'briefcase' },
    { href: '/pencairan', label: 'Pencairan Dana', icon: 'wallet' },
    { href: '/laporan', label: 'Laporan', icon: 'chart' },
    { href: '/pengaturan/users', label: 'Pengaturan', icon: 'settings' },
  ],
  admin_keuangan: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/program-kerja', label: 'Program Kerja', icon: 'briefcase' },
    { href: '/pencairan', label: 'Pencairan Dana', icon: 'wallet' },
  ],
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/kelola-agenda', label: 'Kelola Agenda', icon: 'calendar' },
    { href: '/tv-pamflet', label: 'TV Pamflet', icon: 'tv' },
  ],
  pimpinan: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/kelola-agenda', label: 'Kelola Agenda', icon: 'calendar' },
    { href: '/surat', label: 'Surat Masuk & Keluar', icon: 'mail' },
    { href: '/program-kerja', label: 'Program Kerja', icon: 'briefcase' },
    { href: '/pencairan', label: 'Pencairan Dana', icon: 'wallet' },
  ],
}

const icons = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  tv: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>,
  briefcase: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  logout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  menu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  chevron: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
}

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const sidebarRef = useRef(null)

  // Track mobile viewport
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Close sidebar when pressing Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [sidebarOpen])

  // Focus trap for sidebar
  useEffect(() => {
    if (sidebarOpen && sidebarRef.current) {
      const focusableElements = sidebarRef.current.querySelectorAll(
        'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      const handleTabKey = (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }

      document.addEventListener('keydown', handleTabKey)
      firstElement?.focus()

      return () => document.removeEventListener('keydown', handleTabKey)
    }
  }, [sidebarOpen])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    const getUser = async () => {
      try {
        // Coba ambil dari Supabase Auth dulu
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (authUser) {
          setUser(authUser)
          
          // Get profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, nama, role, is_active, unit_kerja_id, created_at')
            .eq('id', authUser.id)
            .single()
          
          if (profileData) {
            setProfile({
              ...profileData,
              full_name: profileData.nama,
              username: profileData.nama?.toLowerCase().replace(/\s+/g, '_')
            })
          }
        } else {
          // Fallback ke local session jika auth tidak ada
          const localSession = localStorage.getItem('simdir_session')
          if (localSession) {
            try {
              const sessionData = JSON.parse(atob(localSession))
              setUser({
                id: sessionData.id,
                email: sessionData.email,
                user_metadata: {
                  username: sessionData.username,
                  role: sessionData.role
                }
              })
              setProfile({
                id: sessionData.id,
                username: sessionData.username,
                full_name: sessionData.username,
                nama: sessionData.username,
                role: sessionData.role
              })
            } catch (e) {
              console.error('Invalid local session:', e)
            }
          }
        }
      } catch (err) {
        console.error('Auth error:', err)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.log('Logout error:', e)
    }
    
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--bg)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Memuat...</p>
        </div>
      </div>
    )
  }

  const userRole = profile?.role || 'admin'
  const userName = profile?.full_name || profile?.nama || user?.email?.split('@')[0] || 'User'
  const items = navItems[userRole] || navItems.admin

  return (
    <div className="app-shell">
      {/* Skip to Content Link */}
      <a href="#main-content" className="skip-to-content">
        Loncat ke konten utama
      </a>

      {/* Mobile Header */}
      <header className="mobile-header" role="navigation" aria-label="Header mobile">
        <div className="mobile-header-brand">
          <div className="brand-logo" style={{ width: '2rem', height: '2rem', fontSize: '1rem' }} aria-hidden="true">S</div>
          <span style={{ fontWeight: 600, color: 'var(--navy)' }}>SIMDIR</span>
        </div>
        <button 
          className="menu-toggle" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          aria-expanded={sidebarOpen}
          aria-controls="sidebar-nav"
        >
          {sidebarOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <span aria-hidden="true">{icons.menu}</span>
          )}
        </button>
      </header>

      <nav
        ref={sidebarRef}
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        aria-label="Navigasi utama"
        aria-hidden={isMobile && !sidebarOpen ? true : undefined}
      >
        <div className="sidebar-brand">
          <div className="brand-logo" aria-hidden="true">S</div>
          <div>
            <strong>SIMDIR</strong>
            <span>Unesa Science Center</span>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label" id="nav-heading">Menu Utama</div>
        </div>

        <div className="sidebar-nav" aria-labelledby="nav-heading">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{icons[item.icon]}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-info" role="region" aria-label="Informasi pengguna">
            <div className="user-avatar" aria-hidden="true">{userName.charAt(0).toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div className="user-name truncate">{userName}</div>
              <div className="user-role">{userRole.replace('_', ' ')}</div>
            </div>
          </div>
          <button 
            className="logout-btn" 
            onClick={handleLogout}
            aria-label="Keluar dari aplikasi"
          >
            <span aria-hidden="true">{icons.logout}</span>
            Logout
          </button>
        </div>
      </nav>

      <div className="main-content">
        <header className="topbar" role="banner">
          <div className="topbar-left">
            <button 
              className="menu-toggle desktop-hide" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Buka menu navigasi"
              aria-expanded={sidebarOpen}
              aria-controls="sidebar-nav"
            >
              <span aria-hidden="true">{icons.menu}</span>
            </button>
            <div className="topbar-title-wrapper">
              <h1 className="page-title" id="page-title">
                {items.find(item => item.href === pathname)?.label || 'Dashboard'}
              </h1>
              <nav className="breadcrumb" aria-label="Breadcrumb">
                <ol style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', listStyle: 'none', margin: 0, padding: 0 }}>
                  <li><span>Home</span></li>
                  <li aria-hidden="true"><span className="breadcrumb-sep">{icons.chevron}</span></li>
                  <li aria-current="page">
                    <span>{items.find(item => item.href === pathname)?.label || 'Dashboard'}</span>
                  </li>
                </ol>
              </nav>
            </div>
          </div>
          <div className="topbar-right">
            <button 
              className="topbar-btn" 
              aria-label="Notifikasi - 0 belum dibaca"
              title="Notifikasi"
            >
              <span aria-hidden="true">{icons.bell}</span>
            </button>
          </div>
        </header>

        <main 
          id="main-content" 
          className="content-area"
          role="main"
          aria-labelledby="page-title"
          tabIndex={-1}
        >
          <UsersProvider>
            <UnitKerjaProvider>
              {children}
            </UnitKerjaProvider>
          </UsersProvider>
        </main>
      </div>

      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Tutup menu navigasi"
        />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        userRole={userRole} 
        onMenuClick={() => setSidebarOpen(true)}
      />
    </div>
  )
}
