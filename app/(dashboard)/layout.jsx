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
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1"/>
      <rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/>
      <rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  tv: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82V9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
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
    const mq = window.matchMedia('(max-width: 768px)')
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

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (authUser) {
          setUser(authUser)
          
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
        <div className="spinner" />
      </div>
    )
  }

  const userRole = profile?.role || 'admin'
  const userName = profile?.full_name || profile?.nama || user?.email?.split('@')[0] || 'User'
  const userInitial = userName.charAt(0).toUpperCase()
  const items = navItems[userRole] || navItems.admin

  return (
    <div className="app-shell">
      {/* Skip to Content Link */}
      <a href="#main-content" className="skip-to-content">
        Loncat ke konten utama
      </a>

      {/* Sidebar */}
      <nav
        ref={sidebarRef}
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        aria-label="Navigasi utama"
        aria-hidden={isMobile && !sidebarOpen ? true : undefined}
      >
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="10" fill="#1e3a8a"/>
              <text x="20" y="28" textAnchor="middle" fill="#f5b915" fontSize="20" fontWeight="800">S</text>
            </svg>
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">SIMDIR</span>
            <span className="sidebar-brand-sub">Unesa Science Center</span>
          </div>
        </div>

        {/* Section Label */}
        <div className="sidebar-section-label">Menu Utama</div>

        {/* Navigation */}
        <div className="sidebar-nav">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <span className="nav-icon">{icons[item.icon]}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-avatar">{userInitial}</div>
          <div className="user-meta">
            <div className="user-name truncate">{userName}</div>
            <div className="user-role">{userRole.replace('_', ' ')}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <span style={{ width: 16, height: 16 }}>{icons.logout}</span>
          <span>Logout</span>
        </button>
      </nav>

      {/* Main Area */}
      <div className="main-area">
        {/* Topbar (Desktop + Tablet) */}
        <header className="topbar" role="banner">
          <div className="topbar-title">
            <span>Home</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">{items.find(item => item.href === pathname)?.label || 'Dashboard'}</span>
          </div>

          {/* Search */}
          <div className="topbar-search">
            <span className="topbar-search-icon">{icons.search}</span>
            <input type="text" placeholder="Cari agenda, program, surat..." />
          </div>

          {/* Actions */}
          <div className="topbar-actions">
            <button className="icon-btn" aria-label="Notifikasi">
              <span style={{ width: 18, height: 18 }}>{icons.bell}</span>
              <span className="dot" aria-hidden="true" />
            </button>
            <div className="topbar-user">
              <div className="topbar-user-avatar">{userInitial}</div>
              <div className="topbar-user-meta">
                <span className="topbar-user-name">{userName}</span>
                <span className="topbar-user-role">{userRole.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Header (shown on mobile, hidden on desktop/tablet) */}
        <header className="mobile-header" role="banner" aria-label="Header mobile">
          <button
            className="icon-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
            style={{ width: 40, height: 40 }}
          >
            <span style={{ width: 20, height: 20 }}>{icons.menu}</span>
          </button>
          <div className="mobile-header-brand">
            <div className="mobile-header-brand-mark">
              <img src="/images/logo USC.png" alt="USC" />
            </div>
            <div>
              <div className="mobile-header-title">SIMDIR</div>
              <div className="mobile-header-sub">{items.find(item => item.href === pathname)?.label || 'USC'}</div>
            </div>
          </div>
          <button className="icon-btn" aria-label="Notifikasi" style={{ width: 40, height: 40 }}>
            <span style={{ width: 18, height: 18 }}>{icons.bell}</span>
          </button>
        </header>

        {/* Content */}
        <main
          id="main-content"
          className="content"
          role="main"
          tabIndex={-1}
        >
          <UsersProvider>
            <UnitKerjaProvider>
              {children}
            </UnitKerjaProvider>
          </UsersProvider>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        userRole={userRole}
        onMenuClick={() => setSidebarOpen(true)}
      />

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="drawer-overlay open"
          onClick={() => setSidebarOpen(false)}
          aria-label="Tutup menu"
        />
      )}
    </div>
  )
}
