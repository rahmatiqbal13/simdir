'use client'

import { useEffect } from 'react'

export default function DashboardError({ error, reset }) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'var(--danger-50)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem'
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text)', marginBottom: '0.5rem' }}>
        Terjadi Kesalahan
      </h2>
      <p style={{ color: 'var(--text-2)', maxWidth: '400px', marginBottom: '1.5rem', lineHeight: '1.6' }}>
        Maaf, halaman dashboard mengalami gangguan. Silakan coba memuat ulang.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.625rem 1.25rem',
          background: 'var(--primary-solid)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius)',
          fontWeight: '600',
          cursor: 'pointer',
          fontSize: '0.875rem'
        }}
      >
        Coba Lagi
      </button>
    </div>
  )
}
