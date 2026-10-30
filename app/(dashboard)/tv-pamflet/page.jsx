'use client'

import { useState, useEffect, useRef } from 'react'
import ConfirmModal from '@/app/components/ConfirmModal'
import { TV_LAYAR, TV_LAYAR_SLUGS, TV_LAYAR_UNIT } from '@/lib/tvLayar'

// Pilih layar TV tujuan. Kosong = tampil di semua TV.
function LayarPicker({ value, onChange, compact = false }) {
  const toggle = (slug) => onChange(value.includes(slug) ? value.filter(s => s !== slug) : [...value, slug])
  const chip = (active) => ({
    padding: compact ? '1px 8px' : '0.375rem 0.75rem',
    borderRadius: '99px',
    fontSize: compact ? '0.7rem' : '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : 'var(--text-2)',
  })
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: compact ? '0.25rem' : '0.5rem' }}>
      <button type="button" onClick={() => onChange([])} style={chip(value.length === 0)}>Semua TV</button>
      {TV_LAYAR_SLUGS.map(slug => (
        <button key={slug} type="button" onClick={() => toggle(slug)} style={chip(value.includes(slug))}>{TV_LAYAR[slug].nama}</button>
      ))}
    </div>
  )
}

// Pengaturan operasional satu layar unit (tabel tv_screens)
function ScreenSettings({ slug, initial, onSaved, onError }) {
  const [f, setF] = useState(() => ({
    jam_buka: initial?.jam_buka?.slice(0, 5) || '',
    jam_tutup: initial?.jam_tutup?.slice(0, 5) || '',
    tutup_sementara: !!initial?.tutup_sementara,
    catatan: initial?.catatan || '',
    running_text: initial?.running_text || '',
  }))
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))
  const input = { width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }
  const label = { display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text)' }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/tv-screens/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')
      onSaved(`Pengaturan TV ${TV_LAYAR[slug].nama} disimpan. TV akan update dalam 5 menit.`)
    } catch (err) {
      onError(err.message || 'Gagal menyimpan pengaturan layar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>TV {TV_LAYAR[slug].nama}</h2>
        <a href={`/agenda/tv/${slug}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8125rem', color: 'var(--primary)' }}>Buka layar ↗</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <label style={label}>Jam buka</label>
          <input type="time" value={f.jam_buka} onChange={(e) => set('jam_buka', e.target.value)} style={input} />
        </div>
        <div>
          <label style={label}>Jam tutup</label>
          <input type="time" value={f.jam_tutup} onChange={(e) => set('jam_tutup', e.target.value)} style={input} />
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1rem', cursor: 'pointer' }}>
        <input type="checkbox" checked={f.tutup_sementara} onChange={(e) => set('tutup_sementara', e.target.checked)} />
        Tutup sementara (perawatan, acara khusus, dll.)
      </label>

      <div style={{ marginBottom: '1rem' }}>
        <label style={label}>Catatan di kartu status</label>
        <input type="text" value={f.catatan} onChange={(e) => set('catatan', e.target.value)} maxLength={200}
          placeholder={f.tutup_sementara ? 'mis. Perawatan kolam hingga 2 Nov' : 'Opsional — mis. Khusus member pagi ini'} style={input} />
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={label}>Running text</label>
        <textarea value={f.running_text} onChange={(e) => set('running_text', e.target.value)} rows={4} maxLength={2000}
          placeholder={'Satu info per baris, mis.\nWajib bilas sebelum masuk kolam\nTiket pelajar Rp10.000'} style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} />
        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.375rem' }}>
          Jadwal hari ini dari Kelola Agenda (penyelenggara {TV_LAYAR[slug].nama}, tampil publik) ikut otomatis.
        </p>
      </div>

      <button onClick={save} disabled={saving}
        style={{ width: '100%', padding: '0.625rem', background: saving ? 'var(--text-3)' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
        {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
      </button>
    </div>
  )
}

export default function TVPamfletPage() {
  const [pamflets, setPamflets] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('image') // 'image' | 'youtube'
  
  // Image upload state
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [imgTitle, setImgTitle] = useState('')
  const [imgDuration, setImgDuration] = useState(15)
  const fileInputRef = useRef(null)
  
  // YouTube link state
  const [ytTitle, setYtTitle] = useState('')
  const [ytUrl, setYtUrl] = useState('')
  const [ytDuration, setYtDuration] = useState(15)
  const [ytSaving, setYtSaving] = useState(false)
  
  // Layar tujuan untuk pamflet baru (dipakai form gambar & YouTube)
  const [target, setTarget] = useState([])

  // Pengaturan layar unit (tv_screens), dimuat sekali
  const [screens, setScreens] = useState(null)

  const [message, setMessage] = useState({ type: '', text: '' })

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadPamflets()
    fetch('/api/tv-screens')
      .then(res => res.json())
      .then(data => setScreens(Object.fromEntries(data.map(r => [r.slug, r]))))
      .catch(() => setScreens({}))
  }, [])

  const loadPamflets = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tv-pamflets')
      if (!res.ok) throw new Error('Gagal memuat data')
      const data = await res.json()
      setPamflets(data)
    } catch {
      showMessage('error', 'Gagal memuat daftar pamflet')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  // ============ IMAGE UPLOAD ============
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      showMessage('error', 'Format file harus JPG, PNG, atau WebP')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'Ukuran file maksimal 5MB')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreviewUrl(reader.result)
    reader.readAsDataURL(file)

    if (!imgTitle) {
      setImgTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return showMessage('error', 'Pilih file gambar terlebih dahulu')
    if (!imgTitle.trim()) return showMessage('error', 'Masukkan judul pamflet')

    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', selectedFile)
      form.append('title', imgTitle.trim())
      form.append('duration', String(imgDuration))
      form.append('target_layar', JSON.stringify(target))

      const res = await fetch('/api/tv-pamflets', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Upload gagal')

      setPamflets(prev => [...prev, data])
      setSelectedFile(null)
      setPreviewUrl(null)
      setImgTitle('')
      setImgDuration(15)
      if (fileInputRef.current) fileInputRef.current.value = ''
      showMessage('success', `Pamflet "${data.title}" berhasil diupload! TV Display akan update otomatis.`)
    } catch (err) {
      showMessage('error', err.message || 'Gagal mengupload pamflet')
    } finally {
      setUploading(false)
    }
  }

  // ============ YOUTUBE LINK ============
  const handleSaveYoutube = async () => {
    if (!ytTitle.trim()) return showMessage('error', 'Masukkan judul video')
    if (!ytUrl.trim()) return showMessage('error', 'Masukkan URL YouTube')

    setYtSaving(true)
    try {
      const res = await fetch('/api/tv-pamflets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ytTitle.trim(),
          url: ytUrl.trim(),
          duration: ytDuration,
          target_layar: target,
        }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')

      setPamflets(prev => [...prev, data])
      setYtTitle('')
      setYtUrl('')
      setYtDuration(15)
      showMessage('success', `Video "${data.title}" berhasil ditambahkan!`)
    } catch (err) {
      showMessage('error', err.message || 'Gagal menyimpan video')
    } finally {
      setYtSaving(false)
    }
  }

  // ============ DELETE ============
  const handleDelete = (pamflet) => {
    setDeleteTarget(pamflet)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const pamflet = deleteTarget

    setDeleting(true)
    try {
      const res = await fetch(`/api/tv-pamflets/${pamflet.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menghapus')
      }
      setPamflets(prev => prev.filter(p => p.id !== pamflet.id))
      showMessage('success', `"${pamflet.title}" berhasil dihapus`)
    } catch (err) {
      showMessage('error', err.message)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  // ============ EDIT DURATION ============
  const handleEditDuration = async (pamflet, newDuration) => {
    try {
      const res = await fetch(`/api/tv-pamflets/${pamflet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: newDuration }),
      })
      if (!res.ok) throw new Error('Gagal mengupdate')
      setPamflets(prev => prev.map(p => p.id === pamflet.id ? { ...p, duration: newDuration } : p))
    } catch {
      showMessage('error', 'Gagal mengupdate durasi')
    }
  }

  // ============ EDIT TARGET LAYAR ============
  const handleEditTarget = async (pamflet, newTarget) => {
    try {
      const res = await fetch(`/api/tv-pamflets/${pamflet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_layar: newTarget }),
      })
      if (!res.ok) throw new Error('Gagal mengupdate')
      setPamflets(prev => prev.map(p => p.id === pamflet.id ? { ...p, target_layar: newTarget } : p))
    } catch {
      showMessage('error', 'Gagal mengupdate layar tujuan')
    }
  }

  const targetPicker = (
    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text)' }}>
        Tampilkan di
      </label>
      <LayarPicker value={target} onChange={setTarget} />
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">TV Pamflet</h1>
          <p className="page-subtitle">Kelola gambar, video YouTube, dan pengaturan tiap TV Display (Gedung USC, Kolam Renang, SSFC).</p>
        </div>
      </div>

      {message.text && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          background: message.type === 'error' ? 'var(--danger-50)' : 'var(--success-50)',
          border: `1px solid ${message.type === 'error' ? 'var(--danger-100)' : 'var(--success-100)'}`,
          color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1rem' }}>{message.type === 'error' ? '✕' : '✓'}</span>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Form Input */}
        <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <button
              onClick={() => setActiveTab('image')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'image' ? 'var(--primary)' : 'var(--surface-3)',
                color: activeTab === 'image' ? '#fff' : 'var(--text-2)',
              }}
            >
              🖼️ Upload Gambar
            </button>
            <button
              onClick={() => setActiveTab('youtube')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'youtube' ? 'var(--danger)' : 'var(--surface-3)',
                color: activeTab === 'youtube' ? '#fff' : 'var(--text-2)',
              }}
            >
              ▶️ Link YouTube
            </button>
          </div>

          {activeTab === 'image' ? (
            <>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>Upload Pamflet Baru</h2>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text)' }}>
                  File Gambar *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.375rem' }}>
                  JPG, PNG, WebP — maks. 5MB — ideal: 1920×1080px
                </p>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text)' }}>
                  Judul *
                </label>
                <input
                  type="text"
                  value={imgTitle}
                  onChange={(e) => setImgTitle(e.target.value)}
                  placeholder="Judul pamflet"
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text)' }}>
                  Durasi tampil: <strong>{imgDuration} detik</strong>
                </label>
                <input
                  type="range"
                  value={imgDuration}
                  onChange={(e) => setImgDuration(Number(e.target.value))}
                  min="5"
                  max="60"
                  step="5"
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                  <span>5 dtk</span><span>60 dtk</span>
                </div>
              </div>

              {targetPicker}

              {previewUrl && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
                    <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !imgTitle.trim()}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: uploading || !selectedFile || !imgTitle.trim() ? 'var(--text-3)' : 'var(--primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: uploading || !selectedFile || !imgTitle.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {uploading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <span style={{
                      width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      display: 'inline-block', animation: 'spin 0.7s linear infinite',
                    }} />
                    Mengupload...
                  </span>
                ) : 'Upload Pamflet'}
              </button>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>Tambah Video YouTube</h2>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text)' }}>
                  URL YouTube *
                </label>
                <input
                  type="url"
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=... atau https://www.youtube.com/watch?v=..."
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.375rem' }}>
                  Support: Playlist URL atau Single Video URL
                </p>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text)' }}>
                  Judul *
                </label>
                <input
                  type="text"
                  value={ytTitle}
                  onChange={(e) => setYtTitle(e.target.value)}
                  placeholder="Judul video"
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text)' }}>
                  Durasi tampil: <strong>{ytDuration} detik</strong>
                </label>
                <input
                  type="range"
                  value={ytDuration}
                  onChange={(e) => setYtDuration(Number(e.target.value))}
                  min="5"
                  max="60"
                  step="5"
                  style={{ width: '100%', accentColor: 'var(--danger)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                  <span>5 dtk</span><span>60 dtk</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.375rem' }}>
                  Tips: Gunakan durasi lebih lama (30-60 dtk) untuk video
                </p>
              </div>

              {targetPicker}

              <button
                onClick={handleSaveYoutube}
                disabled={ytSaving || !ytUrl.trim() || !ytTitle.trim()}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: ytSaving || !ytUrl.trim() || !ytTitle.trim() ? 'var(--text-3)' : 'var(--danger)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: ytSaving || !ytUrl.trim() || !ytTitle.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {ytSaving ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <span style={{
                      width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      display: 'inline-block', animation: 'spin 0.7s linear infinite',
                    }} />
                    Menyimpan...
                  </span>
                ) : 'Simpan Video YouTube'}
              </button>
            </>
          )}
        </div>

        {/* Daftar Pamflet */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                Daftar Pamflet <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-2)' }}>({pamflets.length})</span>
              </h2>
              <button
                onClick={loadPamflets}
                disabled={loading}
                style={{ padding: '0.375rem 0.75rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8125rem', color: 'var(--text)', cursor: 'pointer' }}
              >
                {loading ? 'Memuat...' : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem 0' }}>Memuat...</p>
            ) : pamflets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--surface-2)', borderRadius: '8px', border: '2px dashed var(--border)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" style={{ width: 40, height: 40, margin: '0 auto 0.75rem' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Belum ada pamflet. Upload gambar atau tambah video YouTube.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pamflets.map((pamflet, index) => (
                  <div
                    key={pamflet.id}
                    style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)', alignItems: 'center' }}
                  >
                    {/* Thumbnail / Icon */}
                    <div style={{ width: '100px', height: '56px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: '#000', display: 'grid', placeItems: 'center' }}>
                      {pamflet.type === 'youtube' ? (
                        <div style={{ color: '#fff', fontSize: '1.5rem' }}>▶️</div>
                      ) : (
                        <img
                          src={pamflet.src_url}
                          alt={pamflet.title}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={(e) => { e.target.style.opacity = '0' }}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pamflet.title}
                        </p>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: pamflet.type === 'youtube' ? 'var(--danger-100)' : 'var(--primary-100)',
                          color: pamflet.type === 'youtube' ? 'var(--danger)' : 'var(--primary-600)',
                          flexShrink: 0,
                        }}>
                          {pamflet.type === 'youtube' ? 'YouTube' : 'Gambar'}
                        </span>
                      </div>
                      <div style={{ marginBottom: '0.375rem' }}>
                        <LayarPicker compact value={pamflet.target_layar || []} onChange={(v) => handleEditTarget(pamflet, v)} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Durasi:</label>
                        <select
                          value={pamflet.duration ?? 15}
                          onChange={(e) => handleEditDuration(pamflet, Number(e.target.value))}
                          style={{ fontSize: '0.75rem', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 4px', color: 'var(--text)' }}
                        >
                          {[5, 10, 15, 20, 30, 45, 60].map(v => (
                            <option key={v} value={v}>{v} dtk</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Order badge + delete */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-3)', background: 'var(--border)', padding: '2px 6px', borderRadius: '4px' }}>
                        #{index + 1}
                      </span>
                      <button
                        onClick={() => handleDelete(pamflet)}
                        title="Hapus"
                        aria-label="Hapus pamflet"
                        style={{ width: 44, height: 44, background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Card */}
          <div style={{ background: 'var(--success-50)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--success-100)' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)', marginBottom: '0.5rem' }}>
              Otomatis — tidak perlu langkah manual
            </p>
            <ul style={{ fontSize: '0.8125rem', color: 'var(--success)', paddingLeft: '1.25rem', lineHeight: '1.8', margin: 0 }}>
              <li>Upload gambar → langsung tersimpan ke cloud storage</li>
              <li>Tambah video YouTube → cukup paste URL, sistem auto-embed</li>
              <li>TV Display refresh otomatis setiap 5 menit</li>
              <li>Hapus pamflet → gambar/video ikut terhapus dari daftar</li>
              <li>Ubah durasi & layar tujuan langsung dari daftar di atas</li>
              <li>Alamat TV: /agenda/tv (Gedung USC){TV_LAYAR_UNIT.map(s => `, /agenda/tv/${s} (${TV_LAYAR[s].nama})`).join('')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Pengaturan layar unit */}
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '2.5rem 0 1rem' }}>Pengaturan Layar</h2>
      {screens === null ? (
        <p style={{ color: 'var(--text-3)' }}>Memuat...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {TV_LAYAR_UNIT.map(slug => (
            <ScreenSettings key={slug} slug={slug} initial={screens[slug]}
              onSaved={(t) => showMessage('success', t)} onError={(t) => showMessage('error', t)} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Pamflet"
        message={deleteTarget ? <>Pamflet <strong>{deleteTarget.title}</strong> akan dihapus permanen. Lanjutkan?</> : ''}
        confirmLabel="Ya, Hapus"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        busy={deleting}
      />
    </div>
  )
}
