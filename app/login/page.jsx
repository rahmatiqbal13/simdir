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
      // MODE LOKAL (jika dipilih atau Supabase tidak tersedia)
      // ============================================
      if (useLocalMode || !supabaseConfigOk) {
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

        // Simpan session lokal
        const sessionData = {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          role: userData.role,
          full_name: userData.full_name,
          source: 'local',
          loginAt: new Date().toISOString()
        }
        
        const sessionToken = btoa(JSON.stringify(sessionData))
        
        localStorage.setItem('simdir_session', sessionToken)
        localStorage.setItem('simdir_user', JSON.stringify({
          id: userData.id,
          username: userData.username,
          email: userData.email,
          role: userData.role,
          full_name: userData.full_name
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
        
        setDebugInfo(`Login berhasil via Local: ${userData.username}`)
        window.location.href = '/dashboard'
        return
      }

      // ============================================
      // MODE SUPABASE
      // ============================================
      console.log('Mencoba login via Supabase Auth...')

      // Coba login langsung ke Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: isEmail ? identifier : `${identifier}@placeholder.com`,
        password: formData.password
      })

      if (authError) {
        console.log('Auth error:', authError)
        
        // Jika email tidak ditemukan di Auth, coba cari di database
        if (authError.message?.includes('Invalid login credentials') || 
            authError.message?.includes('User not found')) {
          
          console.log('User tidak ditemukan di Auth, mencoba via database...')
          
          // Cari user di database
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
            throw new Error('Terjadi kesalahan saat mencari user')
          }
          
          if (!rpcData || rpcData.length === 0) {
            throw new Error(isEmail ? 'Email atau password salah' : 'Username atau password salah')
          }
          
          const userData = rpcData[0]
          
          // Verifikasi password
          if (userData.password !== formData.password) {
            throw new Error(isEmail ? 'Email atau password salah' : 'Username atau password salah')
          }

          if (!userData.is_active) {
            throw new Error('Akun Anda telah dinonaktifkan')
          }

          // Coba buat user di Auth dengan password yang sama
          console.log('Membuat user di Auth...')
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: userData.email,
            password: formData.password,
            options: {
              data: {
                username: userData.username,
                full_name: userData.full_name,
                role: userData.role
              }
            }
          })

          if (signUpError) {
            if (signUpError.message?.includes('already registered')) {
              // User sudah ada di Auth tapi password beda
              throw new Error('Email sudah terdaftar dengan password berbeda. Silakan hubungi admin.')
            }
            throw new Error('Gagal membuat user: ' + signUpError.message)
          }

          console.log('User berhasil dibuat di Auth, mencoba login ulang...')
          
          // Login ulang
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: userData.email,
            password: formData.password
          })

          if (retryError) {
            throw new Error('Gagal login setelah membuat user: ' + retryError.message)
          }

          setDebugInfo(`Login berhasil: ${userData.username} (user baru dibuat)`)
          
          // Update last login
          await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', userData.id)
          
        } else {
          throw new Error(authError.message)
        }
      } else {
        // Login berhasil via Auth
        console.log('Login berhasil via Supabase Auth:', authData)
        
        // Cek apakah user ada di database
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single()

        if (dbError || !dbUser) {
          console.log('User tidak ditemukan di database, membuat...')
          
          // Buat user di database
          const metadata = authData.user.user_metadata
          const { error: insertError } = await supabase.from('users').insert({
            id: authData.user.id,
            email: authData.user.email,
            username: metadata?.username || authData.user.email.split('@')[0],
            full_name: metadata?.full_name || 'User',
            role: metadata?.role || 'admin',
            password: 'AUTH_MANAGED', // Password managed by Supabase Auth
            is_active: true
          })

          if (insertError) {
            console.error('Gagal membuat user di database:', insertError)
          } else {
            console.log('User berhasil dibuat di database')
          }
        }

        setDebugInfo(`Login berhasil via Auth: ${authData.user.email}`)
      }

      // Redirect ke dashboard
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
            <label htmlFor="identifier">Email</label>
            <input
              type="email"
              id="identifier"
              name="identifier"
              placeholder="Masukkan email"
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
          <div style={{ marginTop: '0.5rem' }}>
            <div>• admin@direktorat.ac.id (Supabase Auth)</div>
            <div>• adminiqbal@usc.ac.id (Local)</div>
            <div>• keuangan@usc.ac.id (Local)</div>
            <div>• operator@usc.ac.id (Local)</div>
            <div>• pimpinan@usc.ac.id (Local)</div>
          </div>
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
