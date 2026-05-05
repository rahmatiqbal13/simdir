'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { usePencairan } from '@/context/PencairanContext'

// Data pencairan akan di-fetch dari Supabase

const formatRupiah = (num) => {
  if (!num || isNaN(num)) return 'Rp 0'
  return `Rp ${num.toLocaleString('id-ID')}`
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}

// ============ KOMPONEN STAT CARD ============
function StatCard({ title, value, subtitle, variant, icon }) {
  const variants = {
    default: '',
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    info: 'info'
  }

  return (
    <div className={`stat-card ${variants[variant] || ''}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="stat-label">{title}</div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>{value}</div>
          {subtitle && <div className="muted text-sm mt-1">{subtitle}</div>}
        </div>
        {icon && (
          <div style={{ 
            padding: '0.75rem', 
            borderRadius: 'var(--radius)',
            background: variant === 'success' ? 'var(--success-bg)' : 
                       variant === 'warning' ? 'var(--warning-bg)' : 
                       variant === 'danger' ? 'var(--danger-bg)' : 'var(--primary-bg)',
            color: variant === 'success' ? 'var(--success)' : 
                   variant === 'warning' ? 'var(--warning)' : 
                   variant === 'danger' ? 'var(--danger)' : 'var(--primary)'
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ KOMPONEN PROGRESS BAR ============
function ProgressBar({ value, max, label }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  
  let colorVar = 'var(--success)'
  if (percentage < 50) colorVar = 'var(--danger)'
  else if (percentage < 80) colorVar = 'var(--warning)'

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
        <span style={{ color: 'var(--text-2)' }}>{label}</span>
        <span style={{ color: 'var(--text-3)' }}>{Math.round(percentage)}%</span>
      </div>
      <div style={{ width: '100%', background: 'var(--surface-3)', borderRadius: '9999px', height: '0.5rem' }}>
        <div 
          style={{ 
            height: '0.5rem', 
            borderRadius: '9999px', 
            transition: 'width 0.3s ease',
            background: colorVar,
            width: `${percentage}%`
          }}
        />
      </div>
    </div>
  )
}

// ============ KOMPONEN BREADCRUMB ============
function Breadcrumb({ items }) {
  return (
    <nav style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.5rem',
      fontSize: '0.8125rem',
      color: 'var(--text-3)',
      marginBottom: '1rem'
    }}>
      {items.map((item, index) => (
        <span key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {index > 0 && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
          {item.href ? (
            <a href={item.href} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
              {item.label}
            </a>
          ) : (
            <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

// ============ KOMPONEN STATUS BADGE ============
function StatusBadge({ status, percentage }) {
  const configs = {
    complete: { text: 'Lengkap', class: 'badge-green' },
    partial: { text: 'Sebagian', class: 'badge-amber' },
    empty: { text: 'Belum Ada', class: 'badge-slate' },
  }

  let config = configs.empty
  if (percentage >= 100) config = configs.complete
  else if (percentage > 0) config = configs.partial

  return (
    <span className={`badge ${config.class}`}>
      {config.text}
    </span>
  )
}

// ============ KOMPONEN HEADER SPJ ============
function SpjHeader({ pencairan, totalProgress }) {
  return (
    <div className="card mb-4" style={{ background: 'linear-gradient(135deg, var(--primary-bg) 0%, var(--surface) 100%)' }}>
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{pencairan.nama}</h2>
            <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              {pencairan.program}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {formatDate(pencairan.tanggal)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                {formatRupiah(pencairan.jumlah)}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right', minWidth: '200px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>Progress SPJ</p>
            <StatusBadge percentage={totalProgress} />
            <div style={{ marginTop: '0.5rem' }}>
              <ProgressBar value={totalProgress} max={100} label="Kelengkapan SPJ" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ KOMPONEN SPJ ITEM CARD ============
function SpjItemCard({ header, index, canEdit, onUpdateHeader, onAddDetail, onUpdateDetail }) {
  const totalDetail = header.details.reduce((sum, d) => sum + (d.nominal || 0), 0)
  const progress = header.jumlah_dana > 0 ? (totalDetail / header.jumlah_dana) * 100 : 0

  return (
    <div className="card mb-4" style={{ overflow: 'hidden' }}>
      {/* Header Baris Induk */}
      <div style={{ 
        padding: '1rem 1.25rem', 
        background: 'var(--surface-2)', 
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ 
            width: '1.75rem', 
            height: '1.75rem', 
            borderRadius: '50%', 
            background: 'var(--primary)', 
            color: 'white',
            display: 'grid',
            placeItems: 'center',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            {index + 1}
          </span>
          <div>
            {canEdit ? (
              <input 
                className="table-input" 
                value={header.uraian} 
                onChange={e => onUpdateHeader(header.id, 'uraian', e.target.value)}
                style={{ fontWeight: 600, minWidth: '300px' }}
              />
            ) : (
              <strong>{header.uraian}</strong>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem', fontSize: '0.75rem' }}>
              <span className="muted">No. RBA:</span>
              {canEdit ? (
                <input 
                  className="table-input" 
                  value={header.no_rba} 
                  onChange={e => onUpdateHeader(header.id, 'no_rba', e.target.value)}
                  style={{ width: '100px' }}
                />
              ) : (
                <span>{header.no_rba || '-'}</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Jumlah Dana</p>
          {canEdit ? (
            <input 
              type="number"
              className="table-input table-input-num" 
              value={header.jumlah_dana} 
              onChange={e => onUpdateHeader(header.id, 'jumlah_dana', Number(e.target.value))}
            />
          ) : (
            <strong>{formatRupiah(header.jumlah_dana)}</strong>
          )}
        </div>
      </div>

      {/* Detail SPJ */}
      <div style={{ padding: '1rem 1.25rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Detail SPJ</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
              {formatRupiah(totalDetail)} / {formatRupiah(header.jumlah_dana)}
            </span>
          </div>
          <ProgressBar value={totalDetail} max={header.jumlah_dana} label="Progress SPJ" />
        </div>

        {/* Tabel Detail */}
        <div className="table-wrap" style={{ marginBottom: '1rem' }}>
          <table style={{ minWidth: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>No</th>
                <th>No RKA</th>
                <th>Nilai Anggaran</th>
                <th>Nominal SPJ</th>
                <th>Belum SPJ</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {header.details.map((detail, idx) => {
                const belumSpj = Math.max(0, (detail.nilai_anggaran || 0) - (detail.nominal || 0))
                return (
                  <tr key={detail.id}>
                    <td className="text-center text-muted">{idx + 1}</td>
                    <td>
                      {canEdit ? (
                        <input 
                          className="table-input" 
                          value={detail.nomor_rka} 
                          onChange={e => onUpdateDetail(header.id, detail.id, 'nomor_rka', e.target.value)}
                        />
                      ) : (
                        detail.nomor_rka || '-'
                      )}
                    </td>
                    <td className="text-right">
                      {canEdit ? (
                        <input 
                          type="number"
                          className="table-input table-input-num" 
                          value={detail.nilai_anggaran} 
                          onChange={e => onUpdateDetail(header.id, detail.id, 'nilai_anggaran', Number(e.target.value))}
                        />
                      ) : (
                        formatRupiah(detail.nilai_anggaran)
                      )}
                    </td>
                    <td className="text-right">
                      {canEdit ? (
                        <input 
                          type="number"
                          className="table-input table-input-num" 
                          value={detail.nominal} 
                          onChange={e => onUpdateDetail(header.id, detail.id, 'nominal', Number(e.target.value))}
                        />
                      ) : (
                        formatRupiah(detail.nominal)
                      )}
                    </td>
                    <td className={`text-right font-semibold ${belumSpj > 0 ? 'text-danger' : 'text-success'}`}>
                      {formatRupiah(belumSpj)}
                    </td>
                    <td className="text-center">
                      {progress >= 100 && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color: 'var(--success)' }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {canEdit && (
          <button className="ghost text-sm" onClick={() => onAddDetail(header.id)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Detail SPJ
          </button>
        )}
      </div>

      {/* Footer Info */}
      <div style={{ 
        padding: '0.75rem 1.25rem', 
        background: 'var(--surface-2)', 
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <span>
            <span className="muted">Unit Kerja:</span> <strong>{header.unit_kerja}</strong>
          </span>
          <span>
            <span className="muted">Penerima:</span> <strong>{header.penerima || '-'}</strong>
          </span>
        </div>
        <div>
          {progress >= 100 ? (
            <span className="badge badge-green">SPJ Lengkap</span>
          ) : progress > 0 ? (
            <span className="badge badge-amber">SPJ Sebagian</span>
          ) : (
            <span className="badge badge-slate">Belum SPJ</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ KOMPONEN REKAP UNIT KERJA ============
function RekapUnitKerja({ data, totals }) {
  return (
    <div className="card mt-6">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Rekap per Unit Kerja</h3>
        <span className="muted" style={{ fontSize: '0.75rem' }}>{Object.keys(data).length} unit</span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table style={{ minWidth: '100%' }}>
            <thead>
              <tr>
                <th>Unit Kerja</th>
                <th className="text-right">Panjar</th>
                <th className="text-right">SPJ</th>
                <th className="text-right">Pengembalian</th>
                <th className="text-right">Belum SPJ</th>
                <th className="text-center">Progress</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data).map(([unit, item]) => {
                const progress = item.panjar > 0 ? (item.spj / item.panjar) * 100 : 0
                const belumSpj = item.panjar - item.spj
                return (
                  <tr key={unit}>
                    <td>
                      <strong>{unit}</strong>
                    </td>
                    <td className="text-right">{formatRupiah(item.panjar)}</td>
                    <td className="text-right">{formatRupiah(item.spj)}</td>
                    <td className="text-right">{formatRupiah(item.pengembalian)}</td>
                    <td className={`text-right font-semibold ${belumSpj > 0 ? 'text-danger' : 'text-success'}`}>
                      {formatRupiah(belumSpj)}
                    </td>
                    <td style={{ width: '150px' }}>
                      <ProgressBar value={progress} max={100} label="" />
                    </td>
                  </tr>
                )
              })}
              <tr className="total-row">
                <td><strong>TOTAL</strong></td>
                <td className="text-right"><strong>{formatRupiah(totals.totalDana)}</strong></td>
                <td className="text-right"><strong>{formatRupiah(totals.totalSpj)}</strong></td>
                <td className="text-right"><strong>{formatRupiah(totals.totalPengembalian)}</strong></td>
                <td className="text-right"><strong>{formatRupiah(totals.totalBelumSpj)}</strong></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============ HALAMAN UTAMA ============
export default function SpjPage() {
  const params = useParams()
  const pencairanId = params?.id || ''
  const { getPencairanById, loading: loadingPencairan } = usePencairan()
  
  const [pencairan, setPencairan] = useState(null)
  const [pencairanLoading, setPencairanLoading] = useState(true)
  
  // Fetch pencairan data
  useEffect(() => {
    const loadPencairan = async () => {
      if (!pencairanId) {
        setPencairanLoading(false)
        return
      }
      
      setPencairanLoading(true)
      const result = await getPencairanById(pencairanId)
      
      if (result.success) {
        setPencairan(result.data)
      } else {
        console.error('Error loading pencairan:', result.error)
      }
      setPencairanLoading(false)
    }
    
    loadPencairan()
  }, [pencairanId, getPencairanById])

  const [headers, setHeaders] = useState([
    { 
      id: 'h1', 
      no_rba: '14381', 
      uraian: 'Pembelian barang alat dan mesin Kolam Renang', 
      jumlah_dana: 10000000, 
      unit_kerja: 'Kolam Renang', 
      penerima: 'PT Supplier ABC', 
      details: [
        { id: 'd1', nilai_anggaran: 10000000, nomor_rka: '523123', nominal: 10000000 }
      ]
    },
    { 
      id: 'h2', 
      no_rba: '16507', 
      uraian: 'Pembelian Alat Kebersihan (USC)', 
      jumlah_dana: 2340000, 
      unit_kerja: 'USC', 
      penerima: 'Toko Bersih Jaya', 
      details: [
        { id: 'd2', nilai_anggaran: 2340000, nomor_rka: '114111', nominal: 2339500 }
      ]
    },
    { 
      id: 'h3', 
      no_rba: '16508', 
      uraian: 'Pengadaan ATK Kantor', 
      jumlah_dana: 5000000, 
      unit_kerja: 'USC', 
      penerima: 'PT ATK Sejahtera', 
      details: [
        { id: 'd3', nilai_anggaran: 5000000, nomor_rka: '114112', nominal: 3500000 },
        { id: 'd4', nilai_anggaran: 1500000, nomor_rka: '114113', nominal: 0 }
      ]
    },
  ])

  const userRole = 'super_admin'
  const canEdit = ['super_admin', 'admin_keuangan'].includes(userRole)

  // Hitung totals
  const totals = useMemo(() => {
    let totalDana = 0, totalSpj = 0, totalBelumSpj = 0
    headers.forEach(h => {
      totalDana += h.jumlah_dana || 0
      h.details.forEach(d => {
        const nominal = d.nominal || 0
        const nilaiAnggaran = d.nilai_anggaran || 0
        totalSpj += nominal
        totalBelumSpj += Math.max(0, nilaiAnggaran - nominal)
      })
    })
    return { 
      totalDana, 
      totalSpj, 
      totalBelumSpj,
      totalPengembalian: totalDana - totalSpj
    }
  }, [headers])

  // Hitung progress keseluruhan
  const totalProgress = useMemo(() => {
    return totals.totalDana > 0 ? (totals.totalSpj / totals.totalDana) * 100 : 0
  }, [totals])

  // Rekap per unit kerja
  const rekapUnit = useMemo(() => {
    const units = {}
    headers.forEach(h => {
      if (!units[h.unit_kerja]) {
        units[h.unit_kerja] = { panjar: 0, pengembalian: 0, spj: 0 }
      }
      units[h.unit_kerja].panjar += h.jumlah_dana || 0
      h.details.forEach(d => { 
        units[h.unit_kerja].spj += d.nominal || 0 
      })
    })
    Object.keys(units).forEach(u => { 
      units[u].pengembalian = units[u].panjar - units[u].spj 
    })
    return units
  }, [headers])

  // Handlers
  const handleHeaderChange = (headerId, field, value) => {
    setHeaders(headers.map(h => h.id === headerId ? { ...h, [field]: value } : h))
  }

  const handleDetailChange = (headerId, detailId, field, value) => {
    setHeaders(headers.map(h => {
      if (h.id !== headerId) return h
      return { 
        ...h, 
        details: h.details.map(d => d.id === detailId ? { ...d, [field]: value } : d) 
      }
    }))
  }

  const addHeader = () => {
    setHeaders([...headers, {
      id: `h${Date.now()}`, 
      no_rba: '', 
      uraian: '', 
      jumlah_dana: 0, 
      unit_kerja: 'USC', 
      penerima: '',
      details: [{ id: `d${Date.now()}`, nilai_anggaran: 0, nomor_rka: '', nominal: 0 }]
    }])
  }

  const addDetail = (headerId) => {
    setHeaders(headers.map(h => {
      if (h.id !== headerId) return h
      return { 
        ...h, 
        details: [...h.details, { id: `d${Date.now()}`, nilai_anggaran: 0, nomor_rka: '', nominal: 0 }] 
      }
    }))
  }

  // Loading state
  if (pencairanLoading || loadingPencairan) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" style={{ marginBottom: '1rem' }}></div>
        <h3>Memuat data pencairan...</h3>
      </div>
    )
  }

  // Error state - pencairan not found
  if (!pencairan) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '3rem', height: '3rem', marginBottom: '1rem', opacity: 0.4 }}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h3>Data pencairan tidak ditemukan</h3>
        <p>ID pencairan tidak valid atau data telah dihapus</p>
        <a href="/pencairan" className="btn btn-primary mt-4">
          Kembali ke Daftar Pencairan
        </a>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Pencairan', href: '/pencairan' },
          { label: pencairan.nama }
        ]} 
      />

      {/* Header SPJ */}
      <SpjHeader pencairan={pencairan} totalProgress={totalProgress} />

      {/* Stats Cards */}
      <div className="stats-grid mb-6">
        <StatCard
          title="Jumlah Dana"
          value={formatRupiah(totals.totalDana)}
          subtitle="Total panjar"
          variant="default"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          title="Total SPJ"
          value={formatRupiah(totals.totalSpj)}
          subtitle={`${Math.round(totalProgress)}% dari panjar`}
          variant="success"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
        <StatCard
          title="Pengembalian"
          value={formatRupiah(totals.totalPengembalian)}
          subtitle="Belum terpakai"
          variant={totals.totalPengembalian > 0 ? 'warning' : 'success'}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          }
        />
        <StatCard
          title="Belum SPJ"
          value={formatRupiah(totals.totalBelumSpj)}
          subtitle="Perlu ditindaklanjuti"
          variant={totals.totalBelumSpj > 0 ? 'danger' : 'success'}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        />
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.125rem' }}>Daftar SPJ</h2>
          <p className="muted" style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            {headers.length} baris induk • {headers.reduce((sum, h) => sum + h.details.length, 0)} detail
          </p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={addHeader}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Baris Induk
          </button>
        )}
      </div>

      {/* List SPJ Items */}
      {headers.map((header, index) => (
        <SpjItemCard
          key={header.id}
          header={header}
          index={index}
          canEdit={canEdit}
          onUpdateHeader={handleHeaderChange}
          onAddDetail={addDetail}
          onUpdateDetail={handleDetailChange}
        />
      ))}

      {/* Rekap per Unit Kerja */}
      <RekapUnitKerja data={rekapUnit} totals={totals} />

      {/* Action Footer */}
      {canEdit && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '1rem',
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border)'
        }}>
          <button className="btn btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Excel
          </button>
          <button className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Simpan SPJ
          </button>
        </div>
      )}
    </div>
  )
}
