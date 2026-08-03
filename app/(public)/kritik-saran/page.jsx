'use client'

import { useState, useEffect } from 'react'
import ThemeToggle from '@/app/components/ThemeToggle'

const FASILITAS_LIST = [
  'Achilles Gym Hub', 'Kolam Renang Unesa', 'Driving Golf Unesa',
  'SSFC', 'PUIPT DIC', 'PUIPT SERC',
  'ULABK', 'USC (Umum)', 'Lainnya',
]

const JENIS_LIST = [
  {
    value: 'kritik', icon: '⚠️', label: 'Kritik',
    desc: 'Sampaikan keluhan atau masalah yang Anda alami',
    color: '#fef2f2', border: '#fecaca', accent: '#dc2626',
  },
  {
    value: 'saran', icon: '💡', label: 'Saran',
    desc: 'Berikan ide atau masukan untuk perbaikan layanan',
    color: '#fffbeb', border: '#fde68a', accent: '#d97706',
  },
  {
    value: 'permohonan_kelas', icon: '📚', label: 'Permohonan Kelas',
    desc: 'Ajukan permintaan kelas atau pelatihan baru',
    color: '#eff6ff', border: '#bfdbfe', accent: '#2563eb',
  },
  {
    value: 'permohonan_kegiatan', icon: '🎯', label: 'Permohonan Kegiatan',
    desc: 'Usulkan event atau kegiatan yang ingin diadakan',
    color: '#f0fdf4', border: '#bbf7d0', accent: '#16a34a',
  },
]

const UNIT_KERJA_LIST = [
  'USC (Umum)', 'Achilles Gym Hub', 'Kolam Renang Unesa', 'Driving Golf Unesa',
  'SSFC', 'PUIPT DIC', 'PUIPT SERC',
  'ULABK', 'Eksternal',
]

const STEPS = ['Jenis', 'Detail', 'Identitas']

export default function KritikSaranPage() {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    jenis: '', fasilitas: '', judul: '', isi: '',
    nama_kelas_kegiatan: '', tanggal_diinginkan: '', estimasi_peserta: '', catatan: '',
    nama: '', email: '', telepon: '', unit_kerja: '', jenis_kelamin: '', is_anonim: false,
  })

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError('') }
  const selected = JENIS_LIST.find(j => j.value === form.jenis)
  const isPermohonan = form.jenis === 'permohonan_kelas' || form.jenis === 'permohonan_kegiatan'

  const validate = () => {
    if (step === 0 && !form.jenis) return 'Pilih jenis terlebih dahulu'
    if (step === 1) {
      if (!form.fasilitas) return 'Pilih fasilitas atau layanan terkait'
      if (isPermohonan) {
        if (!form.nama_kelas_kegiatan.trim()) return 'Nama kelas/kegiatan wajib diisi'
        if (!form.tanggal_diinginkan) return 'Tanggal yang diinginkan wajib diisi'
      } else {
        if (!form.judul.trim()) return 'Judul wajib diisi'
        const len = form.isi.trim().length
        if (len < 20) return 'Isi pesan minimal 20 karakter'
        if (len > 2000) return 'Isi pesan maksimal 2000 karakter'
      }
    }
    if (step === 2) {
      if (!form.jenis_kelamin) return 'Jenis kelamin wajib dipilih'
      if (!form.is_anonim && !form.nama.trim()) return 'Nama wajib diisi (atau centang Anonim)'
    }
    return ''
  }

  const next = () => {
    const err = validate()
    if (err) { setError(err); return }
    setStep(s => s + 1)
  }

  const back = () => { setError(''); setStep(s => s - 1) }

  const resetForm = () => ({
    jenis: '', fasilitas: '', judul: '', isi: '',
    nama_kelas_kegiatan: '', tanggal_diinginkan: '', estimasi_peserta: '', catatan: '',
    nama: '', email: '', telepon: '', unit_kerja: '', jenis_kelamin: '', is_anonim: false,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/saran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim')
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={pageStyle}>
        <PublicHeader brandName={brandName} logoUrl={logoUrl} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
          <div style={{
            maxWidth: 460, width: '100%', background: 'var(--surface)', borderRadius: 24,
            padding: '48px 32px', textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          }}>
            <div style={{
              width: 72, height: 72, background: selected?.color || '#f0fdf4', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 32,
            }}>{selected?.icon || '✅'}</div>
            <h1 style={{ margin: '0 0 10px', color: 'var(--text)', fontSize: '1.5rem', fontWeight: 800 }}>
              Terima Kasih!
            </h1>
            <p style={{ margin: '0 0 28px', color: 'var(--text-2)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              {isPermohonan
                ? 'Permohonan Anda telah diterima. Tim kami akan meninjau dan menghubungi Anda secepatnya.'
                : 'Masukan Anda telah berhasil dikirim. Kami sangat menghargai setiap pendapat yang membantu kami berkembang.'}
            </p>
            <button
              onClick={() => { setDone(false); setStep(0); setForm(resetForm()) }}
              style={{ ...primaryBtnStyle, background: selected?.accent || '#2563eb' }}
            >
              Kirim yang Lain
            </button>
            <div style={{ marginTop: 14 }}>
              <a href="/penilaian" style={linkStyle}>Ingin menilai fasilitas USC? →</a>
            </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <PublicHeader brandName={brandName} logoUrl={logoUrl} />

      <div style={{ flex: 1, padding: '28px 16px 40px' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>

          {/* Page Title */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56,
              background: selected ? `linear-gradient(135deg, ${selected.accent}22, ${selected.accent}44)` : 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: 16, fontSize: 26, marginBottom: 14,
              border: `1.5px solid ${selected?.border || '#bfdbfe'}`,
              transition: 'all 0.3s',
            }}>
              {selected?.icon || '💬'}
            </div>
            <h1 style={{ margin: '0 0 6px', color: 'var(--text)', fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Kritik &amp; Saran
            </h1>
            <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '0.9375rem' }}>
              Sampaikan pendapat, masukan, atau permohonan Anda
            </p>
          </div>

          {/* Step Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 24 }}>
            {STEPS.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.8125rem',
                    background: i < step ? '#0f172a' : i === step ? (selected?.accent || '#2563eb') : 'var(--border)',
                    color: i <= step ? 'white' : 'var(--text-3)',
                    transition: 'all 0.3s',
                  }}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: i === step ? 'var(--text)' : 'var(--text-3)' }}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    width: 56, height: 2, margin: '0 4px 18px',
                    background: i < step ? 'var(--text)' : 'var(--border)', transition: 'background 0.3s',
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* Card */}
          <div style={{ background: 'var(--surface)', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

            {/* ---- STEP 0: Jenis ---- */}
            {step === 0 && (
              <div style={{ padding: 28 }}>
                <h2 style={cardTitleStyle}>Apa yang ingin Anda sampaikan?</h2>
                <p style={cardSubStyle}>Pilih jenis yang paling sesuai dengan kebutuhan Anda</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {JENIS_LIST.map(j => (
                    <button key={j.value} type="button" onClick={() => set('jenis', j.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                        border: `2px solid ${form.jenis === j.value ? j.accent : 'var(--border)'}`,
                        borderRadius: 14, background: form.jenis === j.value ? j.color : 'var(--surface)',
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      }}>
                      <span style={{
                        width: 46, height: 46, borderRadius: 12, background: j.color,
                        border: `1.5px solid ${j.border}`, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 22, flexShrink: 0,
                      }}>{j.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9375rem' }}>{j.label}</div>
                        <div style={{ color: 'var(--text-3)', fontSize: '0.8125rem', marginTop: 3 }}>{j.desc}</div>
                      </div>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', border: `2px solid ${form.jenis === j.value ? j.accent : 'var(--border)'}`,
                        background: form.jenis === j.value ? j.accent : 'transparent', flexShrink: 0, transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {form.jenis === j.value && <span style={{ color: 'white', fontSize: 12, lineHeight: 1 }}>✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
                {error && <ErrorMsg>{error}</ErrorMsg>}
                <button type="button" onClick={next}
                  style={{ ...primaryBtnStyle, marginTop: 20, background: selected?.accent || '#2563eb' }}>
                  Lanjut →
                </button>
              </div>
            )}

            {/* ---- STEP 1: Detail ---- */}
            {step === 1 && (
              <div style={{ padding: 28 }}>
                {/* Jenis badge */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', borderRadius: 99, fontSize: '0.8125rem', fontWeight: 700,
                  background: selected?.color, color: selected?.accent, border: `1px solid ${selected?.border}`,
                  marginBottom: 16,
                }}>
                  {selected?.icon} {selected?.label}
                </span>

                <h2 style={cardTitleStyle}>{isPermohonan ? 'Detail Permohonan' : 'Detail Pesan'}</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Fasilitas */}
                  <div>
                    <label style={labelStyle}>Fasilitas / Layanan Terkait <Req /></label>
                    <select value={form.fasilitas} onChange={e => set('fasilitas', e.target.value)} style={selectStyle}>
                      <option value="">-- Pilih fasilitas --</option>
                      {FASILITAS_LIST.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  {isPermohonan ? (
                    <>
                      <div>
                        <label style={labelStyle}>
                          Nama {form.jenis === 'permohonan_kelas' ? 'Kelas' : 'Kegiatan'} yang Diinginkan <Req />
                        </label>
                        <input type="text" value={form.nama_kelas_kegiatan}
                          onChange={e => set('nama_kelas_kegiatan', e.target.value)}
                          placeholder={form.jenis === 'permohonan_kelas' ? 'Contoh: Kelas Yoga Pagi, Renang Tingkat Lanjut...' : 'Contoh: Turnamen Futsal, Workshop Fitness...'}
                          style={fullInputStyle} maxLength={200} />
                      </div>
                      <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={labelStyle}>Tanggal yang Diinginkan <Req /></label>
                          <input type="date" value={form.tanggal_diinginkan}
                            onChange={e => set('tanggal_diinginkan', e.target.value)}
                            min={new Date().toISOString().split('T')[0]} style={fullInputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Estimasi Peserta</label>
                          <input type="number" value={form.estimasi_peserta}
                            onChange={e => set('estimasi_peserta', e.target.value)}
                            placeholder="Contoh: 20" min={1} max={9999} style={fullInputStyle} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Keterangan Tambahan</label>
                        <textarea value={form.catatan}
                          onChange={e => set('catatan', e.target.value)}
                          placeholder="Deskripsikan lebih detail — tujuan, jadwal reguler, atau hal lain yang perlu diketahui..."
                          rows={4} maxLength={1000}
                          style={{ ...fullInputStyle, resize: 'vertical' }} />
                        <div style={charCount}>{form.catatan.length}/1000</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label style={labelStyle}>Judul <Req /></label>
                        <input type="text" value={form.judul}
                          onChange={e => set('judul', e.target.value)}
                          placeholder={form.jenis === 'kritik' ? 'Ringkasan masalah yang Anda alami...' : 'Ringkasan saran Anda...'}
                          maxLength={150} style={fullInputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Isi Pesan <Req /></label>
                        <textarea value={form.isi}
                          onChange={e => set('isi', e.target.value)}
                          placeholder={form.jenis === 'kritik'
                            ? 'Ceritakan masalah Anda secara detail — kapan terjadi, apa yang dialami, dampaknya...'
                            : 'Jelaskan saran Anda secara detail — apa yang perlu diperbaiki atau ditingkatkan...'
                          }
                          rows={5} maxLength={2000}
                          style={{ ...fullInputStyle, resize: 'vertical' }} />
                        <div style={{ ...charCount, color: form.isi.length < 20 && form.isi.length > 0 ? '#dc2626' : 'var(--text-3)' }}>
                          {form.isi.length}/2000
                          {form.isi.length > 0 && form.isi.length < 20 && ' · minimal 20 karakter'}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {error && <ErrorMsg>{error}</ErrorMsg>}
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="button" onClick={back} style={backBtnStyle}>← Kembali</button>
                  <button type="button" onClick={next}
                    style={{ ...primaryBtnStyle, flex: 2, background: selected?.accent || '#2563eb' }}>
                    Lanjut →
                  </button>
                </div>
              </div>
            )}

            {/* ---- STEP 2: Identitas ---- */}
            {step === 2 && (
              <form onSubmit={handleSubmit}>
                <div style={{ padding: 28 }}>
                  <h2 style={cardTitleStyle}>Identitas Pengirim</h2>
                  <p style={cardSubStyle}>
                    Data ini membantu kami menindaklanjuti {isPermohonan ? 'permohonan' : 'masukan'} Anda
                  </p>

                  {/* Anonim Toggle */}
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                    background: 'var(--surface-2)', borderRadius: 12, border: '1.5px solid var(--border)',
                    cursor: 'pointer', marginBottom: 16,
                  }}>
                    <input type="checkbox" checked={form.is_anonim}
                      onChange={e => set('is_anonim', e.target.checked)}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#2563eb', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.875rem' }}>Kirim sebagai Anonim</div>
                      <div style={{ color: 'var(--text-3)', fontSize: '0.75rem', marginTop: 2 }}>Nama dan kontak tidak akan disimpan</div>
                    </div>
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Jenis Kelamin */}
                    <div>
                      <label style={labelStyle}>Jenis Kelamin <Req /></label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {['Laki-laki', 'Perempuan'].map(jk => (
                          <button key={jk} type="button" onClick={() => set('jenis_kelamin', jk)}
                            style={{
                              flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer',
                              border: `2px solid ${form.jenis_kelamin === jk ? (selected?.accent || '#2563eb') : 'var(--border)'}`,
                              background: form.jenis_kelamin === jk ? (selected?.color || '#eff6ff') : 'var(--surface)',
                              fontWeight: 600, fontSize: '0.875rem',
                              color: form.jenis_kelamin === jk ? (selected?.accent || '#2563eb') : 'var(--text-2)',
                              transition: 'all 0.15s',
                            }}>
                            {jk}
                          </button>
                        ))}
                      </div>
                    </div>

                    {!form.is_anonim && (
                      <>
                        <div>
                          <label style={labelStyle}>Nama Lengkap <Req /></label>
                          <input type="text" value={form.nama}
                            onChange={e => set('nama', e.target.value)}
                            placeholder="Nama Anda" style={fullInputStyle} maxLength={100} />
                        </div>
                        <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label style={labelStyle}>No. WhatsApp / Telepon</label>
                            <input type="tel" value={form.telepon}
                              onChange={e => set('telepon', e.target.value)}
                              placeholder="08xxxxxxxxxx" style={fullInputStyle} maxLength={20} />
                          </div>
                          <div>
                            <label style={labelStyle}>Email</label>
                            <input type="email" value={form.email}
                              onChange={e => set('email', e.target.value)}
                              placeholder="email@contoh.com" style={fullInputStyle} />
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label style={labelStyle}>Asal Unit / Instansi</label>
                      <select value={form.unit_kerja} onChange={e => set('unit_kerja', e.target.value)} style={selectStyle}>
                        <option value="">-- Pilih unit (opsional) --</option>
                        {UNIT_KERJA_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  {error && <ErrorMsg>{error}</ErrorMsg>}
                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button type="button" onClick={back} style={backBtnStyle}>← Kembali</button>
                    <button type="submit" disabled={loading}
                      style={{
                        ...primaryBtnStyle, flex: 2,
                        background: selected?.accent || '#2563eb',
                        opacity: loading ? 0.7 : 1,
                      }}>
                      {loading ? 'Mengirim...' : `Kirim ${selected?.label || 'Pesan'}`}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Cross-link */}
          <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8125rem', marginTop: 20 }}>
            Ingin menilai fasilitas USC?{' '}
            <a href="/penilaian" style={linkStyle}>Buka halaman Penilaian Fasilitas →</a>
          </p>
        </div>
      </div>

      <PublicFooter />
      <style>{`
        @media (max-width: 480px) {
          .detail-grid { grid-template-columns: 1fr !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function PublicHeader({ brandName, logoUrl }) {
  return (
    <header style={{
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      padding: '14px 20px', position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ maxWidth: 580, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <img src={logoUrl} alt={brandName} style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brandName}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>Sistem Informasi Direktorat</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <ThemeToggle />
          <a href="/penilaian" style={{
            fontSize: '0.8125rem', fontWeight: 600, color: '#2563eb',
            textDecoration: 'none', padding: '6px 12px', borderRadius: 8,
            border: '1px solid #bfdbfe', background: '#eff6ff',
          }}>
            Penilaian Fasilitas
          </a>
        </div>
      </div>
    </header>
  )
}

function PublicFooter() {
  return (
    <footer style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)', padding: '16px 20px', textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)' }}>
        © 2026 Direktorat Unesa Science Center · Masukan Anda bersifat rahasia
      </p>
    </footer>
  )
}

function Req() {
  return <span style={{ color: '#dc2626' }}>*</span>
}

function ErrorMsg({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
      padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
      borderRadius: 10, color: '#dc2626', fontSize: '0.875rem',
    }}>
      <span>⚠️</span> {children}
    </div>
  )
}

const pageStyle = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column',
  background: 'linear-gradient(160deg, #f0f4ff 0%, #fafafa 50%, #f0fdf4 100%)',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
}

const cardTitleStyle = { fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }
const cardSubStyle = { color: 'var(--text-3)', fontSize: '0.875rem', margin: '0 0 18px' }

const labelStyle = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 6,
}

const baseInput = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)',
  // 16px eksplisit — di bawah itu Safari iOS auto-zoom saat field
  // difokuskan, dan halaman ini mengunci zoom manual.
  fontSize: '16px', color: 'var(--text)', background: 'var(--surface)', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

const fullInputStyle = { ...baseInput }
const selectStyle = { ...baseInput }

const charCount = { textAlign: 'right', fontSize: '0.75rem', marginTop: 4, color: 'var(--text-3)' }

const primaryBtnStyle = {
  display: 'block', width: '100%', padding: '12px', borderRadius: 12, border: 'none',
  color: 'white', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer', textAlign: 'center',
}

const backBtnStyle = {
  flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid var(--border)',
  background: 'var(--surface)', color: 'var(--text-2)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
}

const linkStyle = { color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '0.8125rem' }
