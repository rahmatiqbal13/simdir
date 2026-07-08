'use client'

import { useState, useEffect } from 'react'

// 🎯 Daftar fasilitas — tambah/edit di sini untuk fasilitas baru
const FACILITIES = [
  { id: 'achilles-gym', name: 'Achilles Gym Hub', icon: '🏋️', color: '#dbeafe', textColor: '#1e3a8a' },
  { id: 'kolam-renang', name: 'Kolam Renang Unesa', icon: '🏊', color: '#dcfce7', textColor: '#047857' },
  { id: 'driving-golf', name: 'Driving Golf Unesa', icon: '⛳', color: '#fef3c7', textColor: '#b45309' },
]

const RATING_LABELS = {
  1: 'Buruk',
  2: 'Kurang Baik',
  3: 'Cukup',
  4: 'Baik',
  5: 'Sangat Baik',
}

// Helper: generate unique ID for each rating item
let nextId = 1
const genId = () => nextId++

export default function KritikSaranPage() {
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
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const check = () => setIsMobile(mq.matches)
    check()
    mq.addEventListener('change', check)
    return () => mq.removeEventListener('change', check)
  }, [])

  // Scale helper: shrink sizes on mobile
  const spx = (val) => isMobile ? `${Math.round(val * 0.72)}px` : `${val}px`

  // Fetch custom questions on mount
  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch('/api/pertanyaan-kritik-saran?active=true')
        const data = await res.json()
        if (res.ok && data.grouped) {
          setCustomQuestions(data.grouped)
        }
      } catch (err) {
        console.error('Failed to load custom questions:', err)
      } finally {
        setQuestionsLoading(false)
      }
    }
    loadQuestions()
  }, [])

  const hasCustomQuestions = (facilityName) => {
    const qs = customQuestions[facilityName]
    return qs && qs.length > 0
  }

  const addFacilityWithQuestions = (facilityName) => {
    const qs = customQuestions[facilityName]
    if (qs && qs.length > 0) {
      // Add all active custom questions for this facility
      qs.filter(q => q.is_active).forEach(q => {
        if (!items.some(i => i.fasilitas === facilityName && i.pertanyaan_id === q.id)) {
          setItems(prev => [...prev, {
            id: genId(),
            fasilitas: facilityName,
            aspek: q.pertanyaan,
            rating: 0,
            penjelasan: '',
            jawaban_pilihan: '',
            pertanyaan_id: q.id,
            tipe: q.tipe || 'rating',
            opsi_pilihan: q.opsi_pilihan || null,
          }])
        }
      })
    } else {
      setError('Belum ada pertanyaan untuk fasilitas ini. Silakan hubungi admin.')
      return
    }
    setError('')
  }

  const removeItem = (id) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
    setError('')
  }

  const getItemsByFasilitas = () => {
    const grouped = {}
    items.forEach(item => {
      if (!grouped[item.fasilitas]) grouped[item.fasilitas] = []
      grouped[item.fasilitas].push(item)
    })
    return grouped
  }

  const validate = () => {
    if (!profile.jenis_kelamin) return 'Jenis kelamin wajib dipilih'
    if (items.length === 0) return 'Pilih minimal 1 fasilitas untuk dinilai'
    for (const item of items) {
      const tipe = item.tipe || 'rating'
      if (tipe === 'pilihan_ganda') {
        if (!item.jawaban_pilihan || !item.jawaban_pilihan.trim()) {
          return `Pilihan untuk "${item.aspek}" wajib diisi`
        }
      } else if (tipe === 'checkbox') {
        const jawabanArr = parseCheckboxJawaban(item.jawaban_pilihan)
        if (!jawabanArr || jawabanArr.length === 0) {
          return `Pilihan untuk "${item.aspek}" wajib dipilih minimal 1`
        }
      } else if (tipe === 'teks') {
        if (!item.penjelasan.trim()) {
          return `Penjelasan untuk "${item.aspek}" wajib diisi`
        }
      } else {
        if (!item.rating || item.rating < 1) return `Rating untuk "${item.aspek}" wajib diisi`
        if (!item.penjelasan.trim()) return `Penjelasan untuk "${item.aspek}" wajib diisi`
      }
    }
    return null
  }

  const parseCheckboxJawaban = (val) => {
    if (!val) return []
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch { return [] }
  }

  const validateStep = (stepIndex) => {
    const item = items[stepIndex]
    if (!item) return null
    const tipe = item.tipe || 'rating'
    if (tipe === 'pilihan_ganda') {
      if (!item.jawaban_pilihan || !item.jawaban_pilihan.trim()) {
        return `Pilihan untuk "${item.aspek}" wajib diisi`
      }
    } else if (tipe === 'checkbox') {
      const jawabanArr = parseCheckboxJawaban(item.jawaban_pilihan)
      if (!jawabanArr || jawabanArr.length === 0) {
        return `Pilihan untuk "${item.aspek}" wajib dipilih minimal 1`
      }
    } else if (tipe === 'teks') {
      if (!item.penjelasan.trim()) {
        return `Jawaban untuk "${item.aspek}" wajib diisi`
      }
    } else {
      if (!item.rating || item.rating < 1) return `Rating untuk "${item.aspek}" wajib diisi`
      if (!item.penjelasan.trim()) return `Penjelasan untuk "${item.aspek}" wajib diisi`
    }
    return null
  }

  const goNext = () => {
    const err = validateStep(currentStep)
    if (err) return setError(err)
    setError('')
    setCurrentStep(prev => Math.min(prev + 1, items.length - 1))
  }

  const goPrev = () => {
    setError('')
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  useEffect(() => {
    if (items.length === 0) setCurrentStep(0)
    else if (currentStep >= items.length) setCurrentStep(items.length - 1)
  }, [items.length])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) return setError(err)

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
    } finally {
      setLoading(false)
    }
  }

  const grouped = getItemsByFasilitas()
  const selectedFasilitas = Object.keys(grouped)
  const availableFacilities = FACILITIES.filter(f => !selectedFasilitas.includes(f.name))

  // Progress stats
  const totalFacilities = selectedFasilitas.length
  const totalItems = items.length
  const ratedItems = items.filter(i => i.rating > 0).length
  const explainedItems = items.filter(i => i.penjelasan.trim().length > 0).length
  const answeredItems = items.filter(i => {
    const tipe = i.tipe || 'rating'
    if (tipe === 'pilihan_ganda') return i.jawaban_pilihan && i.jawaban_pilihan.trim().length > 0
    if (tipe === 'checkbox') {
      const arr = parseCheckboxJawaban(i.jawaban_pilihan)
      return arr.length > 0
    }
    if (tipe === 'teks') return i.penjelasan.trim().length > 0
    return i.rating > 0 && i.penjelasan.trim().length > 0
  }).length
  const isComplete = totalItems > 0 && answeredItems === totalItems

  if (submitted) {
    return (
      <div style={getPageStyle(isMobile)}>
        <div style={{
          maxWidth: isMobile ? '100%' : '640px',
          width: '100%',
          background: 'white',
          borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '24px 16px' : '48px 32px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            width: isMobile ? '64px' : '96px', height: isMobile ? '64px' : '96px', background: '#dcfce7', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', fontSize: isMobile ? '32px' : '44px',
          }}>✓</div>
          <h2 style={{ margin: '0 0 16px', color: '#0f172a', fontSize: isMobile ? '24px' : '32px', fontWeight: 700 }}>Terima Kasih!</h2>
          <p style={{ margin: '0 0 32px', color: '#64748b', fontSize: isMobile ? '16px' : '20px', lineHeight: '1.6' }}>
            Kritik dan saran Anda untuk {totalFacilities} fasilitas ({totalItems} penilaian) telah berhasil dikirim.
          </p>
          <button
            onClick={() => {
              setSubmitted(false)
              setItems([])
              setCurrentStep(0)
              setProfile({ nama:'', email:'', telepon:'', unit_kerja:'', jenis_kelamin:'', is_anonim:false })
            }}
            style={{
              padding: isMobile ? '14px 24px' : '18px 32px', background: '#1e3a8a', color: 'white', border: 'none',
              borderRadius: '12px', fontSize: isMobile ? '16px' : '20px', fontWeight: '700', cursor: 'pointer', width: '100%',
            }}
          >Kirim Lagi</button>
        </div>
      </div>
    )
  }

  return (
    <div style={getPageStyle(isMobile)}>
      <div style={{
        maxWidth: isMobile ? '100%' : '800px',
        width: '100%',
        background: 'white',
        borderRadius: isMobile ? '12px' : '16px',
        padding: isMobile ? '16px 12px' : '32px 28px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '16px' : '24px' }}>
          <div style={{
            width: isMobile ? '48px' : '64px', height: isMobile ? '48px' : '64px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
            borderRadius: isMobile ? '12px' : '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontSize: isMobile ? '22px' : '28px',
          }}>💬</div>
          <h1 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: isMobile ? '22px' : '28px', fontWeight: '700' }}>
            Kritik & Saran
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: isMobile ? '14px' : '18px' }}>Unesa Science Center (USC)</p>
          <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: isMobile ? '13px' : '16px' }}>
            Berikan penilaian untuk fasilitas USC
          </p>
        </div>

        {/* Progress Bar */}
        {totalItems > 0 && (
          <div style={{
            marginBottom: isMobile ? '14px' : '20px', padding: isMobile ? '10px 12px' : '14px 16px', background: '#f8fafc',
            borderRadius: isMobile ? '10px' : '12px', border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '6px' : '8px' }}>
              <span style={{ fontSize: isMobile ? '14px' : '18px', fontWeight: 600, color: '#475569' }}>
                Progress: {answeredItems}/{totalItems} dijawab
              </span>
              <span style={{
                fontSize: isMobile ? '13px' : '16px', fontWeight: 700,
                color: isComplete ? '#047857' : '#b45309',
                background: isComplete ? '#dcfce7' : '#fef3c7',
                padding: isMobile ? '2px 8px' : '4px 10px', borderRadius: '6px',
              }}>
                {isComplete ? 'Siap Kirim ✓' : 'Belum Lengkap'}
              </span>
            </div>
            <div style={{ height: isMobile ? '8px' : '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${totalItems > 0 ? (answeredItems / totalItems) * 100 : 0}%`,
                background: isComplete ? '#10b981' : '#3b82f6', borderRadius: '5px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: isMobile ? '10px 14px' : '14px 18px', background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: isMobile ? '8px' : '10px', color: '#dc2626', fontSize: isMobile ? '15px' : '18px', marginBottom: isMobile ? '12px' : '18px', fontWeight: 500,
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Profile */}
          <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '10px', padding: isMobile ? '10px 12px' : '14px 16px',
              background: '#f8fafc', borderRadius: isMobile ? '8px' : '10px', cursor: 'pointer', fontSize: isMobile ? '15px' : '18px', color: '#374151',
            }}>
              <input
                type="checkbox" checked={profile.is_anonim}
                onChange={(e) => setProfile(p => ({ ...p, is_anonim: e.target.checked }))}
                style={{ width: isMobile ? '18px' : '22px', height: isMobile ? '18px' : '22px', accentColor: '#1e3a8a', cursor: 'pointer' }}
              />
              <span>Kirim secara anonim (nama & kontak tidak tampil)</span>
            </label>
            {!profile.is_anonim && (
              <div style={{ marginTop: isMobile ? '8px' : '12px', display: 'grid', gap: isMobile ? '8px' : '12px' }}>
                <input type="text" placeholder="Nama (opsional)" value={profile.nama}
                  onChange={(e) => setProfile(p => ({ ...p, nama: e.target.value }))} style={getInputStyle(isMobile)} />
                <input type="text" placeholder="Email atau Telepon (opsional)"
                  value={profile.email || profile.telepon}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val.includes('@')) setProfile(p => ({ ...p, email: val, telepon: '' }))
                    else setProfile(p => ({ ...p, telepon: val, email: '' }))
                  }} style={getInputStyle(isMobile)} />
              </div>
            )}
            <input type="text" placeholder="Unit Kerja / Instansi (opsional)" value={profile.unit_kerja}
              onChange={(e) => setProfile(p => ({ ...p, unit_kerja: e.target.value }))}
              style={{ ...getInputStyle(isMobile), marginTop: isMobile ? '8px' : '12px' }} />

            {/* Jenis Kelamin — wajib */}
            <div style={{ marginTop: isMobile ? '12px' : '16px' }}>
              <label style={{ ...getLabelStyle(isMobile), marginBottom: isMobile ? '6px' : '10px' }}>
                Jenis Kelamin <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px' }}>
                {['Laki-laki', 'Perempuan'].map(jk => (
                  <button
                    key={jk}
                    type="button"
                    onClick={() => setProfile(p => ({ ...p, jenis_kelamin: jk }))}
                    style={{
                      flex: 1, padding: isMobile ? '10px 12px' : '14px 16px', borderRadius: isMobile ? '8px' : '10px', border: '2px solid',
                      borderColor: profile.jenis_kelamin === jk ? '#3b82f6' : '#e2e8f0',
                      background: profile.jenis_kelamin === jk ? '#eff6ff' : 'white',
                      color: profile.jenis_kelamin === jk ? '#1e3a8a' : '#64748b',
                      fontSize: isMobile ? '16px' : '20px', fontWeight: profile.jenis_kelamin === jk ? '700' : '500',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {jk === 'Laki-laki' ? '👨' : '👩'} {jk}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Add Facility Buttons */}
          {availableFacilities.length > 0 && (
            <div style={{ marginBottom: isMobile ? '14px' : '20px' }}>
              <label style={{ ...getLabelStyle(isMobile), marginBottom: isMobile ? '8px' : '12px' }}>
                Pilih Fasilitas <span style={{ color: '#dc2626' }}>*</span>
                <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: isMobile ? '13px' : '16px' }}> (minimal 1)</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px' }}>
                {availableFacilities.map(facility => {
                  const hasCQ = hasCustomQuestions(facility.name)
                  const cqCount = customQuestions[facility.name]?.filter(q => q.is_active).length || 0
                  return (
                    <button key={facility.id} type="button" onClick={() => addFacilityWithQuestions(facility.name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px', padding: isMobile ? '12px 14px' : '18px 20px',
                        borderRadius: isMobile ? '12px' : '14px', border: '2px solid #e2e8f0', background: 'white',
                        cursor: 'pointer', transition: 'all 0.15s', width: '100%', textAlign: 'left',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white' }}>
                      <div style={{
                        width: isMobile ? '44px' : '56px', height: isMobile ? '44px' : '56px', borderRadius: '12px', background: facility.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '22px' : '28px', flexShrink: 0,
                      }}>{facility.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 700, color: '#0f172a' }}>{facility.name}</div>
                        <div style={{ fontSize: isMobile ? '13px' : '16px', color: '#64748b', marginTop: '4px' }}>
                          {hasCQ
                            ? `${cqCount} pertanyaan siap dinilai`
                            : 'Belum ada pertanyaan'
                          }
                        </div>
                      </div>
                      <div style={{
                        width: isMobile ? '28px' : '36px', height: isMobile ? '28px' : '36px', borderRadius: '50%', border: '2px solid #cbd5e1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: isMobile ? '16px' : '20px', color: '#94a3b8', fontWeight: 700,
                      }}>+</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Wizard Questions */}
          {items.length > 0 && (
            <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
              {/* Step indicator */}
              <div style={{ marginBottom: isMobile ? '14px' : '20px', textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? '16px' : '20px', color: '#64748b', marginBottom: isMobile ? '6px' : '10px', fontWeight: 500 }}>
                  Pertanyaan {currentStep + 1} dari {items.length}
                </div>
                <div style={{ height: isMobile ? '8px' : '12px', background: '#e2e8f0', borderRadius: isMobile ? '4px' : '6px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${((currentStep + 1) / items.length) * 100}%`,
                    background: '#1e3a8a',
                    borderRadius: isMobile ? '4px' : '6px',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>

              {(() => {
                const item = items[currentStep]
                const facility = FACILITIES.find(f => f.name === item.fasilitas)
                const isLastStep = currentStep === items.length - 1
                return (
                  <div style={{
                    background: '#f8fafc', borderRadius: isMobile ? '12px' : '16px', padding: isMobile ? '16px' : '24px',
                    border: '2px solid #e2e8f0',
                  }}>
                    {/* Facility Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', marginBottom: isMobile ? '14px' : '20px' }}>
                      <div style={{
                        width: isMobile ? '44px' : '56px', height: isMobile ? '44px' : '56px', borderRadius: '12px', background: facility?.color || '#e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '22px' : '28px', flexShrink: 0,
                      }}>{facility?.icon || '🏢'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: isMobile ? '17px' : '22px', fontWeight: 700, color: facility?.textColor || '#0f172a' }}>
                          {item.fasilitas}
                        </div>
                        <div style={{ fontSize: isMobile ? '13px' : '16px', color: '#94a3b8' }}>
                          {items.filter(i => i.fasilitas === item.fasilitas).length} pertanyaan untuk fasilitas ini
                        </div>
                      </div>
                    </div>

                    {/* Question Card */}
                    <div style={{
                      background: 'white', borderRadius: isMobile ? '12px' : '14px', padding: isMobile ? '14px' : '20px',
                      border: '2px solid #e2e8f0',
                    }}>
                      {/* Question Label */}
                      <div style={{ marginBottom: isMobile ? '12px' : '16px' }}>
                        <label style={{ fontSize: isMobile ? '14px' : '18px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: isMobile ? '6px' : '8px' }}>
                          Pertanyaan <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <div style={{
                          padding: isMobile ? '10px 12px' : '14px 16px', background: '#eff6ff', borderRadius: isMobile ? '8px' : '10px',
                          border: '1px solid #dbeafe', fontSize: isMobile ? '17px' : '22px', color: '#1e3a8a', fontWeight: 600, lineHeight: 1.4,
                        }}>
                          {item.aspek}
                        </div>
                      </div>

                      {/* Answer input based on tipe */}
                      {(item.tipe || 'rating') === 'pilihan_ganda' && item.opsi_pilihan ? (
                        <div style={{ marginBottom: isMobile ? '8px' : '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '6px' : '10px' }}>
                            {item.opsi_pilihan.map((opsi, idx) => (
                              <label key={idx} style={{
                                display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px',
                                padding: isMobile ? '10px 12px' : '14px 16px', borderRadius: isMobile ? '8px' : '10px', cursor: 'pointer',
                                background: item.jawaban_pilihan === opsi ? '#eff6ff' : 'white',
                                border: '2px solid',
                                borderColor: item.jawaban_pilihan === opsi ? '#3b82f6' : '#e2e8f0',
                                fontSize: isMobile ? '16px' : '20px', color: '#0f172a', transition: 'all 0.15s',
                              }}>
                                <input
                                  type="radio"
                                  name={`pg-${item.id}`}
                                  checked={item.jawaban_pilihan === opsi}
                                  onChange={() => updateItem(item.id, 'jawaban_pilihan', opsi)}
                                  style={{ width: isMobile ? '18px' : '24px', height: isMobile ? '18px' : '24px', accentColor: '#1e3a8a', cursor: 'pointer', flexShrink: 0 }}
                                />
                                <span style={{ fontWeight: item.jawaban_pilihan === opsi ? 700 : 500 }}>
                                  {String.fromCharCode(65 + idx)}. {opsi}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : (item.tipe || 'rating') === 'checkbox' && item.opsi_pilihan ? (
                        <div style={{ marginBottom: isMobile ? '8px' : '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '6px' : '10px' }}>
                            {(() => {
                              const selectedArr = parseCheckboxJawaban(item.jawaban_pilihan)
                              return item.opsi_pilihan.map((opsi, idx) => {
                                const isChecked = selectedArr.includes(opsi)
                                return (
                                  <label key={idx} style={{
                                    display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px',
                                    padding: isMobile ? '10px 12px' : '14px 16px', borderRadius: isMobile ? '8px' : '10px', cursor: 'pointer',
                                    background: isChecked ? '#eff6ff' : 'white',
                                    border: '2px solid',
                                    borderColor: isChecked ? '#3b82f6' : '#e2e8f0',
                                    fontSize: isMobile ? '16px' : '20px', color: '#0f172a', transition: 'all 0.15s',
                                  }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        let nextArr = isChecked
                                          ? selectedArr.filter(v => v !== opsi)
                                          : [...selectedArr, opsi]
                                        updateItem(item.id, 'jawaban_pilihan', JSON.stringify(nextArr))
                                      }}
                                      style={{ width: isMobile ? '18px' : '24px', height: isMobile ? '18px' : '24px', accentColor: '#1e3a8a', cursor: 'pointer', flexShrink: 0 }}
                                    />
                                    <span style={{ fontWeight: isChecked ? 700 : 500 }}>
                                      {String.fromCharCode(65 + idx)}. {opsi}
                                    </span>
                                  </label>
                                )
                              })
                            })()}
                          </div>
                        </div>
                      ) : (item.tipe || 'rating') === 'teks' ? (
                        <textarea value={item.penjelasan}
                          onChange={(e) => updateItem(item.id, 'penjelasan', e.target.value)}
                          placeholder={`Jelaskan jawaban Anda untuk "${item.aspek}"...`}
                          rows={3}
                          style={{
                            width: '100%', padding: isMobile ? '10px 12px' : '14px 16px', border: '2px solid #e2e8f0',
                            borderRadius: isMobile ? '8px' : '10px', fontSize: isMobile ? '16px' : '20px', color: '#0f172a', resize: 'vertical',
                            minHeight: isMobile ? '72px' : '100px', fontFamily: "'Segoe UI', system-ui, sans-serif", outline: 'none',
                            boxSizing: 'border-box',
                          }} />
                      ) : (
                        <>
                          {/* Rating with labels */}
                          <div style={{ marginBottom: isMobile ? '12px' : '16px' }}>
                            <div style={{ display: 'flex', gap: isMobile ? '4px' : '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              {[1, 2, 3, 4, 5].map(star => (
                                <button key={star} type="button"
                                  onClick={() => updateItem(item.id, 'rating', star)}
                                  style={{
                                    background: 'transparent', border: 'none', fontSize: isMobile ? '28px' : '36px',
                                    cursor: 'pointer', padding: '4px', lineHeight: 1,
                                    filter: star <= item.rating ? 'none' : 'grayscale(1)',
                                    opacity: star <= item.rating ? 1 : 0.3, transition: 'all 0.15s',
                                  }}>⭐</button>
                              ))}
                              <span style={{
                                fontSize: isMobile ? '14px' : '18px', fontWeight: 700, marginLeft: '4px',
                                color: item.rating > 0 ? '#047857' : '#94a3b8',
                                background: item.rating > 0 ? '#dcfce7' : 'transparent',
                                padding: item.rating > 0 ? '4px 12px' : '0',
                                borderRadius: '6px',
                              }}>
                                {item.rating > 0 ? `${item.rating}/5 — ${RATING_LABELS[item.rating]}` : 'Pilih rating 1-5'}
                              </span>
                            </div>
                            {/* Rating scale hint */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: isMobile ? '6px' : '8px', padding: '0 4px' }}>
                              <span style={{ fontSize: isMobile ? '13px' : '16px', color: '#ef4444', fontWeight: 600 }}>Buruk</span>
                              <span style={{ fontSize: isMobile ? '13px' : '16px', color: '#10b981', fontWeight: 600 }}>Sangat Baik</span>
                            </div>
                          </div>

                          {/* Penjelasan */}
                          <textarea value={item.penjelasan}
                            onChange={(e) => updateItem(item.id, 'penjelasan', e.target.value)}
                            placeholder={`Jelaskan penilaian Anda untuk "${item.aspek}"...`}
                            rows={3}
                            style={{
                              width: '100%', padding: isMobile ? '10px 12px' : '14px 16px', border: '2px solid #e2e8f0',
                              borderRadius: isMobile ? '8px' : '10px', fontSize: isMobile ? '16px' : '20px', color: '#0f172a', resize: 'vertical',
                              minHeight: isMobile ? '72px' : '100px', fontFamily: "'Segoe UI', system-ui, sans-serif", outline: 'none',
                              boxSizing: 'border-box',
                            }} />
                        </>
                      )}

                      {/* Navigation Buttons */}
                      <div style={{ display: 'flex', gap: isMobile ? '10px' : '16px', marginTop: isMobile ? '16px' : '24px' }}>
                        {currentStep > 0 && (
                          <button type="button" onClick={goPrev}
                            style={{
                              flex: 1, padding: isMobile ? '12px' : '18px', background: '#f1f5f9', color: '#475569', border: 'none',
                              borderRadius: isMobile ? '10px' : '12px', fontSize: isMobile ? '16px' : '20px', fontWeight: '700', cursor: 'pointer',
                              transition: 'background 0.15s',
                            }}>
                            ← Sebelumnya
                          </button>
                        )}
                        {!isLastStep ? (
                          <button type="button" onClick={goNext}
                            style={{
                              flex: 1, padding: isMobile ? '12px' : '18px', background: '#1e3a8a', color: 'white', border: 'none',
                              borderRadius: isMobile ? '10px' : '12px', fontSize: isMobile ? '16px' : '20px', fontWeight: '700', cursor: 'pointer',
                              transition: 'background 0.15s',
                            }}>
                            Berikutnya →
                          </button>
                        ) : (
                          <button type="submit" disabled={loading}
                            style={{
                              flex: 1, padding: isMobile ? '12px' : '18px', background: loading ? '#93c5fd' : '#059669', color: 'white', border: 'none',
                              borderRadius: isMobile ? '10px' : '12px', fontSize: isMobile ? '16px' : '20px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                              transition: 'background 0.15s',
                            }}>
                            {loading ? (
                              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                <span style={{
                                  width: isMobile ? '18px' : '24px', height: isMobile ? '18px' : '24px', border: '3px solid rgba(255,255,255,0.3)',
                                  borderTopColor: 'white', borderRadius: '50%', display: 'inline-block',
                                  animation: 'spin 0.7s linear infinite',
                                }} /> Mengirim...
                              </span>
                            ) : (
                              '✓ Kirim Kritik & Saran'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </form>

        <p style={{
          textAlign: 'center', marginTop: isMobile ? '14px' : '20px', color: '#9ca3af', fontSize: isMobile ? '13px' : '16px', lineHeight: '1.5',
        }}>
          Masukan Anda akan ditinjau oleh pimpinan USC.<br/>Tidak akan dipublikasikan atau ditampilkan di layar publik.
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function getPageStyle(isMobile) {
  return {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a1228 0%, #1e3a8a 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: isMobile ? '8px' : '20px',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  }
}

function getLabelStyle(isMobile) {
  return {
    display: 'block',
    fontSize: isMobile ? '15px' : '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: isMobile ? '6px' : '10px',
  }
}

function getInputStyle(isMobile) {
  return {
    width: '100%',
    padding: isMobile ? '10px 12px' : '14px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: isMobile ? '8px' : '10px',
    fontSize: isMobile ? '15px' : '18px',
    color: '#0f172a',
    background: 'white',
    outline: 'none',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    boxSizing: 'border-box',
  }
}
