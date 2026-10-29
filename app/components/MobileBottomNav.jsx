'use client'

/**
 * Mobile Bottom Navigation (Redesign 01)
 * 3 item utama per role + tombol "Menu" yang membuka sheet "Semua menu".
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ICONS, getBottomNavItems } from './navConfig'

export default function MobileBottomNav({ userRole = 'admin', onMenuClick, menuOpen = false }) {
  const pathname = usePathname()
  const items = getBottomNavItems(userRole)

  return (
    <nav className="mbn no-print" aria-label="Navigasi mobile">
      {items.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mbn-item ${isActive && !menuOpen ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="mbn-icon">{NAV_ICONS[item.icon]}</span>
            <span>{item.shortLabel}</span>
          </Link>
        )
      })}
      <button
        type="button"
        onClick={onMenuClick}
        className={`mbn-item ${menuOpen ? 'active' : ''}`}
        aria-label="Buka semua menu"
        aria-expanded={menuOpen}
      >
        <span className="mbn-icon">{NAV_ICONS.menu}</span>
        <span>Menu</span>
      </button>
    </nav>
  )
}

// Sheet bawah berisi seluruh menu per grup (2 kolom), menggantikan drawer
// sidebar di HP.
export function MobileMenuSheet({ open, onClose, groups, pathname, userName, userRole, onLogout }) {
  if (!open) return null
  return (
    <>
      <div className="menu-sheet-backdrop no-print" onClick={onClose} aria-hidden="true" />
      <div className="menu-sheet no-print" role="dialog" aria-modal="true" aria-label="Semua menu">
        <span className="menu-sheet-grip" aria-hidden="true" />
        <div className="menu-sheet-head">
          <span className="menu-sheet-title">Semua menu</span>
          <button type="button" className="pub-icon-btn" onClick={onClose} aria-label="Tutup menu" style={{ fontSize: 20 }}>×</button>
        </div>
        {groups.map((g) => (
          <div className="menu-sheet-group" key={g.key}>
            <span className="menu-sheet-label">{g.label}</span>
            <div className="menu-sheet-grid">
              {g.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={onClose}
                  className={`menu-sheet-link ${pathname === it.href ? 'active' : ''}`}
                  aria-current={pathname === it.href ? 'page' : undefined}
                >
                  {NAV_ICONS[it.icon]}
                  <span>{it.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
        <div className="menu-sheet-foot">
          <div className="user-avatar">{(userName || 'U').charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }} className="truncate">{userName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'capitalize' }}>{(userRole || '').replace('_', ' ')}</div>
          </div>
          <button type="button" className="btn btn-danger btn-sm" onClick={onLogout} style={{ minHeight: 44 }}>
            <span style={{ width: 16, height: 16, display: 'inline-flex' }}>{NAV_ICONS.logout}</span>
            Keluar
          </button>
        </div>
      </div>
    </>
  )
}
