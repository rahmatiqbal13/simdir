'use client'

/**
 * Mobile Bottom Navigation
 * Menyediakan navigasi bottom untuk mobile devices
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Icons untuk bottom navigation
const navIcons = {
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
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

// Navigation items untuk setiap role
const navItems = {
  super_admin: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', shortLabel: 'Home' },
    { href: '/kelola-agenda', label: 'Agenda', icon: 'calendar', shortLabel: 'Agenda' },
    { href: '/program-kerja', label: 'Program', icon: 'briefcase', shortLabel: 'Proker' },
    { href: '/pencairan', label: 'Dana', icon: 'wallet', shortLabel: 'Dana' },
    { href: null, label: 'Menu', icon: 'menu', shortLabel: 'Menu', isMenu: true },
  ],
  admin_keuangan: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', shortLabel: 'Home' },
    { href: '/program-kerja', label: 'Program', icon: 'briefcase', shortLabel: 'Proker' },
    { href: '/pencairan', label: 'Dana', icon: 'wallet', shortLabel: 'Dana' },
    { href: null, label: 'Menu', icon: 'menu', shortLabel: 'Menu', isMenu: true },
  ],
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', shortLabel: 'Home' },
    { href: '/kelola-agenda', label: 'Agenda', icon: 'calendar', shortLabel: 'Agenda' },
    { href: '/tv-pamflet', label: 'TV', icon: 'tv', shortLabel: 'TV' },
    { href: null, label: 'Menu', icon: 'menu', shortLabel: 'Menu', isMenu: true },
  ],
  pimpinan: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', shortLabel: 'Home' },
    { href: '/kelola-agenda', label: 'Agenda', icon: 'calendar', shortLabel: 'Agenda' },
    { href: '/surat', label: 'Surat', icon: 'mail', shortLabel: 'Surat' },
    { href: '/pencairan', label: 'Dana', icon: 'wallet', shortLabel: 'Dana' },
    { href: null, label: 'Menu', icon: 'menu', shortLabel: 'Menu', isMenu: true },
  ],
}

export default function MobileBottomNav({ userRole = 'admin', onMenuClick }) {
  const pathname = usePathname()
  const items = navItems[userRole] || navItems.admin

  return (
    <nav 
      className="mobile-bottom-nav"
      role="navigation"
      aria-label="Navigasi mobile"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        padding: '0.5rem 0.75rem calc(0.5rem + env(safe-area-inset-bottom))',
        zIndex: 90,
        display: 'none' // Hidden by default, shown on mobile via media query
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        maxWidth: '480px',
        margin: '0 auto'
      }}>
        {items.map((item, index) => {
          const isActive = item.href && pathname === item.href
          const isMenu = item.isMenu

          if (isMenu) {
            return (
              <button
                key={item.label}
                onClick={onMenuClick}
                className="bottom-nav-item"
                aria-label="Buka menu lengkap"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.5rem 0.75rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-2)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  minWidth: '60px',
                  transition: 'all 0.2s',
                  borderRadius: 'var(--radius)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--primary)'
                  e.currentTarget.style.background = 'var(--primary-bg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-2)'
                  e.currentTarget.style.background = 'none'
                }}
              >
                <span style={{ width: '1.5rem', height: '1.5rem' }}>
                  {navIcons[item.icon]}
                </span>
                <span>{item.shortLabel}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.5rem 0.75rem',
                textDecoration: 'none',
                color: isActive ? 'var(--primary)' : 'var(--text-2)',
                fontSize: '0.625rem',
                fontWeight: isActive ? 600 : 500,
                minWidth: '60px',
                transition: 'all 0.2s',
                borderRadius: 'var(--radius)',
                background: isActive ? 'var(--primary-bg)' : 'transparent',
                position: 'relative'
              }}
            >
              <span style={{ width: '1.5rem', height: '1.5rem' }}>
                {navIcons[item.icon]}
              </span>
              <span>{item.shortLabel}</span>
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-0.5rem',
                    width: '20px',
                    height: '3px',
                    background: 'var(--primary)',
                    borderRadius: '0 0 2px 2px'
                  }}
                  aria-hidden="true"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
