'use client'

/**
 * Mobile Bottom Navigation
 * Menyediakan navigasi bottom untuk mobile devices
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ICONS, getBottomNavItems } from './navConfig'

export default function MobileBottomNav({ userRole = 'admin', onMenuClick }) {
  const pathname = usePathname()
  const items = getBottomNavItems(userRole)

  return (
    <nav
      className="mobile-bottom-nav no-print"
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
        {items.map((item) => {
          const isActive = pathname === item.href

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
                fontSize: '0.75rem',
                fontWeight: isActive ? 600 : 500,
                minWidth: '60px',
                transition: 'all 0.2s',
                borderRadius: 'var(--radius)',
                background: isActive ? 'var(--primary-bg)' : 'transparent',
                position: 'relative'
              }}
            >
              <span style={{ width: '1.5rem', height: '1.5rem' }}>
                {NAV_ICONS[item.icon]}
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

        <button
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
            {NAV_ICONS.menu}
          </span>
          <span>Menu</span>
        </button>
      </div>
    </nav>
  )
}
