'use client'

import { useState, useEffect, useRef } from 'react'

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

function Req() {
  return <span style={{ color: 'var(--danger)' }}>*</span>
}

function PublicHeader({ brandName, logoUrl }) {
  return (
    <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 20px', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={logoUrl} alt={brandName} style={{ height: 32, width: 'auto', maxWidth: 120, objectFit: 'contain' }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.2 }}>{brandName}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>Buku Tamu Digital</div>
        </div>
      </div>
    </header>
  )
}

// Signature pad sederhana — opsional, tidak wajib diisi
function SignaturePad({ onChange }) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const hasDrawnRef = useRef(false)

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
    ctx.strokeStyle = '#0f172a'
    ctx.lineTo(x, y)
    ctx.stroke()
    hasDrawnRef.current = true
  }

  const end = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    if (hasDrawnRef.current) onChange(canvasRef.current.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    hasDrawnRef.current = false
    onChange(null)
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={560}
        height={150}
        style={{ width: '100%', height: 150, borderRadius: 10, border: '1px dashed var(--border-strong)', background: 'var(--surface-2)', touchAction: 'none', cursor: 'crosshair' }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <button type="button" onClick={clear} className="btn btn-ghost btn-sm" style={{ marginTop: 6 }}>
        Hapus Tanda Tangan
      </button>
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const resetForm = () => {
    setForm({ nama_lengkap: '', instansi: '', telepon: '', email: '', keperluan: '', keperluan_detail: '', unit_dituju: '', nama_ditemui: '', jumlah_rombongan: '1' })
    setTandaTangan(null)
    setSubmitted(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.nama_lengkap.trim()) return setError('Nama lengkap wajib diisi')
    if (!form.instansi.trim()) return setError('Instansi/asal wajib diisi')
    if (!form.telepon.trim() && !form.email.trim()) return setError('No. HP atau email wajib diisi (minimal salah satu)')
    if (!form.keperluan) return setError('Keperluan kunjungan wajib dipilih')
    if (!form.unit_dituju) return setError('Unit/fasilitas yang dituju wajib dipilih')

    setLoading(true)
    try {
      const res = await fetch('/api/tamu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tanda_tangan: tandaTangan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim')
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

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
                <label style={labelStyle}>Nama Lengkap <Req /></label>
                <input style={inputStyle} value={form.nama_lengkap} onChange={(e) => set('nama_lengkap', e.target.value)} placeholder="Nama Anda" />
              </div>

              <div>
                <label style={labelStyle}>Instansi / Asal <Req /></label>
                <input style={inputStyle} value={form.instansi} onChange={(e) => set('instansi', e.target.value)} placeholder="Nama instansi, atau 'Perorangan'" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <div>
                  <label style={labelStyle}>No. HP {!form.email.trim() && <Req />}</label>
                  <input type="tel" style={inputStyle} value={form.telepon} onChange={(e) => set('telepon', e.target.value)} placeholder="08xxxxxxxxxx" />
                </div>
                <div>
                  <label style={labelStyle}>Email {!form.telepon.trim() && <Req />}</label>
                  <input type="email" style={inputStyle} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@contoh.com" />
                </div>
              </div>
              <p style={{ margin: '-10px 0 0', fontSize: '0.75rem', color: 'var(--text-3)' }}>Isi minimal salah satu (No. HP atau Email).</p>

              <div>
                <label style={labelStyle}>Keperluan Kunjungan <Req /></label>
                <select style={inputStyle} value={form.keperluan} onChange={(e) => set('keperluan', e.target.value)}>
                  <option value="">-- Pilih keperluan --</option>
                  {KEPERLUAN_LIST.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </div>

              {form.keperluan === 'lainnya' && (
                <div>
                  <label style={labelStyle}>Keterangan Keperluan</label>
                  <input style={inputStyle} value={form.keperluan_detail} onChange={(e) => set('keperluan_detail', e.target.value)} placeholder="Jelaskan keperluan kunjungan Anda" />
                </div>
              )}

              <div>
                <label style={labelStyle}>Unit/Fasilitas yang Dituju <Req /></label>
                <select style={inputStyle} value={form.unit_dituju} onChange={(e) => set('unit_dituju', e.target.value)}>
                  <option value="">-- Pilih unit/fasilitas --</option>
                  {UNIT_DITUJU_LIST.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Nama yang Ditemui <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opsional)</span></label>
                  <input style={inputStyle} value={form.nama_ditemui} onChange={(e) => set('nama_ditemui', e.target.value)} placeholder="Nama pihak yang dituju" />
                </div>
                <div>
                  <label style={labelStyle}>Jumlah Rombongan <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opsional)</span></label>
                  <input type="number" min="1" style={inputStyle} value={form.jumlah_rombongan} onChange={(e) => set('jumlah_rombongan', e.target.value)} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Tanda Tangan <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opsional)</span></label>
                <SignaturePad onChange={setTandaTangan} />
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--danger-50)', border: '1px solid var(--danger-100)', borderRadius: 10, color: 'var(--danger)', fontSize: '0.875rem' }}>
                  {error}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Mengirim...' : 'Kirim'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
