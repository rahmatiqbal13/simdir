'use client'

import { useState, useEffect, useRef } from 'react'
import ThemeToggle from '@/app/components/ThemeToggle'
import ConfirmModal from '@/app/components/ConfirmModal'

const KEPERLUAN_LIST = [
  { value: 'kunjungan_kerja', label: 'Kunjungan Kerja' },
  { value: 'studi_banding', label: 'Studi Banding' },
  { value: 'kerja_sama', label: 'Kerja Sama' },
  { value: 'wawancara_media', label: 'Wawancara / Media' },
  { value: 'lainnya', label: 'Lainnya' },
]

const UNIT_DITUJU_LIST = [
  'USC (Umum)', 'Achilles Gym Hub', 'Kolam Renang Unesa', 'Driving Golf Unesa',
  'SSFC', 'PUIPT DIC', 'PUIPT SERC', 'PUI Disabilitas',
  'ULABK', 'PUI Seni', 'PUI Olahraga', 'Lainnya',
]

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--border)', background: 'var(--surface)',
  fontSize: '0.9375rem', color: 'var(--text)',
}
const labelStyle = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }
const errorTextStyle = { margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--danger)' }

function Req() {
  return <span style={{ color: 'var(--danger)' }}>*</span>
}

function PublicHeader({ brandName, logoUrl }) {
  return (
    <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 20px', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <img src={logoUrl} alt={brandName} width={120} height={32} style={{ height: 32, width: 'auto', maxWidth: 120, objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brandName}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>Buku Tamu Digital</div>
          </div>
        </div>
        <ThemeToggle style={{ width: 36, height: 36, flexShrink: 0 }} />
      </div>
    </header>
  )
}

// Signature pad sederhana — opsional, tidak wajib diisi
function SignaturePad({ onChange }) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const hasDrawnRef = useRef(false)
  const strokeColorRef = useRef('#0f172a')
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  // Buffer internal canvas HARUS sama dengan ukuran render sesungguhnya
  // (dikali devicePixelRatio), kalau tidak posisi coretan meleset dari
  // posisi jari/pointer — lihat rect.width vs atribut width={560} lama.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const setupSize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      // Resize (mis. rotasi tablet) membersihkan isi canvas — sinkronkan
      // state form supaya tidak mengirim tanda tangan yang sudah hilang.
      if (hasDrawnRef.current) {
        hasDrawnRef.current = false
        onChange(null)
      }
    }

    setupSize()
    const ro = new ResizeObserver(setupSize)
    ro.observe(canvas)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const point = e.touches ? e.touches[0] : e
    return { x: point.clientX - rect.left, y: point.clientY - rect.top }
  }

  const start = (e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getPos(e, canvas)
    // Baca warna teks aktif (adaptif tema terang/gelap) alih-alih hardcode hex.
    strokeColorRef.current = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#0f172a'
    drawingRef.current = true
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (e) => {
    if (!drawingRef.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getPos(e, canvas)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = strokeColorRef.current
    ctx.lineTo(x, y)
    ctx.stroke()
    hasDrawnRef.current = true
  }

  const end = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    if (hasDrawnRef.current) onChange(canvasRef.current.toDataURL('image/png'))
  }

  const requestClear = () => {
    if (hasDrawnRef.current) {
      setConfirmClearOpen(true)
      return
    }
    doClear()
  }

  const doClear = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    hasDrawnRef.current = false
    onChange(null)
    setConfirmClearOpen(false)
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        aria-label="Area tanda tangan (opsional) — gambar dengan mouse atau jari"
        style={{ width: '100%', height: 150, borderRadius: 10, border: '1px dashed var(--border-strong)', background: 'var(--surface-2)', touchAction: 'none', cursor: 'crosshair' }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <button type="button" onClick={requestClear} className="btn btn-ghost btn-sm" style={{ marginTop: 6, minHeight: 44 }}>
        Hapus Tanda Tangan
      </button>
      <ConfirmModal
        open={confirmClearOpen}
        title="Hapus Tanda Tangan"
        message="Hapus tanda tangan ini?"
        confirmLabel="Ya, Hapus"
        onConfirm={doClear}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  )
}

// Foto tamu — bisa dari kamera langsung (kiosk/tablet) atau upload file.
// Opsional, sama seperti tanda tangan.
function PhotoCapture({ onChange }) {
  const [previewUrl, setPreviewUrl] = useState(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  useEffect(() => () => stopCamera(), [])

  // Blob URL dari createObjectURL() TIDAK otomatis dilepas saat komponen
  // unmount (beda dari state React biasa) — tanpa revoke manual ini,
  // setiap foto yang diambil membocorkan memori selama tab kiosk terbuka.
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      setCameraOn(true)
      // videoRef belum ter-attach sampai render berikutnya (cameraOn baru true)
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      }, 0)
    } catch {
      setCameraError('Kamera tidak tersedia atau akses ditolak. Silakan upload foto dari galeri.')
    }
  }

  const capture = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      setPreviewUrl(URL.createObjectURL(blob))
      onChange(blob)
    }, 'image/jpeg', 0.92)
    stopCamera()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
    onChange(file)
  }

  const requestReset = () => setConfirmResetOpen(true)

  const doReset = () => {
    setPreviewUrl(null)
    onChange(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setConfirmResetOpen(false)
  }

  if (previewUrl) {
    return (
      <div>
        <img src={previewUrl} alt="Preview foto tamu" width={160} height={160} style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
        <div>
          <button type="button" onClick={requestReset} className="btn btn-ghost btn-sm" style={{ marginTop: 6, minHeight: 44 }}>
            Ambil/Upload Ulang
          </button>
        </div>
        <ConfirmModal
          open={confirmResetOpen}
          title="Ambil Ulang Foto"
          message="Hapus foto ini dan ambil ulang?"
          confirmLabel="Ya, Ambil Ulang"
          onConfirm={doReset}
          onCancel={() => setConfirmResetOpen(false)}
        />
      </div>
    )
  }

  if (cameraOn) {
    return (
      <div>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxWidth: 320, borderRadius: 10, border: '1px solid var(--border)', background: '#000' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={capture} className="btn btn-primary btn-sm" style={{ minHeight: 44 }}>Jepret</button>
          <button type="button" onClick={stopCamera} className="btn btn-ghost btn-sm" style={{ minHeight: 44 }}>Batal</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={startCamera} className="btn btn-outline btn-sm" style={{ minHeight: 44 }}>Ambil Foto</button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-outline btn-sm" style={{ minHeight: 44 }}>Upload dari Galeri</button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
      {cameraError && (
        <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--danger)' }}>{cameraError}</p>
      )}
    </div>
  )
}

export default function DaftarTamuPage() {
  const [brandName, setBrandName] = useState('Direktorat Unesa Science Center')
  const [logoUrl, setLogoUrl] = useState('/images/logo USC.png')
  useEffect(() => {
    fetch('/api/app-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.brand_name) setBrandName(data.brand_name)
        if (data.logo_url) setLogoUrl(data.logo_url)
      })
      .catch(() => {})
  }, [])

  const [form, setForm] = useState({
    nama_lengkap: '', instansi: '', telepon: '', email: '', keperluan: '', keperluan_detail: '',
    unit_dituju: '', nama_ditemui: '', jumlah_rombongan: '1',
  })
  const [tandaTangan, setTandaTangan] = useState(null)
  const [foto, setFoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const namaLengkapRef = useRef(null)
  const instansiRef = useRef(null)
  const teleponRef = useRef(null)
  const keperluanRef = useRef(null)
  const unitDitujuRef = useRef(null)
  const fieldRefs = { nama_lengkap: namaLengkapRef, instansi: instansiRef, telepon_email: teleponRef, keperluan: keperluanRef, unit_dituju: unitDitujuRef }

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    setFieldErrors((fe) => {
      if (!fe[field] && !fe.telepon_email) return fe
      const next = { ...fe }
      delete next[field]
      if (field === 'telepon' || field === 'email') delete next.telepon_email
      return next
    })
  }

  const resetForm = () => {
    setForm({ nama_lengkap: '', instansi: '', telepon: '', email: '', keperluan: '', keperluan_detail: '', unit_dituju: '', nama_ditemui: '', jumlah_rombongan: '1' })
    setTandaTangan(null)
    setFoto(null)
    setFieldErrors({})
    setSubmitted(false)
  }

  // Belum submit tapi sudah ada isian berarti — peringatkan sebelum tamu tidak sengaja keluar halaman
  useEffect(() => {
    const hasData = form.nama_lengkap.trim() || form.instansi.trim() || form.telepon.trim() || form.email.trim() || tandaTangan || foto
    if (!hasData || submitted) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [form.nama_lengkap, form.instansi, form.telepon, form.email, tandaTangan, foto, submitted])

  const validate = () => {
    const errs = {}
    if (!form.nama_lengkap.trim()) errs.nama_lengkap = 'Nama lengkap wajib diisi'
    if (!form.instansi.trim()) errs.instansi = 'Instansi/asal wajib diisi'
    if (!form.telepon.trim() && !form.email.trim()) errs.telepon_email = 'Isi minimal salah satu (No. HP atau Email).'
    if (!form.keperluan) errs.keperluan = 'Keperluan kunjungan wajib dipilih'
    if (!form.unit_dituju) errs.unit_dituju = 'Unit/fasilitas yang dituju wajib dipilih'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const errs = validate()
    setFieldErrors(errs)
    const firstInvalid = ['nama_lengkap', 'instansi', 'telepon_email', 'keperluan', 'unit_dituju'].find((k) => errs[k])
    if (firstInvalid) {
      fieldRefs[firstInvalid]?.current?.focus()
      return
    }

    setLoading(true)
    try {
      const body = new FormData()
      Object.entries(form).forEach(([key, value]) => body.append(key, value))
      if (tandaTangan) body.append('tanda_tangan', tandaTangan)
      if (foto) body.append('foto', foto, 'foto.jpg')

      const res = await fetch('/api/tamu', {
        method: 'POST',
        body,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  // Kiosk/tablet resepsionis biasanya ditinggal — kembalikan ke form kosong
  // otomatis kalau tidak ada interaksi setelah submit sukses.
  const AUTO_RESET_SECONDS = 15
  const [countdown, setCountdown] = useState(AUTO_RESET_SECONDS)
  useEffect(() => {
    if (!submitted) return
    setCountdown(AUTO_RESET_SECONDS)
  }, [submitted])

  useEffect(() => {
    if (!submitted) return
    if (countdown <= 0) {
      resetForm()
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [submitted, countdown])

  const pageStyle = {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    background: 'var(--surface-2)',
  }

  if (submitted) {
    return (
      <div style={pageStyle}>
        <PublicHeader brandName={brandName} logoUrl={logoUrl} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
          <div style={{ maxWidth: 460, width: '100%', background: 'var(--surface)', borderRadius: 20, padding: '40px 28px', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ width: 64, height: 64, background: 'var(--success-50)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Terima kasih!</h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9375rem', marginBottom: 24 }}>
              Kunjungan Anda telah tercatat. Selamat datang di {brandName}.
            </p>
            <button className="btn btn-primary" onClick={resetForm}>Isi Buku Tamu Lagi</button>
            <p style={{ margin: '16px 0 0', fontSize: '0.75rem', color: 'var(--text-3)' }} aria-live="polite">
              Kembali ke form kosong otomatis dalam {countdown} detik…
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <PublicHeader brandName={brandName} logoUrl={logoUrl} />
      <div style={{ flex: 1, padding: '32px 16px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Buku Tamu Digital</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9375rem', marginBottom: 24 }}>
            Silakan isi data kunjungan Anda.
          </p>

          <form onSubmit={handleSubmit} className="card" noValidate>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label htmlFor="nama_lengkap" style={labelStyle}>Nama Lengkap <Req /></label>
                <input
                  ref={namaLengkapRef}
                  id="nama_lengkap"
                  name="name"
                  autoComplete="name"
                  style={inputStyle}
                  value={form.nama_lengkap}
                  onChange={(e) => set('nama_lengkap', e.target.value)}
                  placeholder="Nama Anda"
                  aria-invalid={!!fieldErrors.nama_lengkap}
                  aria-describedby={fieldErrors.nama_lengkap ? 'err-nama_lengkap' : undefined}
                />
                {fieldErrors.nama_lengkap && <p id="err-nama_lengkap" style={errorTextStyle}>{fieldErrors.nama_lengkap}</p>}
              </div>

              <div>
                <label htmlFor="instansi" style={labelStyle}>Instansi / Asal <Req /></label>
                <input
                  ref={instansiRef}
                  id="instansi"
                  name="organization"
                  autoComplete="organization"
                  style={inputStyle}
                  value={form.instansi}
                  onChange={(e) => set('instansi', e.target.value)}
                  placeholder="Nama instansi, atau 'Perorangan'"
                  aria-invalid={!!fieldErrors.instansi}
                  aria-describedby={fieldErrors.instansi ? 'err-instansi' : undefined}
                />
                {fieldErrors.instansi && <p id="err-instansi" style={errorTextStyle}>{fieldErrors.instansi}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <div>
                  <label htmlFor="telepon" style={labelStyle}>No. HP {!form.email.trim() && <Req />}</label>
                  <input
                    ref={teleponRef}
                    id="telepon"
                    name="tel"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    style={inputStyle}
                    value={form.telepon}
                    onChange={(e) => set('telepon', e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    aria-invalid={!!fieldErrors.telepon_email}
                    aria-describedby="err-telepon_email"
                  />
                </div>
                <div>
                  <label htmlFor="email" style={labelStyle}>Email {!form.telepon.trim() && <Req />}</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    spellCheck={false}
                    style={inputStyle}
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="email@contoh.com"
                    aria-invalid={!!fieldErrors.telepon_email}
                    aria-describedby="err-telepon_email"
                  />
                </div>
              </div>
              <p id="err-telepon_email" style={{ margin: '-10px 0 0', fontSize: '0.75rem', color: fieldErrors.telepon_email ? 'var(--danger)' : 'var(--text-3)' }}>
                {fieldErrors.telepon_email || 'Isi minimal salah satu (No. HP atau Email).'}
              </p>

              <div>
                <label htmlFor="keperluan" style={labelStyle}>Keperluan Kunjungan <Req /></label>
                <select
                  ref={keperluanRef}
                  id="keperluan"
                  name="keperluan"
                  style={inputStyle}
                  value={form.keperluan}
                  onChange={(e) => set('keperluan', e.target.value)}
                  aria-invalid={!!fieldErrors.keperluan}
                  aria-describedby={fieldErrors.keperluan ? 'err-keperluan' : undefined}
                >
                  <option value="">Pilih keperluan…</option>
                  {KEPERLUAN_LIST.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
                {fieldErrors.keperluan && <p id="err-keperluan" style={errorTextStyle}>{fieldErrors.keperluan}</p>}
              </div>

              {form.keperluan === 'lainnya' && (
                <div>
                  <label htmlFor="keperluan_detail" style={labelStyle}>Keterangan Keperluan</label>
                  <input id="keperluan_detail" name="keperluan_detail" autoComplete="off" style={inputStyle} value={form.keperluan_detail} onChange={(e) => set('keperluan_detail', e.target.value)} placeholder="Jelaskan keperluan kunjungan Anda" />
                </div>
              )}

              <div>
                <label htmlFor="unit_dituju" style={labelStyle}>Unit/Fasilitas yang Dituju <Req /></label>
                <select
                  ref={unitDitujuRef}
                  id="unit_dituju"
                  name="unit_dituju"
                  style={inputStyle}
                  value={form.unit_dituju}
                  onChange={(e) => set('unit_dituju', e.target.value)}
                  aria-invalid={!!fieldErrors.unit_dituju}
                  aria-describedby={fieldErrors.unit_dituju ? 'err-unit_dituju' : undefined}
                >
                  <option value="">Pilih unit/fasilitas…</option>
                  {UNIT_DITUJU_LIST.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                {fieldErrors.unit_dituju && <p id="err-unit_dituju" style={errorTextStyle}>{fieldErrors.unit_dituju}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <div>
                  <label htmlFor="nama_ditemui" style={labelStyle}>Nama yang Ditemui <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opsional)</span></label>
                  <input id="nama_ditemui" name="nama_ditemui" autoComplete="off" style={inputStyle} value={form.nama_ditemui} onChange={(e) => set('nama_ditemui', e.target.value)} placeholder="Nama pihak yang dituju" />
                </div>
                <div>
                  <label htmlFor="jumlah_rombongan" style={labelStyle}>Jumlah Rombongan <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opsional)</span></label>
                  <input id="jumlah_rombongan" name="jumlah_rombongan" type="number" inputMode="numeric" autoComplete="off" min="1" style={inputStyle} value={form.jumlah_rombongan} onChange={(e) => set('jumlah_rombongan', e.target.value)} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Tanda Tangan <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opsional)</span></label>
                <SignaturePad onChange={setTandaTangan} />
              </div>

              <div>
                <label style={labelStyle}>Foto <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opsional)</span></label>
                <PhotoCapture onChange={setFoto} />
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--danger-50)', border: '1px solid var(--danger-100)', borderRadius: 10, color: 'var(--danger)', fontSize: '0.875rem' }}>
                  {error}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Menyimpan…' : 'Simpan Data Kunjungan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
