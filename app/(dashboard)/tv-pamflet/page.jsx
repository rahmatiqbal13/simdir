'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

// Konfigurasi direktori pamflet
const PAMFLET_DIR = '/images/promo/'

export default function TVPamfletPage() {
  const [pamflets, setPamflets] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(15)
  const [message, setMessage] = useState({ type: '', text: '' })
  const fileInputRef = useRef(null)

  // Load daftar pamflet yang ada
  useEffect(() => {
    loadPamflets()
  }, [])

  const loadPamflets = async () => {
    setLoading(true)
    try {
      // Cek pamflet yang ada di public/images/promo/
      // Kita akan mencoba fetch beberapa file pamflet yang mungkin ada
      const possibleFiles = [
        'promo-1.jpg', 'promo-2.jpg', 'promo-3.jpg', 'promo-4.jpg', 'promo-5.jpg',
        'promo-1.png', 'promo-2.png', 'promo-3.png', 'promo-4.png', 'promo-5.png',
      ]
      
      const foundPamflets = []
      
      for (const filename of possibleFiles) {
        try {
          const response = await fetch(`${PAMFLET_DIR}${filename}`, { method: 'HEAD' })
          if (response.ok) {
            foundPamflets.push({
              id: filename,
              filename: filename,
              src: `${PAMFLET_DIR}${filename}`,
              title: filename.replace(/\.(jpg|png)$/i, '').replace(/-/g, ' ').toUpperCase(),
              duration: 15,
            })
          }
        } catch (e) {
          // File tidak ditemukan, skip
        }
      }
      
      setPamflets(foundPamflets)
    } catch (error) {
      console.error('Error loading pamflets:', error)
      showMessage('error', 'Gagal memuat daftar pamflet')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validasi tipe file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      showMessage('error', 'Format file harus JPG atau PNG')
      return
    }

    // Validasi ukuran (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'Ukuran file maksimal 5MB')
      return
    }

    setSelectedFile(file)
    
    // Buat preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result)
    }
    reader.readAsDataURL(file)

    // Auto-fill title dari nama file
    if (!title) {
      const fileName = file.name.replace(/\.[^/.]+$/, '')
      setTitle(fileName.replace(/-/g, ' '))
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      showMessage('error', 'Pilih file gambar terlebih dahulu')
      return
    }

    if (!title.trim()) {
      showMessage('error', 'Masukkan judul pamflet')
      return
    }

    setUploading(true)
    
    try {
      // Generate nama file
      const extension = selectedFile.name.split('.').pop()
      const nextNumber = pamflets.length + 1
      const filename = `promo-${nextNumber}.${extension}`
      
      // Upload ke Supabase Storage (jika tersedia) atau simpan info
      // Untuk saat ini, kita akan menggunakan approach penyimpanan info
      
      // Simulasi upload success
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Tambahkan ke daftar
      const newPamflet = {
        id: filename,
        filename: filename,
        src: previewUrl, // Gunakan preview sementara
        title: title,
        duration: duration,
        isNew: true,
      }
      
      setPamflets([...pamflets, newPamflet])
      
      // Reset form
      setSelectedFile(null)
      setPreviewUrl(null)
      setTitle('')
      setDuration(15)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      showMessage('success', `Pamflet "${title}" berhasil ditambahkan!`)
      
      // Catatan: File perlu diupload manual ke public/images/promo/
      showMessage('info', 'Catatan: File perlu diupload manual ke folder public/images/promo/')
      
    } catch (error) {
      console.error('Upload error:', error)
      showMessage('error', 'Gagal mengupload pamflet')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = (pamflet) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pamflet "${pamflet.title}"?`)) {
      return
    }
    
    setPamflets(pamflets.filter(p => p.id !== pamflet.id))
    showMessage('success', `Pamflet "${pamflet.title}" telah dihapus`)
  }

  const handleUpdateConfig = () => {
    // Generate konfigurasi untuk media-config.js
    const config = pamflets.map((p, index) => ({
      type: 'image',
      src: `/images/promo/${p.filename}`,
      title: p.title,
      duration: p.duration * 1000,
    }))
    
    console.log('Konfigurasi untuk media-config.js:', config)
    showMessage('success', 'Konfigurasi berhasil diupdate! Silakan copy konfigurasi dari console.')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          TV Pamflet
        </h1>
        <p style={{ color: '#64748b' }}>
          Kelola gambar pamflet yang ditampilkan di TV Display
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          background: message.type === 'error' ? '#fef2f2' : message.type === 'success' ? '#f0fdf4' : '#eff6ff',
          border: `1px solid ${message.type === 'error' ? '#fecaca' : message.type === 'success' ? '#bbf7d0' : '#bfdbfe'}`,
          color: message.type === 'error' ? '#dc2626' : message.type === 'success' ? '#16a34a' : '#2563eb',
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Form Upload */}
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
            Upload Pamflet Baru
          </h2>

          {/* File Input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
              color: '#374151',
            }}>
              File Gambar
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={handleFileSelect}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            />
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
              Format: JPG, PNG. Maksimal 5MB. Ukuran ideal: 960x540px atau 1920x1080px
            </p>
          </div>

          {/* Title Input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
              color: '#374151',
            }}>
              Judul Pamflet
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masukkan judul pamflet"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            />
          </div>

          {/* Duration Input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
              color: '#374151',
            }}>
              Durasi Tampil (detik)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min="5"
              max="60"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            />
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
              Rekomendasi: 10-20 detik
            </p>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: '0.5rem',
                color: '#374151',
              }}>
                Preview
              </label>
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
                aspectRatio: '16/9',
              }}>
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: uploading || !selectedFile ? '#9ca3af' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: uploading || !selectedFile ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? 'Mengupload...' : 'Tambah Pamflet'}
          </button>
        </div>

        {/* Daftar Pamflet */}
        <div>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            marginBottom: '1.5rem',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                Daftar Pamflet ({pamflets.length})
              </h2>
              <button
                onClick={handleUpdateConfig}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Update Konfigurasi
              </button>
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                Memuat pamflet...
              </p>
            ) : pamflets.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '2px dashed #e5e7eb',
              }}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  style={{
                    width: '48px',
                    height: '48px',
                    color: '#9ca3af',
                    marginBottom: '1rem',
                  }}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <p style={{ color: '#6b7280' }}>
                  Belum ada pamflet. Upload gambar baru di form sebelah kiri.
                </p>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                  Atau upload manual ke folder public/images/promo/
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pamflets.map((pamflet, index) => (
                  <div
                    key={pamflet.id}
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      padding: '1rem',
                      background: pamflet.isNew ? '#f0fdf4' : '#f9fafb',
                      borderRadius: '8px',
                      border: pamflet.isNew ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      width: '120px',
                      height: '68px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: '#000',
                    }}>
                      <img
                        src={pamflet.src}
                        alt={pamflet.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        marginBottom: '0.25rem',
                      }}>
                        {pamflet.title}
                      </h3>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginBottom: '0.25rem',
                      }}>
                        {pamflet.filename}
                      </p>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                      }}>
                        Durasi: {pamflet.duration} detik
                      </p>
                    </div>

                    {/* Actions */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        background: '#e5e7eb',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        textAlign: 'center',
                      }}>
                        #{index + 1}
                      </span>
                      <button
                        onClick={() => handleDelete(pamflet)}
                        style={{
                          padding: '0.25rem',
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Hapus"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{ width: '18px', height: '18px' }}
                        >
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
          <div style={{
            background: '#eff6ff',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #bfdbfe',
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: 600,
              marginBottom: '1rem',
              color: '#1e40af',
            }}>
              📋 Cara Penggunaan
            </h3>
            <ol style={{
              fontSize: '0.875rem',
              color: '#1e40af',
              paddingLeft: '1.25rem',
              lineHeight: '1.8',
            }}>
              <li>Upload gambar pamflet menggunakan form di sebelah kiri</li>
              <li>Masukkan judul dan atur durasi tampilan</li>
              <li>Klik "Update Konfigurasi" untuk generate konfigurasi</li>
              <li>Copy konfigurasi yang muncul di console browser</li>
              <li>Paste ke file <code>app/(public)/agenda/tv/media-config.js</code></li>
              <li>Upload file gambar ke folder <code>public/images/promo/</code></li>
              <li>Refresh halaman TV Display untuk melihat perubahan</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
