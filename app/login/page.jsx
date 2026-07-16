'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

// USC Logo Component - Using official logo file
const USCLogo = () => (
  <img 
    src="/images/logo USC.png" 
    alt="USC Logo" 
    style={{ 
      width: '100%', 
      height: '100%', 
      objectFit: 'contain',
      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))'
    }} 
  />
)

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const identifier = formData.identifier.trim()

      if (!identifier || !formData.password) {
        throw new Error('Username/email dan password harus diisi')
      }

      // Verifikasi kredensial dilakukan sepenuhnya di server (rate-limited,
      // bcrypt, pesan error generik) — client tidak pernah melihat password hash.
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: formData.password })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Username/email atau password salah')
      }

      // Best-effort: kalau user ini juga terdaftar di Supabase Auth, buat
      // session Supabase asli juga (dipakai sebagai METODE 1 di middleware).
      // Kegagalan di sini tidak masalah — cookie session lokal di atas
      // sudah cukup untuk mengotorisasi user.
      try {
        await supabase.auth.signInWithPassword({
          email: data.user.email,
          password: formData.password
        })
      } catch (authErr) {
        console.log('Auth login failed (non-critical):', authErr.message)
      }

      localStorage.setItem('simdir_session', data.session)

      window.location.href = '/dashboard'

    } catch (err) {
      console.error('Login error:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">
      {/* Left Side - Branding (hidden on mobile) */}
      <div className="login-aside">
        <div className="login-aside-content">
          {/* Brand mark + name */}
          <div className="row-flex" style={{ gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'white', padding: 6,
              display: 'grid', placeItems: 'center'
            }}>
              <USCLogo />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.06em' }}>SIMDIR</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Unesa Science Center</div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ maxWidth: 460 }}>
            <h1 style={{
              fontSize: '2.5rem', fontWeight: 800,
              letterSpacing: '-0.022em', lineHeight: 1.1,
              marginBottom: 16
            }}>
              Sistem Informasi <br /> Direktorat <span style={{ color: 'var(--accent)' }}>USC</span>
            </h1>
            <p style={{ fontSize: '1rem', opacity: 0.8, lineHeight: 1.6 }}>
              Kelola agenda, penilaian fasilitas, kritik &amp; saran, dan laporan
              direktorat dalam satu platform terintegrasi.
            </p>

            {/* Feature chips */}
            <div style={{ display: 'flex', gap: 10, marginTop: 32, flexWrap: 'wrap' }}>
              {[
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label: 'Agenda Pintar' },
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>, label: 'Anggaran Real-time' },
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, label: 'SPJ Digital' },
              ].map(({ icon, label }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 999,
                  fontSize: '0.8125rem', fontWeight: 600
                }}>
                  {icon}
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', opacity: 0.55 }}>
            © 2026 Direktorat Unesa Science Center · v2.0
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-form-wrap">
        <div className="login-form">
          {/* Mobile-only brand header */}
          <div className="hide-desktop" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'var(--primary)', padding: 4,
              display: 'grid', placeItems: 'center'
            }}>
              <USCLogo />
            </div>
            <div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '0.04em' }}>SIMDIR</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Unesa Science Center</div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 6 }}>Selamat datang kembali</h2>
          <p className="muted" style={{ fontSize: '0.9375rem', marginBottom: 28 }}>Masuk dengan akun direktorat Anda.</p>

          {/* Credit */}
          <div style={{ 
            fontSize: '0.6875rem', 
            color: 'var(--text-3)', 
            marginBottom: 20,
            padding: '8px 12px',
            backgroundColor: 'var(--surface-2)',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            Made by <strong>Rahmat Iqbal</strong>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="alert alert-danger"
              role="alert"
              aria-live="polite"
              style={{ marginBottom: 20 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="field mb-4">
              <label className="field-label" htmlFor="identifier">Username atau Email</label>
              <div className="input-group">
                <svg className="input-group-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  type="text"
                  id="identifier"
                  name="identifier"
                  className="input"
                  placeholder="nama.pengguna atau email@usc.ac.id"
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                  required
                  autoComplete="username"
                  spellCheck={false}
                  inputMode="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="field mb-4">
              <div className="row-flex-between">
                <label className="field-label" htmlFor="password">Kata Sandi</label>
              </div>
              <div className="input-group" style={{ position: 'relative' }}>
                <svg className="input-group-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className="input"
                  placeholder="Masukkan kata sandi"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  spellCheck={false}
                  disabled={loading}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  disabled={loading}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 0, color: 'var(--text-3)', cursor: 'pointer', padding: 8
                  }}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', height: 44, fontSize: '0.9375rem', boxShadow: '0 4px 14px rgba(30,58,138,0.25)' }}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: 'white' }} aria-hidden="true" />
                  Memproses...
                </>
              ) : 'Masuk ke SIMDIR'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
