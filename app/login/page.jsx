'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { getLocalUserByUsername, getLocalUserByEmail } from '@/lib/local-users'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)
  const [useLocalMode, setUseLocalMode] = useState(false)
  const [supabaseConfigOk, setSupabaseConfigOk] = useState(false)
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )

  // Check Supabase configuration
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (url && key && !url.includes('your-project') && !key.includes('your-anon-key')) {
      setSupabaseConfigOk(true)
    } else {
      console.log('Supabase not configured, defaulting to local mode')
      setUseLocalMode(true)
    }
  }, [])

  const handleLocalLogin = async (userData, source = 'local') => {
    console.log(`Logging in via ${source} mode...`)
    
    // Simpan session lokal
    const sessionData = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      full_name: userData.full_name || userData.nama,
      source: source,
      loginAt: new Date().toISOString()
    }
    
    const sessionToken = btoa(JSON.stringify(sessionData))
    
    localStorage.setItem('simdir_session', sessionToken)
    localStorage.setItem('simdir_user', JSON.stringify({
      id: userData.id,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      full_name: userData.full_name || userData.nama
    }))
    
    // Set cookie untuk middleware
    try {
      await fetch('/api/auth/local-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionData: sessionToken })
      })
    } catch (e) {
      console.log('Cookie set failed (non-critical):', e)
    }
    
    setDebugInfo(`Login berhasil via ${source}: ${userData.username || userData.nama}`)
    window.location.href = '/dashboard'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setDebugInfo(null)

    try {
      const identifier = formData.identifier.trim()
      
      if (!identifier || !formData.password) {
        throw new Error('Username/email dan password harus diisi')
      }

      const isEmail = identifier.includes('@')

      // ============================================
      // MODE LOKAL (jika dipilih)
      // ============================================
      if (useLocalMode) {
        console.log('Using local mode...')
        
        let localData = null
        
        if (isEmail) {
          localData = getLocalUserByEmail(identifier)
        } else {
          localData = getLocalUserByUsername(identifier)
        }
        
        if (!localData || localData.length === 0) {
          throw new Error(isEmail ? 'Email atau password salah' : 'Username atau password salah')
        }
        
        const userData = localData[0]

        if (userData.password !== formData.password) {
          throw new Error(isEmail ? 'Email atau password salah' : 'Username atau password salah')
        }

        if (!userData.is_active) {
          throw new Error('Akun Anda telah dinonaktifkan')
        }

        await handleLocalLogin(userData, 'local')
        return
      }

      // ============================================
      // MODE SUPABASE - Coba cari di database dulu
      // ============================================
      console.log('Mencari user di database...')
      
      let userData = null
      let userSource = null
      
      try {
        // Cari user di database via RPC
        let rpcData = null
        let rpcError = null

        if (isEmail) {
          const result = await supabase.rpc('get_user_by_email', { p_email: identifier })
          rpcData = result.data
          rpcError = result.error
        } else {
          const result = await supabase.rpc('get_user_by_username', { p_username: identifier })
          rpcData = result.data
          rpcError = result.error
        }
        
        if (rpcError) {
          console.error('RPC Error:', rpcError)
          console.log('Fallback ke local mode...')
        } else if (rpcData && rpcData.length > 0) {
          userData = rpcData[0]
          userSource = 'database'
          console.log('User found in database:', userData.username || userData.nama)
        }
      } catch (rpcErr) {
        console.log('RPC failed, will try local:', rpcErr.message)
      }

      // Jika tidak ketemu di database, coba local
      if (!userData) {
        console.log('Mencari user di file lokal...')
        
        let localData = null
        
        if (isEmail) {
          localData = getLocalUserByEmail(identifier)
        } else {
          localData = getLocalUserByUsername(identifier)
        }
        
        if (localData && localData.length > 0) {
          userData = localData[0]
          userSource = 'local'
          console.log('User found locally:', userData.username)
        }
      }

      // Jika user tidak ditemukan sama sekali
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

      // ============================================
      // Coba login ke Supabase Auth (opsional)
      // Jika gagal, tetap login via local
      // ============================================
      console.log('Mencoba login ke Supabase Auth...')
      
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: formData.password
      })

      if (authError) {
        console.log('Auth failed (expected if password differs):', authError.message)
        console.log('Continuing with local session...')
        
        // Coba buat user di Auth untuk next time (silent)
        try {
          await supabase.auth.signUp({
            email: userData.email,
            password: formData.password,
            options: {
              data: {
                username: userData.username,
                nama: userData.full_name || userData.nama,
                role: userData.role
              },
              emailConfirm: true
            }
          })
          console.log('User created in Auth for future use')
        } catch (signupErr) {
          console.log('Could not create auth user (may already exist):', signupErr.message)
        }
      } else {
        console.log('Auth login successful')
        
        // Update last login di database
        try {
          await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', userData.id)
        } catch (e) {
          console.log('Could not update last_login:', e)
        }
      }

      // Login via local session (works regardless of Auth status)
      await handleLocalLogin(userData, userSource)
      
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
            <strong>Error:</strong> {error}
          </div>
        )}

        {debugInfo && (
          <div style={{ 
            background: '#dbeafe', 
            color: '#1e40af', 
            padding: '0.75rem', 
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            <strong>Debug:</strong> {debugInfo}
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
          <strong>User Tersedia:</strong>
          <table style={{ width: '100%', marginTop: '0.5rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                <th style={{ textAlign: 'left', padding: '0.25rem' }}>Email/Username</th>
                <th style={{ textAlign: 'left', padding: '0.25rem' }}>Password</th>
                <th style={{ textAlign: 'left', padding: '0.25rem' }}>Role</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '0.25rem' }}>admin@direktorat.ac.id</td>
                <td style={{ padding: '0.25rem' }}>admin123</td>
                <td style={{ padding: '0.25rem' }}>super_admin</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem' }}>adminiqbal</td>
                <td style={{ padding: '0.25rem' }}>usc@_140451</td>
                <td style={{ padding: '0.25rem' }}>super_admin</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem' }}>keuangan</td>
                <td style={{ padding: '0.25rem' }}>keuangan123</td>
                <td style={{ padding: '0.25rem' }}>admin_keuangan</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem' }}>operator</td>
                <td style={{ padding: '0.25rem' }}>operator123</td>
                <td style={{ padding: '0.25rem' }}>admin</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem' }}>pimpinan</td>
                <td style={{ padding: '0.25rem' }}>pimpinan123</td>
                <td style={{ padding: '0.25rem' }}>pimpinan</td>
              </tr>
            </tbody>
          </table>
        </div>

        {supabaseConfigOk && (
          <div style={{ 
            marginTop: '0.5rem', 
            padding: '0.5rem', 
            background: '#fef3c7', 
            borderRadius: '8px',
            fontSize: '0.7rem',
            color: '#92400e',
            textAlign: 'center'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={useLocalMode}
                onChange={(e) => setUseLocalMode(e.target.checked)}
              />
              Gunakan Mode Lokal (bypass Supabase)
            </label>
          </div>
        )}

        {!supabaseConfigOk && (
          <div style={{ 
            marginTop: '0.5rem', 
            padding: '0.5rem', 
            background: '#fee2e2', 
            borderRadius: '8px',
            fontSize: '0.7rem',
            color: '#dc2626',
            textAlign: 'center'
          }}>
            ⚠️ Supabase belum dikonfigurasi. Menggunakan mode lokal.
          </div>
        )}
      </div>
    </div>
  )
}
