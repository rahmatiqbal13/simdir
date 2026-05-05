'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useProgramKerja } from '@/context/ProgramKerjaContext'

const UNIT_KERJA_LIST = [
  'USC', 'PUI Keolahragaan', 'PUI Disabilitas', 'PUI Seni Budaya',
  'Kolam Renang', 'Driving Golf', 'ULABK', 'SSFC',
  'PUIPT Seni Budaya Majapahitan', 'PUIPT DIC', 'PUIPT SERC'
]

const TAHUN_LIST = [2024, 2025, 2026, 2027]

const ITEMS_PER_PAGE = 5

const formatRupiah = (num) => {
  if (!num || isNaN(num)) return 'Rp 0'
  return `Rp ${num.toLocaleString('id-ID')}`
}

function calculateTotal(items) {
  if (!items || !Array.isArray(items)) return 0
  return items.reduce((sum, item) => sum + ((item.jumlah || 0) * (item.harga_satuan || 0)), 0)
}

// ============ KOMPONEN STAT CARD ============
function StatCard({ title, value, subtitle, variant }) {
  const variants = {
    default: '',
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    info: 'info'
  }

  return (
    <div className={`stat-card ${variants[variant] || ''}`}>
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
      {subtitle && <div className="muted text-sm mt-1">{subtitle}</div>}
    </div>
  )
}

// ============ KOMPONEN FILTER BAR ============
function FilterBar({ 
  searchQuery, 
  setSearchQuery, 
  selectedUnit, 
  setSelectedUnit,
  selectedTahun,
  setSelectedTahun,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  onExport,
  totalItems
}) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="card mb-4" style={{ overflow: 'visible' }}>
      <div className="card-body" style={{ overflow: 'visible' }}>
        {/* Baris Pertama: Search dan Toggle View */}
        <div className="toolbar" style={{ marginBottom: showFilters ? '1rem' : 0, position: 'relative', zIndex: 100 }}>
          <div className="filter-group filter-search" style={{ maxWidth: '24rem' }}>
            <svg className="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Cari program kerja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="filter-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="filter-clear-btn"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Item Count */}
            <span style={{ 
              fontSize: '0.8125rem', 
              color: 'var(--text-2)',
              marginRight: '0.5rem'
            }}>
              {totalItems} program
            </span>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters ? 'btn-primary' : 'ghost'}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filter
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                style={{ width: '1rem', height: '1rem', transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div className="flex" style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '0.25rem' }}>
              <button
                onClick={() => setViewMode('card')}
                className="btn icon-only"
                style={{ 
                  background: viewMode === 'card' ? 'var(--surface)' : 'transparent',
                  boxShadow: viewMode === 'card' ? 'var(--shadow-sm)' : 'none',
                  color: viewMode === 'card' ? 'var(--primary)' : 'var(--text-2)'
                }}
                title="Tampilan Card"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className="btn icon-only"
                style={{ 
                  background: viewMode === 'table' ? 'var(--surface)' : 'transparent',
                  boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none',
                  color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-2)'
                }}
                title="Tampilan Tabel"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>

            {/* Export Dropdown */}
            <ExportDropdown onExport={onExport} />
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', 
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)'
          }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Unit Kerja</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Semua Unit Kerja</option>
                {UNIT_KERJA_LIST.map((uk) => (
                  <option key={uk} value={uk}>{uk}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Tahun Anggaran</label>
              <select
                value={selectedTahun}
                onChange={(e) => setSelectedTahun(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Semua Tahun</option>
                {TAHUN_LIST.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Urutkan</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="name_asc">Nama A-Z</option>
                <option value="name_desc">Nama Z-A</option>
                <option value="pagu_desc">Pagu Terbesar</option>
                <option value="pagu_asc">Pagu Terkecil</option>
                <option value="usage_desc">Penggunaan Tertinggi</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============ KOMPONEN EXPORT DROPDOWN ============
function ExportDropdown({ onExport }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const exportOptions = [
    { 
      id: 'print', 
      label: '🖨️ Print / PDF', 
      desc: 'Cetak atau simpan sebagai PDF',
      color: 'var(--primary)'
    },
    { 
      id: 'csv', 
      label: '📊 Export CSV', 
      desc: 'Download file Excel (.csv)',
      color: 'var(--success)'
    },
    { 
      id: 'json', 
      label: '💾 Export JSON', 
      desc: 'Download data mentah (.json)',
      color: 'var(--warning)'
    }
  ]

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-primary"
        style={{ 
          background: 'var(--success)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          whiteSpace: 'nowrap'
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export Data
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          style={{ 
            width: '1rem', 
            height: '1rem',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            minWidth: '280px',
            zIndex: 10000,
            overflow: 'hidden'
          }}
        >
          {exportOptions.map((option, idx) => (
            <button
              key={option.id}
              onClick={() => {
                onExport(option.id)
                setIsOpen(false)
              }}
              style={{
                width: '100%',
                padding: '1rem 1.25rem',
                textAlign: 'left',
                background: 'white',
                border: 'none',
                borderBottom: idx < exportOptions.length - 1 ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white'
              }}
            >
              <span style={{ 
                fontWeight: 600, 
                fontSize: '0.9375rem',
                color: option.color,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {option.label}
              </span>
              <span style={{ 
                fontSize: '0.8125rem', 
                color: '#64748b',
                marginLeft: '1.5rem'
              }}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ KOMPONEN PROGRESS BAR ============
function ProgressBar({ value, max, showLabel = true }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  
  let colorVar = 'var(--success)'
  if (percentage > 90) colorVar = 'var(--danger)'
  else if (percentage > 75) colorVar = 'var(--warning)'

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
          <span style={{ color: 'var(--text-2)' }}>{Math.round(percentage)}% terpakai</span>
          <span style={{ color: 'var(--text-3)' }}>{formatRupiah(value)} / {formatRupiah(max)}</span>
        </div>
      )}
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

// ============ KOMPONEN PROGRAM CARD ============
function ProgramCard({ program, onEdit, onDelete, canEdit }) {
  const [expanded, setExpanded] = useState(false)
  const [showVariabel, setShowVariabel] = useState(false)

  const variabelItems = program.variabel || []
  const totalVariabel = useMemo(() => calculateTotal(variabelItems), [variabelItems])
  const paguAnggaran = program.pagu_anggaran || 0
  const sisaPagu = paguAnggaran - totalVariabel
  const serapan = paguAnggaran > 0 ? Math.round((totalVariabel / paguAnggaran) * 100) : 0
  const isOverBudget = sisaPagu < 0

  const getStatusBadge = () => {
    if (isOverBudget) return { text: 'Over Budget', class: 'badge-amber' }
    if (serapan >= 90) return { text: 'Hampir Habis', class: 'badge-amber' }
    if (serapan === 0) return { text: 'Belum Dipakai', class: 'badge-slate' }
    return { text: 'Aktif', class: 'badge-green' }
  }

  const status = getStatusBadge()

  return (
    <div className="card program-panel" style={{ marginBottom: '0.75rem' }}>
      {/* Header Card */}
      <div 
        className="program-summary"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <div className="collapse-mark" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className={`badge ${status.class}`}>{status.text}</span>
            <span className="muted" style={{ fontSize: '0.75rem' }}>{program.id_rka}</span>
          </div>
          <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '0.25rem' }}>{program.nama}</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {program.unit_kerja_id}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {program.tahun}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>Pagu Anggaran</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: isOverBudget ? 'var(--danger)' : 'var(--text)' }}>
            {formatRupiah(paguAnggaran)}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ padding: '0 1.25rem', marginBottom: '0.75rem' }}>
        <ProgressBar value={totalVariabel} max={paguAnggaran} />
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="program-detail" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Stats Grid */}
          <div className="rka-meta" style={{ marginBottom: '1rem' }}>
            <div>
              <span>Total Pagu</span>
              <strong>{formatRupiah(paguAnggaran)}</strong>
            </div>
            <div>
              <span>Total Variabel</span>
              <strong style={{ color: isOverBudget ? 'var(--danger)' : 'var(--text)' }}>
                {formatRupiah(totalVariabel)}
              </strong>
            </div>
            <div>
              <span>Sisa Pagu</span>
              <strong style={{ color: isOverBudget ? 'var(--danger)' : 'var(--success)' }}>
                {isOverBudget ? '-' : ''}{formatRupiah(Math.abs(sisaPagu))}
                {isOverBudget && <span style={{ fontSize: '0.75rem', display: 'block' }}>(Over Budget)</span>}
              </strong>
            </div>
            <div>
              <span>% Penggunaan</span>
              <strong style={{ color: isOverBudget ? 'var(--danger)' : 'var(--text)' }}>{serapan}%</strong>
            </div>
          </div>

          {/* Rincian Biaya Toggle */}
          <div className="variabel-toggle">
            <button
              className="ghost"
              onClick={(e) => { e.stopPropagation(); setShowVariabel(!showVariabel) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5z" />
              </svg>
              {showVariabel ? 'Sembunyikan' : 'Tampilkan'} Rincian Biaya
              {showVariabel ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </button>
          </div>

          {/* Biaya Variabel Section */}
          {showVariabel && (
            <BiayaVariabelSection
              programId={program.id}
              items={variabelItems}
              onUpdate={(items) => onUpdateVariabel(program.id, items)}
              canEdit={canEdit}
              pagu={paguAnggaran}
            />
          )}

          {/* Actions */}
          {canEdit && (
            <div className="flex gap-2 mt-4" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button
                className="btn btn-primary"
                onClick={(e) => { e.stopPropagation(); onEdit(program) }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
              <button
                className="btn btn-danger"
                onClick={(e) => { e.stopPropagation(); onDelete(program.id) }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Hapus
              </button>
              <a
                href={`/pencairan?program=${program.id}`}
                onClick={(e) => e.stopPropagation()}
                className="btn btn-primary"
                style={{ marginLeft: 'auto', background: 'var(--success)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Pencairan
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============ KOMPONEN BIAYA VARIABEL ============
function BiayaVariabelSection({ programId, canEdit, pagu }) {
  const { loadBiayaVariabel, addBiayaVariabel, updateBiayaVariabel, deleteBiayaVariabel } = useProgramKerja()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newItem, setNewItem] = useState({ nama_variabel: '', jumlah: 1, harga_satuan: 0, satuan: '' })
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    loadItems()
  }, [programId])

  const loadItems = async () => {
    try {
      setLoading(true)
      const data = await loadBiayaVariabel(programId)
      setItems(data)
    } catch (err) {
      console.error('Error loading biaya variabel:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalVariabel = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0)
  }, [items])
  
  const sisaPagu = pagu - totalVariabel
  const isOverBudget = sisaPagu < 0
  const isFull = sisaPagu <= 0
  const persentaseUsed = pagu > 0 ? (totalVariabel / pagu) * 100 : 0
  
  // Validasi sebelum tambah
  const newItemTotal = (newItem.jumlah || 0) * (newItem.harga_satuan || 0)
  const willExceed = (totalVariabel + newItemTotal) > pagu

  const handleAdd = async () => {
    if (!newItem.nama_variabel.trim()) {
      setErrorMsg('Nama variabel wajib diisi')
      return
    }
    
    if (willExceed) {
      setErrorMsg(`Gagal! Total akan melebihi pagu. Sisa pagu: ${formatRupiah(sisaPagu)}`)
      return
    }
    
    try {
      await addBiayaVariabel(programId, newItem)
      await loadItems()
      setNewItem({ nama_variabel: '', jumlah: 1, harga_satuan: 0, satuan: '' })
      setShowForm(false)
      setErrorMsg('')
    } catch (err) {
      setErrorMsg('Gagal menambahkan: ' + err.message)
    }
  }

  const handleRemove = async (id) => {
    if (!confirm('Hapus item ini?')) return
    try {
      await deleteBiayaVariabel(id)
      await loadItems()
      setErrorMsg('')
    } catch (err) {
      alert('Gagal menghapus: ' + err.message)
    }
  }

  const handleUpdate = async (updated) => {
    // Cek apakah update akan melebihi pagu
    const oldItem = items.find(i => i.id === updated.id)
    const oldTotal = oldItem ? oldItem.total : 0
    const newTotal = (updated.jumlah || 0) * (updated.harga_satuan || 0)
    const totalAfterUpdate = totalVariabel - oldTotal + newTotal
    
    if (totalAfterUpdate > pagu) {
      alert(`Gagal! Total akan melebihi pagu. Sisa yang bisa digunakan: ${formatRupiah(pagu - (totalVariabel - oldTotal))}`)
      return
    }
    
    try {
      await updateBiayaVariabel(updated.id, updated)
      await loadItems()
      setErrorMsg('')
    } catch (err) {
      alert('Gagal mengupdate: ' + err.message)
    }
  }

  // Warna progress bar berdasarkan persentase
  const getProgressColor = () => {
    if (persentaseUsed >= 100) return 'var(--danger)'
    if (persentaseUsed >= 80) return 'var(--warning)'
    return 'var(--success)'
  }

  return (
    <div className="variabel-section" style={{ 
      background: 'white', 
      borderRadius: '12px', 
      border: '1px solid var(--border)',
      overflow: 'hidden'
    }}>
      {/* Header dengan Progress */}
      <div style={{ 
        padding: '1.25rem', 
        background: isOverBudget ? 'var(--danger-bg)' : isFull ? 'var(--warning-bg)' : 'var(--surface-2)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem', color: 'var(--primary)' }}>
              <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5z" />
              <path d="M6 9.01V9" /><path d="M15 5l6.3 6.3M14 7.58l-5.92 5.92" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Rincian Biaya Variabel</span>
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '0.125rem 0.5rem', 
              background: isFull ? 'var(--danger)' : persentaseUsed >= 80 ? 'var(--warning)' : 'var(--success)',
              color: 'white',
              borderRadius: '999px'
            }}>
              {items.length} Item
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: '0.25rem' }}>
              Total Variabel
            </div>
            <div style={{ 
              fontWeight: 700, 
              fontSize: '1.125rem',
              color: isOverBudget ? 'var(--danger)' : 'var(--text)'
            }}>
              {formatRupiah(totalVariabel)}
            </div>
          </div>
        </div>

        {/* Progress Bar Pagu */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.375rem' }}>
            <span style={{ color: 'var(--text-2)' }}>Penggunaan Pagu</span>
            <span style={{ 
              fontWeight: 600,
              color: persentaseUsed >= 100 ? 'var(--danger)' : persentaseUsed >= 80 ? 'var(--warning)' : 'var(--success)'
            }}>
              {persentaseUsed.toFixed(1)}% ({formatRupiah(sisaPagu)} tersisa)
            </span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            background: 'var(--surface-3)', 
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${Math.min(persentaseUsed, 100)}%`, 
              height: '100%', 
              background: getProgressColor(),
              borderRadius: '999px',
              transition: 'all 0.3s ease'
            }} />
          </div>
        </div>

        {/* Warning Message */}
        {isFull && (
          <div style={{ 
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius)',
            fontSize: '0.8125rem',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Pagu sudah penuh! Tidak bisa menambah variabel lagi.
          </div>
        )}
        {!isFull && persentaseUsed >= 80 && (
          <div style={{ 
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning)',
            borderRadius: 'var(--radius)',
            fontSize: '0.8125rem',
            color: 'var(--warning)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Pagu hampir habis! Sisa {formatRupiah(sisaPagu)}.
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</div>
      )}

      {/* Table */}
      {!loading && items.length > 0 ? (
        <div className="table-wrap" style={{ padding: '0 1rem' }}>
          <table style={{ fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={{ width: '40px', padding: '0.75rem' }}>No</th>
                <th style={{ padding: '0.75rem' }}>Nama Variabel</th>
                <th style={{ width: '100px', padding: '0.75rem', textAlign: 'center' }}>Jumlah</th>
                <th style={{ width: '140px', padding: '0.75rem', textAlign: 'right' }}>Harga Satuan</th>
                <th style={{ width: '140px', padding: '0.75rem', textAlign: 'right' }}>Total</th>
                {canEdit && <th style={{ width: '50px', padding: '0.75rem' }}></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <BiayaVariabelRow 
                  key={item.id} 
                  item={item} 
                  index={idx} 
                  onUpdate={handleUpdate} 
                  onRemove={handleRemove} 
                  canEdit={canEdit} 
                />
              ))}
              <tr style={{ background: 'var(--surface-3)', borderTop: '2px solid var(--border)' }}>
                <td colSpan={4} className="text-right" style={{ padding: '0.875rem', fontWeight: 700, fontSize: '0.9375rem' }}>
                  TOTAL BIAYA VARIABEL
                </td>
                <td className="text-right" style={{ 
                  padding: '0.875rem', 
                  fontWeight: 700, 
                  fontSize: '1rem',
                  color: isOverBudget ? 'var(--danger)' : 'var(--primary)'
                }}>
                  {formatRupiah(totalVariabel)}
                </td>
                {canEdit && <td style={{ padding: '0.875rem' }}></td>}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        !loading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '2.5rem 1rem',
            color: 'var(--text-2)',
            background: 'var(--surface-2)',
            margin: '1rem',
            borderRadius: 'var(--radius)',
            border: '2px dashed var(--border)'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px', marginBottom: '0.75rem', opacity: 0.5 }}>
              <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5z" />
            </svg>
            <p style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Belum ada rincian biaya variabel</p>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Klik "Tambah Variabel" untuk menambahkan</p>
          </div>
        )
      )}

      {/* Add Button / Form */}
      {canEdit && (
        <div style={{ padding: '1rem', background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
          {errorMsg && (
            <div style={{ 
              marginBottom: '0.75rem',
              padding: '0.5rem 0.75rem',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius)',
              fontSize: '0.8125rem',
              color: 'var(--danger)'
            }}>
              {errorMsg}
            </div>
          )}
          
          {showForm ? (
            <div className="variabel-form-inline">
              <input
                className="table-input"
                value={newItem.nama_variabel}
                onChange={(e) => {
                  setNewItem({ ...newItem, nama_variabel: e.target.value })
                  setErrorMsg('')
                }}
                placeholder="Nama variabel (cth: Beli bola voli)"
                autoFocus
                style={{ flex: 1 }}
              />
              <input
                type="number"
                className="table-input table-input-num"
                value={newItem.jumlah}
                onChange={(e) => {
                  setNewItem({ ...newItem, jumlah: parseInt(e.target.value) || 0 })
                  setErrorMsg('')
                }}
                placeholder="Qty"
                min="1"
                style={{ width: '70px' }}
              />
              <input
                className="table-input table-input-num"
                value={newItem.satuan}
                onChange={(e) => setNewItem({ ...newItem, satuan: e.target.value })}
                placeholder="Satuan"
                style={{ width: '80px' }}
              />
              <input
                type="number"
                className="table-input table-input-num"
                value={newItem.harga_satuan}
                onChange={(e) => setNewItem({ ...newItem, harga_satuan: parseInt(e.target.value) || 0 })}
                placeholder="Harga"
                min="0"
                style={{ width: '120px' }}
              />
              <button 
                className="btn btn-primary" 
                onClick={handleAdd}
                disabled={willExceed}
                style={{ opacity: willExceed ? 0.5 : 1 }}
              >
                Tambah
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => {
                  setShowForm(false)
                  setErrorMsg('')
                  setNewItem({ nama_variabel: '', jumlah: 1, harga_satuan: 0, satuan: '' })
                }}
              >
                Batal
              </button>
            </div>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={() => {
                if (isFull) {
                  alert('Pagu sudah penuh! Tidak bisa menambah variabel lagi.')
                  return
                }
                setShowForm(true)
                setErrorMsg('')
              }}
              disabled={isFull}
              style={{ 
                width: '100%',
                opacity: isFull ? 0.5 : 1,
                cursor: isFull ? 'not-allowed' : 'pointer'
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {isFull ? 'Pagu Penuh - Tidak Bisa Menambah' : 'Tambah Variabel Baru'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function BiayaVariabelRow({ item, onUpdate, onRemove, canEdit, index }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td className="text-center text-muted" style={{ padding: '0.75rem' }}>{index + 1}</td>
      <td style={{ padding: '0.75rem' }}>
        {canEdit ? (
          <input
            className="table-input"
            value={item.nama_variabel}
            onChange={(e) => onUpdate({ ...item, nama_variabel: e.target.value })}
            placeholder="Nama item"
            style={{ width: '100%', minWidth: '150px' }}
          />
        ) : (
          <span style={{ fontWeight: 500 }}>{item.nama_variabel}</span>
        )}
      </td>
      <td className="text-center" style={{ padding: '0.75rem' }}>
        {canEdit ? (
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}>
            <input
              type="number"
              className="table-input table-input-num"
              value={item.jumlah}
              onChange={(e) => onUpdate({ ...item, jumlah: parseInt(e.target.value) || 0 })}
              min="0"
              style={{ width: '60px', textAlign: 'center' }}
            />
            <input
              className="table-input table-input-num"
              value={item.satuan}
              onChange={(e) => onUpdate({ ...item, satuan: e.target.value })}
              placeholder="Satuan"
              style={{ width: '70px', textAlign: 'center' }}
            />
          </div>
        ) : (
          <span>{item.jumlah} {item.satuan}</span>
        )}
      </td>
      <td className="text-right" style={{ padding: '0.75rem' }}>
        {canEdit ? (
          <input
            type="number"
            className="table-input table-input-num"
            value={item.harga_satuan}
            onChange={(e) => onUpdate({ ...item, harga_satuan: parseInt(e.target.value) || 0 })}
            min="0"
            style={{ width: '120px', textAlign: 'right' }}
          />
        ) : (
          <span>{formatRupiah(item.harga_satuan)}</span>
        )}
      </td>
      <td className="text-right" style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
        {formatRupiah(item.total || 0)}
      </td>
      {canEdit && (
        <td className="text-center" style={{ padding: '0.75rem' }}>
          <button 
            className="ghost icon-only" 
            onClick={() => onRemove(item.id)} 
            title="Hapus"
            style={{ color: 'var(--danger)', padding: '0.25rem' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </td>
      )}
    </tr>
  )
}

// ============ KOMPONEN PROGRAM TABLE ============
function ProgramTable({ programs, onEdit, onDelete, canEdit }) {
  const [expandedId, setExpandedId] = useState(null)

  return (
    <div className="table-wrap">
      <table style={{ minWidth: '48rem' }}>
        <thead>
          <tr>
            <th>Program</th>
            <th>Unit Kerja</th>
            <th className="text-right">Pagu</th>
            <th className="text-right">Terpakai</th>
            <th className="text-right">Sisa</th>
            <th className="text-center">%</th>
            <th className="text-center">Status</th>
            {canEdit && <th className="text-center">Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {programs.map((program) => {
            const totalVariabel = calculateTotal(program.variabel || [])
            const paguAnggaran = program.pagu_anggaran || 0
            const sisaPagu = paguAnggaran - totalVariabel
            const serapan = paguAnggaran > 0 ? Math.round((totalVariabel / paguAnggaran) * 100) : 0
            const isOverBudget = sisaPagu < 0
            const isExpanded = expandedId === program.id

            const getStatusBadge = () => {
              if (isOverBudget) return { text: 'Over', class: 'badge-amber' }
              if (serapan >= 90) return { text: 'Warning', class: 'badge-amber' }
              if (serapan === 0) return { text: 'Idle', class: 'badge-slate' }
              return { text: 'Active', class: 'badge-green' }
            }

            const status = getStatusBadge()

            return (
              <>
                <tr 
                  key={program.id}
                  className={isExpanded ? 'header-row' : ''}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : program.id)}
                >
                  <td>
                    <div>
                      <strong style={{ fontSize: '0.875rem' }}>{program.nama}</strong>
                      <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>
                        {program.id_rka} • {program.tahun}
                      </p>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{program.unit_kerja_id}</td>
                  <td className="text-right" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatRupiah(paguAnggaran)}</td>
                  <td className="text-right" style={{ fontSize: '0.875rem' }}>{formatRupiah(totalVariabel)}</td>
                  <td className="text-right" style={{ fontSize: '0.875rem' }}>
                    <span className={isOverBudget ? 'text-danger' : ''}>
                      {formatRupiah(Math.abs(sisaPagu))}
                    </span>
                  </td>
                  <td className="text-center" style={{ fontSize: '0.875rem' }}>
                    <span className={isOverBudget ? 'text-danger' : ''}>{serapan}%</span>
                  </td>
                  <td className="text-center">
                    <span className={`badge ${status.class}`}>{status.text}</span>
                  </td>
                  {canEdit && (
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className="ghost icon-only"
                          onClick={(e) => { e.stopPropagation(); onEdit(program) }}
                          title="Edit"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="ghost icon-only"
                          style={{ color: 'var(--danger)' }}
                          onClick={(e) => { e.stopPropagation(); onDelete(program.id) }}
                          title="Hapus"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} style={{ padding: 0, background: 'var(--surface-2)' }}>
                      <div style={{ padding: '1rem' }}>
                        <BiayaVariabelSection
                          programId={program.id}
                          items={program.variabel || []}
                          onUpdate={(items) => onUpdateVariabel(program.id, items)}
                          canEdit={canEdit}
                          pagu={paguAnggaran}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============ KOMPONEN PAGINATION ============
function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'space-between', 
      gap: '1rem',
      marginTop: '1.5rem' 
    }} className="sm:flex-row">
      <p className="muted" style={{ fontSize: '0.8125rem' }}>
        Menampilkan <strong>{startItem}</strong> - <strong>{endItem}</strong> dari <strong>{totalItems}</strong> program
      </p>

      <div className="flex items-center gap-2">
        <button
          className="btn ghost icon-only"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className="btn icon-only"
              style={{ 
                minWidth: '2.25rem',
                background: currentPage === page ? 'var(--primary)' : 'var(--surface)',
                color: currentPage === page ? 'white' : 'var(--text)',
                border: currentPage === page ? 'none' : '1px solid var(--border)'
              }}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          className="btn ghost icon-only"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ============ KOMPONEN MODAL ============
function ProgramModal({ program, onSave, onClose }) {
  const [form, setForm] = useState({
    id_rka: program?.id_rka || '',
    nama_program: program?.nama || '',
    unit_kerja: program?.unit_kerja_id || 'USC',
    tahun: program?.tahun || new Date().getFullYear(),
    pagu: program?.pagu_anggaran || 0,
  })
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.pagu < 0) {
      setError('Pagu tidak boleh negatif')
      return
    }
    if (!form.id_rka.trim() || !form.nama_program.trim()) {
      setError('ID RKA dan Nama Program wajib diisi')
      return
    }
    // Mapping form fields ke field database yang benar
    const dataToSave = {
      ...program,
      id_rka: form.id_rka,
      nama: form.nama_program,
      unit_kerja_id: form.unit_kerja,
      tahun: form.tahun,
      pagu_anggaran: form.pagu,
      variabel: program?.variabel || []
    }
    onSave(dataToSave)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{program?.id ? 'Edit' : 'Tambah'} Program Kerja</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card-form-body">
            {error && (
              <div className="error-msg" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <div className="form-grid">
              <div>
                <label>ID RKA</label>
                <input
                  name="id_rka"
                  value={form.id_rka}
                  onChange={(e) => setForm({ ...form, id_rka: e.target.value })}
                  required
                  placeholder="14406"
                />
              </div>
              <div>
                <label>Tahun Anggaran</label>
                <select
                  value={form.tahun}
                  onChange={(e) => setForm({ ...form, tahun: parseInt(e.target.value) })}
                >
                  {TAHUN_LIST.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="full">
                <label>Nama Program</label>
                <input
                  name="nama_program"
                  value={form.nama_program}
                  onChange={(e) => setForm({ ...form, nama_program: e.target.value })}
                  required
                  placeholder="Nama program kerja"
                />
              </div>
              <div>
                <label>Unit Kerja</label>
                <select
                  value={form.unit_kerja}
                  onChange={(e) => setForm({ ...form, unit_kerja: e.target.value })}
                >
                  {UNIT_KERJA_LIST.map((uk) => (
                    <option key={uk} value={uk}>{uk}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Pagu Anggaran (Rp)</label>
                <input
                  type="number"
                  name="pagu"
                  value={form.pagu}
                  onChange={(e) => setForm({ ...form, pagu: parseInt(e.target.value) || 0 })}
                  required
                  min="0"
                  placeholder="150000000"
                />
              </div>
            </div>
          </div>

          <div className="card-form-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============ HALAMAN UTAMA ============
export default function ProgramKerjaPage() {
  const { programs, loading, error, addProgram, updateProgram, deleteProgram, refreshPrograms } = useProgramKerja()

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [selectedTahun, setSelectedTahun] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState('card')
  const [currentPage, setCurrentPage] = useState(1)

  // Modal States
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  // User Role (nantinya dari context/auth)
  const userRole = 'super_admin'
  const canEdit = ['super_admin', 'admin_keuangan'].includes(userRole)

  // Filter & Sort Programs
  const filteredPrograms = useMemo(() => {
    let result = [...programs]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p => 
        (p.nama || '').toLowerCase().includes(query) ||
        (p.unit_kerja_id || '').toLowerCase().includes(query)
      )
    }

    // Unit filter
    if (selectedUnit) {
      result = result.filter(p => p.unit_kerja_id === selectedUnit)
    }

    // Tahun filter
    if (selectedTahun) {
      result = result.filter(p => p.tahun === parseInt(selectedTahun))
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (a.nama || '').localeCompare(b.nama || '')
        case 'name_desc':
          return (b.nama || '').localeCompare(a.nama || '')
        case 'pagu_asc':
          return (a.pagu_anggaran || 0) - (b.pagu_anggaran || 0)
        case 'pagu_desc':
          return (b.pagu_anggaran || 0) - (a.pagu_anggaran || 0)
        case 'oldest':
          return new Date(a.created_at || 0) - new Date(b.created_at || 0)
        case 'newest':
        default:
          return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      }
    })

    return result
  }, [programs, searchQuery, selectedUnit, selectedTahun, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredPrograms.length / ITEMS_PER_PAGE)
  const paginatedPrograms = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredPrograms.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredPrograms, currentPage])

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedUnit, selectedTahun, sortBy])

  // Calculate totals
  const totals = useMemo(() => {
    return filteredPrograms.reduce((acc, p) => {
      return {
        pagu: acc.pagu + (p.pagu_anggaran || 0),
        variabel: acc.variabel + 0, // Variabel akan diimplementasikan nanti
      }
    }, { pagu: 0, variabel: 0 })
  }, [filteredPrograms])

  // Handlers
  const handleSave = async (program) => {
    try {
      if (program.id) {
        await updateProgram(program.id, program)
      } else {
        await addProgram(program)
      }
      setShowModal(false)
      setEditing(null)
      await refreshPrograms()
    } catch (err) {
      alert('Gagal menyimpan program: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Hapus program ini?')) {
      try {
        await deleteProgram(id)
        await refreshPrograms()
      } catch (err) {
        alert('Gagal menghapus program: ' + err.message)
      }
    }
  }

  const handleExport = async (type = 'print') => {
    if (filteredPrograms.length === 0) {
      alert('Tidak ada data untuk diexport')
      return
    }

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `Program_Kerja_${timestamp}`

    if (type === 'print') {
      // Buka window print dengan data
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const html = generatePrintHTML(filteredPrograms, totals, selectedUnit, selectedTahun)
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => printWindow.print(), 500)
      }
    } else if (type === 'csv') {
      // Export ke CSV
      const csv = generateCSV(filteredPrograms)
      downloadFile(csv, `${filename}.csv`, 'text/csv')
    } else if (type === 'json') {
      // Export ke JSON
      const json = JSON.stringify(filteredPrograms, null, 2)
      downloadFile(json, `${filename}.json`, 'application/json')
    }
  }

  // Helper untuk generate HTML print
  const generatePrintHTML = (programs, totals, unitFilter, tahunFilter) => {
    const totalPagu = programs.reduce((sum, p) => sum + (p.pagu_anggaran || 0), 0)
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Data Program Kerja - SIMDIR</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .summary { margin-top: 30px; padding: 15px; background: #f9f9f9; border-radius: 5px; }
          .summary-item { display: flex; justify-content: space-between; margin: 5px 0; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; }
          @media print {
            .no-print { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>DATA PROGRAM KERJA</h1>
          <p>Direktorat Unesa Science Center</p>
          <p>Tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          ${unitFilter ? `<p>Unit Kerja: ${unitFilter}</p>` : ''}
          ${tahunFilter ? `<p>Tahun: ${tahunFilter}</p>` : ''}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Program</th>
              <th>Unit Kerja</th>
              <th>Tahun</th>
              <th class="text-right">Pagu Anggaran</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${programs.map((p, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${p.nama || '-'}</td>
                <td>${p.unit_kerja_id || '-'}</td>
                <td>${p.tahun || '-'}</td>
                <td class="text-right">Rp ${(p.pagu_anggaran || 0).toLocaleString('id-ID')}</td>
                <td>${p.status || 'aktif'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <div class="summary-item">
            <strong>Total Program:</strong>
            <span>${programs.length} program</span>
          </div>
          <div class="summary-item">
            <strong>Total Pagu Anggaran:</strong>
            <span>Rp ${totalPagu.toLocaleString('id-ID')}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Dicetak dari Sistem Informasi Manajemen Direktorat (SIMDIR)</p>
          <p>© ${new Date().getFullYear()} Unesa Science Center</p>
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
            🖨️ Cetak / Save as PDF
          </button>
        </div>
      </body>
      </html>
    `
  }

  // Helper untuk generate CSV
  const generateCSV = (programs) => {
    const headers = ['No', 'Nama Program', 'Unit Kerja', 'Tahun', 'Pagu Anggaran', 'Status', 'Sumber Dana']
    const rows = programs.map((p, idx) => [
      idx + 1,
      `"${(p.nama || '').replace(/"/g, '""')}"`,
      p.unit_kerja_id || '-',
      p.tahun || '-',
      p.pagu_anggaran || 0,
      p.status || 'aktif',
      p.sumber_dana || 'UKT'
    ])
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  }

  // Helper untuk download file
  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

    // Loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div>Memuat data program kerja...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
        <h3>Error Loading Data</h3>
        <p>{error}</p>
        <button onClick={refreshPrograms} className="btn btn-primary mt-4">
          Coba Lagi
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="toolbar" style={{ position: 'relative', zIndex: 1 }}>
        <div>
          <h2>Program Kerja & Anggaran</h2>
          <p className="muted" style={{ fontSize: '0.9375rem', marginTop: '0.25rem' }}>
            Kelola program kerja dan anggaran unit-unit kerja
          </p>
        </div>
        {canEdit && (
          <button
            className="btn btn-primary"
            onClick={() => { setEditing(null); setShowModal(true) }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Program
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-grid mb-6">
        <StatCard
          title="Total Pagu"
          value={formatRupiah(totals.pagu)}
          subtitle="Anggaran tersedia"
          variant="default"
        />
        <StatCard
          title="Total Terpakai"
          value={formatRupiah(totals.variabel)}
          subtitle="Biaya variabel"
          variant="info"
        />
        <StatCard
          title="Sisa Pagu"
          value={formatRupiah(totals.pagu - totals.variabel)}
          subtitle={`${totals.pagu > 0 ? Math.round((totals.variabel / totals.pagu) * 100) : 0}% terpakai`}
          variant={totals.pagu - totals.variabel < 0 ? 'danger' : 'success'}
        />
        <StatCard
          title="Jumlah Program"
          value={`${filteredPrograms.length}`}
          subtitle={`Dari ${programs.length} total program`}
          variant="warning"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedUnit={selectedUnit}
        setSelectedUnit={setSelectedUnit}
        selectedTahun={selectedTahun}
        setSelectedTahun={setSelectedTahun}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onExport={handleExport}
        totalItems={filteredPrograms.length}
      />

      {/* Content */}
      {filteredPrograms.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '3rem', height: '3rem', marginBottom: '1rem', opacity: 0.4 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <h3>Tidak ada program ditemukan</h3>
          <p>Coba ubah filter atau kata kunci pencarian</p>
        </div>
      ) : (
        <>
          {viewMode === 'card' ? (
            <div className="program-list">
              {paginatedPrograms.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  onEdit={(p) => { setEditing(p); setShowModal(true) }}
                  onDelete={handleDelete}
                  canEdit={canEdit}
                />
              ))}
            </div>
          ) : (
            <ProgramTable
              programs={paginatedPrograms}
              onEdit={(p) => { setEditing(p); setShowModal(true) }}
              onDelete={handleDelete}
              onManageVariabel={handleOpenVariabel}
              canEdit={canEdit}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredPrograms.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <ProgramModal
          program={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}

    </div>
  )
}
