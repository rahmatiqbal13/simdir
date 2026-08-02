'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import ConfirmModal from '@/app/components/ConfirmModal'

// Must match the FACILITIES array in the public page (app/(public)/penilaian/page.jsx)
const FACILITIES = [
  { id: 'achilles-gym', name: 'Achilles Gym Hub', icon: '🏋️', color: '#dbeafe', textColor: '#1e3a8a' },
  { id: 'kolam-renang', name: 'Kolam Renang Unesa', icon: '🏊', color: '#dcfce7', textColor: '#047857' },
  { id: 'driving-golf', name: 'Driving Golf Unesa', icon: '⛳', color: '#fef3c7', textColor: '#b45309' },
  { id: 'ssfc', name: 'SSFC', icon: '🏟️', color: '#fce7f3', textColor: '#9d174d' },
  { id: 'puipt-dic', name: 'PUIPT DIC', icon: '💡', color: '#fffbeb', textColor: '#b45309' },
  { id: 'puipt-serc', name: 'PUIPT SERC', icon: '🔬', color: '#ede9fe', textColor: '#5b21b6' },
  { id: 'pui-disabilitas', name: 'PUI Disabilitas', icon: '♿', color: '#ecfdf5', textColor: '#065f46' },
  { id: 'ulabk', name: 'ULABK', icon: '📖', color: '#fff7ed', textColor: '#c2410c' },
  { id: 'pui-seni', name: 'PUI Seni', icon: '🎨', color: '#fdf4ff', textColor: '#7c3aed' },
  { id: 'pui-olahraga', name: 'PUI Olahraga', icon: '🏅', color: '#fff1f2', textColor: '#be123c' },
  { id: 'usc-umum', name: 'USC (Umum)', icon: '🏛️', color: '#f0f9ff', textColor: '#0369a1' },
]

export default function PertanyaanKritikSaranPage() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFacility, setSelectedFacility] = useState(FACILITIES[0].name)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editTipe, setEditTipe] = useState('rating')
  const [editOpsi, setEditOpsi] = useState(['', ''])
  const [newQuestion, setNewQuestion] = useState('')
  const [newTipe, setNewTipe] = useState('rating')
  const [newOpsi, setNewOpsi] = useState(['', ''])
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const getAuthHeaders = useCallback(() => {
    const session = typeof window !== 'undefined' && localStorage.getItem('simdir_session')
    if (!session) return { 'Content-Type': 'application/json' }
    try {
      const decoded = JSON.parse(atob(session))
      return { 'Content-Type': 'application/json', authorization: `Bearer ${decoded.token || decoded.role || 'session'}` }
    } catch {
      return { 'Content-Type': 'application/json' }
    }
  }, [])

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pertanyaan-kritik-saran?active=false', {
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memuat')
      setQuestions(data.questions || [])
    } catch (err) {
      console.error('Error fetching questions:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const facilityQuestions = questions
    .filter(q => q.fasilitas_name === selectedFacility)
    .sort((a, b) => a.urutan - b.urutan)

  const handleAdd = async () => {
    if (!newQuestion.trim()) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        fasilitas_name: selectedFacility,
        pertanyaan: newQuestion.trim(),
        tipe: newTipe,
        urutan: facilityQuestions.length,
        is_active: isActive,
      }
      if (newTipe === 'pilihan_ganda' || newTipe === 'checkbox') {
        const opsi = newOpsi.filter(o => o.trim()).map(o => o.trim())
        if (opsi.length < 2) {
          setError('Pilihan ganda/checkbox memerlukan minimal 2 opsi')
          setSaving(false)
          return
        }
        payload.opsi_pilihan = opsi
      }

      const res = await fetch('/api/pertanyaan-kritik-saran', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menambah')
      setNewQuestion('')
      setNewTipe('rating')
      setNewOpsi(['', ''])
      setIsActive(true)
      setSuccess('Pertanyaan berhasil ditambahkan')
      await fetchQuestions()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id) => {
    if (!editText.trim()) return
    setSaving(true)
    setError('')
    try {
      const payload = { id, pertanyaan: editText.trim(), tipe: editTipe }
      if (editTipe === 'pilihan_ganda' || editTipe === 'checkbox') {
        payload.opsi_pilihan = editOpsi.filter(o => o.trim())
      }
      const res = await fetch('/api/pertanyaan-kritik-saran', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengupdate')
      setEditingId(null)
      setEditText('')
      setEditTipe('rating')
      setEditOpsi(['', ''])
      setSuccess('Pertanyaan berhasil diupdate')
      await fetchQuestions()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (q) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/pertanyaan-kritik-saran', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: q.id, is_active: !q.is_active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengupdate')
      await fetchQuestions()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async (q) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/pertanyaan-kritik-saran', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fasilitas_name: q.fasilitas_name,
          pertanyaan: `${q.pertanyaan} (salinan)`,
          tipe: q.tipe || 'rating',
          opsi_pilihan: q.opsi_pilihan ? q.opsi_pilihan.split('|').map(o => o.trim()).filter(Boolean) : undefined,
          urutan: (q.urutan || 0) + 1,
          is_active: q.is_active,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menduplikat')
      setSuccess('Pertanyaan berhasil diduplikat')
      await fetchQuestions()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/pertanyaan-kritik-saran?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus')
      setSuccess('Pertanyaan berhasil dihapus')
      await fetchQuestions()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= facilityQuestions.length) return

    const items = [...facilityQuestions]
    const temp = items[index]
    items[index] = items[targetIndex]
    items[targetIndex] = temp

    setSaving(true)
    try {
      for (let i = 0; i < items.length; i++) {
        const res = await fetch('/api/pertanyaan-kritik-saran', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ id: items[i].id, urutan: i }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Gagal mengupdate urutan')
        }
      }
      await fetchQuestions()
    } catch (err) {
      setError(err.message + ' — sebagian urutan mungkin sudah berubah, memuat ulang data terbaru.')
      await fetchQuestions()
    } finally {
      setSaving(false)
    }
  }

  const activeCount = facilityQuestions.filter(q => q.is_active).length
  const totalCount = facilityQuestions.length

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
        <Link href="/kelola-penilaian" style={{ color: '#3b82f6', textDecoration: 'none' }}>Penilaian Fasilitas</Link>
        <span style={{ color: '#9ca3af' }}>/</span>
        <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>Pertanyaan</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>
          Pertanyaan Kritik & Saran
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', margin: 0 }}>
          Atur pertanyaan khusus untuk setiap unit usaha/fasilitas
        </p>
      </div>

      {/* Alert */}
      {error && (
        <div style={{
          padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '14px',
        }}>{error}</div>
      )}
      {success && (
        <div style={{
          padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: '8px', color: '#16a34a', fontSize: '13px', marginBottom: '14px',
        }}>{success}</div>
      )}

      {/* Facility Selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
          Pilih Fasilitas
        </label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {FACILITIES.map(f => (
            <button
              key={f.id}
              onClick={() => { setSelectedFacility(f.name); setEditingId(null); setEditText('') }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                borderRadius: '10px', border: '2px solid',
                borderColor: selectedFacility === f.name ? '#3b82f6' : 'var(--border)',
                background: selectedFacility === f.name ? '#eff6ff' : 'var(--surface)',
                color: selectedFacility === f.name ? '#1e3a8a' : 'var(--text-3)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '18px' }}>{f.icon}</span>
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stats for selected facility */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem',
      }}>
        <StatCard label="Total Pertanyaan" value={totalCount} bg="var(--surface-2)" color="var(--text)" />
        <StatCard label="Aktif" value={activeCount} bg="#f0fdf4" color="#047857" />
        <StatCard label="Nonaktif" value={totalCount - activeCount} bg="#fef2f2" color="#dc2626" />
      </div>

      {/* Add New Question */}
      <div style={{
        background: 'var(--surface)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border)',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-2)', margin: '0 0 0.75rem' }}>
          + Tambah Pertanyaan Baru untuk {selectedFacility}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Contoh: Bagaimana kebersihan lantai gym?"
            style={{
              width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)',
              borderRadius: '8px', fontSize: '14px', color: 'var(--text)', outline: 'none',
              fontFamily: "'Segoe UI', system-ui, sans-serif", boxSizing: 'border-box',
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          />
          {/* Tipe selector */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-2)', fontWeight: 500 }}>Tipe:</span>
            {[
              { value: 'rating', label: '⭐ Rating 1-5' },
              { value: 'teks', label: '📝 Teks' },
              { value: 'pilihan_ganda', label: '🔘 Pilihan Ganda' },
              { value: 'checkbox', label: '☑️ Checkbox (Pilihan Multiple)' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setNewTipe(opt.value)}
                style={{
                  padding: '5px 10px', borderRadius: '6px', border: '1.5px solid',
                  borderColor: newTipe === opt.value ? '#3b82f6' : 'var(--border)',
                  background: newTipe === opt.value ? '#eff6ff' : 'var(--surface)',
                  color: newTipe === opt.value ? '#1e3a8a' : 'var(--text-3)',
                  fontSize: '12px', fontWeight: newTipe === opt.value ? '600' : '400',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Opsi pilihan ganda / checkbox */}
          {(newTipe === 'pilihan_ganda' || newTipe === 'checkbox') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500 }}>Opsi Pilihan:</span>
              {newOpsi.map((opsi, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)', width: '22px', fontWeight: 600 }}>
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <input
                    type="text"
                    value={opsi}
                    onChange={(e) => {
                      const next = [...newOpsi]
                      next[idx] = e.target.value
                      setNewOpsi(next)
                    }}
                    placeholder={`Opsi ${String.fromCharCode(65 + idx)}`}
                    style={{
                      flex: 1, padding: '7px 10px', border: '1.5px solid var(--border)',
                      borderRadius: '6px', fontSize: '13px', color: 'var(--text)', outline: 'none',
                      fontFamily: "'Segoe UI', system-ui, sans-serif",
                    }}
                  />
                  {newOpsi.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setNewOpsi(prev => prev.filter((_, i) => i !== idx))}
                      style={{
                        padding: '4px 8px', borderRadius: '4px', border: 'none',
                        background: '#fee2e2', color: '#dc2626', fontSize: '11px',
                        cursor: 'pointer', fontWeight: 600,
                      }}
                    >
                      Hapus
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setNewOpsi(prev => [...prev, ''])}
                style={{
                  padding: '5px 10px', borderRadius: '6px', border: '1.5px dashed #3b82f6',
                  background: 'var(--surface)', color: '#3b82f6', fontSize: '11px', fontWeight: '600',
                  cursor: 'pointer', alignSelf: 'flex-start',
                }}
              >
                + Tambah Opsi
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px',
              background: 'var(--surface-2)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#374151',
              whiteSpace: 'nowrap',
            }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#1e3a8a', cursor: 'pointer' }}
              />
              Aktif
            </label>
            <button
              onClick={handleAdd}
              disabled={saving || !newQuestion.trim()}
              style={{
                padding: '10px 20px', background: saving || !newQuestion.trim() ? '#93c5fd' : '#1e3a8a',
                color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px',
                fontWeight: '600', cursor: saving || !newQuestion.trim() ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {saving ? '...' : 'Tambah'}
            </button>
          </div>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--text-3)' }}>
          Pengguna akan melihat pertanyaan ini saat memilih fasilitas {selectedFacility} di form publik.
        </p>
      </div>

      {/* Questions List */}
      <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-2)', margin: 0 }}>
            Daftar Pertanyaan — {selectedFacility}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
            {facilityQuestions.length} pertanyaan
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : facilityQuestions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
            <div style={{ color: 'var(--text-3)', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
              Belum ada pertanyaan
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: '13px' }}>
              Tambah pertanyaan di atas agar muncul di form publik
            </div>
          </div>
        ) : (
          <div>
            {facilityQuestions.map((q, index) => (
              <div
                key={q.id}
                style={{
                  padding: '14px 16px', borderBottom: '1px solid var(--surface-3)',
                  display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                  background: q.is_active ? 'var(--surface)' : 'var(--surface-2)',
                  opacity: q.is_active ? 1 : 0.7,
                }}
              >
                {/* Order number / drag handle */}
                <div style={{
                  width: '28px', height: '28px', borderRadius: '6px', background: 'var(--surface-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', flexShrink: 0,
                }}>
                  {index + 1}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === q.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          style={{
                            flex: 1, padding: '8px 10px', border: '1.5px solid #3b82f6',
                            borderRadius: '6px', fontSize: '14px', color: 'var(--text)', outline: 'none',
                            fontFamily: "'Segoe UI', system-ui, sans-serif",
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate(q.id)
                            if (e.key === 'Escape') { setEditingId(null); setEditText(''); setEditTipe('rating'); setEditOpsi(['', '']) }
                          }}
                          autoFocus
                        />
                        <select
                          value={editTipe}
                          onChange={(e) => setEditTipe(e.target.value)}
                          style={{
                            padding: '8px 10px', border: '1.5px solid #3b82f6',
                            borderRadius: '6px', fontSize: '14px', color: 'var(--text)', outline: 'none',
                          }}
                        >
                          <option value="rating">Rating</option>
                          <option value="teks">Teks</option>
                          <option value="pilihan_ganda">Pilihan Ganda</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                        <button
                          onClick={() => handleUpdate(q.id)}
                          disabled={saving}
                          style={{
                            padding: '6px 12px', background: '#1e3a8a', color: 'white',
                            border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                        Simpan
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditText('') }}
                        style={{
                          padding: '6px 12px', background: 'var(--surface-3)', color: 'var(--text-3)',
                          border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Batal
                      </button>
                      </div>
                      {(editTipe === 'pilihan_ganda' || editTipe === 'checkbox') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600 }}>Opsi Pilihan:</div>
                          {editOpsi.map((op, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={op}
                                placeholder={`Opsi ${idx + 1}`}
                                onChange={(e) => {
                                  const next = [...editOpsi]
                                  next[idx] = e.target.value
                                  setEditOpsi(next)
                                }}
                                style={{
                                  flex: 1, padding: '6px 8px', border: '1px solid var(--border-strong)',
                                  borderRadius: '4px', fontSize: '13px', color: 'var(--text)', outline: 'none',
                                }}
                              />
                              {editOpsi.length > 2 && (
                                <button
                                  onClick={() => setEditOpsi(prev => prev.filter((_, i) => i !== idx))}
                                  style={{
                                    padding: '4px 8px', background: '#fee2e2', color: '#dc2626',
                                    border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
                                  }}
                                >
                                  Hapus
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => setEditOpsi(prev => [...prev, ''])}
                            style={{
                              padding: '6px 10px', background: 'var(--surface-3)', color: '#3b82f6',
                              border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                              cursor: 'pointer', alignSelf: 'flex-start',
                            }}
                          >
                            + Tambah Opsi
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500, wordBreak: 'break-word' }}>
                      {q.pertanyaan}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                      background: q.is_active ? '#dcfce7' : '#fee2e2',
                      color: q.is_active ? '#047857' : '#dc2626',
                    }}>
                      {q.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                      {q.tipe === 'rating' ? '⭐ Rating 1-5' : q.tipe === 'pilihan_ganda' ? '🔘 Pilihan Ganda' : q.tipe === 'checkbox' ? '☑️ Checkbox' : '📝 Teks'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {/* Move up */}
                  <button
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0 || saving}
                    title="Naikkan urutan"
                    aria-label="Naikkan urutan"
                    style={{
                      width: '44px', height: '44px', borderRadius: '6px', border: 'none',
                      background: 'transparent', color: index === 0 ? 'var(--border-strong)' : 'var(--text-3)',
                      fontSize: '14px', cursor: index === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ↑
                  </button>
                  {/* Move down */}
                  <button
                    onClick={() => handleMove(index, 1)}
                    disabled={index === facilityQuestions.length - 1 || saving}
                    title="Turunkan urutan"
                    aria-label="Turunkan urutan"
                    style={{
                      width: '44px', height: '44px', borderRadius: '6px', border: 'none',
                      background: 'transparent', color: index === facilityQuestions.length - 1 ? 'var(--border-strong)' : 'var(--text-3)',
                      fontSize: '14px', cursor: index === facilityQuestions.length - 1 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ↓
                  </button>
                  {/* Toggle active */}
                  <button
                    onClick={() => handleToggleActive(q)}
                    disabled={saving}
                    title={q.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    aria-label={q.is_active ? 'Sembunyikan pertanyaan' : 'Tampilkan pertanyaan'}
                    style={{
                      width: '44px', height: '44px', borderRadius: '6px', border: 'none',
                      background: q.is_active ? '#fef2f2' : '#dcfce7',
                      color: q.is_active ? '#dc2626' : '#047857',
                      fontSize: '14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {q.is_active ? '🙈' : '👁️'}
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => {
                      setEditingId(q.id)
                      setEditText(q.pertanyaan)
                      setEditTipe(q.tipe || 'rating')
                      if (q.opsi_pilihan) {
                        setEditOpsi(q.opsi_pilihan.split('|').map(o => o.trim()).filter(Boolean))
                      } else {
                        setEditOpsi(['', ''])
                      }
                    }}
                    disabled={saving || editingId === q.id}
                    title="Edit"
                    aria-label="Edit pertanyaan"
                    style={{
                      width: '44px', height: '44px', borderRadius: '6px', border: 'none',
                      background: '#eff6ff', color: '#3b82f6',
                      fontSize: '14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ✏️
                  </button>
                  {/* Duplicate */}
                  <button
                    onClick={() => handleDuplicate(q)}
                    disabled={saving}
                    title="Duplikat"
                    aria-label="Duplikat pertanyaan"
                    style={{
                      width: '44px', height: '44px', borderRadius: '6px', border: 'none',
                      background: '#fef3c7', color: '#b45309',
                      fontSize: '14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    📋
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => setDeleteTarget(q)}
                    disabled={saving}
                    title="Hapus"
                    aria-label="Hapus pertanyaan"
                    style={{
                      width: '44px', height: '44px', borderRadius: '6px', border: 'none',
                      background: '#fee2e2', color: '#dc2626',
                      fontSize: '14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div style={{
        marginTop: '1.5rem', padding: '1rem', background: '#eff6ff', borderRadius: '10px',
        border: '1px solid #dbeafe',
      }}>
        <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 8px' }}>
          💡 Cara Kerja
        </h4>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>
          <li>Pertanyaan <strong>aktif</strong> akan muncul di form publik saat pengguna memilih fasilitas.</li>
          <li>Urutan menentukan posisi pertanyaan di form publik.</li>
          <li>Tipe pertanyaan: Rating ⭐1-5, Teks 📝, Pilihan Ganda 🔘, atau Checkbox ☑️ (pilihan multiple).</li>
        </ul>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Pertanyaan"
        message={deleteTarget ? <>Yakin ingin menghapus pertanyaan <strong>&ldquo;{deleteTarget.pertanyaan}&rdquo;</strong>? Tindakan ini tidak dapat dibatalkan.</> : ''}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        busy={saving}
        onConfirm={async () => {
          await handleDelete(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function StatCard({ label, value, bg, color }) {
  return (
    <div style={{ background: bg, borderRadius: '10px', padding: '1rem', border: '1px solid var(--border)', textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.25rem', fontWeight: 600 }}>
        {label}
      </div>
    </div>
  )
}
