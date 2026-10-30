'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { UsersProvider } from '@/context/UsersContext'
import { UnitKerjaProvider } from '@/context/UnitKerjaContext'
import MobileBottomNav, { MobileMenuSheet } from '@/app/components/MobileBottomNav'
import ThemeToggle from '@/app/components/ThemeToggle'
import { NAV_ICONS as icons, getGroupedSidebarItems, getPaletteItems } from '@/app/components/navConfig'

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
      style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'calc(clamp(20px, 8vh, 80px) + env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) calc(20px + env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left))' }}
      onClick={onClose}
    >
      <div
        style={{ background:'var(--surface)', borderRadius:16, width:'100%', maxWidth:560, maxHeight:'calc(100vh - 40px)', display:'flex', flexDirection:'column', boxShadow:'0 20px 40px rgba(15,23,42,0.18)', overflow:'hidden', animation:'modalIn .18s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
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
          <kbd style={{ fontSize:'0.6875rem', padding:'2px 6px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-3)', fontFamily: 'var(--font-mono)' }}>ESC</kbd>
        </div>
        {/* Results */}
        <div style={{ flex:'1 1 auto', minHeight:0, maxHeight:360, overflowY:'auto' }}>
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
        <div style={{ padding:'8px 18px', borderTop:'1px solid var(--border)', background:'var(--surface-2)', display:'flex', gap:16, fontSize:'0.75rem', color:'var(--text-3)', flexShrink:0 }}>
          <span>↵ untuk buka</span>
          <span>ESC untuk tutup</span>
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [saranBaru, setSaranBaru] = useState(0)
  const [brandName, setBrandName] = useState('Direktorat Unesa Science Center')
  const [logoUrl, setLogoUrl] = useState('/images/logo USC.png')
  const pathname = usePathname()
  const [openMenu, setOpenMenu] = useState(null)
  const navRef = useRef(null)

  useEffect(() => {
    fetch('/api/app-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.brand_name) setBrandName(data.brand_name)
        if (data.logo_url) setLogoUrl(data.logo_url)
      })
      .catch(() => {})
  }, [])

  // Jumlah kritik & saran yang belum ditinjau → badge di navbar
  useEffect(() => {
    try {
      const s = localStorage.getItem('simdir_session')
      if (!s) return
      const d = JSON.parse(atob(s))
      fetch('/api/saran', { headers: { authorization: `Bearer ${d.token || d.role || 'session'}` } })
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => Array.isArray(rows) && setSaranBaru(rows.filter((x) => x.status === 'baru').length))
        .catch(() => {})
    } catch {}
  }, [])

  // Tutup sheet menu saat pindah halaman
  useEffect(() => { setMenuOpen(false); setOpenMenu(null) }, [pathname])

  // Tutup dropdown navbar saat klik di luar
  useEffect(() => {
    if (!openMenu) return
    const close = (e) => { if (!navRef.current?.contains(e.target)) setOpenMenu(null) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [openMenu])

  // Ctrl+K opens command palette, Escape closes menus
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setOpenMenu(null)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
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
  const groupedItems = getGroupedSidebarItems(userRole)
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

      {/* Main Area */}
      <div className="main-area">
        {/* Navbar desktop (v3): pita biru, menu per grup dengan dropdown */}
        <header className="topnav no-print" role="banner" ref={navRef}>
          <Link href="/dashboard" className="topnav-brand">
            <img src={logoUrl} alt={brandName} />
            <span>SIMDIR</span>
          </Link>
          <nav className="topnav-menu" aria-label="Navigasi utama">
            {groupedItems.map((group) => {
              const active = group.items.some(i => i.href === pathname)
              if (group.items.length === 1) {
                const item = group.items[0]
                return <Link key={group.key} href={item.href} className={`topnav-btn ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>{item.key === 'dashboard' ? 'Beranda' : item.label}</Link>
              }
              const badge = group.items.some(i => i.key === 'kelola-saran') && saranBaru > 0
              return (
                <div key={group.key} style={{ position: 'relative' }}>
                  <button type="button" className={`topnav-btn ${active || openMenu === group.key ? 'active' : ''}`} aria-expanded={openMenu === group.key}
                    onClick={() => setOpenMenu(openMenu === group.key ? null : group.key)}>
                    {group.label}
                    {badge && <span className="topnav-dot" aria-label={`${saranBaru} masukan baru`} />}
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  {openMenu === group.key && (
                    <div className="topnav-drop">
                      {group.items.map(item => (
                        <Link key={item.href} href={item.href} className={pathname === item.href ? 'active' : ''} aria-current={pathname === item.href ? 'page' : undefined}>
                          <span className="nav-icon">{icons[item.icon]}</span>
                          <span style={{ flex: 1 }}>{item.label}</span>
                          {item.key === 'kelola-saran' && saranBaru > 0 && <span className="nav-badge">{saranBaru}</span>}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
          <div style={{ flex: 1 }} />
          <button className="topnav-search" onClick={() => setShowSearch(true)} aria-label="Cari (Ctrl+K)">
            <span style={{ width: 16, height: 16, display: 'inline-flex' }}>{icons.search}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>Cari menu, agenda, invoice…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <ThemeToggle style={{ width: 40, height: 40, borderRadius: 10, color: '#fff' }} />
          <button className="topnav-icon" aria-label={saranBaru > 0 ? `Notifikasi: ${saranBaru} masukan baru` : 'Notifikasi'} onClick={() => saranBaru > 0 && (window.location.href = '/kelola-saran')}>
            <span style={{ width: 18, height: 18, display: 'inline-flex' }}>{icons.bell}</span>
            {saranBaru > 0 && <span className="topnav-dot" style={{ position: 'absolute', top: 8, right: 9 }} aria-hidden="true" />}
          </button>
          <div style={{ position: 'relative' }}>
            <button type="button" className="topnav-avatar" aria-label="Menu akun" aria-expanded={openMenu === 'akun'} onClick={() => setOpenMenu(openMenu === 'akun' ? null : 'akun')}>{userInitial}</button>
            {openMenu === 'akun' && (
              <div className="topnav-drop" style={{ left: 'auto', right: 0, width: 240 }}>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <strong style={{ fontSize: 14 }} className="truncate">{userName}</strong>
                  <span style={{ fontSize: 12.5, color: 'var(--text-3)', textTransform: 'capitalize' }}>{userRole.replace('_', ' ')}</span>
                </div>
                <button type="button" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
                  <span className="nav-icon">{icons.logout}</span>Keluar
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Mobile Header (shown on mobile, hidden on desktop/tablet) */}
        <header className="mobile-header no-print" aria-label="Header mobile">
          <div className="mobile-header-brand">
            <div className="mobile-header-brand-mark">
              <img src={logoUrl} alt={brandName} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="mobile-header-title">SIMDIR</div>
            </div>
          </div>
          <ThemeToggle style={{ width: 44, height: 44, borderRadius: 12, color: 'var(--text)' }} />
          <button className="icon-btn" onClick={() => setShowSearch(true)} aria-label="Cari">
            <span style={{ width: 18, height: 18 }}>{icons.search}</span>
          </button>
          <button className="icon-btn" aria-label="Notifikasi" onClick={() => saranBaru > 0 && (window.location.href = '/kelola-saran')}>
            <span style={{ width: 18, height: 18 }}>{icons.bell}</span>
            {saranBaru > 0 && <span className="dot" aria-hidden="true" />}
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
        <footer className="no-print app-credit">
          Made by <strong>Rahmat Iqbal</strong>
        </footer>
      </div>

      {/* Mobile Bottom Navigation + sheet "Semua menu" */}
      <MobileBottomNav
        userRole={userRole}
        menuOpen={menuOpen}
        onMenuClick={() => setMenuOpen(v => !v)}
      />
      <MobileMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        groups={groupedItems}
        pathname={pathname}
        userName={userName}
        userRole={userRole}
        onLogout={handleLogout}
      />

    </div>
  )
}
