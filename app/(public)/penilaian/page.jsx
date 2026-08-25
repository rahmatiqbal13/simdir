'use client'

import { useState, useEffect, useRef } from 'react'
import ThemeToggle from '@/app/components/ThemeToggle'

// Cuma unit usaha yang dinilai lewat penilaian bintang — PUI dan USC (Umum)
// bukan unit usaha, jadi tidak masuk di sini (lihat juga
// kelola-penilaian/pertanyaan/page.jsx yang harus selalu sinkron dengan
// daftar ini). 'ssfc' sudah berganti nama jadi 'Achilles Gym Hub' — entri
// lama dihapus, bukan cuma di-rename, supaya tidak dobel.
const FACILITIES = [
  { id: 'achilles-gym',    name: 'Achilles Gym Hub',   icon: '🏋️', color: '#dbeafe', textColor: '#1e40af', border: '#bfdbfe' },
  { id: 'kolam-renang',    name: 'Kolam Renang Unesa', icon: '🏊', color: '#dcfce7', textColor: '#166534', border: '#bbf7d0' },
  { id: 'driving-golf',    name: 'Driving Golf Unesa', icon: '⛳', color: '#fef3c7', textColor: '#92400e', border: '#fde68a' },
  { id: 'ulabk',           name: 'ULABK',              icon: '📖', color: '#fff7ed', textColor: '#c2410c', border: '#fed7aa' },
]

const RATING_LABELS = { 1: 'Buruk', 2: 'Kurang Baik', 3: 'Cukup', 4: 'Baik', 5: 'Sangat Baik' }

let nextId = 1
const genId = () => nextId++

export default function PenilaianPage() {
  const [items, setItems] = useState([])
  const [customQuestions, setCustomQuestions] = useState({})
  const [questionsLoading, setQuestionsLoading] = useState(true)
  const [profile, setProfile] = useState({
    nama: '', email: '', telepon: '', unit_kerja: '', jenis_kelamin: '', is_anonim: false,
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const wizardRef = useRef(null)
  const [brandName, setBrandName] = useState('Direktorat Unesa Science Center')
  const [logoUrl, setLogoUrl] = useState('/images/logo USC.png')

  const scrollToWizard = () => wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  useEffect(() => {
    fetch('/api/app-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.brand_name) setBrandName(data.brand_name)
        if (data.logo_url) setLogoUrl(data.logo_url)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch('/api/pertanyaan-kritik-saran?active=true')
        const data = await res.json()
        if (res.ok && data.grouped) setCustomQuestions(data.grouped)
      } catch (err) {
        console.error('Failed to load questions:', err)
      } finally {
        setQuestionsLoading(false)
      }
    }
    loadQuestions()
  }, [])

  const hasQuestions = (name) => {
    const qs = customQuestions[name]
    return qs && qs.length > 0
  }

  const addFacility = (name) => {
    const qs = customQuestions[name]
    if (!qs || qs.length === 0) {
      setError('Belum ada pertanyaan untuk fasilitas ini.')
      return
    }
    qs.filter(q => q.is_active).forEach(q => {
      if (!items.some(i => i.fasilitas === name && i.pertanyaan_id === q.id)) {
        setItems(prev => [...prev, {
          id: genId(), fasilitas: name, aspek: q.pertanyaan, rating: 0,
          penjelasan: '', jawaban_pilihan: '', pertanyaan_id: q.id,
          tipe: q.tipe || 'rating', opsi_pilihan: q.opsi_pilihan || null,
        }])
      }
    })
    setError('')
    scrollToWizard()
  }

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
    setError('')
  }

  const parseCheckbox = (val) => {
    if (!val) return []
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch { return [] }
  }

  const isItemAnswered = (item) => {
    const tipe = item.tipe || 'rating'
    if (tipe === 'pilihan_ganda') return !!item.jawaban_pilihan?.trim()
    if (tipe === 'checkbox') return parseCheckbox(item.jawaban_pilihan).length > 0
    if (tipe === 'teks') return !!item.penjelasan.trim()
    return item.rating > 0 && !!item.penjelasan.trim()
  }

  const validateCurrentStep = () => {
    const item = items[currentStep]
    if (!item) return null
    if (!isItemAnswered(item)) {
      const tipe = item.tipe || 'rating'
      if (tipe === 'rating') {
        if (!item.rating) return `Rating untuk "${item.aspek}" wajib diisi`
        if (!item.penjelasan.trim()) return `Penjelasan untuk "${item.aspek}" wajib diisi`
      }
      return `Jawaban untuk "${item.aspek}" wajib diisi`
    }
    return null
  }

  const validate = () => {
    if (!profile.jenis_kelamin) return 'Jenis kelamin wajib dipilih'
    if (items.length === 0) return 'Pilih minimal 1 fasilitas untuk dinilai'
    for (const item of items) {
      if (!isItemAnswered(item)) return `Jawaban untuk "${item.aspek}" belum diisi`
    }
    return null
  }

  const goNext = () => {
    const err = validateCurrentStep()
    if (err) { setError(err); return }
    setError('')
    setCurrentStep(prev => Math.min(prev + 1, items.length - 1))
    scrollToWizard()
  }

  const goPrev = () => {
    setError('')
    setCurrentStep(prev => Math.max(prev - 1, 0))
    scrollToWizard()
  }

  useEffect(() => {
    if (items.length === 0) setCurrentStep(0)
    else if (currentStep >= items.length) setCurrentStep(items.length - 1)
  }, [items.length])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); scrollToWizard(); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/kritik-saran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          items: items.map(({ fasilitas, aspek, rating, penjelasan, jawaban_pilihan, pertanyaan_id, tipe }) => ({
            fasilitas, aspek, rating, penjelasan, jawaban_pilihan, pertanyaan_id, tipe,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim')
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.')
      scrollToWizard()
    } finally {
      setLoading(false)
    }
  }

  const grouped = {}
  items.forEach(item => {
    if (!grouped[item.fasilitas]) grouped[item.fasilitas] = []
    grouped[item.fasilitas].push(item)
  })
  const selectedNames = Object.keys(grouped)
  const availableFacilities = FACILITIES.filter(f => !selectedNames.includes(f.name))
  const answeredItems = items.filter(isItemAnswered).length
  const isComplete = items.length > 0 && answeredItems === items.length

  if (submitted) {
    return (
      <div style={pageStyle}>
        <PublicHeader brandName={brandName} logoUrl={logoUrl} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
          <div style={{
            maxWidth: 480, width: '100%', background: 'var(--surface)', borderRadius: 24,
            padding: '48px 32px', textAlign: 'center',
            boxShadow: '0 8px 32px rgba(30,58,138,0.12)',
          }}>
            <div style={{
              width: 80, height: 80, background: '#dcfce7', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', fontSize: 36,
            }}>✓</div>
            <h2 style={{ margin: '0 0 12px', color: 'var(--text)', fontSize: '1.5rem', fontWeight: 700 }}>
              Terima Kasih!
            </h2>
            <p style={{ margin: '0 0 8px', color: 'var(--text-2)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Penilaian Anda untuk <strong>{selectedNames.length}</strong> fasilitas ({items.length} pertanyaan) telah berhasil dikirim.
            </p>
            <p style={{ margin: '0 0 32px', color: 'var(--text-3)', fontSize: '0.875rem' }}>
              Kami sangat menghargai masukan Anda untuk peningkatan layanan USC.
            </p>
            <button
              onClick={() => { setSubmitted(false); setItems([]); setCurrentStep(0); setProfile({ nama:'', email:'', telepon:'', unit_kerja:'', jenis_kelamin:'', is_anonim:false }) }}
              style={primaryBtnStyle}
            >
              Beri Penilaian Lagi
            </button>
            <div style={{ marginTop: 12 }}>
              <a href="/kritik-saran" style={linkStyle}>Punya kritik atau saran? →</a>
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
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Page Title */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
              borderRadius: 16, fontSize: 24, marginBottom: 14,
            }}>⭐</div>
            <h1 style={{ margin: '0 0 6px', color: 'var(--text)', fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Penilaian Fasilitas
            </h1>
            <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '0.9375rem' }}>
              Bantu kami meningkatkan kualitas fasilitas Unesa Science Center
            </p>
          </div>

          {/* Main Card */}
          <div style={{ background: 'var(--surface)', borderRadius: 20, boxShadow: '0 4px 24px rgba(30,58,138,0.08)', overflow: 'hidden' }}>
            <form onSubmit={handleSubmit}>

              {/* Profile Section */}
              <div style={{ padding: '24px 24px 0' }}>
                <SectionLabel>Identitas Penilai</SectionLabel>

                {/* Anonim Toggle */}
                <label style={anonLabelStyle}>
                  <input
                    type="checkbox" checked={profile.is_anonim}
                    onChange={e => setProfile(p => ({ ...p, is_anonim: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: '#1e3a8a', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>Kirim secara anonim</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>Nama dan kontak tidak akan disimpan</div>
                  </div>
                </label>

                {!profile.is_anonim && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 10 }}>
                    <input type="text" placeholder="Nama (opsional)" value={profile.nama}
                      onChange={e => setProfile(p => ({ ...p, nama: e.target.value }))} style={inputStyle} />
                    <input type="tel" placeholder="No. WhatsApp (opsional)" value={profile.telepon}
                      onChange={e => setProfile(p => ({ ...p, telepon: e.target.value }))} style={inputStyle} />
                    <input type="email" placeholder="Email (opsional)" value={profile.email}
                      onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
                  </div>
                )}

                <input type="text" placeholder="Unit Kerja / Instansi (opsional)" value={profile.unit_kerja}
                  onChange={e => setProfile(p => ({ ...p, unit_kerja: e.target.value }))}
                  style={{ ...inputStyle, marginTop: 10, width: '100%', boxSizing: 'border-box' }} />

                {/* Jenis Kelamin */}
                <div style={{ marginTop: 14 }}>
                  <label style={labelStyle}>Jenis Kelamin <span style={{ color: '#dc2626' }}>*</span></label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {['Laki-laki', 'Perempuan'].map(jk => (
                      <button key={jk} type="button"
                        onClick={() => setProfile(p => ({ ...p, jenis_kelamin: jk }))}
                        style={{
                          flex: 1, minHeight: 44, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                          border: `2px solid ${profile.jenis_kelamin === jk ? '#3b82f6' : 'var(--border)'}`,
                          background: profile.jenis_kelamin === jk ? '#eff6ff' : 'var(--surface)',
                          fontWeight: 600, fontSize: '0.875rem',
                          color: profile.jenis_kelamin === jk ? '#1e3a8a' : 'var(--text-3)',
                          transition: 'all 0.15s',
                        }}>
                        {jk === 'Laki-laki' ? '👨 ' : '👩 '}{jk}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--surface-3)', margin: '20px 0' }} />

              {/* Facility Picker */}
              {availableFacilities.length > 0 && (
                <div style={{ padding: '0 24px' }}>
                  <SectionLabel>Pilih Fasilitas <span style={{ color: '#dc2626', fontWeight: 400 }}>*</span></SectionLabel>
                  {questionsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontSize: '0.875rem' }}>
                      Memuat fasilitas...
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                      {availableFacilities.map(f => {
                        const hasCQ = hasQuestions(f.name)
                        const qCount = customQuestions[f.name]?.filter(q => q.is_active).length || 0
                        return (
                          <button key={f.id} type="button" onClick={() => addFacility(f.name)}
                            disabled={!hasCQ}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                              borderRadius: 12, border: `1.5px solid ${hasCQ ? 'var(--border)' : 'var(--surface-3)'}`,
                              background: hasCQ ? 'var(--surface)' : '#fafafa',
                              cursor: hasCQ ? 'pointer' : 'not-allowed',
                              textAlign: 'left', transition: 'all 0.15s',
                              opacity: hasCQ ? 1 : 0.5,
                            }}
                            onMouseEnter={e => hasCQ && (e.currentTarget.style.borderColor = '#3b82f6', e.currentTarget.style.background = '#f8faff')}
                            onMouseLeave={e => hasCQ && (e.currentTarget.style.borderColor = 'var(--border)', e.currentTarget.style.background = 'var(--surface)')}
                          >
                            <div style={{
                              width: 38, height: 38, borderRadius: 10, background: f.color,
                              border: `1px solid ${f.border}`, display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 18, flexShrink: 0,
                            }}>{f.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text)', lineHeight: 1.3 }}>{f.name}</div>
                              <div style={{ fontSize: '0.6875rem', color: hasCQ ? 'var(--text-3)' : 'var(--text-3)', marginTop: 2 }}>
                                {hasCQ ? `${qCount} pertanyaan` : 'Belum tersedia'}
                              </div>
                            </div>
                            {hasCQ && (
                              <span style={{ color: 'var(--text-3)', fontSize: 18, flexShrink: 0 }}>+</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Selected facilities summary */}
              {selectedNames.length > 0 && (
                <div style={{ padding: '0 24px' }}>
                  {availableFacilities.length > 0 && <div style={{ height: 1, background: 'var(--surface-3)', margin: '16px 0' }} />}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <SectionLabel style={{ margin: 0 }}>Fasilitas Dipilih</SectionLabel>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{answeredItems}/{items.length} dijawab</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{
                      height: '100%', width: `${items.length > 0 ? (answeredItems / items.length) * 100 : 0}%`,
                      background: isComplete ? '#10b981' : '#3b82f6', borderRadius: 3, transition: 'width 0.3s',
                    }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedNames.map(name => {
                      const f = FACILITIES.find(x => x.name === name)
                      return (
                        <span key={name} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                          background: f?.color || 'var(--surface-3)', color: f?.textColor || 'var(--text-2)',
                          border: `1px solid ${f?.border || 'var(--border)'}`,
                          borderRadius: 99, fontSize: '0.8125rem', fontWeight: 600,
                        }}>
                          {f?.icon} {name}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ margin: '12px 24px 0', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: '0.875rem' }}>
                  {error}
                </div>
              )}

              {/* Wizard Questions */}
              {items.length > 0 && (
                <div ref={wizardRef} style={{ padding: '16px 24px 0' }}>
                  <div style={{ height: 1, background: 'var(--surface-3)', marginBottom: 16 }} />
                  <SectionLabel>Pertanyaan {currentStep + 1} dari {items.length}</SectionLabel>

                  {/* Step progress */}
                  <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{
                      height: '100%',
                      width: `${((currentStep + 1) / items.length) * 100}%`,
                      background: '#1e3a8a', borderRadius: 2, transition: 'width 0.3s',
                    }} />
                  </div>

                  {(() => {
                    const item = items[currentStep]
                    const facility = FACILITIES.find(f => f.name === item.fasilitas)
                    const isLast = currentStep === items.length - 1
                    return (
                      <div style={{
                        background: 'var(--surface-2)', borderRadius: 16, padding: 20,
                        border: '1.5px solid var(--border)',
                      }}>
                        {/* Facility badge */}
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14,
                          padding: '5px 12px', borderRadius: 99,
                          background: facility?.color || 'var(--surface-3)',
                          border: `1px solid ${facility?.border || 'var(--border)'}`,
                          color: facility?.textColor || 'var(--text-2)',
                          fontSize: '0.8125rem', fontWeight: 600,
                        }}>
                          {facility?.icon} {item.fasilitas}
                        </div>

                        {/* Question */}
                        <div style={{
                          padding: '12px 14px', background: '#eff6ff', borderRadius: 10,
                          border: '1px solid #dbeafe', fontSize: '0.9375rem', color: '#1e3a8a',
                          fontWeight: 600, lineHeight: 1.5, marginBottom: 16,
                        }}>
                          {item.aspek}
                        </div>

                        {/* Answer area */}
                        <QuestionInput item={item} updateItem={updateItem} parseCheckbox={parseCheckbox} />

                        {/* Nav buttons */}
                        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                          {currentStep > 0 && (
                            <button type="button" onClick={goPrev} style={backBtnStyle}>← Sebelumnya</button>
                          )}
                          {!isLast ? (
                            <button type="button" onClick={goNext} style={{ ...primaryBtnStyle, flex: 1 }}>Berikutnya →</button>
                          ) : (
                            <button type="submit" disabled={loading} style={{ ...primaryBtnStyle, flex: 1, background: '#059669' }}>
                              {loading ? 'Mengirim...' : '✓ Kirim Penilaian'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Submit when all done (not in wizard) */}
              {items.length > 0 && isComplete && currentStep === items.length - 1 && (
                <div style={{ padding: '16px 24px' }} />
              )}

              {items.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.875rem' }}>
                  Pilih minimal satu fasilitas di atas untuk mulai memberikan penilaian.
                </div>
              )}

            </form>
          </div>

          {/* Footer note */}
          <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8125rem', marginTop: 20, lineHeight: 1.6 }}>
            Penilaian Anda bersifat rahasia dan hanya dilihat oleh tim pimpinan USC.
          </p>
          <p style={{ textAlign: 'center', marginTop: 8 }}>
            <a href="/kritik-saran" style={linkStyle}>Punya kritik, saran, atau permohonan kelas? Klik di sini →</a>
          </p>
        </div>
      </div>

      <PublicFooter />
      <style>{`
        @media (max-width: 520px) {
          .penilaian-grid { grid-template-columns: 1fr !important; }
          .profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function QuestionInput({ item, updateItem, parseCheckbox }) {
  const tipe = item.tipe || 'rating'

  if (tipe === 'pilihan_ganda' && item.opsi_pilihan) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {item.opsi_pilihan.map((opsi, idx) => (
          <label key={idx} style={{
            display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '10px 14px',
            borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', boxSizing: 'border-box',
            background: item.jawaban_pilihan === opsi ? '#eff6ff' : 'var(--surface)',
            border: `2px solid ${item.jawaban_pilihan === opsi ? '#3b82f6' : 'var(--border)'}`,
          }}>
            <input type="radio" name={`pg-${item.id}`} checked={item.jawaban_pilihan === opsi}
              onChange={() => updateItem(item.id, 'jawaban_pilihan', opsi)}
              style={{ width: 18, height: 18, accentColor: '#1e3a8a', cursor: 'pointer', flexShrink: 0 }} />
            <span style={{ fontSize: '0.9rem', fontWeight: item.jawaban_pilihan === opsi ? 600 : 400, color: 'var(--text)' }}>
              {String.fromCharCode(65 + idx)}. {opsi}
            </span>
          </label>
        ))}
      </div>
    )
  }

  if (tipe === 'checkbox' && item.opsi_pilihan) {
    const selected = parseCheckbox(item.jawaban_pilihan)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {item.opsi_pilihan.map((opsi, idx) => {
          const checked = selected.includes(opsi)
          return (
            <label key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '10px 14px',
              borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', boxSizing: 'border-box',
              background: checked ? '#eff6ff' : 'var(--surface)',
              border: `2px solid ${checked ? '#3b82f6' : 'var(--border)'}`,
            }}>
              <input type="checkbox" checked={checked}
                onChange={() => {
                  const next = checked ? selected.filter(v => v !== opsi) : [...selected, opsi]
                  updateItem(item.id, 'jawaban_pilihan', JSON.stringify(next))
                }}
                style={{ width: 18, height: 18, accentColor: '#1e3a8a', cursor: 'pointer', flexShrink: 0 }} />
              <span style={{ fontSize: '0.9rem', fontWeight: checked ? 600 : 400, color: 'var(--text)' }}>
                {String.fromCharCode(65 + idx)}. {opsi}
              </span>
            </label>
          )
        })}
      </div>
    )
  }

  if (tipe === 'teks') {
    return (
      <textarea value={item.penjelasan}
        onChange={e => updateItem(item.id, 'penjelasan', e.target.value)}
        placeholder={`Tuliskan jawaban Anda...`}
        rows={4}
        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 80 }} />
    )
  }

  // Default: rating + penjelasan
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button key={star} type="button"
              onClick={() => updateItem(item.id, 'rating', star)}
              aria-label={`Beri rating ${star} dari 5 bintang`}
              aria-pressed={star <= item.rating}
              style={{
                background: 'transparent', border: 'none', fontSize: 30,
                cursor: 'pointer', lineHeight: 1,
                minWidth: 44, minHeight: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                filter: star <= item.rating ? 'none' : 'grayscale(1)',
                opacity: star <= item.rating ? 1 : 0.3, transition: 'all 0.15s',
                transform: star <= item.rating ? 'scale(1.1)' : 'scale(1)',
              }}>⭐</button>
          ))}
          {item.rating > 0 && (
            <span style={{
              fontSize: '0.8125rem', fontWeight: 700, marginLeft: 4,
              color: '#047857', background: '#dcfce7', padding: '3px 10px', borderRadius: 6,
            }}>
              {item.rating}/5 — {RATING_LABELS[item.rating]}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0 4px' }}>
          <span style={{ color: '#b91c1c', fontWeight: 600 }}>Buruk</span>
          <span style={{ color: '#047857', fontWeight: 600 }}>Sangat Baik</span>
        </div>
      </div>
      <textarea value={item.penjelasan}
        onChange={e => updateItem(item.id, 'penjelasan', e.target.value)}
        placeholder={`Jelaskan penilaian Anda untuk "${item.aspek}"...`}
        rows={3}
        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
    </>
  )
}

function PublicHeader({ brandName, logoUrl }) {
  return (
    <header style={{
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      padding: '14px 20px', position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <img src={logoUrl} alt={brandName} style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brandName}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>Sistem Informasi Direktorat</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <ThemeToggle />
          <a href="/kritik-saran" style={{
            display: 'inline-flex', alignItems: 'center', minHeight: 44, boxSizing: 'border-box',
            fontSize: '0.8125rem', fontWeight: 600, color: '#2563eb',
            textDecoration: 'none', padding: '6px 12px', borderRadius: 8,
            border: '1px solid #bfdbfe', background: '#eff6ff',
          }}>
            Kritik & Saran
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
        © 2026 Direktorat Unesa Science Center · Respons akan ditinjau oleh tim pimpinan
      </p>
    </footer>
  )
}

function SectionLabel({ children, style }) {
  return (
    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, ...style }}>
      {children}
    </div>
  )
}

const pageStyle = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column',
  background: 'linear-gradient(160deg, #f0f4ff 0%, #f8fafc 60%, #f0fdf4 100%)',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
}

const inputStyle = {
  padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 10,
  // 16px eksplisit — di bawah itu Safari iOS auto-zoom saat field
  // difokuskan, dan halaman ini mengunci zoom manual.
  fontSize: '16px', color: 'var(--text)', background: 'var(--surface)', outline: 'none',
  fontFamily: 'inherit',
}

const labelStyle = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 8,
}

const anonLabelStyle = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
  background: 'var(--surface-2)', borderRadius: 10, border: '1.5px solid var(--border)', cursor: 'pointer',
}

const primaryBtnStyle = {
  display: 'block', width: '100%', minHeight: 44, padding: '12px', borderRadius: 12, border: 'none',
  background: '#1e3a8a', color: 'white', fontWeight: 700, fontSize: '0.9375rem',
  cursor: 'pointer', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box',
}

const backBtnStyle = {
  flex: 1, minHeight: 44, padding: '12px', borderRadius: 12, border: '1.5px solid var(--border)',
  background: 'var(--surface)', color: 'var(--text-2)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
  boxSizing: 'border-box',
}

const linkStyle = {
  color: '#2563eb', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600,
}
