'use client'

import { useState, useEffect, useRef } from 'react'
import ConfirmModal from '@/app/components/ConfirmModal'
import PublicShell, { usePublicBrand, todayEyebrow } from '@/app/components/PublicShell'

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

const errorTextStyle = { margin: '6px 0 0', fontSize: 13, color: 'var(--danger)' }

function Req() {
  return <span className="pub-req">*</span>
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
    <div className="sig-box">
      <span className="sig-hint" aria-hidden="true">Tanda tangan dengan jari</span>
      <span className="sig-line" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        aria-label="Area tanda tangan (opsional) — gambar dengan mouse atau jari"
        style={{ position: 'relative', width: '100%', height: 130, display: 'block', touchAction: 'none', cursor: 'crosshair' }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <button type="button" onClick={requestClear} className="sig-clear">Hapus</button>
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
        <img src={previewUrl} alt="Preview foto tamu" width={160} height={160} style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border)' }} />
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
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', background: '#000' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={capture} className="btn btn-primary" style={{ minHeight: 48 }}>Jepret</button>
          <button type="button" onClick={stopCamera} className="btn btn-secondary" style={{ minHeight: 48 }}>Batal</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button type="button" onClick={startCamera} className="pub-tile-btn">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
          Ambil foto
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="pub-tile-btn">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></svg>
          Dari galeri
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
      {cameraError && (
        <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--danger)' }}>{cameraError}</p>
      )}
    </div>
  )
}

export default function DaftarTamuPage() {
  const { brandName, logoUrl } = usePublicBrand()

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

  const shell = { title: brandName, subtitle: 'Buku Tamu Digital', logoUrl }
  const rombongan = Math.max(1, parseInt(form.jumlah_rombongan, 10) || 1)

  if (submitted) {
    return (
      <PublicShell {...shell}>
        <div className="pub-success">
          <span className="pub-success-icon"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg></span>
          <h1 className="pub-h">Terima kasih!</h1>
          <p className="pub-lede">Kunjungan Anda tercatat. Selamat datang di {brandName}.</p>
          <button type="button" className="pub-ghost" onClick={resetForm} style={{ minHeight: 50, marginTop: 8 }}>Isi untuk tamu berikutnya</button>
          <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-3)' }} aria-live="polite">Form kosong otomatis dalam {countdown} detik</span>
        </div>
      </PublicShell>
    )
  }

  return (
    <PublicShell {...shell}>
      <form onSubmit={handleSubmit} noValidate className="pub-form" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="pub-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="eyebrow" style={{ fontSize: 11.5 }} suppressHydrationWarning>{todayEyebrow()}</span>
            <h1 className="pub-h">Selamat datang.</h1>
            <p className="pub-lede">Isi data kunjungan Anda — kurang dari satu menit.</p>
          </div>

          <div>
            <label htmlFor="nama_lengkap">Nama lengkap <Req /></label>
            <input
              ref={namaLengkapRef}
              id="nama_lengkap"
              name="name"
              autoComplete="name"
              value={form.nama_lengkap}
              onChange={(e) => set('nama_lengkap', e.target.value)}
              placeholder="Nama Anda"
              aria-invalid={!!fieldErrors.nama_lengkap}
              aria-describedby={fieldErrors.nama_lengkap ? 'err-nama_lengkap' : undefined}
            />
            {fieldErrors.nama_lengkap && <p id="err-nama_lengkap" style={errorTextStyle}>{fieldErrors.nama_lengkap}</p>}
          </div>

          <div>
            <label htmlFor="instansi">Instansi / asal <Req /></label>
            <input
              ref={instansiRef}
              id="instansi"
              name="organization"
              autoComplete="organization"
              value={form.instansi}
              onChange={(e) => set('instansi', e.target.value)}
              placeholder="Nama instansi, atau Perorangan"
              aria-invalid={!!fieldErrors.instansi}
              aria-describedby={fieldErrors.instansi ? 'err-instansi' : undefined}
            />
            {fieldErrors.instansi && <p id="err-instansi" style={errorTextStyle}>{fieldErrors.instansi}</p>}
          </div>

          <fieldset className="pub-fieldset">
            <legend>Kontak <Req /> <span className="pub-opt">· isi salah satu</span></legend>
            <input
              ref={teleponRef}
              id="telepon"
              name="tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.telepon}
              onChange={(e) => set('telepon', e.target.value)}
              placeholder="No. HP — 08xxxxxxxxxx"
              aria-label="Nomor HP"
              aria-invalid={!!fieldErrors.telepon_email}
              aria-describedby="err-telepon_email"
            />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="Email — email@contoh.com"
              aria-label="Email"
              aria-invalid={!!fieldErrors.telepon_email}
              aria-describedby="err-telepon_email"
            />
            {fieldErrors.telepon_email && <p id="err-telepon_email" style={{ ...errorTextStyle, margin: 0 }}>{fieldErrors.telepon_email}</p>}
          </fieldset>

          <fieldset className="pub-fieldset" aria-describedby={fieldErrors.keperluan ? 'err-keperluan' : undefined}>
            <legend>Keperluan kunjungan <Req /></legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="radiogroup" aria-label="Keperluan kunjungan">
              {KEPERLUAN_LIST.map((k, i) => (
                <button
                  key={k.value}
                  ref={i === 0 ? keperluanRef : undefined}
                  type="button"
                  role="radio"
                  aria-checked={form.keperluan === k.value}
                  className={`chip ${form.keperluan === k.value ? 'active' : ''}`}
                  onClick={() => set('keperluan', k.value)}
                >
                  {k.label}
                </button>
              ))}
            </div>
            {form.keperluan === 'lainnya' && (
              <input id="keperluan_detail" name="keperluan_detail" autoComplete="off" value={form.keperluan_detail} onChange={(e) => set('keperluan_detail', e.target.value)} placeholder="Jelaskan keperluan Anda" aria-label="Keterangan keperluan" />
            )}
            {fieldErrors.keperluan && <p id="err-keperluan" style={{ ...errorTextStyle, margin: 0 }}>{fieldErrors.keperluan}</p>}
          </fieldset>

          <div>
            <label htmlFor="unit_dituju">Unit / fasilitas yang dituju <Req /></label>
            <select
              ref={unitDitujuRef}
              id="unit_dituju"
              name="unit_dituju"
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

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 140px', gap: 10, alignItems: 'end' }}>
            <div style={{ minWidth: 0 }}>
              <label htmlFor="nama_ditemui">Bertemu dengan</label>
              <input id="nama_ditemui" name="nama_ditemui" autoComplete="off" value={form.nama_ditemui} onChange={(e) => set('nama_ditemui', e.target.value)} placeholder="Opsional" />
            </div>
            <div>
              <label id="lbl-romb">Rombongan</label>
              <div className="stepper" role="group" aria-labelledby="lbl-romb">
                <button type="button" aria-label="Kurangi" onClick={() => set('jumlah_rombongan', String(Math.max(1, rombongan - 1)))} disabled={rombongan <= 1}>−</button>
                <span className="mono" aria-live="polite">{rombongan}</span>
                <button type="button" aria-label="Tambah" onClick={() => set('jumlah_rombongan', String(rombongan + 1))}>+</button>
              </div>
            </div>
          </div>

          <div>
            <label>Tanda tangan <span className="pub-opt">· opsional</span></label>
            <SignaturePad onChange={setTandaTangan} />
          </div>

          <div>
            <label>Foto <span className="pub-opt">· opsional</span></label>
            <PhotoCapture onChange={setFoto} />
          </div>

          {error && (
            <div role="alert" style={{ padding: '12px 14px', background: 'var(--danger-50)', borderRadius: 12, color: 'var(--danger)', fontSize: 14, fontWeight: 600 }}>
              {error}
            </div>
          )}
        </div>
        <div className="pub-dock">
          <button type="submit" className="pub-cta" disabled={loading}>
            {loading ? 'Menyimpan…' : 'Simpan data kunjungan'}
          </button>
        </div>
      </form>
    </PublicShell>
  )
}
