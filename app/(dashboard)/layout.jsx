'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { UsersProvider } from '@/context/UsersContext'
import { UnitKerjaProvider } from '@/context/UnitKerjaContext'
import MobileBottomNav from '@/app/components/MobileBottomNav'
import ThemeToggle from '@/app/components/ThemeToggle'
import { NAV_ICONS as icons, getSidebarItems, getPaletteItems } from '@/app/components/navConfig'

function CommandPalette({ open, onClose, items, icons }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const filtered = items.filter(i =>
    !query || i.label.toLowerCase().includes(query.toLowerCase())
  )

  if (!open) return null

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'80px 20px 20px' }}
      onClick={onClose}
    >
      <div
        style={{ background:'var(--surface)', borderRadius:16, width:'100%', maxWidth:560, boxShadow:'0 20px 40px rgba(15,23,42,0.18)', overflow:'hidden', animation:'modalIn .18s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:18, height:18, color:'var(--text-3)', flexShrink:0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari halaman atau fitur..."
            style={{ flex:1, border:'none', outline:'none', fontSize:'0.9375rem', color:'var(--text)', background:'transparent' }}
          />
          <kbd style={{ fontSize:'0.6875rem', padding:'2px 6px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-3)', fontFamily:'monospace' }}>ESC</kbd>
        </div>
        {/* Results */}
        <div style={{ maxHeight:360, overflowY:'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding:'32px 20px', textAlign:'center', color:'var(--text-3)', fontSize:'0.875rem' }}>
              Tidak ada hasil untuk "{query}"
            </div>
          ) : (
            <>
              <div style={{ padding:'8px 18px 4px', fontSize:'0.6875rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-3)' }}>Navigasi</div>
              {filtered.map(item => (
                <button
                  key={item.href}
                  onClick={() => { router.push(item.href); onClose() }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 18px', background:'none', border:'none', cursor:'pointer', textAlign:'left', transition:'background .12s', borderRadius:0 }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  <span style={{ width:32, height:32, borderRadius:8, background:'var(--primary-50)', color:'var(--primary)', display:'grid', placeItems:'center', flexShrink:0 }}>
                    <span style={{ width:16, height:16 }}>{icons[item.icon]}</span>
                  </span>
                  <span style={{ fontSize:'0.9375rem', fontWeight:500, color:'var(--text)' }}>{item.label}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:14, height:14, color:'var(--text-3)', marginLeft:'auto' }}>
                    <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
                  </svg>
                </button>
              ))}
            </>
          )}
        </div>
        <div style={{ padding:'8px 18px', borderTop:'1px solid var(--border)', background:'var(--surface-2)', display:'flex', gap:16, fontSize:'0.75rem', color:'var(--text-3)' }}>
          <span>↵ untuk buka</span>
          <span>ESC untuk tutup</span>
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [brandName, setBrandName] = useState('Direktorat Unesa Science Center')
  const [logoUrl, setLogoUrl] = useState('/images/logo USC.png')
  const pathname = usePathname()
  const sidebarRef = useRef(null)
  const userMenuRef = useRef(null)

  useEffect(() => {
    fetch('/api/app-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.brand_name) setBrandName(data.brand_name)
        if (data.logo_url) setLogoUrl(data.logo_url)
      })
      .catch(() => {})
  }, [])

  // Track mobile viewport
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Ctrl+K opens command palette, Escape closes sidebar/menus
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
      if (e.key === 'Escape') {
        if (sidebarOpen) setSidebarOpen(false)
        setShowUserMenu(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [sidebarOpen])

  // Close user menu when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
                full_name: sessionData.full_name || sessionData.username,
                nama: sessionData.full_name || sessionData.username,
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
  const items = getSidebarItems(userRole)
  const paletteItems = getPaletteItems(userRole)

  return (
    <div className="app-shell">
      {/* Skip to Content Link */}
      <a href="#main-content" className="skip-to-content">
        Loncat ke konten utama
      </a>

      {/* Command Palette */}
      <CommandPalette
        open={showSearch}
        onClose={() => setShowSearch(false)}
        items={paletteItems}
        icons={icons}
      />

      {/* Sidebar */}
      <nav
        ref={sidebarRef}
        className={`sidebar ${sidebarOpen ? 'open' : ''} no-print`}
        aria-label="Navigasi utama"
        aria-hidden={isMobile && !sidebarOpen ? true : undefined}
      >
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <img src={logoUrl} alt={brandName} />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">{brandName}</span>
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
              title={item.label}
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
        <header className="topbar no-print" role="banner">
          <div className="topbar-title">
            <span>Home</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">{items.find(item => item.href === pathname)?.label || 'Dashboard'}</span>
          </div>

          {/* Search — klik untuk buka command palette */}
          <button
            className="topbar-search"
            onClick={() => setShowSearch(true)}
            aria-label="Cari (Ctrl+K)"
            style={{ cursor: 'text', textAlign: 'left' }}
          >
            <span className="topbar-search-icon">{icons.search}</span>
            <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-3)', pointerEvents: 'none' }}>
              Cari agenda, program, surat...
            </span>
            <kbd style={{ fontSize: '0.6875rem', padding: '2px 6px', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-3)', fontFamily: 'monospace', flexShrink: 0 }}>
              Ctrl K
            </kbd>
          </button>

          {/* Actions */}
          <div className="topbar-actions">
            <ThemeToggle style={{ width: 40, height: 40, borderRadius: 10 }} />
            <button className="icon-btn" aria-label="Notifikasi">
              <span style={{ width: 18, height: 18 }}>{icons.bell}</span>
              <span className="dot" aria-hidden="true" />
            </button>

            {/* User menu */}
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                className="topbar-user"
                onClick={() => setShowUserMenu(v => !v)}
                aria-expanded={showUserMenu}
                aria-label="Menu pengguna"
              >
                <div className="topbar-user-avatar">{userInitial}</div>
                <div className="topbar-user-meta">
                  <span className="topbar-user-name">{userName}</span>
                  <span className="topbar-user-role">{userRole.replace('_', ' ')}</span>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: 'var(--text-3)', marginLeft: 4, transition: 'transform .15s', transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0)' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {showUserMenu && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-md)', minWidth: 200, zIndex: 100, animation: 'modalIn .15s ease', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>{userName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>{userRole.replace('_', ' ')}</div>
                  </div>
                  {userRole === 'super_admin' && (
                    <Link
                      href="/pengaturan/users"
                      onClick={() => setShowUserMenu(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', fontSize: '0.875rem', color: 'var(--text)', transition: 'background .12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ width: 16, height: 16 }}>{icons.settings}</span>
                      Pengaturan
                    </Link>
                  )}
                  <button
                    onClick={() => { setShowUserMenu(false); handleLogout() }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--danger)', textAlign: 'left', transition: 'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ width: 16, height: 16 }}>{icons.logout}</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Header (shown on mobile, hidden on desktop/tablet) */}
        <header className="mobile-header no-print" aria-label="Header mobile">
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
              <img src={logoUrl} alt={brandName} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="mobile-header-title">{brandName}</div>
              <div className="mobile-header-sub">{items.find(item => item.href === pathname)?.label || 'USC'}</div>
            </div>
          </div>
          <ThemeToggle style={{ width: 40, height: 40, border: 'none', background: 'none' }} />
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

        {/* Footer Credit */}
        <footer className="no-print" style={{ 
          padding: '1rem 1.5rem', 
          borderTop: '1px solid var(--border)',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-3)',
          backgroundColor: 'var(--surface)',
        }}>
          Made by <strong>Rahmat Iqbal</strong>
        </footer>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        userRole={userRole}
        onMenuClick={() => setSidebarOpen(true)}
      />

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="drawer-overlay open no-print"
          onClick={() => setSidebarOpen(false)}
          aria-label="Tutup menu"
        />
      )}
    </div>
  )
}
