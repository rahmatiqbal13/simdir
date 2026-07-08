'use client'

import { useState, useEffect, useRef } from 'react'

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
  
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadPamflets()
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
  const handleDelete = async (pamflet) => {
    if (!confirm(`Hapus "${pamflet.title}"?`)) return

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

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">TV Pamflet</h1>
          <p className="page-subtitle">Kelola gambar dan video YouTube yang ditampilkan di TV Display.</p>
        </div>
      </div>

      {message.text && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          background: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          color: message.type === 'error' ? '#dc2626' : '#16a34a',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1rem' }}>{message.type === 'error' ? '✕' : '✓'}</span>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Form Input */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
            <button
              onClick={() => setActiveTab('image')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'image' ? '#3b82f6' : '#f3f4f6',
                color: activeTab === 'image' ? '#fff' : '#6b7280',
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
                background: activeTab === 'youtube' ? '#ef4444' : '#f3f4f6',
                color: activeTab === 'youtube' ? '#fff' : '#6b7280',
              }}
            >
              ▶️ Link YouTube
            </button>
          </div>

          {activeTab === 'image' ? (
            <>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>Upload Pamflet Baru</h2>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#374151' }}>
                  File Gambar *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.375rem' }}>
                  JPG, PNG, WebP — maks. 5MB — ideal: 1920×1080px
                </p>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#374151' }}>
                  Judul *
                </label>
                <input
                  type="text"
                  value={imgTitle}
                  onChange={(e) => setImgTitle(e.target.value)}
                  placeholder="Judul pamflet"
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#374151' }}>
                  Durasi tampil: <strong>{imgDuration} detik</strong>
                </label>
                <input
                  type="range"
                  value={imgDuration}
                  onChange={(e) => setImgDuration(Number(e.target.value))}
                  min="5"
                  max="60"
                  step="5"
                  style={{ width: '100%', accentColor: '#3b82f6' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af' }}>
                  <span>5 dtk</span><span>60 dtk</span>
                </div>
              </div>

              {previewUrl && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
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
                  background: uploading || !selectedFile || !imgTitle.trim() ? '#9ca3af' : '#3b82f6',
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
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#374151' }}>
                  URL YouTube *
                </label>
                <input
                  type="url"
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=... atau https://www.youtube.com/watch?v=..."
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.375rem' }}>
                  Support: Playlist URL atau Single Video URL
                </p>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#374151' }}>
                  Judul *
                </label>
                <input
                  type="text"
                  value={ytTitle}
                  onChange={(e) => setYtTitle(e.target.value)}
                  placeholder="Judul video"
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#374151' }}>
                  Durasi tampil: <strong>{ytDuration} detik</strong>
                </label>
                <input
                  type="range"
                  value={ytDuration}
                  onChange={(e) => setYtDuration(Number(e.target.value))}
                  min="5"
                  max="60"
                  step="5"
                  style={{ width: '100%', accentColor: '#ef4444' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af' }}>
                  <span>5 dtk</span><span>60 dtk</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.375rem' }}>
                  Tips: Gunakan durasi lebih lama (30-60 dtk) untuk video
                </p>
              </div>

              <button
                onClick={handleSaveYoutube}
                disabled={ytSaving || !ytUrl.trim() || !ytTitle.trim()}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: ytSaving || !ytUrl.trim() || !ytTitle.trim() ? '#9ca3af' : '#ef4444',
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
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                Daftar Pamflet <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#6b7280' }}>({pamflets.length})</span>
              </h2>
              <button
                onClick={loadPamflets}
                disabled={loading}
                style={{ padding: '0.375rem 0.75rem', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8125rem', color: '#374151', cursor: 'pointer' }}
              >
                {loading ? 'Memuat...' : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem 0' }}>Memuat...</p>
            ) : pamflets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f9fafb', borderRadius: '8px', border: '2px dashed #e5e7eb' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ width: 40, height: 40, margin: '0 auto 0.75rem' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Belum ada pamflet. Upload gambar atau tambah video YouTube.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pamflets.map((pamflet, index) => (
                  <div
                    key={pamflet.id}
                    style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', alignItems: 'center' }}
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
                          background: pamflet.type === 'youtube' ? '#fee2e2' : '#dbeafe',
                          color: pamflet.type === 'youtube' ? '#dc2626' : '#2563eb',
                          flexShrink: 0,
                        }}>
                          {pamflet.type === 'youtube' ? 'YouTube' : 'Gambar'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Durasi:</label>
                        <select
                          value={pamflet.duration}
                          onChange={(e) => handleEditDuration(pamflet, Number(e.target.value))}
                          style={{ fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', padding: '1px 4px', color: '#374151' }}
                        >
                          {[5, 10, 15, 20, 30, 45, 60].map(v => (
                            <option key={v} value={v}>{v} dtk</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Order badge + delete */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', background: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>
                        #{index + 1}
                      </span>
                      <button
                        onClick={() => handleDelete(pamflet)}
                        title="Hapus"
                        style={{ padding: '4px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '4px', display: 'flex' }}
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
          <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '1.25rem', border: '1px solid #bbf7d0' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#15803d', marginBottom: '0.5rem' }}>
              Otomatis — tidak perlu langkah manual
            </p>
            <ul style={{ fontSize: '0.8125rem', color: '#166534', paddingLeft: '1.25rem', lineHeight: '1.8', margin: 0 }}>
              <li>Upload gambar → langsung tersimpan ke cloud storage</li>
              <li>Tambah video YouTube → cukup paste URL, sistem auto-embed</li>
              <li>TV Display refresh otomatis setiap 5 menit</li>
              <li>Hapus pamflet → gambar/video ikut terhapus dari daftar</li>
              <li>Ubah durasi langsung dari daftar di atas</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
