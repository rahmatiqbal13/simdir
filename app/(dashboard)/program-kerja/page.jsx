'use client'

import { useState, useMemo, useCallback } from 'react'

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
  onExport
}) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="card mb-4">
      <div className="card-body">
        {/* Baris Pertama: Search dan Toggle View */}
        <div className="toolbar" style={{ marginBottom: showFilters ? '1rem' : 0 }}>
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

            <button
              onClick={onExport}
              className="btn btn-primary"
              style={{ background: 'var(--success)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
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
function ProgramCard({ program, onEdit, onDelete, onUpdateVariabel, canEdit }) {
  const [expanded, setExpanded] = useState(false)
  const [showVariabel, setShowVariabel] = useState(false)

  const variabelItems = program.variabel || []
  const totalVariabel = useMemo(() => calculateTotal(variabelItems), [variabelItems])
  const sisaPagu = program.pagu - totalVariabel
  const serapan = program.pagu > 0 ? Math.round((totalVariabel / program.pagu) * 100) : 0
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
          <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '0.25rem' }}>{program.nama_program}</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {program.unit_kerja}
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
            {formatRupiah(program.pagu)}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ padding: '0 1.25rem', marginBottom: '0.75rem' }}>
        <ProgressBar value={totalVariabel} max={program.pagu} />
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="program-detail" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Stats Grid */}
          <div className="rka-meta" style={{ marginBottom: '1rem' }}>
            <div>
              <span>Total Pagu</span>
              <strong>{formatRupiah(program.pagu)}</strong>
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
              pagu={program.pagu}
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
function BiayaVariabelSection({ programId, items, onUpdate, canEdit, pagu }) {
  const [showForm, setShowForm] = useState(false)
  const [newItem, setNewItem] = useState({ nama_variabel: '', jumlah: 1, harga_satuan: 0 })

  const totalVariabel = useMemo(() => calculateTotal(items), [items])
  const selisih = pagu - totalVariabel
  const isOverBudget = selisih < 0

  const handleAdd = () => {
    if (!newItem.nama_variabel.trim()) return
    onUpdate([...items, { ...newItem, id: `v${Date.now()}` }])
    setNewItem({ nama_variabel: '', jumlah: 1, harga_satuan: 0 })
    setShowForm(false)
  }

  const handleRemove = useCallback((id) => {
    onUpdate(items.filter((i) => i.id !== id))
  }, [items, onUpdate])

  const handleUpdate = useCallback((updated) => {
    onUpdate(items.map((i) => i.id === updated.id ? updated : i))
  }, [items, onUpdate])

  return (
    <div className="variabel-section">
      {/* Header */}
      <div className="variabel-header">
        <div className="variabel-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5z" />
            <path d="M6 9.01V9" /><path d="M15 5l6.3 6.3M14 7.58l-5.92 5.92" />
          </svg>
          <span>Rincian Biaya Variabel</span>
        </div>
        <span className={isOverBudget ? 'text-danger font-semibold' : 'text-success font-semibold'}>
          Total: {formatRupiah(totalVariabel)}
        </span>
      </div>

      {/* Table */}
      {items.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>No</th>
                <th>Nama Variabel</th>
                <th style={{ width: '100px' }} className="text-right">Jumlah</th>
                <th style={{ width: '140px' }} className="text-right">Harga Satuan</th>
                <th style={{ width: '140px' }} className="text-right">Total</th>
                {canEdit && <th style={{ width: '50px' }}></th>}
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
              <tr className="total-row">
                <td colSpan={4} className="text-right"><strong>TOTAL</strong></td>
                <td className={`text-right font-semibold ${isOverBudget ? 'text-danger' : ''}`}>
                  {formatRupiah(totalVariabel)}
                </td>
                {canEdit && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-variabel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
            <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5z" />
          </svg>
          <p>Belum ada rincian biaya variabel</p>
        </div>
      )}

      {/* Add Button / Form */}
      {canEdit && (
        <div className="variabel-actions">
          {showForm ? (
            <div className="variabel-form-inline">
              <input
                className="table-input"
                value={newItem.nama_variabel}
                onChange={(e) => setNewItem({ ...newItem, nama_variabel: e.target.value })}
                placeholder="Nama variabel (cth: Beli bola voli)"
                autoFocus
                style={{ flex: 1 }}
              />
              <input
                type="number"
                className="table-input table-input-num"
                value={newItem.jumlah}
                onChange={(e) => setNewItem({ ...newItem, jumlah: parseInt(e.target.value) || 0 })}
                placeholder="Qty"
                min="1"
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
              <button className="btn btn-primary" onClick={handleAdd}>Tambah</button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Batal</button>
            </div>
          ) : (
            <button className="ghost text-sm" onClick={() => setShowForm(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tambah Variabel
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function BiayaVariabelRow({ item, onUpdate, onRemove, canEdit, index }) {
  const total = (item.jumlah || 0) * (item.harga_satuan || 0)

  return (
    <tr>
      <td className="text-center text-muted">{index + 1}</td>
      <td>
        {canEdit ? (
          <input
            className="table-input"
            value={item.nama_variabel}
            onChange={(e) => onUpdate({ ...item, nama_variabel: e.target.value })}
            placeholder="Nama item"
          />
        ) : (
          <span>{item.nama_variabel}</span>
        )}
      </td>
      <td className="text-right">
        {canEdit ? (
          <input
            type="number"
            className="table-input table-input-num"
            value={item.jumlah}
            onChange={(e) => onUpdate({ ...item, jumlah: parseInt(e.target.value) || 0 })}
            min="0"
          />
        ) : (
          item.jumlah
        )}
      </td>
      <td className="text-right">
        {canEdit ? (
          <input
            type="number"
            className="table-input table-input-num"
            value={item.harga_satuan}
            onChange={(e) => onUpdate({ ...item, harga_satuan: parseInt(e.target.value) || 0 })}
            min="0"
          />
        ) : (
          formatRupiah(item.harga_satuan)
        )}
      </td>
      <td className="text-right font-semibold">{formatRupiah(total)}</td>
      {canEdit && (
        <td className="text-center">
          <button className="ghost icon-only" onClick={() => onRemove(item.id)} title="Hapus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </td>
      )}
    </tr>
  )
}

// ============ KOMPONEN PROGRAM TABLE ============
function ProgramTable({ programs, onEdit, onDelete, onUpdateVariabel, canEdit }) {
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
            const sisaPagu = program.pagu - totalVariabel
            const serapan = program.pagu > 0 ? Math.round((totalVariabel / program.pagu) * 100) : 0
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
                      <strong style={{ fontSize: '0.875rem' }}>{program.nama_program}</strong>
                      <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>
                        {program.id_rka} • {program.tahun}
                      </p>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{program.unit_kerja}</td>
                  <td className="text-right" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatRupiah(program.pagu)}</td>
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
                          pagu={program.pagu}
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
    nama_program: program?.nama_program || '',
    unit_kerja: program?.unit_kerja || 'USC',
    tahun: program?.tahun || new Date().getFullYear(),
    pagu: program?.pagu || 0,
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
    onSave({ ...program, ...form, variabel: program?.variabel || [] })
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
  const [programs, setPrograms] = useState([
    {
      id: '1', id_rka: '14406', nama_program: 'Peningkatan tata kelola unit kerja',
      unit_kerja: 'USC', tahun: 2026, pagu: 150000000,
      variabel: [
        { id: 'v1', nama_variabel: 'Pengadaan ATK', jumlah: 50, harga_satuan: 25000 },
        { id: 'v2', nama_variabel: 'Transport rapat', jumlah: 20, harga_satuan: 150000 },
      ]
    },
    {
      id: '2', id_rka: '14407', nama_program: 'Pemeliharaan fasilitas olahraga',
      unit_kerja: 'Kolam Renang', tahun: 2026, pagu: 75000000,
      variabel: [
        { id: 'v3', nama_variabel: 'Cat akhir kolam', jumlah: 100, harga_satuan: 350000 },
      ]
    },
    {
      id: '3', id_rka: '14408', nama_program: 'Pengelolaan olahraga pendidikan',
      unit_kerja: 'PUI Keolahragaan', tahun: 2026, pagu: 100000000,
      variabel: []
    },
    {
      id: '4', id_rka: '14409', nama_program: 'Pengembangan atlet muda',
      unit_kerja: 'SSFC', tahun: 2026, pagu: 200000000,
      variabel: [
        { id: 'v4', nama_variabel: 'Pelatihan', jumlah: 30, harga_satuan: 2000000 },
        { id: 'v5', nama_variabel: 'Peralatan', jumlah: 50, harga_satuan: 1500000 },
      ]
    },
    {
      id: '5', id_rka: '14410', nama_program: 'Turnamen golf nasional',
      unit_kerja: 'Driving Golf', tahun: 2026, pagu: 500000000,
      variabel: [
        { id: 'v6', nama_variabel: 'Hadiah', jumlah: 1, harga_satuan: 300000000 },
        { id: 'v7', nama_variabel: 'Konsumsi', jumlah: 200, harga_satuan: 500000 },
      ]
    },
  ])

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
        p.nama_program.toLowerCase().includes(query) ||
        p.id_rka.toLowerCase().includes(query) ||
        p.unit_kerja.toLowerCase().includes(query)
      )
    }

    // Unit filter
    if (selectedUnit) {
      result = result.filter(p => p.unit_kerja === selectedUnit)
    }

    // Tahun filter
    if (selectedTahun) {
      result = result.filter(p => p.tahun === parseInt(selectedTahun))
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.nama_program.localeCompare(b.nama_program)
        case 'name_desc':
          return b.nama_program.localeCompare(a.nama_program)
        case 'pagu_asc':
          return a.pagu - b.pagu
        case 'pagu_desc':
          return b.pagu - a.pagu
        case 'usage_desc':
          const usageA = calculateTotal(a.variabel || []) / a.pagu
          const usageB = calculateTotal(b.variabel || []) / b.pagu
          return usageB - usageA
        case 'oldest':
          return a.id.localeCompare(b.id)
        case 'newest':
        default:
          return b.id.localeCompare(a.id)
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
      const totalVar = calculateTotal(p.variabel || [])
      return {
        pagu: acc.pagu + p.pagu,
        variabel: acc.variabel + totalVar,
      }
    }, { pagu: 0, variabel: 0 })
  }, [filteredPrograms])

  // Handlers
  const handleSave = (program) => {
    if (program.id) {
      setPrograms(programs.map((p) => p.id === program.id ? program : p))
    } else {
      setPrograms([...programs, { ...program, id: Date.now().toString() }])
    }
    setShowModal(false)
    setEditing(null)
  }

  const handleDelete = (id) => {
    if (confirm('Hapus program ini?')) {
      setPrograms(programs.filter((p) => p.id !== id))
    }
  }

  const handleUpdateVariabel = (programId, variabel) => {
    setPrograms(programs.map((p) => p.id === programId ? { ...p, variabel } : p))
  }

  const handleExport = () => {
    // Simulasi export
    alert(`Export ${filteredPrograms.length} program kerja`)
  }

  return (
    <div>
      {/* Header */}
      <div className="toolbar">
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
                  onUpdateVariabel={handleUpdateVariabel}
                  canEdit={canEdit}
                />
              ))}
            </div>
          ) : (
            <ProgramTable
              programs={paginatedPrograms}
              onEdit={(p) => { setEditing(p); setShowModal(true) }}
              onDelete={handleDelete}
              onUpdateVariabel={handleUpdateVariabel}
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
