'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useToast } from '@/app/components/Toast'

const FACILITY_COLORS = {
  'Achilles Gym Hub': { bg: '#dbeafe', text: '#1e3a8a' },
  'Kolam Renang Unesa': { bg: '#dcfce7', text: '#047857' },
  'Driving Golf Unesa': { bg: '#fef3c7', text: '#b45309' },
  'SSFC': { bg: '#fce7f3', text: '#9d174d' },
  'PUIPT DIC': { bg: '#fffbeb', text: '#b45309' },
  'PUIPT SERC': { bg: '#ede9fe', text: '#5b21b6' },
  'PUI Disabilitas': { bg: '#ecfdf5', text: '#065f46' },
  'ULABK': { bg: '#fff7ed', text: '#c2410c' },
  'PUI Seni': { bg: '#fdf4ff', text: '#7c3aed' },
  'PUI Olahraga': { bg: '#fff1f2', text: '#be123c' },
  'USC (Umum)': { bg: '#f0f9ff', text: '#0369a1' },
}

const ASPEK_COLORS = {
  'Sarana': '#3b82f6',
  'Prasarana': '#8b5cf6',
  'Pelayanan': '#f59e0b',
  'Kebersihan': '#10b981',
  'Keamanan': '#ef4444',
  'Lainnya': '#6b7280',
}

const STATUS_LABELS = {
  'baru': { text: 'Baru', bg: '#fef2f2', color: '#dc2626' },
  'dibaca': { text: 'Dibaca', bg: '#fefce8', color: '#b45309' },
  'ditanggapi': { text: 'Ditanggapi', bg: '#f0fdf4', color: '#16a34a' },
}

export default function KritikSaranAdminPage() {
  const { success: toastSuccess, error: toastError } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterFasilitas, setFilterFasilitas] = useState('')
  const [filterJenisKelamin, setFilterJenisKelamin] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [tanggapan, setTanggapan] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [deleteItem, setDeleteItem] = useState(null)
  const [deleteStep, setDeleteStep] = useState(0)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    try {
      const session = localStorage.getItem('simdir_session')
      if (session) {
        const decoded = JSON.parse(atob(session))
        setUserRole(decoded.role || '')
      }
    } catch {}
  }, [])

  const isSuperAdmin = userRole === 'super_admin'

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

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/kritik-saran', {
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memuat')
      setItems(data || [])
    } catch (err) {
      console.error('Error fetching kritik saran:', err)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => {
      if (!selectedItem) fetchData()
    }, 300000)
    return () => clearInterval(interval)
  }, [fetchData, selectedItem])

  const filteredItems = items.filter(item => {
    if (filterStatus && item.status !== filterStatus) return false
    if (filterFasilitas && !item.items?.some(i => i.fasilitas === filterFasilitas)) return false
    if (filterJenisKelamin && item.jenis_kelamin !== filterJenisKelamin) return false
    return true
  })

  // Stats
  const totalItems = items.length
  const totalBaru = items.filter(i => i.status === 'baru').length
  const avgRating = items.length > 0
    ? (items.reduce((sum, i) => sum + (i.overall_rating || 0), 0) / items.length).toFixed(1)
    : '0'

  const statsByFasilitas = {}
  items.forEach(item => {
    item.items?.forEach(sub => {
      if (!statsByFasilitas[sub.fasilitas]) {
        statsByFasilitas[sub.fasilitas] = { count: 0, totalRating: 0 }
      }
      statsByFasilitas[sub.fasilitas].count++
      statsByFasilitas[sub.fasilitas].totalRating += sub.rating
    })
  })

  const handleUpdateStatus = async (id, status) => {
    setUpdateLoading(true)
    try {
      const res = await fetch('/api/kritik-saran', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal')
      await fetchData()
      if (selectedItem?.id === id) {
        setSelectedItem(prev => ({ ...prev, status }))
      }
    } catch (err) {
      toastError('Gagal update status: ' + err.message)
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleSaveTanggapan = async () => {
    if (!selectedItem) return
    setUpdateLoading(true)
    try {
      const res = await fetch('/api/kritik-saran', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: selectedItem.id, tanggapan, status: 'ditanggapi' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal')
      await fetchData()
      setSelectedItem(prev => ({ ...prev, tanggapan, status: 'ditanggapi' }))
      toastSuccess('Tanggapan berhasil disimpan')
    } catch (err) {
      toastError('Gagal menyimpan tanggapan: ' + err.message)
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/kritik-saran?id=${deleteItem.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus')
      await fetchData()
      if (selectedItem?.id === deleteItem.id) setSelectedItem(null)
      setDeleteItem(null)
      setDeleteStep(0)
      toastSuccess('Kritik & saran berhasil dihapus')
    } catch (err) {
      toastError('Gagal menghapus: ' + err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const formatDate = (d) => {
    if (!d) return '-'
    const date = new Date(d)
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>
            Kelola Penilaian Fasilitas
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', margin: 0 }}>
            Lihat dan tanggapi penilaian bintang dari pengguna fasilitas USC
          </p>
        </div>
        <Link
          href="/kelola-penilaian/pertanyaan"
          style={{
            padding: '8px 16px', background: '#eff6ff', color: '#1e3a8a',
            borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            textDecoration: 'none', border: '1px solid #dbeafe',
            whiteSpace: 'nowrap',
          }}
        >
          ⚙️ Kelola Pertanyaan
        </Link>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Total Masuk" value={totalItems} bg="#eff6ff" color="#1e3a8a" />
        <StatCard label="Belum Dibaca" value={totalBaru} bg="#fef2f2" color="#dc2626" />
        <StatCard label="Rata-rata Rating" value={avgRating} bg="#f0fdf4" color="#047857" suffix="/5" />
        <StatCard label="Total Fasilitas" value={Object.keys(statsByFasilitas).length} bg="#fefce8" color="#b45309" />
      </div>

      {/* Stats per Fasilitas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {Object.entries(statsByFasilitas).map(([name, stat]) => (
          <div key={name} style={{
            background: 'var(--surface)', borderRadius: '12px', padding: '1rem',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px',
              background: FACILITY_COLORS[name]?.bg || 'var(--surface-3)',
              color: FACILITY_COLORS[name]?.text || 'var(--text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 700,
            }}>
              {name.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{name}</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>
                {stat.count} masukan · ⭐ {(stat.totalRating / stat.count).toFixed(1)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem' }}
        >
          <option value="">Semua Status</option>
          <option value="baru">Baru</option>
          <option value="dibaca">Dibaca</option>
          <option value="ditanggapi">Ditanggapi</option>
        </select>
        <select
          value={filterFasilitas}
          onChange={(e) => setFilterFasilitas(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem' }}
        >
          <option value="">Semua Fasilitas</option>
          <option value="Achilles Gym Hub">Achilles Gym Hub</option>
          <option value="Kolam Renang Unesa">Kolam Renang Unesa</option>
          <option value="Driving Golf Unesa">Driving Golf Unesa</option>
          <option value="SSFC">SSFC</option>
          <option value="PUIPT DIC">PUIPT DIC</option>
          <option value="PUIPT SERC">PUIPT SERC</option>
          <option value="PUI Disabilitas">PUI Disabilitas</option>
          <option value="ULABK">ULABK</option>
          <option value="PUI Seni">PUI Seni</option>
          <option value="PUI Olahraga">PUI Olahraga</option>
          <option value="USC (Umum)">USC (Umum)</option>
        </select>
        <select
          value={filterJenisKelamin}
          onChange={(e) => setFilterJenisKelamin(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem' }}
        >
          <option value="">Semua Jenis Kelamin</option>
          <option value="laki-laki">Laki-laki</option>
          <option value="perempuan">Perempuan</option>
        </select>
        <button
          onClick={() => { setFilterStatus(''); setFilterFasilitas(''); setFilterJenisKelamin('') }}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          Reset Filter
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-2)' }}>Tanggal</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-2)' }}>Pengirim</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-2)' }}>Jenis Kelamin</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-2)' }}>Fasilitas</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-2)' }}>Rating</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-2)' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-2)' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Tidak ada data</td></tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--surface-3)' }}>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text)' }}>{formatDate(item.created_at)}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text)' }}>
                        {item.is_anonim ? 'Anonim' : (item.nama || 'Tidak diketahui')}
                      </div>
                      {item.unit_kerja && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{item.unit_kerja}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text)' }}>
                      {item.jenis_kelamin === 'laki-laki' ? 'Laki-laki' : item.jenis_kelamin === 'perempuan' ? 'Perempuan' : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.items?.map(sub => (
                          <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem',
                              background: FACILITY_COLORS[sub.fasilitas]?.bg || 'var(--surface-3)',
                              color: FACILITY_COLORS[sub.fasilitas]?.text || 'var(--text-3)',
                              fontWeight: 600,
                            }}>
                              {sub.fasilitas}
                            </span>
                            <span style={{
                              padding: '1px 6px', borderRadius: '3px', fontSize: '0.7rem',
                              background: ASPEK_COLORS[sub.aspek] + '20' || 'var(--surface-3)',
                              color: ASPEK_COLORS[sub.aspek] || 'var(--text-3)',
                              fontWeight: 500,
                            }}>
                              {sub.aspek || 'Lainnya'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>
                        {item.overall_rating ? `⭐ ${item.overall_rating}` : '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {item.total_items || 0} penilaian
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                        background: STATUS_LABELS[item.status]?.bg || 'var(--surface-3)',
                        color: STATUS_LABELS[item.status]?.color || 'var(--text-3)',
                      }}>
                        {STATUS_LABELS[item.status]?.text || item.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={async () => {
                            setSelectedItem(item)
                            setTanggapan(item.tanggapan || '')
                            if (item.status === 'baru') {
                              try {
                                await fetch('/api/kritik-saran', {
                                  method: 'PATCH',
                                  headers: getAuthHeaders(),
                                  body: JSON.stringify({ id: item.id, status: 'dibaca' }),
                                })
                                setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'dibaca' } : i))
                              } catch (e) { /* ignore */ }
                            }
                          }}
                          style={{
                            padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid #3b82f6',
                            background: 'var(--surface)', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Detail
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => { setDeleteItem(item); setDeleteStep(1) }}
                            style={{
                              padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid #dc2626',
                              background: 'var(--surface)', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: '1rem',
        }} onClick={() => setSelectedItem(null)}>
          <div
            style={{
              background: 'var(--surface)', borderRadius: '16px', maxWidth: '600px', width: '100%',
              maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>
                    Detail Kritik & Saran
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>
                    {formatDate(selectedItem.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  aria-label="Tutup"
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    border: 'none', background: 'var(--surface-3)', color: 'var(--text-3)',
                    fontSize: '18px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              {/* Profile */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-2)', margin: '0 0 0.5rem' }}>Pengirim</h3>
                <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                    {selectedItem.is_anonim ? 'Anonim' : (selectedItem.nama || 'Tidak diketahui')}
                  </div>
                  {selectedItem.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>📧 {selectedItem.email}</div>}
                  {selectedItem.telepon && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>📱 {selectedItem.telepon}</div>}
                  {selectedItem.unit_kerja && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>🏢 {selectedItem.unit_kerja}</div>}
                </div>
              </div>

              {/* Items per Fasilitas */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-2)', margin: '0 0 0.5rem' }}>
                  Penilaian per Fasilitas ({selectedItem.items?.length || 0})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedItem.items?.map(sub => (
                    <div key={sub.id} style={{
                      background: 'var(--surface-2)', borderRadius: '10px', padding: '0.875rem',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                          background: FACILITY_COLORS[sub.fasilitas]?.bg || 'var(--surface-3)',
                          color: FACILITY_COLORS[sub.fasilitas]?.text || 'var(--text-3)',
                        }}>
                          {sub.fasilitas}
                        </span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                          background: ASPEK_COLORS[sub.aspek] + '20' || 'var(--surface-3)',
                          color: ASPEK_COLORS[sub.aspek] || 'var(--text-3)',
                        }}>
                          {sub.aspek || 'Lainnya'}
                        </span>
                        {sub.rating > 0 && (
                          <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.875rem', marginLeft: 'auto' }}>
                            ⭐ {sub.rating}/5
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text)', lineHeight: '1.5' }}>
                        {(() => {
                          if (sub.jawaban_pilihan) {
                            try {
                              const arr = JSON.parse(sub.jawaban_pilihan)
                              if (Array.isArray(arr)) return `☑️ ${arr.join(', ')}`
                            } catch {}
                            return sub.jawaban_pilihan
                          }
                          return sub.penjelasan || '-'
                        })()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall */}
              <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e3a8a' }}>Overall Rating</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e3a8a' }}>
                  ⭐ {selectedItem.overall_rating || '-'}/5
                </span>
              </div>

              {/* Status Actions */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-2)', margin: '0 0 0.5rem' }}>Status</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['baru', 'dibaca', 'ditanggapi']).map(status => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(selectedItem.id, status)}
                      disabled={updateLoading || selectedItem.status === status}
                      style={{
                        padding: '0.5rem 1rem', borderRadius: '8px', border: '1.5px solid',
                        borderColor: selectedItem.status === status ? STATUS_LABELS[status].color : 'var(--border)',
                        background: selectedItem.status === status ? STATUS_LABELS[status].bg : 'var(--surface)',
                        color: selectedItem.status === status ? STATUS_LABELS[status].color : 'var(--text-3)',
                        fontSize: '0.875rem', fontWeight: 600, cursor: selectedItem.status === status ? 'default' : 'pointer',
                        opacity: selectedItem.status === status ? 1 : 0.7,
                      }}
                    >
                      {STATUS_LABELS[status].text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tanggapan */}
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-2)', margin: '0 0 0.5rem' }}>Tanggapan</h3>
                <textarea
                  value={tanggapan}
                  onChange={(e) => setTanggapan(e.target.value)}
                  placeholder="Tulis tanggapan atau tindak lanjut di sini..."
                  rows={4}
                  style={{
                    width: '100%', padding: '0.75rem', border: '1.5px solid var(--border)',
                    borderRadius: '8px', fontSize: '0.875rem', color: 'var(--text)', resize: 'vertical',
                    fontFamily: "'Segoe UI', system-ui, sans-serif", outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={handleSaveTanggapan}
                  disabled={updateLoading}
                  style={{
                    marginTop: '0.75rem', padding: '0.625rem 1.25rem', background: '#1e3a8a',
                    color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem',
                    fontWeight: 600, cursor: 'pointer', width: '100%',
                  }}
                >
                  {updateLoading ? 'Menyimpan...' : 'Simpan Tanggapan'}
                </button>
              </div>

              {isSuperAdmin && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => { setDeleteItem(selectedItem); setDeleteStep(1) }}
                    style={{
                      width: '100%', padding: '0.625rem 1.25rem', background: '#fee2e2',
                      color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px',
                      fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    🗑️ Hapus Kritik & Saran Ini
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteStep > 0 && deleteItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 60, padding: '1rem',
        }} onClick={() => { setDeleteItem(null); setDeleteStep(0) }}>
          <div
            style={{
              background: 'var(--surface)', borderRadius: '16px', maxWidth: '480px', width: '100%',
              padding: '1.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {deleteStep === 1 && (
              <>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#dc2626', margin: '0 0 0.75rem' }}>
                  ⚠️ Konfirmasi Hapus (1/2)
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: '1.6', marginBottom: '1.25rem' }}>
                  Anda akan menghapus kritik & saran dari <strong>{deleteItem.is_anonim ? 'Anonim' : (deleteItem.nama || 'Tidak diketahui')}</strong> untuk fasilitas <strong>{deleteItem.kategori || '-'}</strong> yang dikirim pada {formatDate(deleteItem.created_at)}.
                  <br /><br />
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>Data yang dihapus tidak dapat dikembalikan.</span>
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => { setDeleteItem(null); setDeleteStep(0) }}
                    style={{
                      flex: 1, padding: '0.625rem 1rem', background: 'var(--surface-3)',
                      color: 'var(--text-2)', border: 'none', borderRadius: '8px',
                      fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => setDeleteStep(2)}
                    style={{
                      flex: 1, padding: '0.625rem 1rem', background: '#dc2626',
                      color: 'white', border: 'none', borderRadius: '8px',
                      fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Lanjutkan →
                  </button>
                </div>
              </>
            )}
            {deleteStep === 2 && (
              <>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#dc2626', margin: '0 0 0.75rem' }}>
                  ⚠️ Konfirmasi Final (2/2)
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: '1.6', marginBottom: '1.25rem' }}>
                  Apakah Anda <strong>benar-benar yakin</strong> ingin menghapus data ini secara permanen?
                  <br /><br />
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>Tindakan ini tidak dapat dibatalkan.</span>
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => setDeleteStep(1)}
                    style={{
                      flex: 1, padding: '0.625rem 1rem', background: 'var(--surface-3)',
                      color: 'var(--text-2)', border: 'none', borderRadius: '8px',
                      fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    ← Kembali
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    style={{
                      flex: 1, padding: '0.625rem 1rem', background: '#dc2626',
                      color: 'white', border: 'none', borderRadius: '8px',
                      fontSize: '0.875rem', fontWeight: 600, cursor: deleteLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {deleteLoading ? 'Menghapus...' : '🗑️ Ya, Hapus Permanen'}
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

function StatCard({ label, value, bg, color, suffix = '' }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border)', textAlign: 'center' }}>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color }}>
        {value}{suffix}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.25rem', fontWeight: 600 }}>
        {label}
      </div>
    </div>
  )
}
