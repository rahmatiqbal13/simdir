'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const identifier = formData.identifier.trim()
      
      if (!identifier || !formData.password) {
        throw new Error('Username/email dan password harus diisi')
      }

      const isEmail = identifier.includes('@')

      // Cari user di database via RPC
      let userData = null

      if (isEmail) {
        const { data, error: rpcError } = await supabase.rpc('get_user_by_email', { 
          p_email: identifier 
        })
        if (rpcError) throw rpcError
        if (data && data.length > 0) userData = data[0]
      } else {
        const { data, error: rpcError } = await supabase.rpc('get_user_by_username', { 
          p_username: identifier 
        })
        if (rpcError) throw rpcError
        if (data && data.length > 0) userData = data[0]
      }

      if (!userData) {
        throw new Error(isEmail ? 'Email atau password salah' : 'Username atau password salah')
      }

      // Trim password untuk menghilangkan whitespace
      const inputPassword = formData.password.trim()
      const dbPassword = userData.password.trim()

      // Verifikasi password
      if (dbPassword !== inputPassword) {
        throw new Error(isEmail ? 'Email atau password salah' : 'Username atau password salah')
      }

      if (!userData.is_active) {
        throw new Error('Akun Anda telah dinonaktifkan')
      }

      // Coba login ke Supabase Auth (opsional - untuk fitur real-time dsb)
      let authSuccess = false
      try {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: userData.email,
          password: formData.password
        })
        
        if (!authError) {
          authSuccess = true
        }
      } catch (authErr) {
        console.log('Auth login failed (non-critical):', authErr.message)
      }
      
      // Jika auth gagal, coba signup
      if (!authSuccess) {
        try {
          const { error: signUpError } = await supabase.auth.signUp({
            email: userData.email,
            password: formData.password,
            options: {
              data: {
                username: userData.username,
                nama: userData.full_name || userData.nama,
                role: userData.role
              }
            }
          })
          
          if (!signUpError) {
            authSuccess = true
          }
        } catch (signUpErr) {
          console.log('Auth signup failed (non-critical):', signUpErr.message)
        }
      }

      // Update last login (tidak critical)
      try {
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userData.id)
      } catch (e) {
        console.log('Update last_login failed (non-critical):', e)
      }

      // Set cookie untuk middleware
      const sessionPayload = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role
      }
      
      await fetch('/api/auth/local-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionData: btoa(JSON.stringify(sessionPayload))
        })
      })
      
      // Also save to localStorage for client-side
      localStorage.setItem('simdir_session', btoa(JSON.stringify(sessionPayload)))

      window.location.href = '/dashboard'
      
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="login-container" role="main" aria-labelledby="login-title">
      <div className="login-card">
        <div className="login-header">
          <div className="login-brand">
            <div className="brand-logo" aria-hidden="true">S</div>
            <strong>SIMDIR</strong>
          </div>
          <h1 id="login-title">Masuk</h1>
          <p>Sistem Informasi Manajemen Direktorat USC</p>
        </div>

        {error && (
          <div 
            className="error-msg" 
            role="alert"
            aria-live="polite"
            aria-atomic="true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem', flexShrink: 0 }} aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="identifier">Username atau Email <span aria-label="wajib diisi">*</span></label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              placeholder="Masukkan username atau email"
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              required
              autoComplete="username"
              aria-required="true"
              aria-describedby="identifier-help"
              disabled={loading}
            />
            <span id="identifier-help" className="sr-only">Masukkan username atau alamat email Anda</span>
          </div>

          <div className="form-group">
            <label htmlFor="password">Kata Sandi <span aria-label="wajib diisi">*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                placeholder="Masukkan kata sandi"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete="current-password"
                aria-required="true"
                aria-describedby="password-help"
                disabled={loading}
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                aria-pressed={showPassword}
                disabled={loading}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-3)',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '44px',
                  minWidth: '44px',
                  lineHeight: 1,
                  borderRadius: 'var(--radius)'
                }}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }} aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }} aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <span id="password-help" className="sr-only">Masukkan kata sandi Anda</span>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading} 
            style={{ width: '100%', minHeight: '44px' }}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px', marginRight: '0.5rem' }} aria-hidden="true" />
                Memproses...
              </>
            ) : 'Masuk'}
          </button>
        </form>

      </div>
    </div>
  )
}
