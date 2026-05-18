'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { usePencairan } from '@/context/PencairanContext';

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
  onExport,
  programs = []
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
                {programs.map((p) => (
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
function PencairanCard({ item, onEdit, onDelete, canEdit, expandedId, setExpandedId, programs = [] }) {
  const isExpanded = expandedId === item.id;
  const program = programs.find(p => p.id === item.program_id) || { nama: item.program, unit_kerja: item.unit_kerja || '-' };
  
  const getStatus = () => {
    // Simulasi status berdasarkan data
    if (!item.spj_submitted) return 'pending';
    if (item.spj_partial) return 'partial';
    return 'completed';
  };

  const status = getStatus();
  const totalKegiatan = item.kegiatan?.length || 0;
  const totalNilai = item.kegiatan?.reduce((sum, k) => sum + (k.jumlah || 0), 0) || item.jumlah || 0;
  
  // Handle multiple programs
  const programCount = item.programs?.length || 0;
  const unitKerjaList = item.programs?.map(p => p.unit_kerja).filter(Boolean) || [];
  const uniqueUnitKerja = [...new Set(unitKerjaList)];

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
            {programCount > 1 && (
              <span style={{ 
                fontSize: '0.6875rem', 
                padding: '0.125rem 0.5rem', 
                background: 'var(--primary-bg)', 
                color: 'var(--primary)',
                borderRadius: '9999px',
                fontWeight: 500
              }}>
                {programCount} Program
              </span>
            )}
          </div>
          <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '0.25rem' }}>
            {item.nama}
          </strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {uniqueUnitKerja.length > 1 
                ? `${uniqueUnitKerja.length} Unit Kerja` 
                : (uniqueUnitKerja[0] || program.unit_kerja || '-')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
              </svg>
              {programCount > 0 ? `${programCount} program` : `${totalKegiatan} kegiatan`}
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
              <strong>{programCount > 1 ? `${programCount} Program` : (program.nama || '-')}</strong>
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
          
          {/* Multiple Programs Detail */}
          {programCount > 1 && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-2)' }}>
                Detail Program ({programCount})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {item.programs?.map((prog, idx) => (
                  <div key={prog.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.5rem',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.8125rem'
                  }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{idx + 1}. {prog.nama}</span>
                      <span className="muted" style={{ marginLeft: '0.5rem' }}>({prog.unit_kerja})</span>
                    </div>
                    <strong>{formatRupiah(prog.jumlah_alokasi)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                href={`/pencairan/${item.slug || item.id}/spj`}
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
function PencairanTable({ items, onEdit, onDelete, canEdit, expandedId, setExpandedId, programs = [] }) {
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
            const programCount = item.programs?.length || 0;
            const program = programs.find(p => p.id === item.program_id) || { nama: item.program, unit_kerja: item.unit_kerja };
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '0.875rem' }}>{item.nama}</strong>
                        {programCount > 1 && (
                          <span style={{ 
                            fontSize: '0.6875rem', 
                            padding: '0.125rem 0.375rem', 
                            background: 'var(--primary-bg)', 
                            color: 'var(--primary)',
                            borderRadius: '9999px'
                          }}>
                            {programCount} Program
                          </span>
                        )}
                      </div>
                      {item.keterangan && (
                        <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>
                          {item.keterangan.length > 50 ? item.keterangan.substring(0, 50) + '...' : item.keterangan}
                        </p>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>
                    {programCount > 1 
                      ? `${programCount} Program` 
                      : (program.nama || '-')}
                  </td>
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
                          href={`/pencairan/${item.slug || item.id}/spj`}
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
                            href={`/pencairan/${item.slug || item.id}/spj`}
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

// ============ KOMPONEN PROGRAM SEARCH SELECT ============
function ProgramSearchSelect({ programs, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = programs.filter(p =>
    p.nama.toLowerCase().includes(query.toLowerCase()) ||
    (p.unit_kerja_id && String(p.unit_kerja_id).toLowerCase().includes(query.toLowerCase()))
  );

  const handleSelect = (id) => {
    onSelect(id);
    setQuery('');
    setOpen(false);
  };

  if (programs.length === 0) return null;

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: '1rem' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ position: 'absolute', left: '0.75rem', width: '1rem', height: '1rem', color: 'var(--text-3)', pointerEvents: 'none' }}
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Cari dan tambah program kerja..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          style={{ paddingLeft: '2.25rem', paddingRight: query ? '2.25rem' : undefined }}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setOpen(false); }}
            style={{
              position: 'absolute', right: '0.75rem',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-3)', display: 'grid', placeItems: 'center',
              width: '1.25rem', height: '1.25rem', padding: 0,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
          maxHeight: '220px', overflowY: 'auto', zIndex: 200,
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '0.875rem 1rem', color: 'var(--text-3)', fontSize: '0.875rem', textAlign: 'center' }}>
              {query ? 'Program tidak ditemukan' : 'Semua program sudah dipilih'}
            </div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(p.id); }}
                style={{
                  padding: '0.625rem 1rem', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = ''}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{p.nama}</div>
                {p.unit_kerja_id && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.125rem' }}>
                    Unit: {p.unit_kerja_id}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============ KOMPONEN MODAL ============
function PencairanModal({ item, onSave, onClose, programs = [] }) {
  const [form, setForm] = useState({
    nama: item?.nama || '',
    tanggal: item?.tanggal || new Date().toISOString().split('T')[0],
    jumlah: item?.jumlah || 0,
    keterangan: item?.keterangan || '',
  });
  
  // Support multiple programs with allocation
  const [selectedPrograms, setSelectedPrograms] = useState(
    item?.programs?.map(p => ({
      id: p.id,
      jumlah_alokasi: p.jumlah_alokasi || 0,
      keterangan: p.keterangan || ''
    })) || []
  );
  
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
    if (selectedPrograms.length === 0) {
      setError('Pilih minimal satu program kerja');
      return;
    }

    // Validate total alokasi doesn't exceed jumlah
    const totalAlokasi = selectedPrograms.reduce((sum, p) => sum + (parseFloat(p.jumlah_alokasi) || 0), 0);
    if (totalAlokasi > form.jumlah) {
      setError(`Total alokasi (${formatRupiah(totalAlokasi)}) melebihi jumlah pencairan (${formatRupiah(form.jumlah)})`);
      return;
    }
    
    onSave({
      ...item,
      ...form,
      id: item?.id || Date.now().toString(),
      programs: selectedPrograms.map(sp => {
        const program = programs.find(p => p.id === sp.id);
        return {
          ...sp,
          nama: program?.nama,
          unit_kerja: program?.unit_kerja_id
        };
      }),
      kegiatan: item?.kegiatan || [],
    });
  };

  const addProgram = (programId) => {
    if (!programId || selectedPrograms.find(p => p.id === programId)) return;
    setSelectedPrograms([...selectedPrograms, { id: programId, jumlah_alokasi: 0, keterangan: '' }]);
  };

  const removeProgram = (programId) => {
    setSelectedPrograms(selectedPrograms.filter(p => p.id !== programId));
  };

  const updateProgramAllocation = (programId, field, value) => {
    setSelectedPrograms(selectedPrograms.map(p => 
      p.id === programId ? { ...p, [field]: value } : p
    ));
  };

  const availablePrograms = programs.filter(p => !selectedPrograms.find(sp => sp.id === p.id));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{item?.id ? 'Edit' : 'Tambah'} Pencairan Dana</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card-form-body">
            {error && (
              <div className="error-msg" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
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
                <label>Tanggal</label>
                <input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  required
                />
              </div>
              <div>
                <label>Jumlah Total (Rp)</label>
                <input
                  type="number"
                  value={form.jumlah}
                  onChange={(e) => setForm({ ...form, jumlah: parseInt(e.target.value) || 0 })}
                  required
                  min="1"
                  placeholder="50000000"
                />
              </div>
              
              {/* Multiple Programs Selection */}
              <div className="full">
                <label>Program Kerja <span className="muted">(bisa pilih multiple)</span></label>
                
                {/* Add Program — Searchable */}
                <ProgramSearchSelect programs={availablePrograms} onSelect={addProgram} />
                
                {/* Selected Programs List */}
                {selectedPrograms.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedPrograms.map((sp, index) => {
                      const program = programs.find(p => p.id === sp.id);
                      return (
                        <div key={sp.id} style={{ 
                          padding: '0.75rem', 
                          border: '1px solid var(--border)', 
                          borderRadius: 'var(--radius)',
                          background: 'var(--surface-2)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <strong style={{ fontSize: '0.875rem' }}>{index + 1}. {program?.nama}</strong>
                            <button 
                              type="button"
                              onClick={() => removeProgram(sp.id)}
                              style={{ 
                                color: 'var(--danger)', 
                                fontSize: '0.75rem',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              Hapus
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Alokasi Dana (Rp)</label>
                              <input
                                type="number"
                                value={sp.jumlah_alokasi}
                                onChange={(e) => updateProgramAllocation(sp.id, 'jumlah_alokasi', parseInt(e.target.value) || 0)}
                                min="0"
                                placeholder="0"
                                style={{ fontSize: '0.8125rem' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Keterangan</label>
                              <input
                                type="text"
                                value={sp.keterangan}
                                onChange={(e) => updateProgramAllocation(sp.id, 'keterangan', e.target.value)}
                                placeholder="Opsional"
                                style={{ fontSize: '0.8125rem' }}
                              />
                            </div>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
                            Unit: {program?.unit_kerja_id}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="muted" style={{ fontSize: '0.875rem', padding: '1rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                    Belum ada program dipilih
                  </div>
                )}
                
                {/* Total Alokasi Summary */}
                {selectedPrograms.length > 0 && (
                  <div style={{ 
                    marginTop: '0.75rem', 
                    padding: '0.5rem 0.75rem', 
                    background: 'var(--primary-bg)', 
                    borderRadius: 'var(--radius)',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>Total Alokasi:</span>
                    <strong>{formatRupiah(selectedPrograms.reduce((sum, p) => sum + (parseFloat(p.jumlah_alokasi) || 0), 0))}</strong>
                  </div>
                )}
              </div>
              
              <div className="full">
                <label>Keterangan Umum</label>
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
  // Use PencairanContext instead of local state
  const { pencairan, programs, loading, addPencairan, updatePencairan, deletePencairan, updateSPJStatus } = usePencairan();

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

  // User Role — dibaca dari session, bukan hardcode
  const [userRole, setUserRole] = useState('viewer')
  useEffect(() => {
    try {
      const session = localStorage.getItem('simdir_session')
      if (session) {
        const parsed = JSON.parse(atob(session))
        if (parsed.role) setUserRole(parsed.role)
      }
    } catch {}
  }, [])
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

    // Program filter (check in program_ids array for multiple programs support)
    if (selectedProgram) {
      result = result.filter(p => p.program_ids?.includes(selectedProgram));
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

  // Handlers - using context
  const handleSave = async (item) => {
    let result;
    if (item.id && pencairan.find(p => p.id === item.id)) {
      result = await updatePencairan(item.id, item);
    } else {
      result = await addPencairan(item);
    }
    
    if (result.success) {
      setShowModal(false);
      setEditingItem(null);
    } else {
      alert('Error: ' + result.error);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Hapus pencairan ini?')) {
      const result = await deletePencairan(id);
      if (!result.success) {
        alert('Error: ' + result.error);
      }
    }
  };

  const handleExport = () => {
    // Export functionality
    const dataToExport = filteredItems.map(item => ({
      'Nomor Pencairan': item.nama,
      'Program': item.program,
      'Unit Kerja': item.unit_kerja,
      'Tanggal': item.tanggal,
      'Jumlah': item.jumlah,
      'Keterangan': item.keterangan,
      'Status': item.spj_submitted ? (item.spj_partial ? 'SPJ Sebagian' : 'SPJ Lengkap') : 'Menunggu SPJ'
    }));
    
    const csv = convertToCSV(dataToExport);
    downloadCSV(csv, 'pencairan-dana.csv');
  };

  // CSV helper functions
  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape values with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
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
        programs={programs}
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
                  programs={programs}
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
              programs={programs}
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
          programs={programs}
        />
      )}
    </div>
  );
}
