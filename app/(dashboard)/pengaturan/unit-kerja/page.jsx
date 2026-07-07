'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useUnitKerja } from '@/context/UnitKerjaContext';

const ITEMS_PER_PAGE = 8;

// Unit categories
const UNIT_CATEGORIES = {
  'pusat_unggulan': { label: 'Pusat Unggulan Iptek', color: '#4f46e5', bgColor: '#eef2ff' },
  'puipt': { label: 'PUIPT', color: '#059669', bgColor: '#ecfdf5' },
  'fasilitas': { label: 'Fasilitas Olahraga', color: '#d97706', bgColor: '#fffbeb' },
  'lainnya': { label: 'Lainnya', color: '#6b7280', bgColor: '#f3f4f6' },
};

// Detect category based on unit name
const getCategory = (nama) => {
  const lower = nama.toLowerCase();
  if (lower.includes('pui ') || lower.includes('pusat unggulan iptek')) return 'pusat_unggulan';
  if (lower.includes('puipt')) return 'puipt';
  if (lower.includes('kolam') || lower.includes('golf') || lower.includes('driving')) return 'fasilitas';
  return 'lainnya';
};

// ============ KOMPONEN STAT CARD ============
function StatCard({ title, value, icon, color }) {
  const c = (() => {
    if (!color) return { bg: 'var(--primary-50)', fg: 'var(--primary)' };
    if (color.includes('--primary')) return { bg: 'var(--primary-50)', fg: 'var(--primary)' };
    if (color.includes('--success')) return { bg: 'var(--success-50)', fg: 'var(--success)' };
    if (color.includes('--warning')) return { bg: 'var(--warning-50)', fg: 'var(--warning)' };
    if (color.includes('--danger'))  return { bg: 'var(--danger-50)',  fg: 'var(--danger)'  };
    return { bg: color + '18', fg: color };
  })();
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className="stat-icon-wrap" style={{ background: c.bg, color: c.fg }}>{icon}</div>
      </div>
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

// ============ KOMPONEN CATEGORY BADGE ============
function CategoryBadge({ category }) {
  const config = UNIT_CATEGORIES[category] || UNIT_CATEGORIES.lainnya;
  
  return (
    <span 
      className="badge" 
      style={{ 
        background: config.bgColor, 
        color: config.color,
        border: `1px solid ${config.color}30`,
        fontSize: '0.6875rem'
      }}
    >
      {config.label}
    </span>
  );
}

// ============ KOMPONEN STATUS BADGE ============
function StatusBadge({ isActive }) {
  return (
    <span 
      className="badge" 
      style={{ 
        background: isActive ? 'var(--success-bg)' : 'var(--surface-3)', 
        color: isActive ? 'var(--success)' : 'var(--text-3)',
        fontSize: '0.6875rem'
      }}
    >
      <span 
        style={{ 
          display: 'inline-block', 
          width: '6px', 
          height: '6px', 
          borderRadius: '50%', 
          background: isActive ? 'var(--success)' : 'var(--text-3)',
          marginRight: '4px'
        }} 
      />
      {isActive ? 'Aktif' : 'Nonaktif'}
    </span>
  );
}

// ============ KOMPONEN UNIT CARD ============
function UnitCard({ unit, index, canEdit, onEdit, onToggleStatus, onDelete }) {
  const category = getCategory(unit.nama);
  const config = UNIT_CATEGORIES[category] || UNIT_CATEGORIES.lainnya;
  
  // Generate initials
  const unitCode = unit.kode || unit.singkatan || '';
  const initials = unitCode.substring(0, 2).toUpperCase() || unit.nama.substring(0, 2).toUpperCase();

  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Avatar */}
          <div style={{ 
            width: '3rem', 
            height: '3rem', 
            borderRadius: 'var(--radius)',
            background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)`,
            color: 'white',
            display: 'grid',
            placeItems: 'center',
            fontSize: '0.875rem',
            fontWeight: 700,
            flexShrink: 0
          }}>
            {initials}
          </div>

          {/* Unit Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <strong style={{ fontSize: '0.9375rem' }}>{unit.nama}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <code style={{ 
                background: 'var(--surface-2)', 
                padding: '0.125rem 0.375rem', 
                borderRadius: 'var(--radius)',
                fontSize: '0.75rem',
                color: 'var(--text-2)'
              }}>
                {unit.kode || unit.singkatan}
              </code>
              <CategoryBadge category={category} />
              <StatusBadge isActive={unit.is_active} />
            </div>
          </div>

          {/* Actions */}
          {canEdit && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="ghost icon-only" 
                onClick={() => onEdit(unit)}
                title="Edit Unit"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button 
                className="ghost icon-only" 
                onClick={() => onToggleStatus(unit.id)}
                title={unit.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                style={{ color: unit.is_active ? 'var(--warning)' : 'var(--success)' }}
              >
                {unit.is_active ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                    <path d="M5 12h14" /><path d="M12 5v14" />
                  </svg>
                )}
              </button>
              <button 
                className="ghost icon-only" 
                onClick={() => onDelete(unit.id)}
                title="Hapus Unit"
                style={{ color: 'var(--danger)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ KOMPONEN UNIT TABLE ============
function UnitTable({ units, canEdit, onEdit, onToggleStatus, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: '50px' }}>No</th>
            <th>Unit Kerja</th>
            <th style={{ width: '120px' }}>Singkatan</th>
            <th style={{ width: '150px' }}>Kategori</th>
            <th style={{ width: '100px' }}>Status</th>
            {canEdit && <th style={{ width: '120px' }} className="text-center">Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {units.map((unit, index) => {
            const category = getCategory(unit.nama);
            const config = UNIT_CATEGORIES[category] || UNIT_CATEGORIES.lainnya;
            
            return (
              <tr key={unit.id}>
                <td className="text-center">{index + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '2rem', 
                      height: '2rem', 
                      borderRadius: 'var(--radius)',
                      background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)`,
                      color: 'white',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {(unit.kode || unit.singkatan)?.substring(0, 2).toUpperCase() || unit.nama.substring(0, 2).toUpperCase()}
                    </div>
                    <strong style={{ fontSize: '0.875rem' }}>{unit.nama}</strong>
                  </div>
                </td>
                <td>
                  <code style={{ 
                    background: 'var(--surface-2)', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: 'var(--radius)',
                    fontSize: '0.8125rem'
                  }}>
                    {unit.kode || unit.singkatan}
                  </code>
                </td>
                <td>
                  <CategoryBadge category={category} />
                </td>
                <td>
                  <StatusBadge isActive={unit.is_active} />
                </td>
                {canEdit && (
                  <td className="text-center">
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                      <button 
                        className="ghost icon-only" 
                        onClick={() => onEdit(unit)}
                        title="Edit"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button 
                        className="ghost icon-only" 
                        onClick={() => onToggleStatus(unit.id)}
                        title={unit.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        style={{ color: unit.is_active ? 'var(--warning)' : 'var(--success)' }}
                      >
                        {unit.is_active ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                            <path d="M5 12h14" /><path d="M12 5v14" />
                          </svg>
                        )}
                      </button>
                      <button 
                        className="ghost icon-only" 
                        onClick={() => onDelete(unit.id)}
                        title="Hapus"
                        style={{ color: 'var(--danger)' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============ KOMPONEN MODAL ============
function UnitModal({ unit, onSave, onClose }) {
  const [form, setForm] = useState({
    nama: unit?.nama || '',
    singkatan: unit?.kode || unit?.singkatan || '',
    is_active: unit?.is_active ?? true,
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!form.nama.trim()) {
      setError('Nama unit kerja wajib diisi');
      return;
    }
    if (!form.singkatan.trim()) {
      setError('Singkatan wajib diisi');
      return;
    }
    if (form.singkatan.length > 10) {
      setError('Singkatan maksimal 10 karakter');
      return;
    }

    onSave({ ...unit, ...form });
  };

  // Auto-generate singkatan from nama
  const generateSingkatan = () => {
    const words = form.nama.split(' ');
    const singkatan = words.map(w => w[0]).join('').toUpperCase();
    setForm({ ...form, singkatan: singkatan.substring(0, 10) });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{unit?.id ? 'Edit' : 'Tambah'} Unit Kerja</h2>
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
                <label>Nama Unit Kerja</label>
                <input 
                  value={form.nama}
                  onChange={e => setForm({ ...form, nama: e.target.value })}
                  placeholder="Contoh: Pusat Unggulan Iptek Keolahragaan"
                  required
                />
              </div>
              <div className="full">
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Singkatan</span>
                  <button 
                    type="button" 
                    onClick={generateSingkatan}
                    className="ghost text-sm"
                    style={{ padding: '0.125rem 0.5rem', fontSize: '0.6875rem' }}
                  >
                    Generate
                  </button>
                </label>
                <input 
                  value={form.singkatan}
                  onChange={e => setForm({ ...form, singkatan: e.target.value.toUpperCase() })}
                  placeholder="Contoh: PUI-Olahraga"
                  maxLength={10}
                  required
                />
                <p className="muted" style={{ fontSize: '0.6875rem', marginTop: '0.25rem' }}>
                  Maksimal 10 karakter
                </p>
              </div>
              {unit?.id && (
                <div className="full">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    />
                    <span>Unit Aktif</span>
                  </label>
                </div>
              )}
            </div>
          </div>
          <div className="card-form-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary">
              {unit?.id ? 'Simpan Perubahan' : 'Tambah Unit'}
            </button>
          </div>
        </form>
      </div>
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
        Menampilkan <strong>{startItem}</strong> - <strong>{endItem}</strong> dari <strong>{totalItems}</strong> unit
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

// ============ HALAMAN UTAMA ============
export default function UnitKerjaPage() {
  const { units, loading, error, addUnit, updateUnit, deleteUnit, toggleUnitStatus, refreshUnits } = useUnitKerja();

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const userRole = 'super_admin';
  const canEdit = userRole === 'super_admin';

  // Filter units
  const filteredUnits = useMemo(() => {
    let result = [...units];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        (u.nama || '').toLowerCase().includes(query) ||
        ((u.kode || u.singkatan) || '').toLowerCase().includes(query)
      );
    }
    
    if (filterCategory) {
      result = result.filter(u => getCategory(u.nama) === filterCategory);
    }
    
    if (filterStatus) {
      result = result.filter(u => 
        filterStatus === 'active' ? u.is_active : !u.is_active
      );
    }
    
    return result;
  }, [units, searchQuery, filterCategory, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredUnits.length / ITEMS_PER_PAGE);
  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUnits.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUnits, currentPage]);

  // Stats
  const stats = useMemo(() => {
    const byCategory = {};
    units.forEach(u => {
      const cat = getCategory(u.nama);
      if (!byCategory[cat]) byCategory[cat] = 0;
      byCategory[cat]++;
    });
    
    return {
      total: units.length,
      active: units.filter(u => u.is_active).length,
      inactive: units.filter(u => !u.is_active).length,
      byCategory
    };
  }, [units]);

  // Handlers
  const handleSave = async (unit) => {
    try {
      setActionLoading(true);
      if (unit.id) {
        await updateUnit(unit.id, unit);
      } else {
        await addUnit(unit);
      }
      setShowModal(false);
      setEditingItem(null);
    } catch (err) {
      alert('Gagal menyimpan unit kerja: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const unit = units.find(u => u.id === id);
      if (unit) {
        await toggleUnitStatus(id, unit.is_active);
      }
    } catch (err) {
      alert('Gagal mengubah status: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus unit kerja ini?')) {
      try {
        setActionLoading(true);
        await deleteUnit(id);
      } catch (err) {
        alert('Gagal menghapus unit kerja: ' + err.message);
      } finally {
        setActionLoading(false);
      }
    }
  };

  if (!canEdit) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '3rem', height: '3rem', marginBottom: '1rem', opacity: 0.4 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <h3>Akses Ditolak</h3>
        <p>Anda tidak memiliki akses ke halaman ini.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div style={{ width: '3rem', height: '3rem', border: '3px solid var(--surface-2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
        <h3>Memuat Data...</h3>
        <p>Sedang mengambil data unit kerja dari server</p>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '3rem', height: '3rem', marginBottom: '1rem', color: 'var(--danger)' }}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h3>Terjadi Kesalahan</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={refreshUnits} style={{ marginTop: '1rem' }}>
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Unit Kerja</h1>
          <p className="page-subtitle">Struktur organisasi &amp; pagu anggaran tiap subdit.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowModal(true); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Unit
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid mb-6">
        <StatCard
          title="Total Unit"
          value={stats.total}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
          color="var(--primary)"
        />
        <StatCard
          title="Unit Aktif"
          value={stats.active}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          color="var(--success)"
        />
        <StatCard
          title="PUI & PUIPT"
          value={(stats.byCategory.pusat_unggulan || 0) + (stats.byCategory.puipt || 0)}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          }
          color={UNIT_CATEGORIES.pusat_unggulan.color}
        />
        <StatCard
          title="Fasilitas"
          value={stats.byCategory.fasilitas || 0}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          }
          color={UNIT_CATEGORIES.fasilitas.color}
        />
      </div>

      {/* Category Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {Object.entries(UNIT_CATEGORIES).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setFilterCategory(filterCategory === key ? '' : key)}
            className="card"
            style={{ 
              cursor: 'pointer',
              border: filterCategory === key ? `2px solid ${config.color}` : '1px solid var(--border)',
              background: filterCategory === key ? config.bgColor : 'var(--surface)'
            }}
          >
            <div className="card-body" style={{ padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: config.color }}>
                  {config.label}
                </span>
                <span style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: 700, 
                  color: filterCategory === key ? config.color : 'var(--text)'
                }}>
                  {stats.byCategory[key] || 0}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <div className="filter-group filter-search" style={{ maxWidth: '20rem' }}>
              <svg className="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Cari unit kerja..."
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
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ minWidth: '8rem' }}
              >
                <option value="">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>

              <div className="flex" style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '0.25rem' }}>
                <button
                  onClick={() => setViewMode('card')}
                  className="btn icon-only"
                  style={{ 
                    background: viewMode === 'card' ? 'var(--surface)' : 'transparent',
                    boxShadow: viewMode === 'card' ? 'var(--shadow-sm)' : 'none',
                    color: viewMode === 'card' ? 'var(--primary)' : 'var(--text-2)'
                  }}
                  title="Card View"
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
                  title="Table View"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unit List */}
      {filteredUnits.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '3rem', height: '3rem', marginBottom: '1rem', opacity: 0.4 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <h3>Tidak ada unit ditemukan</h3>
          <p>Coba ubah filter pencarian</p>
        </div>
      ) : (
        <>
          {viewMode === 'card' ? (
            <div>
              {paginatedUnits.map((unit, index) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  index={(currentPage - 1) * ITEMS_PER_PAGE + index}
                  canEdit={canEdit}
                  onEdit={(u) => { setEditingItem(u); setShowModal(true); }}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <UnitTable
              units={paginatedUnits}
              canEdit={canEdit}
              onEdit={(u) => { setEditingItem(u); setShowModal(true); }}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredUnits.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </>
      )}

      {/* Logo Invoice Upload */}
      <div className="card mb-4">
        <div className="card-header">
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Logo Invoice</h3>
        </div>
        <div className="card-body">
          <LogoUploadSection />
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <UnitModal
          unit={editingItem}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
        />
      )}
    </div>
  );
}

// ============ KOMPONEN LOGO UPLOAD ============
function LogoUploadSection() {
  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('simdir_invoice_logo');
    if (saved) setLogo(saved);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar yang diizinkan (PNG, JPG, SVG)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file maksimal 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      localStorage.setItem('simdir_invoice_logo', base64);
      setLogo(base64);
      setPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    localStorage.removeItem('simdir_invoice_logo');
    setLogo(null);
    setPreview(null);
  };

  return (
    <div>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
        Upload logo lembaga Anda untuk ditampilkan di header invoice saat dicetak. 
        Format yang didukung: PNG, JPG, SVG. Maksimal 2MB.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        {(preview || logo) && (
          <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: 'var(--radius)', 
            border: '2px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            background: 'white'
          }}>
            <img 
              src={preview || logo} 
              alt="Logo Preview" 
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, marginRight: '0.5rem' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {logo ? 'Ganti Logo' : 'Upload Logo'}
          </button>
          {logo && (
            <button 
              className="btn btn-danger"
              onClick={handleRemove}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, marginRight: '0.5rem' }}>
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Hapus
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
