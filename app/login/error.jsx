'use client'

import { useEffect } from 'react'

export default function LoginError({ error, reset }) {
  useEffect(() => {
    console.error('Login page error:', error)
  }, [error])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem'
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
        Terjadi Kesalahan
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '400px', marginBottom: '1.5rem', lineHeight: '1.6' }}>
        Maaf, halaman login mengalami gangguan. Silakan coba memuat ulang.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.625rem 1.25rem',
          background: '#f5b915',
          color: '#1e3a8a',
          border: 'none',
          borderRadius: '10px',
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
