'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

const FACILITY_COLORS = {
  'Achilles Gym Hub': { bg: '#dbeafe', text: '#1e3a8a' },
  'Kolam Renang Unesa': { bg: '#dcfce7', text: '#047857' },
  'Driving Golf Unesa': { bg: '#fef3c7', text: '#b45309' },
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
  'dibaca': { text: 'Dibaca', bg: '#fefce8', color: '#ca8a04' },
  'ditanggapi': { text: 'Ditanggapi', bg: '#f0fdf4', color: '#16a34a' },
}

export default function KritikSaranAdminPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterFasilitas, setFilterFasilitas] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [tanggapan, setTanggapan] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('kritik_saran')
        .select('*, items:kritik_saran_items(*)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Error fetching kritik saran:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredItems = items.filter(item => {
    if (filterStatus && item.status !== filterStatus) return false
    if (filterFasilitas && !item.items?.some(i => i.fasilitas === filterFasilitas)) return false
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
      const { error } = await supabase
        .from('kritik_saran')
        .update({ status })
        .eq('id', id)

      if (error) throw error
      await fetchData()
      if (selectedItem?.id === id) {
        setSelectedItem(prev => ({ ...prev, status }))
      }
    } catch (err) {
      alert('Gagal update status: ' + err.message)
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleSaveTanggapan = async () => {
    if (!selectedItem) return
    setUpdateLoading(true)
    try {
      const { error } = await supabase
        .from('kritik_saran')
        .update({ tanggapan, status: 'ditanggapi' })
        .eq('id', selectedItem.id)

      if (error) throw error
      await fetchData()
      setSelectedItem(prev => ({ ...prev, tanggapan, status: 'ditanggapi' }))
      alert('Tanggapan berhasil disimpan')
    } catch (err) {
      alert('Gagal menyimpan tanggapan: ' + err.message)
    } finally {
      setUpdateLoading(false)
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem' }}>
            Kelola Kritik & Saran
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            Review dan tanggapi masukan dari pengguna untuk fasilitas USC
          </p>
        </div>
        <Link
          href="/kelola-kritik-saran/pertanyaan"
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Total Masuk" value={totalItems} bg="#eff6ff" color="#1e3a8a" />
        <StatCard label="Belum Dibaca" value={totalBaru} bg="#fef2f2" color="#dc2626" />
        <StatCard label="Rata-rata Rating" value={avgRating} bg="#f0fdf4" color="#047857" suffix="/5" />
        <StatCard label="Total Fasilitas" value={Object.keys(statsByFasilitas).length} bg="#fefce8" color="#b45309" />
      </div>

      {/* Stats per Fasilitas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {Object.entries(statsByFasilitas).map(([name, stat]) => (
          <div key={name} style={{
            background: 'white', borderRadius: '12px', padding: '1rem',
            border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px',
              background: FACILITY_COLORS[name]?.bg || '#f1f5f9',
              color: FACILITY_COLORS[name]?.text || '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 700,
            }}>
              {name.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{name}</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
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
          style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}
        >
          <option value="">Semua Status</option>
          <option value="baru">Baru</option>
          <option value="dibaca">Dibaca</option>
          <option value="ditanggapi">Ditanggapi</option>
        </select>
        <select
          value={filterFasilitas}
          onChange={(e) => setFilterFasilitas(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}
        >
          <option value="">Semua Fasilitas</option>
          <option value="Achilles Gym Hub">Achilles Gym Hub</option>
          <option value="Kolam Renang Unesa">Kolam Renang Unesa</option>
          <option value="Driving Golf Unesa">Driving Golf Unesa</option>
        </select>
        <button
          onClick={() => { setFilterStatus(''); setFilterFasilitas('') }}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          Reset Filter
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Tanggal</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Pengirim</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Fasilitas</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Rating</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Tidak ada data</td></tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>{formatDate(item.created_at)}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 500, color: '#0f172a' }}>
                        {item.is_anonim ? 'Anonim' : (item.nama || 'Tidak diketahui')}
                      </div>
                      {item.unit_kerja && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.unit_kerja}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.items?.map(sub => (
                          <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem',
                              background: FACILITY_COLORS[sub.fasilitas]?.bg || '#f1f5f9',
                              color: FACILITY_COLORS[sub.fasilitas]?.text || '#64748b',
                              fontWeight: 600,
                            }}>
                              {sub.fasilitas}
                            </span>
                            <span style={{
                              padding: '1px 6px', borderRadius: '3px', fontSize: '0.7rem',
                              background: ASPEK_COLORS[sub.aspek] + '20' || '#f1f5f9',
                              color: ASPEK_COLORS[sub.aspek] || '#64748b',
                              fontWeight: 500,
                            }}>
                              {sub.aspek || 'Lainnya'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                        ⭐ {item.overall_rating || '-'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {item.total_items || 0} penilaian
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                        background: STATUS_LABELS[item.status]?.bg || '#f1f5f9',
                        color: STATUS_LABELS[item.status]?.color || '#64748b',
                      }}>
                        {STATUS_LABELS[item.status]?.text || item.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setSelectedItem(item)
                          setTanggapan(item.tanggapan || '')
                        }}
                        style={{
                          padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid #3b82f6',
                          background: 'white', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Detail
                      </button>
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
              background: 'white', borderRadius: '16px', maxWidth: '600px', width: '100%',
              maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem' }}>
                    Detail Kritik & Saran
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                    {formatDate(selectedItem.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    border: 'none', background: '#f1f5f9', color: '#64748b',
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
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', margin: '0 0 0.5rem' }}>Pengirim</h3>
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {selectedItem.is_anonim ? 'Anonim' : (selectedItem.nama || 'Tidak diketahui')}
                  </div>
                  {selectedItem.email && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📧 {selectedItem.email}</div>}
                  {selectedItem.telepon && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📱 {selectedItem.telepon}</div>}
                  {selectedItem.unit_kerja && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>🏢 {selectedItem.unit_kerja}</div>}
                </div>
              </div>

              {/* Items per Fasilitas */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', margin: '0 0 0.5rem' }}>
                  Penilaian per Fasilitas ({selectedItem.items?.length || 0})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedItem.items?.map(sub => (
                    <div key={sub.id} style={{
                      background: '#f8fafc', borderRadius: '10px', padding: '0.875rem',
                      border: '1px solid #e2e8f0',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                          background: FACILITY_COLORS[sub.fasilitas]?.bg || '#f1f5f9',
                          color: FACILITY_COLORS[sub.fasilitas]?.text || '#64748b',
                        }}>
                          {sub.fasilitas}
                        </span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                          background: ASPEK_COLORS[sub.aspek] + '20' || '#f1f5f9',
                          color: ASPEK_COLORS[sub.aspek] || '#64748b',
                        }}>
                          {sub.aspek || 'Lainnya'}
                        </span>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', marginLeft: 'auto' }}>
                          ⭐ {sub.rating}/5
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#0f172a', lineHeight: '1.5' }}>
                        {sub.penjelasan}
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
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', margin: '0 0 0.5rem' }}>Status</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['baru', 'dibaca', 'ditanggapi']).map(status => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(selectedItem.id, status)}
                      disabled={updateLoading || selectedItem.status === status}
                      style={{
                        padding: '0.5rem 1rem', borderRadius: '8px', border: '1.5px solid',
                        borderColor: selectedItem.status === status ? STATUS_LABELS[status].color : '#e2e8f0',
                        background: selectedItem.status === status ? STATUS_LABELS[status].bg : 'white',
                        color: selectedItem.status === status ? STATUS_LABELS[status].color : '#64748b',
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
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', margin: '0 0 0.5rem' }}>Tanggapan</h3>
                <textarea
                  value={tanggapan}
                  onChange={(e) => setTanggapan(e.target.value)}
                  placeholder="Tulis tanggapan atau tindak lanjut di sini..."
                  rows={4}
                  style={{
                    width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0',
                    borderRadius: '8px', fontSize: '0.875rem', color: '#0f172a', resize: 'vertical',
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, bg, color, suffix = '' }) {
  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color }}>
        {value}{suffix}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 600 }}>
        {label}
      </div>
    </div>
  )
}
