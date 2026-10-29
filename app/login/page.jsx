'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import ThemeToggle from '@/app/components/ThemeToggle'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  })
  const [brandName, setBrandName] = useState('Direktorat Unesa Science Center')
  const [logoUrl, setLogoUrl] = useState('/images/logo USC.png')

  useEffect(() => {
    fetch('/api/app-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.brand_name) setBrandName(data.brand_name)
        if (data.logo_url) setLogoUrl(data.logo_url)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const identifier = formData.identifier.trim()

      if (!identifier || !formData.password) {
        throw new Error('Email dan password harus diisi')
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
        throw new Error(data.error || 'Email atau password salah')
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
      {/* Kiri — panel navy dengan cincin kuning (disembunyikan di HP) */}
      <div className="login-aside">
        <div className="login-brand">
          <img src={logoUrl} alt={brandName} className="login-brand-logo" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span className="login-brand-name">SIMDIR</span>
            <span className="login-brand-sub">{brandName}</span>
          </div>
        </div>
        <div className="login-pitch">
          <h1 className="login-headline">Agenda, layanan &amp; keuangan direktorat — satu tempat.</h1>
          <p className="login-lede">Masuk untuk mengelola agenda, TV display, masukan publik, dan dokumen keuangan.</p>
        </div>
        <div className="login-status"><span className="login-status-dot" />Sistem normal · Made by Rahmat Iqbal</div>
      </div>

      {/* Kanan — formulir */}
      <div className="login-form-wrap">
        <div className="login-topbar">
          <div className="login-mobile-brand hide-desktop">
            <img src={logoUrl} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 }}>SIMDIR</span>
          </div>
          <ThemeToggle style={{ width: 40, height: 40, borderRadius: 10, color: 'var(--text)', marginLeft: 'auto' }} />
        </div>
        <div className="login-form">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h2 className="login-title">Masuk</h2>
            <p className="muted" style={{ fontSize: 15, margin: 0 }}>Gunakan akun yang diberikan admin direktorat.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger" role="alert" aria-live="polite">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div className="field">
              <label className="field-label" htmlFor="identifier">Email atau username</label>
              <input
                type="text"
                id="identifier"
                name="identifier"
                placeholder="nama@unesa.ac.id"
                value={formData.identifier}
                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                required
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                disabled={loading}
                style={{ height: 48 }}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="password">Kata sandi</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  spellCheck={false}
                  disabled={loading}
                  style={{ height: 48, paddingRight: 84 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  disabled={loading}
                  style={{ position: 'absolute', right: 4, width: 76, height: 40, border: 0, background: 'transparent', color: 'var(--text-2)', font: '600 12.5px var(--font-sans)', cursor: 'pointer' }}
                >
                  {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', minHeight: 50, fontSize: 15.5, fontWeight: 700 }}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: 'white' }} aria-hidden="true" />
                  Memproses...
                </>
              ) : 'Masuk'}
            </button>
          </form>

          <div className="login-public">
            <span className="eyebrow" style={{ fontSize: 11.5, letterSpacing: '.1em' }}>Halaman publik</span>
            <div className="login-public-grid">
              <a href="/daftar-tamu">Buku Tamu</a>
              <a href="/kritik-saran">Kritik &amp; Saran</a>
              <a href="/penilaian">Penilaian Fasilitas</a>
              <a href="/agenda">Agenda publik</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
