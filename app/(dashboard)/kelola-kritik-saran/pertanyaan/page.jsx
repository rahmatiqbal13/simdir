'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

// Must match the FACILITIES array in public page
const FACILITIES = [
  { id: 'achilles-gym', name: 'Achilles Gym Hub', icon: '🏋️', color: '#dbeafe', textColor: '#1e3a8a' },
  { id: 'kolam-renang', name: 'Kolam Renang Unesa', icon: '🏊', color: '#dcfce7', textColor: '#047857' },
  { id: 'driving-golf', name: 'Driving Golf Unesa', icon: '⛳', color: '#fef3c7', textColor: '#b45309' },
]

export default function PertanyaanKritikSaranPage() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFacility, setSelectedFacility] = useState(FACILITIES[0].name)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [newQuestion, setNewQuestion] = useState('')
  const [newTipe, setNewTipe] = useState('rating')
  const [newOpsi, setNewOpsi] = useState(['', ''])
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
      if (newTipe === 'pilihan_ganda') {
        const opsi = newOpsi.filter(o => o.trim()).map(o => o.trim())
        if (opsi.length < 2) {
          setError('Pilihan ganda memerlukan minimal 2 opsi')
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
      const res = await fetch('/api/pertanyaan-kritik-saran', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, pertanyaan: editText.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengupdate')
      setEditingId(null)
      setEditText('')
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

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus pertanyaan ini?')) return
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
      setError(err.message)
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
        <Link href="/kelola-kritik-saran" style={{ color: '#3b82f6', textDecoration: 'none' }}>Kritik & Saran</Link>
        <span style={{ color: '#9ca3af' }}>/</span>
        <span style={{ color: '#64748b', fontWeight: 600 }}>Pertanyaan</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem' }}>
          Pertanyaan Kritik & Saran
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
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
                borderColor: selectedFacility === f.name ? '#3b82f6' : '#e2e8f0',
                background: selectedFacility === f.name ? '#eff6ff' : 'white',
                color: selectedFacility === f.name ? '#1e3a8a' : '#64748b',
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
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem',
      }}>
        <StatCard label="Total Pertanyaan" value={totalCount} bg="#f8fafc" color="#0f172a" />
        <StatCard label="Aktif" value={activeCount} bg="#f0fdf4" color="#047857" />
        <StatCard label="Nonaktif" value={totalCount - activeCount} bg="#fef2f2" color="#dc2626" />
      </div>

      {/* Add New Question */}
      <div style={{
        background: 'white', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', margin: '0 0 0.75rem' }}>
          + Tambah Pertanyaan Baru untuk {selectedFacility}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Contoh: Bagaimana kebersihan lantai gym?"
            style={{
              width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0',
              borderRadius: '8px', fontSize: '14px', color: '#0f172a', outline: 'none',
              fontFamily: "'Segoe UI', system-ui, sans-serif", boxSizing: 'border-box',
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          />
          {/* Tipe selector */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Tipe:</span>
            {[
              { value: 'rating', label: '⭐ Rating 1-5' },
              { value: 'teks', label: '📝 Teks' },
              { value: 'pilihan_ganda', label: '🔘 Pilihan Ganda' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setNewTipe(opt.value)}
                style={{
                  padding: '5px 10px', borderRadius: '6px', border: '1.5px solid',
                  borderColor: newTipe === opt.value ? '#3b82f6' : '#e2e8f0',
                  background: newTipe === opt.value ? '#eff6ff' : 'white',
                  color: newTipe === opt.value ? '#1e3a8a' : '#64748b',
                  fontSize: '12px', fontWeight: newTipe === opt.value ? '600' : '400',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Opsi pilihan ganda */}
          {newTipe === 'pilihan_ganda' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>Opsi Pilihan:</span>
              {newOpsi.map((opsi, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', width: '22px', fontWeight: 600 }}>
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
                      flex: 1, padding: '7px 10px', border: '1.5px solid #e2e8f0',
                      borderRadius: '6px', fontSize: '13px', color: '#0f172a', outline: 'none',
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
                  background: 'white', color: '#3b82f6', fontSize: '11px', fontWeight: '600',
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
              background: '#f8fafc', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#374151',
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
        <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#94a3b8' }}>
          Pengguna akan melihat pertanyaan ini saat memilih fasilitas {selectedFacility} di form publik.
        </p>
      </div>

      {/* Questions List */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', margin: 0 }}>
            Daftar Pertanyaan — {selectedFacility}
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {facilityQuestions.length} pertanyaan
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : facilityQuestions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
            <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
              Belum ada pertanyaan
            </div>
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>
              Tambah pertanyaan di atas atau gunakan aspek default (Sarana, Prasarana, dll) di form publik
            </div>
          </div>
        ) : (
          <div>
            {facilityQuestions.map((q, index) => (
              <div
                key={q.id}
                style={{
                  padding: '14px 16px', borderBottom: '1px solid #f1f5f9',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: q.is_active ? 'white' : '#f8fafc',
                  opacity: q.is_active ? 1 : 0.7,
                }}
              >
                {/* Order number / drag handle */}
                <div style={{
                  width: '28px', height: '28px', borderRadius: '6px', background: '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, color: '#64748b', flexShrink: 0,
                }}>
                  {index + 1}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === q.id ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        style={{
                          flex: 1, padding: '8px 10px', border: '1.5px solid #3b82f6',
                          borderRadius: '6px', fontSize: '14px', color: '#0f172a', outline: 'none',
                          fontFamily: "'Segoe UI', system-ui, sans-serif",
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(q.id)
                          if (e.key === 'Escape') { setEditingId(null); setEditText('') }
                        }}
                        autoFocus
                      />
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
                          padding: '6px 12px', background: '#f1f5f9', color: '#64748b',
                          border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500, wordBreak: 'break-word' }}>
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
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {q.tipe === 'rating' ? '⭐ Rating 1-5' : q.tipe === 'pilihan_ganda' ? '🔘 Pilihan Ganda' : '📝 Teks'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  {/* Move up */}
                  <button
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0 || saving}
                    title="Naikkan urutan"
                    style={{
                      width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                      background: 'transparent', color: index === 0 ? '#cbd5e1' : '#64748b',
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
                    style={{
                      width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                      background: 'transparent', color: index === facilityQuestions.length - 1 ? '#cbd5e1' : '#64748b',
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
                    style={{
                      width: '28px', height: '28px', borderRadius: '6px', border: 'none',
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
                    onClick={() => { setEditingId(q.id); setEditText(q.pertanyaan) }}
                    disabled={saving || editingId === q.id}
                    title="Edit"
                    style={{
                      width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                      background: '#eff6ff', color: '#3b82f6',
                      fontSize: '14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ✏️
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(q.id)}
                    disabled={saving}
                    title="Hapus"
                    style={{
                      width: '28px', height: '28px', borderRadius: '6px', border: 'none',
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
          <li>Jika fasilitas tidak memiliki pertanyaan aktif, form publik akan menampilkan aspek default (Sarana, Prasarana, dll).</li>
          <li>Urutan menentukan posisi pertanyaan di form publik.</li>
          <li>Tipe pertanyaan: Rating ⭐1-5, Teks 📝, atau Pilihan Ganda 🔘.</li>
        </ul>
      </div>
    </div>
  )
}

function StatCard({ label, value, bg, color }) {
  return (
    <div style={{ background: bg, borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 600 }}>
        {label}
      </div>
    </div>
  )
}
