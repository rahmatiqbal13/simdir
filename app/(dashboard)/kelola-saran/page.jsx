'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/app/components/Toast'

const JENIS_META = {
  kritik:              { label: 'Kritik',              icon: '⚠️', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  saran:               { label: 'Saran',               icon: '💡', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  permohonan_kelas:    { label: 'Permohonan Kelas',    icon: '📚', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  permohonan_kegiatan: { label: 'Permohonan Kegiatan', icon: '🎯', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
}

const STATUS_META = {
  baru:      { label: 'Baru',      bg: '#fef2f2', color: '#dc2626' },
  dibaca:    { label: 'Dibaca',    bg: '#fefce8', color: '#b45309' },
  diproses:  { label: 'Diproses', bg: '#eff6ff', color: '#2563eb' },
  selesai:   { label: 'Selesai',   bg: '#f0fdf4', color: '#16a34a' },
  ditolak:   { label: 'Ditolak',   bg: '#f8fafc', color: '#64748b' },
}

export default function KelolaSaranPage() {
  const { success: toastSuccess, error: toastError } = useToast()
  const [items, setItems]                 = useState([])
  const [loading, setLoading]             = useState(true)
  const [filterStatus, setFilterStatus]   = useState('')
  const [filterJenis, setFilterJenis]     = useState('')
  const [selectedItem, setSelectedItem]   = useState(null)
  const [tanggapan, setTanggapan]         = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)
  const [deleteItem, setDeleteItem]       = useState(null)
  const [deleteStep, setDeleteStep]       = useState(0)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [userRole, setUserRole]           = useState('')

  useEffect(() => {
    try {
      const s = localStorage.getItem('simdir_session')
      if (s) setUserRole(JSON.parse(atob(s)).role || '')
    } catch {}
  }, [])

  const isSuperAdmin = userRole === 'super_admin'

  const authHeaders = useCallback(() => {
    try {
      const s = localStorage.getItem('simdir_session')
      if (!s) return { 'Content-Type': 'application/json' }
      const d = JSON.parse(atob(s))
      return { 'Content-Type': 'application/json', authorization: `Bearer ${d.token || d.role || 'session'}` }
    } catch { return { 'Content-Type': 'application/json' } }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/saran', { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [authHeaders])

  useEffect(() => {
    fetchData()
    const id = setInterval(() => { if (!selectedItem) fetchData() }, 300000)
    return () => clearInterval(id)
  }, [fetchData, selectedItem])

  const filtered = items.filter(it => {
    if (filterStatus && it.status !== filterStatus) return false
    if (filterJenis && it.jenis !== filterJenis) return false
    return true
  })

  const stats = {
    total: items.length,
    baru:  items.filter(i => i.status === 'baru').length,
    permohonan: items.filter(i => i.jenis === 'permohonan_kelas' || i.jenis === 'permohonan_kegiatan').length,
    selesai: items.filter(i => i.status === 'selesai').length,
  }

  const updateStatus = async (id, status) => {
    setUpdateLoading(true)
    try {
      const res = await fetch('/api/saran', { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ id, status }) })
      if (!res.ok) throw new Error((await res.json()).error)
      await fetchData()
      if (selectedItem?.id === id) setSelectedItem(prev => ({ ...prev, status }))
    } catch (err) { toastError('Gagal: ' + err.message) }
    finally { setUpdateLoading(false) }
  }

  const saveTanggapan = async () => {
    if (!selectedItem) return
    setUpdateLoading(true)
    try {
      const res = await fetch('/api/saran', {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ id: selectedItem.id, tanggapan, status: 'selesai' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await fetchData()
      setSelectedItem(prev => ({ ...prev, tanggapan, status: 'selesai' }))
    } catch (err) { toastError('Gagal: ' + err.message) }
    finally { setUpdateLoading(false) }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/saran?id=${deleteItem.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) throw new Error((await res.json()).error)
      await fetchData()
      if (selectedItem?.id === deleteItem.id) setSelectedItem(null)
      setDeleteItem(null); setDeleteStep(0)
    } catch (err) { toastError('Gagal: ' + err.message) }
    finally { setDeleteLoading(false) }
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
  const fmtDateOnly = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Kelola Kritik & Saran</h1>
        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', margin: 0 }}>
          Tinjau dan tindaklanjuti kritik, saran, serta permohonan dari pengguna
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Masuk',   value: stats.total,      bg: '#eff6ff', color: '#1e3a8a' },
          { label: 'Belum Dibaca',  value: stats.baru,       bg: '#fef2f2', color: '#dc2626' },
          { label: 'Permohonan',    value: stats.permohonan, bg: '#f0fdf4', color: '#16a34a' },
          { label: 'Selesai',       value: stats.selesai,    bg: '#fefce8', color: '#b45309' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select value={filterJenis} onChange={e => setFilterJenis(e.target.value)} style={selectStyle}>
          <option value="">Semua Jenis</option>
          {Object.entries(JENIS_META).map(([v, m]) => <option key={v} value={v}>{m.icon} {m.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">Semua Status</option>
          {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
        <button
          onClick={() => { setFilterJenis(''); setFilterStatus('') }}
          style={{ ...selectStyle, cursor: 'pointer', background: 'var(--surface)' }}
        >Reset</button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                {['Tanggal', 'Jenis', 'Fasilitas', 'Pengirim', 'Judul / Nama', 'Status', 'Aksi'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Tidak ada data</td></tr>
              ) : filtered.map(item => {
                const jm = JENIS_META[item.jenis] || JENIS_META.saran
                const sm = STATUS_META[item.status] || STATUS_META.baru
                const isPermohonan = item.jenis === 'permohonan_kelas' || item.jenis === 'permohonan_kegiatan'
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--surface-3)' }}>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-2)', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{fmtDate(item.created_at)}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700, background: jm.bg, color: jm.color, border: `1px solid ${jm.border}`, whiteSpace: 'nowrap' }}>
                        {jm.icon} {jm.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text)' }}>{item.fasilitas || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text)' }}>{item.is_anonim ? 'Anonim' : (item.nama || '-')}</div>
                      {item.unit_kerja && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{item.unit_kerja}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                        {isPermohonan ? item.nama_kelas_kegiatan : item.judul}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: sm.bg, color: sm.color }}>
                        {sm.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button
                        onClick={async () => {
                          setSelectedItem(item)
                          setTanggapan(item.tanggapan || '')
                          if (item.status === 'baru') {
                            try {
                              await fetch('/api/saran', { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ id: item.id, status: 'dibaca' }) })
                              setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'dibaca' } : i))
                            } catch {}
                          }
                        }}
                        style={{ padding: '0.375rem 0.875rem', borderRadius: 6, border: '1px solid #3b82f6', background: 'var(--surface)', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >Detail</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (() => {
        const jm = JENIS_META[selectedItem.jenis] || JENIS_META.saran
        const isPermohonan = selectedItem.jenis === 'permohonan_kelas' || selectedItem.jenis === 'permohonan_kegiatan'
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
            onClick={() => setSelectedItem(null)}>
            <div style={{ background: 'var(--surface)', borderRadius: 16, maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
              onClick={e => e.stopPropagation()}>

              {/* Modal Header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ padding: '3px 12px', borderRadius: 99, fontSize: '0.8125rem', fontWeight: 700, background: jm.bg, color: jm.color, border: `1px solid ${jm.border}` }}>
                      {jm.icon} {jm.label}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>{fmtDate(selectedItem.created_at)}</p>
                </div>
                <button onClick={() => setSelectedItem(null)} aria-label="Tutup" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--surface-3)', color: 'var(--text-3)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Pengirim */}
                <div>
                  <h3 style={sectionTitle}>Pengirim</h3>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{selectedItem.is_anonim ? 'Anonim' : (selectedItem.nama || '-')}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                      {selectedItem.jenis_kelamin && <span>{selectedItem.jenis_kelamin}</span>}
                      {selectedItem.unit_kerja && <span>🏢 {selectedItem.unit_kerja}</span>}
                      {selectedItem.telepon && <span>📱 {selectedItem.telepon}</span>}
                      {selectedItem.email && <span>📧 {selectedItem.email}</span>}
                    </div>
                  </div>
                </div>

                {/* Fasilitas */}
                <div>
                  <h3 style={sectionTitle}>Fasilitas / Layanan</h3>
                  <span style={{ padding: '4px 12px', borderRadius: 8, background: 'var(--surface-3)', color: 'var(--text)', fontWeight: 600, fontSize: '0.875rem' }}>{selectedItem.fasilitas}</span>
                </div>

                {/* Konten */}
                {isPermohonan ? (
                  <div>
                    <h3 style={sectionTitle}>Detail Permohonan</h3>
                    <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={detailRow}>
                        <span style={detailLabel}>Nama {selectedItem.jenis === 'permohonan_kelas' ? 'Kelas' : 'Kegiatan'}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{selectedItem.nama_kelas_kegiatan}</span>
                      </div>
                      <div style={detailRow}>
                        <span style={detailLabel}>Tanggal Diinginkan</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{fmtDateOnly(selectedItem.tanggal_diinginkan)}</span>
                      </div>
                      {selectedItem.estimasi_peserta && (
                        <div style={detailRow}>
                          <span style={detailLabel}>Estimasi Peserta</span>
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{selectedItem.estimasi_peserta} orang</span>
                        </div>
                      )}
                      {selectedItem.catatan && (
                        <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                          <div style={detailLabel}>Keterangan</div>
                          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.6 }}>{selectedItem.catatan}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 style={sectionTitle}>{selectedItem.judul}</h3>
                    <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.7, background: 'var(--surface-2)', borderRadius: 10, padding: '1rem' }}>
                      {selectedItem.isi}
                    </p>
                  </div>
                )}

                {/* Tanggapan lama jika ada */}
                {selectedItem.tanggapan && selectedItem.status !== 'selesai' && (
                  <div>
                    <h3 style={sectionTitle}>Tanggapan Sebelumnya</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text)', background: '#f0fdf4', borderRadius: 8, padding: '0.75rem', lineHeight: 1.6 }}>{selectedItem.tanggapan}</p>
                  </div>
                )}

                {/* Status */}
                <div>
                  <h3 style={sectionTitle}>Status</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {Object.entries(STATUS_META).map(([s, m]) => (
                      <button key={s} onClick={() => updateStatus(selectedItem.id, s)}
                        disabled={updateLoading || selectedItem.status === s}
                        style={{
                          padding: '0.5rem 1rem', borderRadius: 8, border: '1.5px solid',
                          borderColor: selectedItem.status === s ? m.color : 'var(--border)',
                          background: selectedItem.status === s ? m.bg : 'var(--surface)',
                          color: selectedItem.status === s ? m.color : 'var(--text-3)',
                          fontSize: '0.875rem', fontWeight: 600,
                          cursor: selectedItem.status === s ? 'default' : 'pointer',
                          opacity: selectedItem.status === s ? 1 : 0.75,
                        }}>{m.label}</button>
                    ))}
                  </div>
                </div>

                {/* Tulis Tanggapan */}
                <div>
                  <h3 style={sectionTitle}>Tulis Tanggapan</h3>
                  <textarea
                    value={tanggapan}
                    onChange={e => setTanggapan(e.target.value)}
                    placeholder={isPermohonan ? 'Tulis keputusan atau tindak lanjut permohonan ini...' : 'Tulis tanggapan atau tindak lanjut...'}
                    rows={4}
                    style={{ width: '100%', padding: '0.75rem', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '0.875rem', color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button onClick={saveTanggapan} disabled={updateLoading}
                    style={{ marginTop: 8, padding: '0.625rem 1.25rem', background: '#0f172a', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                    {updateLoading ? 'Menyimpan...' : '✓ Simpan Tanggapan & Tandai Selesai'}
                  </button>
                </div>

                {/* Hapus */}
                {isSuperAdmin && (
                  <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <button onClick={() => { setDeleteItem(selectedItem); setDeleteStep(1) }}
                      style={{ width: '100%', padding: '0.625rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                      🗑️ Hapus
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Delete Modal */}
      {deleteStep > 0 && deleteItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1rem' }}
          onClick={() => { setDeleteItem(null); setDeleteStep(0) }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, maxWidth: 480, width: '100%', padding: '1.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>
            {deleteStep === 1 && (
              <>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#dc2626', margin: '0 0 12px' }}>⚠️ Konfirmasi Hapus</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 20px' }}>
                  Hapus data dari <strong>{deleteItem.is_anonim ? 'Anonim' : (deleteItem.nama || '-')}</strong>?{' '}
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>Tindakan ini tidak dapat dibatalkan.</span>
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setDeleteItem(null); setDeleteStep(0) }} style={cancelBtnStyle}>Batal</button>
                  <button onClick={() => setDeleteStep(2)} style={dangerBtnStyle}>Lanjutkan →</button>
                </div>
              </>
            )}
            {deleteStep === 2 && (
              <>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#dc2626', margin: '0 0 12px' }}>⚠️ Konfirmasi Final</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 20px' }}>Apakah Anda benar-benar yakin?</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setDeleteStep(1)} style={cancelBtnStyle}>← Kembali</button>
                  <button onClick={handleDelete} disabled={deleteLoading} style={dangerBtnStyle}>
                    {deleteLoading ? 'Menghapus...' : '🗑️ Hapus Permanen'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const sectionTitle = { fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-2)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }
const detailRow    = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }
const detailLabel  = { fontSize: '0.8125rem', color: 'var(--text-3)', flexShrink: 0 }
const selectStyle  = { padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem', outline: 'none' }
const cancelBtnStyle = { flex: 1, padding: '0.625rem', background: 'var(--surface-3)', color: 'var(--text-2)', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }
const dangerBtnStyle = { flex: 1, padding: '0.625rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }
