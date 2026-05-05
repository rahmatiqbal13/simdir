'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
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

      // Verifikasi password
      if (userData.password !== formData.password) {
        throw new Error(isEmail ? 'Email atau password salah' : 'Username atau password salah')
      }

      if (!userData.is_active) {
        throw new Error('Akun Anda telah dinonaktifkan')
      }

      // Login ke Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: formData.password
      })

      if (authError) {
        // Jika user belum ada di auth, buat dulu
        if (authError.message.includes('Invalid login credentials')) {
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
          
          if (signUpError) throw signUpError
          
          // Login lagi setelah signup
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: userData.email,
            password: formData.password
          })
          
          if (loginError) throw loginError
        } else {
          throw authError
        }
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id)

      // Set cookie untuk middleware
      await fetch('/api/auth/local-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionData: btoa(JSON.stringify({
            id: userData.id,
            username: userData.username,
            email: userData.email,
            role: userData.role
          }))
        })
      })

      window.location.href = '/dashboard'
      
    } catch (err) {
      console.error('Login error:', err)
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

        <div style={{ 
          marginTop: '1rem', 
          padding: '0.75rem', 
          background: '#f3f4f6', 
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          <strong>Akun Default:</strong>
          <table style={{ width: '100%', marginTop: '0.5rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                <th style={{ textAlign: 'left', padding: '0.25rem' }}>Username</th>
                <th style={{ textAlign: 'left', padding: '0.25rem' }}>Password</th>
                <th style={{ textAlign: 'left', padding: '0.25rem' }}>Role</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '0.25rem' }}>adminiqbal</td>
                <td style={{ padding: '0.25rem' }}>usc@_140451</td>
                <td style={{ padding: '0.25rem' }}>super_admin</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
