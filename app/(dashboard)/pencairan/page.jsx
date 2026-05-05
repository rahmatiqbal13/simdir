'use client';

import { useState, useMemo } from 'react';

// Data program untuk referensi
const PROGRAM_LIST = [
  { id: '1', nama: 'Peningkatan tata kelola unit kerja', unit_kerja: 'USC', pagu: 150000000 },
  { id: '2', nama: 'Pemeliharaan fasilitas olahraga', unit_kerja: 'Kolam Renang', pagu: 75000000 },
  { id: '3', nama: 'Pengelolaan olahraga pendidikan', unit_kerja: 'PUI Keolahragaan', pagu: 100000000 },
  { id: '4', nama: 'Pengembangan atlet muda', unit_kerja: 'SSFC', pagu: 200000000 },
  { id: '5', nama: 'Turnamen golf nasional', unit_kerja: 'Driving Golf', pagu: 500000000 },
];

const ITEMS_PER_PAGE = 5;

const formatRupiah = (num) => {
  if (!num || isNaN(num)) return 'Rp 0';
  return 'Rp ' + num.toLocaleString('id-ID');
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
};

const formatDateFull = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
};

// ============ KOMPONEN STAT CARD ============
function StatCard({ title, value, subtitle, variant }) {
  return (
    <div className={`stat-card ${variant || ''}`}>
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
      {subtitle && <div className="muted text-sm mt-1">{subtitle}</div>}
    </div>
  );
}

// ============ KOMPONEN FILTER BAR ============
function FilterBar({ 
  searchQuery, 
  setSearchQuery, 
  selectedProgram, 
  setSelectedProgram,
  selectedStatus,
  setSelectedStatus,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  onExport
}) {
  const [showFilters, setShowFilters] = useState(false);

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
              placeholder="Cari pencairan..."
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
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Program Kerja</label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Semua Program</option>
                {PROGRAM_LIST.map((p) => (
                  <option key={p.id} value={p.id}>{p.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Status SPJ</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Semua Status</option>
                <option value="pending">Menunggu SPJ</option>
                <option value="partial">SPJ Sebagian</option>
                <option value="completed">SPJ Lengkap</option>
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
                <option value="amount_desc">Jumlah Terbesar</option>
                <option value="amount_asc">Jumlah Terkecil</option>
                <option value="name_asc">Nama A-Z</option>
                <option value="date_desc">Tanggal Terbaru</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ KOMPONEN STATUS BADGE ============
function StatusBadge({ status }) {
  const configs = {
    pending: { text: 'Menunggu SPJ', class: 'badge-amber' },
    partial: { text: 'SPJ Sebagian', class: 'badge-blue' },
    completed: { text: 'SPJ Lengkap', class: 'badge-green' },
  };

  const config = configs[status] || configs.pending;

  return (
    <span className={`badge ${config.class}`}>
      {config.text}
    </span>
  );
}

// ============ KOMPONEN PENCARIAN CARD ============
function PencairanCard({ item, onEdit, onDelete, canEdit, expandedId, setExpandedId }) {
  const isExpanded = expandedId === item.id;
  const program = PROGRAM_LIST.find(p => p.id === item.program_id) || { nama: item.program, unit_kerja: '-' };
  
  const getStatus = () => {
    // Simulasi status berdasarkan data
    if (!item.spj_submitted) return 'pending';
    if (item.spj_partial) return 'partial';
    return 'completed';
  };

  const status = getStatus();
  const totalKegiatan = item.kegiatan?.length || 0;
  const totalNilai = item.kegiatan?.reduce((sum, k) => sum + (k.jumlah || 0), 0) || item.jumlah || 0;

  return (
    <div className="card program-panel" style={{ marginBottom: '0.75rem' }}>
      {/* Header Card */}
      <div 
        className="program-summary"
        onClick={() => setExpandedId(isExpanded ? null : item.id)}
        style={{ cursor: 'pointer' }}
      >
        <div className="collapse-mark" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <StatusBadge status={status} />
            <span className="muted" style={{ fontSize: '0.75rem' }}>
              {formatDate(item.tanggal)}
            </span>
          </div>
          <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '0.25rem' }}>
            {item.nama}
          </strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {program.unit_kerja}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
              </svg>
              {totalKegiatan} kegiatan
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>Total Pencairan</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
            {formatRupiah(totalNilai)}
          </p>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="program-detail" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Info Grid */}
          <div className="rka-meta" style={{ marginBottom: '1rem' }}>
            <div>
              <span>Nama Pencairan</span>
              <strong>{item.nama}</strong>
            </div>
            <div>
              <span>Program Kerja</span>
              <strong>{program.nama}</strong>
            </div>
            <div>
              <span>Tanggal</span>
              <strong>{formatDateFull(item.tanggal)}</strong>
            </div>
            <div>
              <span>Total Nilai</span>
              <strong>{formatRupiah(totalNilai)}</strong>
            </div>
          </div>

          {/* Keterangan */}
          {item.keterangan && (
            <div style={{ 
              padding: '0.75rem 1rem', 
              background: 'var(--surface-2)', 
              borderRadius: 'var(--radius)',
              marginBottom: '1rem'
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>Keterangan</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{item.keterangan}</p>
            </div>
          )}

          {/* Daftar Kegiatan */}
          {totalKegiatan > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                Rincian Kegiatan
              </h4>
              <div className="table-wrap">
                <table style={{ minWidth: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>No</th>
                      <th>Uraian Kegiatan</th>
                      <th style={{ width: '150px' }} className="text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.kegiatan.map((k, idx) => (
                      <tr key={k.id}>
                        <td className="text-center text-muted">{idx + 1}</td>
                        <td>{k.uraian}</td>
                        <td className="text-right font-semibold">{formatRupiah(k.jumlah)}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={2} className="text-right"><strong>TOTAL</strong></td>
                      <td className="text-right font-semibold">{formatRupiah(totalNilai)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SPJ Section */}
          <div style={{ 
            padding: '1rem', 
            background: status === 'completed' ? 'var(--success-bg)' : 'var(--warning-bg)', 
            borderRadius: 'var(--radius)',
            border: `1px solid ${status === 'completed' ? 'rgba(5, 150, 105, 0.2)' : 'rgba(217, 119, 6, 0.2)'}`,
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ 
                  width: '2.5rem', 
                  height: '2.5rem', 
                  borderRadius: 'var(--radius)',
                  background: status === 'completed' ? 'var(--success)' : 'var(--warning)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'white'
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Status SPJ</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                    {status === 'completed' 
                      ? 'SPJ telah lengkap dan diverifikasi' 
                      : status === 'partial'
                      ? 'SPJ sebagian, menunggu kelengkapan'
                      : 'Menunggu pengumpulan SPJ'}
                  </p>
                </div>
              </div>
              <a 
                href={`/pencairan/${item.id}/spj`}
                className="btn btn-primary"
                style={{ 
                  background: status === 'completed' ? 'var(--success)' : 'var(--warning)',
                  fontSize: '0.8125rem'
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                </svg>
                Kelola SPJ
              </a>
            </div>
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="flex gap-2 mt-4" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button
                className="btn btn-primary"
                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
              <button
                className="btn btn-danger"
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Hapus
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ KOMPONEN PENCARIAN TABLE ============
function PencairanTable({ items, onEdit, onDelete, canEdit, expandedId, setExpandedId }) {
  return (
    <div className="table-wrap">
      <table style={{ minWidth: '48rem' }}>
        <thead>
          <tr>
            <th>Pencairan</th>
            <th>Program</th>
            <th>Tanggal</th>
            <th className="text-right">Jumlah</th>
            <th className="text-center">Kegiatan</th>
            <th className="text-center">Status SPJ</th>
            {canEdit && <th className="text-center">Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            const program = PROGRAM_LIST.find(p => p.id === item.program_id) || { nama: item.program };
            const totalKegiatan = item.kegiatan?.length || 0;
            const totalNilai = item.kegiatan?.reduce((sum, k) => sum + (k.jumlah || 0), 0) || item.jumlah || 0;
            
            const getStatus = () => {
              if (!item.spj_submitted) return 'pending';
              if (item.spj_partial) return 'partial';
              return 'completed';
            };
            
            const status = getStatus();

            return (
              <>
                <tr 
                  key={item.id}
                  className={isExpanded ? 'header-row' : ''}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <td>
                    <div>
                      <strong style={{ fontSize: '0.875rem' }}>{item.nama}</strong>
                      {item.keterangan && (
                        <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>
                          {item.keterangan.length > 50 ? item.keterangan.substring(0, 50) + '...' : item.keterangan}
                        </p>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{program.nama}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{formatDate(item.tanggal)}</td>
                  <td className="text-right" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatRupiah(totalNilai)}</td>
                  <td className="text-center" style={{ fontSize: '0.875rem' }}>{totalKegiatan}</td>
                  <td className="text-center">
                    <StatusBadge status={status} />
                  </td>
                  {canEdit && (
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <a 
                          href={`/pencairan/${item.id}/spj`}
                          className="btn icon-only"
                          style={{ color: 'var(--primary)' }}
                          onClick={(e) => e.stopPropagation()}
                          title="Kelola SPJ"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                          </svg>
                        </a>
                        <button
                          className="ghost icon-only"
                          onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                          title="Edit"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="ghost icon-only"
                          style={{ color: 'var(--danger)' }}
                          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                          title="Hapus"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} style={{ padding: 0, background: 'var(--surface-2)' }}>
                      <div style={{ padding: '1rem' }}>
                        {/* Kegiatan Detail */}
                        {totalKegiatan > 0 && (
                          <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                            <table>
                              <thead>
                                <tr>
                                  <th style={{ width: '40px' }}>No</th>
                                  <th>Uraian Kegiatan</th>
                                  <th style={{ width: '150px' }} className="text-right">Jumlah</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.kegiatan.map((k, idx) => (
                                  <tr key={k.id}>
                                    <td className="text-center text-muted">{idx + 1}</td>
                                    <td>{k.uraian}</td>
                                    <td className="text-right font-semibold">{formatRupiah(k.jumlah)}</td>
                                  </tr>
                                ))}
                                <tr className="total-row">
                                  <td colSpan={2} className="text-right"><strong>TOTAL</strong></td>
                                  <td className="text-right font-semibold">{formatRupiah(totalNilai)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {/* SPJ Quick Action */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <a 
                            href={`/pencairan/${item.id}/spj`}
                            className="btn btn-primary"
                            style={{ fontSize: '0.8125rem' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                            </svg>
                            Kelola SPJ
                          </a>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============ KOMPONEN PAGINATION ============
function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

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
        Menampilkan <strong>{startItem}</strong> - <strong>{endItem}</strong> dari <strong>{totalItems}</strong> pencairan
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
  );
}

// ============ KOMPONEN MODAL ============
function PencairanModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({
    nama: item?.nama || '',
    program_id: item?.program_id || '1',
    tanggal: item?.tanggal || new Date().toISOString().split('T')[0],
    jumlah: item?.jumlah || 0,
    keterangan: item?.keterangan || '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!form.nama.trim()) {
      setError('Nama pencairan wajib diisi');
      return;
    }
    if (form.jumlah <= 0) {
      setError('Jumlah harus lebih dari 0');
      return;
    }

    const selectedProgram = PROGRAM_LIST.find(p => p.id === form.program_id);
    
    onSave({
      ...item,
      ...form,
      id: item?.id || Date.now().toString(),
      program: selectedProgram?.nama || '',
      kegiatan: item?.kegiatan || [],
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{item?.id ? 'Edit' : 'Tambah'} Pencairan Dana</h2>
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
              <div className="full">
                <label>Nama Pencairan</label>
                <input
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  required
                  placeholder="Contoh: TUPK Maret 2026"
                />
              </div>
              <div>
                <label>Program Kerja</label>
                <select
                  value={form.program_id}
                  onChange={(e) => setForm({ ...form, program_id: e.target.value })}
                  required
                >
                  {PROGRAM_LIST.map((p) => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Tanggal</label>
                <input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  required
                />
              </div>
              <div>
                <label>Jumlah (Rp)</label>
                <input
                  type="number"
                  value={form.jumlah}
                  onChange={(e) => setForm({ ...form, jumlah: parseInt(e.target.value) || 0 })}
                  required
                  min="1"
                  placeholder="50000000"
                />
              </div>
              <div className="full">
                <label>Keterangan</label>
                <textarea
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  rows={3}
                  placeholder="Keterangan tambahan (opsional)"
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
  );
}

// ============ HALAMAN UTAMA ============
export default function PencairanPage() {
  const [pencairan, setPencairan] = useState([
    { 
      id: '1', 
      nama: 'TUPK Maret 2026', 
      program: 'Peningkatan tata kelola unit kerja', 
      program_id: '1', 
      tanggal: '2026-03-15', 
      jumlah: 50000000, 
      keterangan: 'Pencairan pertama semester untuk operasional rutin', 
      kegiatan: [
        { id: 'k1', uraian: 'Pengadaan alat tulis kantor', jumlah: 15000000 },
        { id: 'k2', uraian: 'Biaya operasional bulan Maret', jumlah: 35000000 },
      ],
      spj_submitted: false,
    },
    { 
      id: '2', 
      nama: 'TUP 1 April', 
      program: 'Pemeliharaan fasilitas olahraga', 
      program_id: '2', 
      tanggal: '2026-04-01', 
      jumlah: 25000000, 
      keterangan: 'Pemeliharaan berkala fasilitas kolam renang', 
      kegiatan: [
        { id: 'k3', uraian: 'Perbaikan pompa air', jumlah: 10000000 },
        { id: 'k4', uraian: 'Pengadaan suku cadang', jumlah: 15000000 },
      ],
      spj_submitted: true,
      spj_partial: true,
    },
    { 
      id: '3', 
      nama: 'Honorarium Pelatih Q1', 
      program: 'Pengembangan atlet muda', 
      program_id: '4', 
      tanggal: '2026-03-31', 
      jumlah: 60000000, 
      keterangan: 'Pembayaran honorarium pelatih periode Januari-Maret', 
      kegiatan: [
        { id: 'k5', uraian: 'Honor pelatih teknik', jumlah: 30000000 },
        { id: 'k6', uraian: 'Honor pelatih fisik', jumlah: 20000000 },
        { id: 'k7', uraian: 'Honor pelatih kiper', jumlah: 10000000 },
      ],
      spj_submitted: true,
      spj_partial: false,
    },
    { 
      id: '4', 
      nama: 'Biaya Turnamen Regional', 
      program: 'Pengembangan atlet muda', 
      program_id: '4', 
      tanggal: '2026-04-10', 
      jumlah: 15000000, 
      keterangan: 'Biaya pendaftaran dan transport turnamen regional', 
      kegiatan: [
        { id: 'k8', uraian: 'Pendaftaran turnamen', jumlah: 5000000 },
        { id: 'k9', uraian: 'Transportasi tim', jumlah: 8000000 },
        { id: 'k10', uraian: 'Konsumsi perjalanan', jumlah: 2000000 },
      ],
      spj_submitted: false,
    },
    { 
      id: '5', 
      nama: 'Pengadaan Peralatan Golf', 
      program: 'Turnamen golf nasional', 
      program_id: '5', 
      tanggal: '2026-04-15', 
      jumlah: 75000000, 
      keterangan: 'Pengadaan peralatan pendukung turnamen', 
      kegiatan: [
        { id: 'k11', uraian: 'Sewa peralatan scoring', jumlah: 25000000 },
        { id: 'k12', uraian: 'Pengadaan bendera dan marka', jumlah: 15000000 },
        { id: 'k13', uraian: 'Peralatan komunikasi', jumlah: 20000000 },
        { id: 'k14', uraian: 'Peralatan dokumentasi', jumlah: 15000000 },
      ],
      spj_submitted: true,
      spj_partial: false,
    },
  ]);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('card');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // User Role
  const userRole = 'super_admin';
  const canEdit = ['super_admin', 'admin_keuangan'].includes(userRole);

  // Filter & Sort
  const filteredItems = useMemo(() => {
    let result = [...pencairan];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.nama.toLowerCase().includes(query) ||
        p.program.toLowerCase().includes(query) ||
        (p.keterangan && p.keterangan.toLowerCase().includes(query))
      );
    }

    // Program filter
    if (selectedProgram) {
      result = result.filter(p => p.program_id === selectedProgram);
    }

    // Status filter
    if (selectedStatus) {
      result = result.filter(p => {
        const status = !p.spj_submitted ? 'pending' : p.spj_partial ? 'partial' : 'completed';
        return status === selectedStatus;
      });
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.nama.localeCompare(b.nama);
        case 'amount_desc':
          return (b.jumlah || 0) - (a.jumlah || 0);
        case 'amount_asc':
          return (a.jumlah || 0) - (b.jumlah || 0);
        case 'date_desc':
          return new Date(b.tanggal) - new Date(a.tanggal);
        case 'oldest':
          return a.id.localeCompare(b.id);
        case 'newest':
        default:
          return b.id.localeCompare(a.id);
      }
    });

    return result;
  }, [pencairan, searchQuery, selectedProgram, selectedStatus, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedProgram, selectedStatus, sortBy]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredItems.reduce((acc, p) => {
      const total = p.kegiatan?.reduce((sum, k) => sum + (k.jumlah || 0), 0) || p.jumlah || 0;
      return {
        count: acc.count + 1,
        total: acc.total + total,
        pending: acc.pending + (!p.spj_submitted ? 1 : 0),
        completed: acc.completed + (p.spj_submitted && !p.spj_partial ? 1 : 0),
      };
    }, { count: 0, total: 0, pending: 0, completed: 0 });
  }, [filteredItems]);

  // Handlers
  const handleSave = (item) => {
    if (item.id && pencairan.find(p => p.id === item.id)) {
      setPencairan(pencairan.map(p => p.id === item.id ? item : p));
    } else {
      setPencairan([...pencairan, item]);
    }
    setShowModal(false);
    setEditingItem(null);
  };

  const handleDelete = (id) => {
    if (confirm('Hapus pencairan ini?')) {
      setPencairan(pencairan.filter(p => p.id !== id));
    }
  };

  const handleExport = () => {
    alert(`Export ${filteredItems.length} data pencairan`);
  };

  return (
    <div>
      {/* Header */}
      <div className="toolbar">
        <div>
          <h2>Pencairan Dana</h2>
          <p className="muted" style={{ fontSize: '0.9375rem', marginTop: '0.25rem' }}>
            Kelola pencairan dana dan SPJ program kerja
          </p>
        </div>
        {canEdit && (
          <button
            className="btn btn-primary"
            onClick={() => { setEditingItem(null); setShowModal(true); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Pencairan
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-grid mb-6">
        <StatCard
          title="Total Pencairan"
          value={formatRupiah(totals.total)}
          subtitle={`${totals.count} transaksi`}
          variant="default"
        />
        <StatCard
          title="Menunggu SPJ"
          value={`${totals.pending}`}
          subtitle="Perlu ditindaklanjuti"
          variant="warning"
        />
        <StatCard
          title="SPJ Lengkap"
          value={`${totals.completed}`}
          subtitle="Sudah diverifikasi"
          variant="success"
        />
        <StatCard
          title="Rata-rata"
          value={formatRupiah(totals.count > 0 ? Math.round(totals.total / totals.count) : 0)}
          subtitle="Nilai per pencairan"
          variant="info"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedProgram={selectedProgram}
        setSelectedProgram={setSelectedProgram}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onExport={handleExport}
      />

      {/* Content */}
      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '3rem', height: '3rem', marginBottom: '1rem', opacity: 0.4 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <h3>Tidak ada pencairan ditemukan</h3>
          <p>Coba ubah filter atau kata kunci pencarian</p>
        </div>
      ) : (
        <>
          {viewMode === 'card' ? (
            <div className="program-list">
              {paginatedItems.map((item) => (
                <PencairanCard
                  key={item.id}
                  item={item}
                  onEdit={(p) => { setEditingItem(p); setShowModal(true); }}
                  onDelete={handleDelete}
                  canEdit={canEdit}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                />
              ))}
            </div>
          ) : (
            <PencairanTable
              items={paginatedItems}
              onEdit={(p) => { setEditingItem(p); setShowModal(true); }}
              onDelete={handleDelete}
              canEdit={canEdit}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredItems.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <PencairanModal
          item={editingItem}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
        />
      )}
    </div>
  );
}
