'use client'

import { useState, useEffect } from 'react'

// 🎯 Daftar fasilitas — tambah/edit di sini untuk fasilitas baru
const FACILITIES = [
  { id: 'achilles-gym', name: 'Achilles Gym Hub', icon: '🏋️', color: '#dbeafe', textColor: '#1e3a8a' },
  { id: 'kolam-renang', name: 'Kolam Renang Unesa', icon: '🏊', color: '#dcfce7', textColor: '#047857' },
  { id: 'driving-golf', name: 'Driving Golf Unesa', icon: '⛳', color: '#fef3c7', textColor: '#b45309' },
]

const ASPEK_LIST = ['Sarana', 'Prasarana', 'Pelayanan', 'Kebersihan', 'Keamanan', 'Lainnya']

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
    nama: '', email: '', telepon: '', unit_kerja: '', is_anonim: false,
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

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

  const addItem = (fasilitasName, aspek, pertanyaanId = null, tipe = 'rating', opsiPilihan = null) => {
    // Check if this exact fasilitas+aspek combo already exists
    if (items.some(i => i.fasilitas === fasilitasName && i.aspek === aspek)) return
    setItems(prev => [...prev, {
      id: genId(),
      fasilitas: fasilitasName,
      aspek,
      rating: 0,
      penjelasan: '',
      jawaban_pilihan: '',
      pertanyaan_id: pertanyaanId,
      tipe,
      opsi_pilihan: opsiPilihan,
    }])
    setError('')
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
      // Fallback: add default first aspect
      addItem(facilityName, 'Sarana')
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
    if (items.length === 0) return 'Pilih minimal 1 fasilitas untuk dinilai'
    for (const item of items) {
      const tipe = item.tipe || 'rating'
      if (tipe === 'pilihan_ganda') {
        if (!item.jawaban_pilihan || !item.jawaban_pilihan.trim()) {
          return `Pilihan untuk "${item.aspek}" wajib diisi`
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
    if (tipe === 'teks') return i.penjelasan.trim().length > 0
    return i.rating > 0 && i.penjelasan.trim().length > 0
  }).length
  const isComplete = totalItems > 0 && answeredItems === totalItems

  if (submitted) {
    return (
      <div style={pageStyle}>
        <div style={{
          maxWidth: '480px', width: '100%', background: 'white', borderRadius: '16px',
          padding: '40px 24px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            width: '72px', height: '72px', background: '#dcfce7', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: '32px',
          }}>✓</div>
          <h2 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '22px' }}>Terima Kasih!</h2>
          <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '15px', lineHeight: '1.6' }}>
            Kritik dan saran Anda untuk {totalFacilities} fasilitas ({totalItems} penilaian) telah berhasil dikirim.
          </p>
          <button
            onClick={() => {
              setSubmitted(false)
              setItems([])
              setProfile({ nama:'', email:'', telepon:'', unit_kerja:'', is_anonim:false })
            }}
            style={{
              padding: '12px 24px', background: '#1e3a8a', color: 'white', border: 'none',
              borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', width: '100%',
            }}
          >Kirim Lagi</button>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={{
        maxWidth: '580px', width: '100%', background: 'white', borderRadius: '16px',
        padding: '28px 22px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '52px', height: '52px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px', fontSize: '22px',
          }}>💬</div>
          <h1 style={{ margin: '0 0 4px', color: '#0f172a', fontSize: '20px', fontWeight: '700' }}>
            Kritik & Saran
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Unesa Science Center (USC)</p>
          <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '12px' }}>
            Berikan penilaian untuk fasilitas USC
          </p>
        </div>

        {/* Progress Bar */}
        {totalItems > 0 && (
          <div style={{
            marginBottom: '16px', padding: '10px 12px', background: '#f8fafc',
            borderRadius: '10px', border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                Progress: {answeredItems}/{totalItems} dijawab
              </span>
              <span style={{
                fontSize: '11px', fontWeight: 700,
                color: isComplete ? '#047857' : '#b45309',
                background: isComplete ? '#dcfce7' : '#fef3c7',
                padding: '2px 8px', borderRadius: '4px',
              }}>
                {isComplete ? 'Siap Kirim ✓' : 'Belum Lengkap'}
              </span>
            </div>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${totalItems > 0 ? (answeredItems / totalItems) * 100 : 0}%`,
                background: isComplete ? '#10b981' : '#3b82f6', borderRadius: '3px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '14px',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Profile */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px',
              background: '#f8fafc', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#374151',
            }}>
              <input
                type="checkbox" checked={profile.is_anonim}
                onChange={(e) => setProfile(p => ({ ...p, is_anonim: e.target.checked }))}
                style={{ width: '16px', height: '16px', accentColor: '#1e3a8a', cursor: 'pointer' }}
              />
              <span>Kirim secara anonim (nama & kontak tidak tampil)</span>
            </label>
            {!profile.is_anonim && (
              <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                <input type="text" placeholder="Nama (opsional)" value={profile.nama}
                  onChange={(e) => setProfile(p => ({ ...p, nama: e.target.value }))} style={inputStyle} />
                <input type="text" placeholder="Email atau Telepon (opsional)"
                  value={profile.email || profile.telepon}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val.includes('@')) setProfile(p => ({ ...p, email: val, telepon: '' }))
                    else setProfile(p => ({ ...p, telepon: val, email: '' }))
                  }} style={inputStyle} />
              </div>
            )}
            <input type="text" placeholder="Unit Kerja / Instansi (opsional)" value={profile.unit_kerja}
              onChange={(e) => setProfile(p => ({ ...p, unit_kerja: e.target.value }))}
              style={{ ...inputStyle, marginTop: '8px' }} />
          </div>

          {/* Add Facility Buttons */}
          {availableFacilities.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ ...labelStyle, marginBottom: '8px' }}>
                Pilih Fasilitas <span style={{ color: '#dc2626' }}>*</span>
                <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '12px' }}> (minimal 1)</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availableFacilities.map(facility => {
                  const hasCQ = hasCustomQuestions(facility.name)
                  const cqCount = customQuestions[facility.name]?.filter(q => q.is_active).length || 0
                  return (
                    <button key={facility.id} type="button" onClick={() => addFacilityWithQuestions(facility.name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                        borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white',
                        cursor: 'pointer', transition: 'all 0.15s', width: '100%', textAlign: 'left',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '10px', background: facility.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0,
                      }}>{facility.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{facility.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {hasCQ
                            ? `${cqCount} pertanyaan siap dinilai`
                            : 'Tap untuk mulai menilai (aspek default)'
                          }
                        </div>
                      </div>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #cbd5e1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', color: '#94a3b8', fontWeight: 700,
                      }}>+</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Grouped Items by Fasilitas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '18px' }}>
            {Object.entries(grouped).map(([fasilitasName, fasilitasItems]) => {
              const facility = FACILITIES.find(f => f.name === fasilitasName)
              const usedAspek = new Set(fasilitasItems.map(i => i.aspek))
              const availableAspek = ASPEK_LIST.filter(a => !usedAspek.has(a))
              const hasCQ = hasCustomQuestions(fasilitasName)

              return (
                <div key={fasilitasName} style={{
                  background: '#f8fafc', borderRadius: '14px', padding: '16px',
                  border: '2px solid #e2e8f0',
                }}>
                  {/* Fasilitas Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px', background: facility?.color || '#e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0,
                    }}>{facility?.icon || '🏢'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: facility?.textColor || '#0f172a' }}>
                        {fasilitasName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {fasilitasItems.length} {hasCQ ? 'pertanyaan' : 'aspek'} dinilai
                      </div>
                    </div>
                    <button type="button" onClick={() => {
                      setItems(prev => prev.filter(i => i.fasilitas !== fasilitasName))
                    }} style={{
                      padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#fee2e2',
                      color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontWeight: 600,
                    }}>Hapus Semua</button>
                  </div>

                  {/* Question/Aspek Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                    {fasilitasItems.map(item => (
                      <div key={item.id} style={{
                        background: 'white', borderRadius: '10px', padding: '12px',
                        border: '1.5px solid #e2e8f0', position: 'relative',
                      }}>
                        {/* Remove single item */}
                        <button type="button" onClick={() => removeItem(item.id)}
                          style={{
                            position: 'absolute', top: '8px', right: '8px', width: '22px', height: '22px',
                            borderRadius: '50%', border: 'none', background: '#fee2e2', color: '#dc2626',
                            fontSize: '12px', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                          }}>×</button>

                        {/* Aspek / Question Label */}
                        <div style={{ marginBottom: '8px', paddingRight: '28px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                            {item.pertanyaan_id ? 'Pertanyaan' : 'Aspek'} <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          {!hasCQ ? (
                            /* Aspect selector for non-custom-question facilities */
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {ASPEK_LIST.map(aspek => (
                                <button key={aspek} type="button"
                                  onClick={() => {
                                    if (aspek !== item.aspek && usedAspek.has(aspek)) return
                                    updateItem(item.id, 'aspek', aspek)
                                  }}
                                  style={{
                                    padding: '5px 10px', borderRadius: '6px', border: '1.5px solid',
                                    borderColor: item.aspek === aspek ? '#3b82f6' : '#e2e8f0',
                                    background: item.aspek === aspek ? '#eff6ff' : 'white',
                                    color: item.aspek === aspek ? '#1e3a8a' : usedAspek.has(aspek) ? '#cbd5e1' : '#64748b',
                                    fontSize: '11px', fontWeight: item.aspek === aspek ? '600' : '400',
                                    cursor: usedAspek.has(aspek) && item.aspek !== aspek ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.15s',
                                  }}>{aspek}</button>
                              ))}
                            </div>
                          ) : (
                            <div style={{
                              padding: '8px 10px', background: '#eff6ff', borderRadius: '6px',
                              border: '1px solid #dbeafe', fontSize: '13px', color: '#1e3a8a', fontWeight: 500,
                            }}>
                              {item.aspek}
                            </div>
                          )}
                        </div>

                        {/* Answer input based on tipe */}
                        {(item.tipe || 'rating') === 'pilihan_ganda' && item.opsi_pilihan ? (
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {item.opsi_pilihan.map((opsi, idx) => (
                                <label key={idx} style={{
                                  display: 'flex', alignItems: 'center', gap: '8px',
                                  padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                                  background: item.jawaban_pilihan === opsi ? '#eff6ff' : 'white',
                                  border: '1.5px solid',
                                  borderColor: item.jawaban_pilihan === opsi ? '#3b82f6' : '#e2e8f0',
                                  fontSize: '13px', color: '#0f172a', transition: 'all 0.15s',
                                }}>
                                  <input
                                    type="radio"
                                    name={`pg-${item.id}`}
                                    checked={item.jawaban_pilihan === opsi}
                                    onChange={() => updateItem(item.id, 'jawaban_pilihan', opsi)}
                                    style={{ width: '16px', height: '16px', accentColor: '#1e3a8a', cursor: 'pointer', flexShrink: 0 }}
                                  />
                                  <span style={{ fontWeight: item.jawaban_pilihan === opsi ? 600 : 400 }}>
                                    {String.fromCharCode(65 + idx)}. {opsi}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Rating with labels */}
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                {[1, 2, 3, 4, 5].map(star => (
                                  <button key={star} type="button"
                                    onClick={() => updateItem(item.id, 'rating', star)}
                                    style={{
                                      background: 'transparent', border: 'none', fontSize: '22px',
                                      cursor: 'pointer', padding: 0, lineHeight: 1,
                                      filter: star <= item.rating ? 'none' : 'grayscale(1)',
                                      opacity: star <= item.rating ? 1 : 0.3, transition: 'all 0.15s',
                                    }}>⭐</button>
                                ))}
                                <span style={{
                                  fontSize: '12px', fontWeight: 600, marginLeft: '4px',
                                  color: item.rating > 0 ? '#047857' : '#94a3b8',
                                  background: item.rating > 0 ? '#dcfce7' : 'transparent',
                                  padding: item.rating > 0 ? '2px 8px' : '0',
                                  borderRadius: '4px',
                                }}>
                                  {item.rating > 0 ? `${item.rating}/5 — ${RATING_LABELS[item.rating]}` : 'Pilih rating 1-5'}
                                </span>
                              </div>
                              {/* Rating scale hint */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', padding: '0 2px' }}>
                                <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 500 }}>Buruk</span>
                                <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 500 }}>Sangat Baik</span>
                              </div>
                            </div>

                            {/* Penjelasan */}
                            <textarea value={item.penjelasan}
                              onChange={(e) => updateItem(item.id, 'penjelasan', e.target.value)}
                              placeholder={`Jelaskan penilaian Anda untuk "${item.aspek}"...`}
                              rows={2}
                              style={{
                                width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0',
                                borderRadius: '8px', fontSize: '13px', color: '#0f172a', resize: 'vertical',
                                minHeight: '56px', fontFamily: "'Segoe UI', system-ui, sans-serif", outline: 'none',
                                boxSizing: 'border-box',
                              }} />
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add More Aspek (only for facilities without custom questions) */}
                  {!hasCQ && availableAspek.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', alignSelf: 'center' }}>+ Tambah aspek:</span>
                      {availableAspek.map(aspek => (
                        <button key={aspek} type="button" onClick={() => addItem(fasilitasName, aspek)}
                          style={{
                            padding: '5px 10px', borderRadius: '6px', border: '1.5px dashed #3b82f6',
                            background: 'white', color: '#3b82f6', fontSize: '11px', fontWeight: '600',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.target.style.background = '#eff6ff' }}
                          onMouseLeave={e => { e.target.style.background = 'white' }}>
                          + {aspek}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading || items.length === 0}
            style={{
              width: '100%', padding: '14px', background: loading || items.length === 0 ? '#93c5fd' : '#1e3a8a',
              color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px',
              fontWeight: '600', cursor: loading || items.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{
                  width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white', borderRadius: '50%', display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }} /> Mengirim...
              </span>
            ) : (
              isComplete
                ? `✓ Kirim Kritik & Saran (${totalFacilities} fasilitas, ${totalItems} penilaian)`
                : `Lengkapi dulu (${answeredItems}/${totalItems} dijawab)`
            )}
          </button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: '16px', color: '#9ca3af', fontSize: '11px', lineHeight: '1.5',
        }}>
          Masukan Anda akan ditinjau oleh pimpinan USC.<br/>Tidak akan dipublikasikan atau ditampilkan di layar publik.
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #0a1228 0%, #1e3a8a 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '20px', fontFamily: "'Segoe UI', system-ui, sans-serif",
}

const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px',
}

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: '8px', fontSize: '14px', color: '#0f172a', background: 'white',
  outline: 'none', fontFamily: "'Segoe UI', system-ui, sans-serif", boxSizing: 'border-box',
}
