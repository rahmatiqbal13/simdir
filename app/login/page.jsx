'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/supabase-js'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    identifier: '', // Bisa username atau email
    password: ''
  })

  const supabase = createClientComponentClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const identifier = formData.identifier.trim()
      
      // Cek apakah input adalah email atau username
      const isEmail = identifier.includes('@')
      
      let userData
      
      if (isEmail) {
        // Cari user berdasarkan email
        const { data, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', identifier)
          .single()
        
        if (userError || !data) {
          throw new Error('Email atau password salah')
        }
        
        userData = data
      } else {
        // Cari user berdasarkan username
        const { data, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('username', identifier)
          .single()
        
        if (userError || !data) {
          throw new Error('Username atau password salah')
        }
        
        userData = data
      }

      // Verifikasi password
      if (userData.password !== formData.password) {
        throw new Error(isEmail ? 'Email atau password salah' : 'Username atau password salah')
      }

      // Cek apakah user aktif
      if (!userData.is_active) {
        throw new Error('Akun Anda telah dinonaktifkan')
      }

      // Login dengan Supabase Auth menggunakan email sebagai identifier
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: formData.password
      })

      if (authError) {
        // Jika auth gagal, coba signup terlebih dahulu
        const { error: signUpError } = await supabase.auth.signUp({
          email: userData.email,
          password: formData.password,
          options: {
            data: {
              username: userData.username,
              role: userData.role
            }
          }
        })

        if (signUpError) {
          throw new Error('Gagal login. Silakan coba lagi.')
        }
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id)

      // Redirect ke dashboard
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-brand">
            <div className="brand-logo">S</div>
            <strong>SIMDIR</strong>
          </div>
          <h1>Masuk</h1>
          <p>Sistem Informasi Manajemen Direktorat USC</p>
        </div>

        {error && (
          <div className="error-msg" style={{ 
            background: '#fee2e2', 
            color: '#dc2626', 
            padding: '0.75rem', 
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="identifier">Username atau Email</label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              placeholder="Masukkan username atau email"
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Kata Sandi</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Masukkan kata sandi"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-3)' }}>
          <p>Default Superadmin:</p>
          <p><strong>Username:</strong> adminiqbal</p>
          <p><strong>Password:</strong> usc@_140451</p>
        </div>
      </div>
    </div>
  )
}
