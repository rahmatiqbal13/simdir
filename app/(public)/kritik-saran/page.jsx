'use client'

import { useState } from 'react'

// 🎯 Daftar fasilitas — tambah/edit di sini untuk fasilitas baru
const FACILITIES = [
  { id: 'achilles-gym', name: 'Achilles Gym Hub', icon: '🏋️', color: '#dbeafe', textColor: '#1e3a8a' },
  { id: 'kolam-renang', name: 'Kolam Renang Unesa', icon: '🏊', color: '#dcfce7', textColor: '#047857' },
  { id: 'driving-golf', name: 'Driving Golf Unesa', icon: '⛳', color: '#fef3c7', textColor: '#b45309' },
]

const ASPEK_LIST = ['Sarana', 'Prasarana', 'Pelayanan', 'Kebersihan', 'Keamanan', 'Lainnya']

// Helper: generate unique ID for each rating item
let nextId = 1
const genId = () => nextId++

export default function KritikSaranPage() {
  const [items, setItems] = useState([])
  const [profile, setProfile] = useState({
    nama: '', email: '', telepon: '', unit_kerja: '', is_anonim: false,
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // items = [{ id, fasilitas, aspek, rating, penjelasan }]

  const addItem = (fasilitasName, aspek) => {
    // Check if this exact fasilitas+aspek combo already exists
    if (items.some(i => i.fasilitas === fasilitasName && i.aspek === aspek)) return
    setItems(prev => [...prev, { id: genId(), fasilitas: fasilitasName, aspek, rating: 0, penjelasan: '' }])
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
    if (items.length === 0) return 'Pilih minimal 1 fasilitas dan aspek'
    for (const item of items) {
      if (!item.rating || item.rating < 1) return `Rating untuk ${item.fasilitas} - ${item.aspek} wajib diisi`
      if (!item.penjelasan.trim()) return `Penjelasan untuk ${item.fasilitas} - ${item.aspek} wajib diisi`
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
          items: items.map(({ fasilitas, aspek, rating, penjelasan }) => ({ fasilitas, aspek, rating, penjelasan })),
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
            Kritik dan saran Anda untuk {Object.keys(grouped).length} fasilitas ({items.length} penilaian) telah berhasil dikirim.
          </p>
          <button
            onClick={() => { setSubmitted(false); setItems([]); setProfile({ nama:'', email:'', telepon:'', unit_kerja:'', is_anonim:false }) }}
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
        maxWidth: '560px', width: '100%', background: 'white', borderRadius: '16px',
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
            Nilai setiap aspek: Sarana, Prasarana, Pelayanan, Kebersihan, Keamanan
          </p>
        </div>

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
                {availableFacilities.map(facility => (
                  <button key={facility.id} type="button" onClick={() => addItem(facility.name, 'Sarana')}
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
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Tap untuk mulai menilai</div>
                    </div>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #cbd5e1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', color: '#94a3b8', fontWeight: 700,
                    }}>+</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Grouped Items by Fasilitas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '18px' }}>
            {Object.entries(grouped).map(([fasilitasName, fasilitasItems]) => {
              const facility = FACILITIES.find(f => f.name === fasilitasName)
              const usedAspek = new Set(fasilitasItems.map(i => i.aspek))
              const availableAspek = ASPEK_LIST.filter(a => !usedAspek.has(a))

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
                        {fasilitasItems.length} aspek dinilai
                      </div>
                    </div>
                    <button type="button" onClick={() => {
                      // Remove all items for this fasilitas
                      setItems(prev => prev.filter(i => i.fasilitas !== fasilitasName))
                    }} style={{
                      padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#fee2e2',
                      color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontWeight: 600,
                    }}>Hapus Semua</button>
                  </div>

                  {/* Aspek Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                    {fasilitasItems.map(item => (
                      <div key={item.id} style={{
                        background: 'white', borderRadius: '10px', padding: '12px',
                        border: '1.5px solid #e2e8f0', position: 'relative',
                      }}>
                        {/* Remove single aspek */}
                        <button type="button" onClick={() => removeItem(item.id)}
                          style={{
                            position: 'absolute', top: '8px', right: '8px', width: '22px', height: '22px',
                            borderRadius: '50%', border: 'none', background: '#fee2e2', color: '#dc2626',
                            fontSize: '12px', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                          }}>×</button>

                        {/* Aspek Selector */}
                        <div style={{ marginBottom: '8px', paddingRight: '28px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                            Aspek <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {ASPEK_LIST.map(aspek => (
                              <button key={aspek} type="button"
                                onClick={() => {
                                  // Only allow change if new aspek not already used
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
                        </div>

                        {/* Rating */}
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
                            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>
                              {item.rating > 0 ? `${item.rating}/5` : 'Rating wajib'}
                            </span>
                          </div>
                        </div>

                        {/* Penjelasan */}
                        <textarea value={item.penjelasan}
                          onChange={(e) => updateItem(item.id, 'penjelasan', e.target.value)}
                          placeholder={`Jelaskan pengalaman Anda terkait ${item.aspek.toLowerCase()} di ${fasilitasName}...`}
                          rows={2}
                          style={{
                            width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0',
                            borderRadius: '8px', fontSize: '13px', color: '#0f172a', resize: 'vertical',
                            minHeight: '56px', fontFamily: "'Segoe UI', system-ui, sans-serif", outline: 'none',
                            boxSizing: 'border-box',
                          }} />
                      </div>
                    ))}
                  </div>

                  {/* Add More Aspek */}
                  {availableAspek.length > 0 && (
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
            ) : `Kirim Kritik & Saran (${Object.keys(grouped).length} fasilitas, ${items.length} penilaian)`}
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
