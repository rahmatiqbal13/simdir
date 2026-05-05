'use client'

import { useState } from 'react'

const demoUsers = [
  { role: 'Super Admin', email: 'superadmin@usc.local', desc: 'Akses penuh ke semua fitur' },
  { role: 'Admin Keuangan', email: 'keuangan@usc.local', desc: 'Kelola program kerja & SPJ' },
  { role: 'Admin', email: 'admin@usc.local', desc: 'Kelola agenda & surat' },
  { role: 'Pimpinan', email: 'pimpinan@usc.local', desc: 'Lihat laporan & rekap' },
]

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const handleQuickLogin = (user) => {
    setSelectedUser(user.email)
    setLoading(true)
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 800)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 1000)
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
          <p>Masuk dengan akun demo untuk mengakses sistem</p>
        </div>

        <div className="demo-section">
          <p className="demo-label">Login Cepat (Demo)</p>
          <div className="demo-grid">
            {demoUsers.map((user) => (
              <button
                key={user.role}
                type="button"
                className="demo-btn"
                onClick={() => handleQuickLogin(user)}
                disabled={loading}
              >
                <span className="demo-btn-role">{user.role}</span>
                <span className="demo-btn-desc">{user.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="divider">
          <span>atau masuk dengan email</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="nama@email.com"
              defaultValue={selectedUser || ''}
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
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}