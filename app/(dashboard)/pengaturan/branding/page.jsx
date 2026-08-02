'use client'

import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/app/components/Toast'
import ConfirmModal from '@/app/components/ConfirmModal'

const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
const MAX_LOGO_SIZE = 2 * 1024 * 1024

export default function BrandingSettingsPage() {
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/app-settings')
        const data = await res.json()
        setBrandName(data.brand_name || '')
        setLogoUrl(data.logo_url || null)
      } catch (err) {
        error('Gagal memuat pengaturan')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [error])

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview)
    }
  }, [logoPreview])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      error('Format logo harus JPG, PNG, WebP, atau SVG')
      e.target.value = ''
      return
    }
    if (file.size > MAX_LOGO_SIZE) {
      error('Ukuran logo maksimal 2MB')
      e.target.value = ''
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!brandName.trim()) {
      error('Nama instansi wajib diisi')
      return
    }
    if (logoFile) {
      setConfirmOpen(true)
      return
    }
    doSave()
  }

  const doSave = async () => {
    setConfirmOpen(false)
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('brand_name', brandName.trim())
      if (logoFile) fd.append('logo', logoFile)

      const res = await fetch('/api/app-settings', { method: 'PUT', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')

      setLogoUrl(data.logo_url || null)
      setLogoFile(null)
      setLogoPreview(null)
      success('Pengaturan tampilan berhasil disimpan')
    } catch (err) {
      error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
        <h3>Memuat pengaturan...</h3>
      </div>
    )
  }

  const displayLogo = logoPreview || logoUrl || '/images/logo USC.png'

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Nama Instansi &amp; Logo</h1>
          <p className="page-subtitle">Ditampilkan di halaman TV kiosk, login, dan agenda publik.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 560 }}>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="field">
            <label className="field-label" htmlFor="brand_name">Nama Instansi</label>
            <input
              id="brand_name"
              className="input"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Direktorat Unesa Science Center"
              maxLength={80}
              required
            />
          </div>

          <div className="field">
            <label className="field-label">Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 72, height: 72, borderRadius: 12,
                border: '1px solid var(--border)', background: 'var(--surface-2)',
                display: 'grid', placeItems: 'center', padding: 8, flexShrink: 0,
              }}>
                <img src={displayLogo} alt="Logo saat ini" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Ganti Logo
                </button>
                <div className="muted" style={{ fontSize: '0.75rem', marginTop: 6 }}>
                  JPG, PNG, WebP, atau SVG. Maks. 2MB.
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.svg"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>

      <ConfirmModal
        open={confirmOpen}
        title="Ganti Logo?"
        message="Logo ini dipakai di banyak halaman sekaligus (TV kiosk, login, agenda publik). Logo lama akan digantikan permanen untuk semua halaman tersebut."
        confirmLabel="Ganti Logo"
        cancelLabel="Batal"
        busy={saving}
        onConfirm={doSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
