'use client';

import { useState, useMemo } from 'react';
import { useUsers } from '@/context/UsersContext';

// Role configurations
const ROLE_CONFIGS = {
  super_admin: { 
    label: 'Super Admin', 
    color: '#dc2626', 
    bgColor: '#fef2f2',
    description: 'Akses penuh ke semua fitur'
  },
  admin_keuangan: { 
    label: 'Admin Keuangan', 
    color: '#4f46e5', 
    bgColor: '#eef2ff',
    description: 'Kelola anggaran dan SPJ'
  },
  admin: { 
    label: 'Admin', 
    color: '#059669', 
    bgColor: '#ecfdf5',
    description: 'Kelola data dan laporan'
  },
  pimpinan: { 
    label: 'Pimpinan', 
    color: '#7c3aed', 
    bgColor: '#f5f3ff',
    description: 'Akses laporan dan approval'
  },
};

const ITEMS_PER_PAGE = 5;

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

// ============ KOMPONEN ROLE BADGE ============
function RoleBadge({ role }) {
  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.admin;
  
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

// ============ KOMPONEN USER CARD ============
function UserCard({ user, index, canEdit, onEdit, onToggleStatus, onDelete }) {
  const config = ROLE_CONFIGS[user.role] || ROLE_CONFIGS.admin;
  
  // Generate avatar initials
  const userName = user.full_name || user.nama || '';
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Avatar */}
          <div style={{ 
            width: '3rem', 
            height: '3rem', 
            borderRadius: '50%',
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

          {/* User Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <strong style={{ fontSize: '0.9375rem' }}>{user.full_name || user.nama}</strong>
              <RoleBadge role={user.role} />
            </div>
            <p className="muted" style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
              {user.email}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <StatusBadge isActive={user.is_active} />
              <span className="muted" style={{ fontSize: '0.6875rem' }}>
                {config.description}
              </span>
            </div>
          </div>

          {/* Actions */}
          {canEdit && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="ghost icon-only" 
                onClick={() => onEdit(user)}
                title="Edit User"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button 
                className="ghost icon-only" 
                onClick={() => onToggleStatus(user.id)}
                title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                style={{ color: user.is_active ? 'var(--warning)' : 'var(--success)' }}
              >
                {user.is_active ? (
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
                onClick={() => onDelete(user.id)}
                title="Hapus User"
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

// ============ KOMPONEN USER TABLE ============
function UserTable({ users, canEdit, onEdit, onToggleStatus, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: '50px' }}>No</th>
            <th>User</th>
            <th style={{ width: '150px' }}>Role</th>
            <th style={{ width: '100px' }}>Status</th>
            {canEdit && <th style={{ width: '120px' }} className="text-center">Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.id}>
              <td className="text-center">{index + 1}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    width: '2rem', 
                    height: '2rem', 
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${ROLE_CONFIGS[user.role]?.color || '#666'} 0%, ${ROLE_CONFIGS[user.role]?.color || '#666'}dd 100%)`,
                    color: 'white',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {(user.full_name || user.nama || '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.875rem' }}>{user.full_name || user.nama}</strong>
                    <p className="muted" style={{ fontSize: '0.75rem', margin: 0 }}>{user.email}</p>
                  </div>
                </div>
              </td>
              <td>
                <RoleBadge role={user.role} />
                <p className="muted" style={{ fontSize: '0.6875rem', marginTop: '0.25rem' }}>
                  {ROLE_CONFIGS[user.role]?.description}
                </p>
              </td>
              <td>
                <StatusBadge isActive={user.is_active} />
              </td>
              {canEdit && (
                <td className="text-center">
                  <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                    <button 
                      className="ghost icon-only" 
                      onClick={() => onEdit(user)}
                      title="Edit"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button 
                      className="ghost icon-only" 
                      onClick={() => onToggleStatus(user.id)}
                      title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      style={{ color: user.is_active ? 'var(--warning)' : 'var(--success)' }}
                    >
                      {user.is_active ? (
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
                      onClick={() => onDelete(user.id)}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ KOMPONEN MODAL ============
function UserModal({ user, onSave, onClose }) {
  const [form, setForm] = useState({
    nama: user?.full_name || user?.nama || '',
    username: user?.username || '',
    email: user?.email || '',
    role: user?.role || 'admin',
    is_active: user?.is_active ?? true,
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!form.nama.trim()) {
      setError('Nama lengkap wajib diisi');
      return;
    }
    if (!form.username.trim()) {
      setError('Username wajib diisi');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setError('Email valid wajib diisi');
      return;
    }
    if (!user?.id && !form.password.trim()) {
      setError('Password wajib diisi untuk user baru');
      return;
    }

    onSave({ ...user, ...form });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{user?.id ? 'Edit' : 'Tambah'} User</h2>
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
                <label>Nama Lengkap</label>
                <input 
                  value={form.nama}
                  onChange={e => setForm({ ...form, nama: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  required
                />
              </div>
              <div className="full">
                <label>Username</label>
                <input 
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder="Contoh: budisantoso"
                  required
                />
              </div>
              <div className="full">
                <label>Email</label>
                <input 
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="Contoh: budi@usc.ac.id"
                  required
                />
              </div>
              <div className="full">
                <label>Role</label>
                <select 
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  required
                >
                  {Object.entries(ROLE_CONFIGS).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
                <p className="muted" style={{ fontSize: '0.6875rem', marginTop: '0.25rem' }}>
                  {ROLE_CONFIGS[form.role]?.description}
                </p>
              </div>
              <div className="full">
                <label>{user?.id ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}</label>
                <input 
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={user?.id ? "Biarkan kosong jika tidak diubah" : "Masukkan password"}
                  required={!user?.id}
                />
              </div>
              {user?.id && (
                <div className="full">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    />
                    <span>User Aktif</span>
                  </label>
                </div>
              )}
            </div>
          </div>
          <div className="card-form-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary">
              {user?.id ? 'Simpan Perubahan' : 'Tambah User'}
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
        Menampilkan <strong>{startItem}</strong> - <strong>{endItem}</strong> dari <strong>{totalItems}</strong> user
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
export default function UsersPage() {
  const { users, loading, error, addUser, updateUser, deleteUser, toggleUserStatus, refreshUsers } = useUsers();

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const userRole = 'super_admin';
  const canEdit = userRole === 'super_admin';

  // Filter users
  const filteredUsers = useMemo(() => {
    let result = [...users];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
            result = result.filter(u => 
        ((u.full_name || u.nama || '').toLowerCase().includes(query)) ||
        (u.email || '').toLowerCase().includes(query)
      );
    }
    
    if (filterRole) {
      result = result.filter(u => u.role === filterRole);
    }
    
    if (filterStatus) {
      result = result.filter(u => 
        filterStatus === 'active' ? u.is_active : !u.is_active
      );
    }
    
    return result;
  }, [users, searchQuery, filterRole, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    byRole: Object.keys(ROLE_CONFIGS).map(key => ({
      role: key,
      count: users.filter(u => u.role === key).length,
      color: ROLE_CONFIGS[key].color
    }))
  }), [users]);

  // Handlers
  const handleSave = async (user) => {
    try {
      setActionLoading(true);
      if (user.id) {
        await updateUser(user.id, user);
      } else {
        await addUser(user);
      }
      setShowModal(false);
      setEditingItem(null);
    } catch (err) {
      alert('Gagal menyimpan user: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const user = users.find(u => u.id === id);
      if (user) {
        await toggleUserStatus(id, user.is_active);
      }
    } catch (err) {
      alert('Gagal mengubah status: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus user ini?')) {
      try {
        setActionLoading(true);
        await deleteUser(id);
      } catch (err) {
        alert('Gagal menghapus user: ' + err.message);
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
        <p>Sedang mengambil data user dari server</p>
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
        <button className="btn btn-primary" onClick={refreshUsers} style={{ marginTop: '1rem' }}>
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
          <h1 className="page-title">Manajemen Pengguna</h1>
          <p className="page-subtitle">Kelola akun, peran, dan akses pengguna SIMDIR.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary hide-mobile" onClick={refreshUsers}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowModal(true); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Pengguna
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid mb-6">
        <StatCard
          title="Total User"
          value={stats.total}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          color="var(--primary)"
        />
        <StatCard
          title="User Aktif"
          value={stats.active}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          color="var(--success)"
        />
        <StatCard
          title="User Nonaktif"
          value={stats.inactive}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          }
          color="var(--warning)"
        />
        <StatCard
          title="Super Admin"
          value={stats.byRole.find(r => r.role === 'super_admin')?.count || 0}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
          color={ROLE_CONFIGS.super_admin.color}
        />
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
                placeholder="Cari user..."
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
                value={filterRole} 
                onChange={(e) => setFilterRole(e.target.value)}
                style={{ minWidth: '8rem' }}
              >
                <option value="">Semua Role</option>
                {Object.entries(ROLE_CONFIGS).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>

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

      {/* User List */}
      {filteredUsers.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '3rem', height: '3rem', marginBottom: '1rem', opacity: 0.4 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <h3>Tidak ada user ditemukan</h3>
          <p>Coba ubah filter pencarian</p>
        </div>
      ) : (
        <>
          {viewMode === 'card' ? (
            <div>
              {paginatedUsers.map((user, index) => (
                <UserCard
                  key={user.id}
                  user={user}
                  index={(currentPage - 1) * ITEMS_PER_PAGE + index}
                  canEdit={canEdit}
                  onEdit={(u) => { setEditingItem(u); setShowModal(true); }}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <UserTable
              users={paginatedUsers}
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
              totalItems={filteredUsers.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <UserModal
          user={editingItem}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
        />
      )}
    </div>
  );
}
