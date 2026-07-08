'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

// ============ KONSTANTA ============
const STATUS_CONFIG = {
  dibuat: { 
    label: 'Dibuat', 
    color: '#64748b', 
    bgColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    stamp: null 
  },
  dikirim: { 
    label: 'Dikirim', 
    color: '#3b82f6', 
    bgColor: '#dbeafe',
    borderColor: '#93c5fd',
    stamp: 'dikirim' 
  },
  disetujui: { 
    label: 'Disetujui', 
    color: '#8b5cf6', 
    bgColor: '#ede9fe',
    borderColor: '#c4b5fd',
    stamp: 'disetujui' 
  },
  segera: { 
    label: 'Segera', 
    color: '#f59e0b', 
    bgColor: '#fef3c7',
    borderColor: '#fcd34d',
    stamp: 'segera' 
  },
  jatuh_tempo: { 
    label: 'Jatuh Tempo', 
    color: '#dc2626', 
    bgColor: '#fee2e2',
    borderColor: '#fca5a5',
    stamp: 'jatuh_tempo' 
  },
  lunas: { 
    label: 'Lunas', 
    color: '#059669', 
    bgColor: '#d1fae5',
    borderColor: '#6ee7b7',
    stamp: 'lunas' 
  },
};

// ============ HELPERS ============
const formatRupiah = (num) => {
  if (!num || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
};

const formatDateShort = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

// ============ KOMPONEN STAMP/STAMPEL ============
function InvoiceStamp({ status, size = 'normal' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.dibuat;
  
  if (!config.stamp) return null;
  
  const stampSize = size === 'small' ? { width: 60, height: 60, fontSize: 9 } :
                    size === 'large' ? { width: 120, height: 120, fontSize: 16 } :
                    { width: 80, height: 80, fontSize: 11 };
  
  const stampLabels = {
    lunas: 'LUNAS',
    segera: 'SEGERA',
    jatuh_tempo: 'JATUH\nTEMPO',
    final: 'FINAL',
    dikirim: 'DIKIRIM',
    disetujui: 'DISETUJUI',
  };
  
  const label = stampLabels[config.stamp] || config.stamp.toUpperCase();
  
  return (
    <div style={{
      width: stampSize.width,
      height: stampSize.height,
      borderRadius: '50%',
      border: `3px solid ${config.color}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: config.color,
      fontWeight: 800,
      fontSize: stampSize.fontSize,
      textAlign: 'center',
      lineHeight: 1.1,
      transform: 'rotate(-15deg)',
      opacity: 0.85,
      whiteSpace: 'pre-line',
      boxShadow: `0 0 0 2px white, 0 0 0 4px ${config.color}`,
    }}>
      {label}
    </div>
  );
}

// ============ KOMPONEN STATUS BADGE ============
function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.dibuat;
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 10px',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      backgroundColor: config.bgColor,
      color: config.color,
      border: `1px solid ${config.borderColor}`,
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: config.color,
      }} />
      {config.label}
    </span>
  );
}

// ============ KOMPONEN STAT CARD ============
function StatCard({ title, value, subtitle, color }) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginBottom: '0.5rem' }}>
        {title}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: color || 'var(--text)', marginBottom: '0.25rem' }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ============ MODAL KONFIRMASI HAPUS ============
function DeleteConfirmModal({ show, onClose, onConfirm, invoice }) {
  if (!show || !invoice) return null;
  
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Konfirmasi Hapus</h3>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="card-form-body" style={{ padding: '1.5rem' }}>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Apakah Anda yakin ingin menghapus invoice <strong>{invoice.nomor_invoice}</strong>?
            <br /><br />
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-danger" onClick={onConfirm}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Hapus Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ HALAMAN UTAMA ============
export default function EInvoicePage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [userRole, setUserRole] = useState('');

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoice_summary')
        .select('*')
        .order('tanggal_invoice', { ascending: false });
      
      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Get user role (Supabase auth atau localStorage fallback)
  useEffect(() => {
    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(profile?.role || '');
        return;
      }
      // Fallback: local session (METODE 2 login)
      try {
        const localSession = localStorage.getItem('simdir_session');
        if (localSession) {
          const sessionData = JSON.parse(atob(localSession));
          setUserRole(sessionData.role || '');
        }
      } catch (e) {
        console.error('Invalid local session:', e);
      }
    };
    getUserRole();
    fetchInvoices();
  }, [supabase, fetchInvoices]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = !searchQuery || 
        inv.nomor_invoice?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.nama_pelanggan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.kode_pelanggan?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = !filterStatus || inv.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, filterStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = invoices.length;
    const lunas = invoices.filter(i => i.status === 'lunas').length;
    const jatuhTempo = invoices.filter(i => i.status === 'jatuh_tempo').length;
    const pending = invoices.filter(i => !['lunas', 'jatuh_tempo'].includes(i.status)).length;
    const totalAmount = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
    
    return { total, lunas, jatuhTempo, pending, totalAmount };
  }, [invoices]);

  // Handle delete
  const handleDelete = async () => {
    if (!invoiceToDelete) return;
    
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceToDelete.id);
      
      if (error) throw error;
      
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete.id));
      setDeleteModalOpen(false);
      setInvoiceToDelete(null);
    } catch (err) {
      console.error('Error deleting invoice:', err);
      alert('Gagal menghapus invoice. Silakan coba lagi.');
    }
  };

  // Handle status update
  const updateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      setInvoices(prev => prev.map(inv => 
        inv.id === id ? { ...inv, status: newStatus } : inv
      ));
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Gagal mengupdate status. Silakan coba lagi.');
    }
  };

  const isSuperAdmin = userRole === 'super_admin';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">E-Invoice</h1>
          <p className="page-subtitle">Kelola invoice digital dengan stempel otomatis</p>
        </div>
        <div className="page-actions">
          <Link href="/e-invoice/customers" className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Data Pelanggan
          </Link>
          <Link href="/e-invoice/create" className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Buat Invoice
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid mb-6">
        <StatCard 
          title="Total Invoice" 
          value={stats.total} 
          subtitle="Semua periode"
          color="var(--primary)"
        />
        <StatCard 
          title="Lunas" 
          value={stats.lunas} 
          subtitle={`${stats.total > 0 ? Math.round((stats.lunas / stats.total) * 100) : 0}% dari total`}
          color="#059669"
        />
        <StatCard 
          title="Jatuh Tempo" 
          value={stats.jatuhTempo} 
          subtitle="Perlu perhatian"
          color="#dc2626"
        />
        <StatCard 
          title="Pending" 
          value={stats.pending} 
          subtitle="Dalam proses"
          color="#f59e0b"
        />
      </div>

      {/* Filter & Search */}
      <div className="card mb-4">
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  style={{ 
                    width: 18, 
                    height: 18, 
                    position: 'absolute', 
                    left: 12, 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: 'var(--text-3)'
                  }}
                >
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Cari nomor invoice, nama pelanggan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="">Semua Status</option>
              <option value="dibuat">Dibuat</option>
              <option value="dikirim">Dikirim</option>
              <option value="disetujui">Disetujui</option>
              <option value="segera">Segera</option>
              <option value="jatuh_tempo">Jatuh Tempo</option>
              <option value="lunas">Lunas</option>
            </select>
            <button className="btn btn-ghost" onClick={() => { setSearchQuery(''); setFilterStatus(''); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
              </svg>
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Daftar Invoice</h3>
          <span className="muted" style={{ fontSize: '0.75rem' }}>
            {filteredInvoices.length} invoice
          </span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>No. Invoice</th>
                  <th>Pelanggan</th>
                  <th>Tanggal</th>
                  <th>Jatuh Tempo</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-2)' }}>
                        <div className="spinner" style={{ width: 24, height: 24 }} />
                        Memuat data...
                      </div>
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                      <div className="empty-state" style={{ padding: 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, color: 'var(--text-3)', marginBottom: '1rem' }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10 9 9 9 8 9"/>
                        </svg>
                        <p className="muted">Tidak ada invoice ditemukan</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {invoice.nomor_invoice}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>
                          {invoice.kode_pelanggan}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{invoice.nama_pelanggan}</div>
                        {invoice.customer_telepon && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>
                            {invoice.customer_telepon}
                          </div>
                        )}
                      </td>
                      <td>{formatDateShort(invoice.tanggal_invoice)}</td>
                      <td>
                        <span style={{ 
                          color: invoice.status === 'jatuh_tempo' ? '#dc2626' : 
                                 invoice.status === 'segera' ? '#f59e0b' : 'inherit'
                        }}>
                          {formatDateShort(invoice.tanggal_jatuh_tempo)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                        {formatRupiah(invoice.total)}
                      </td>
                      <td>
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <Link 
                            href={`/e-invoice/${invoice.id}`}
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Lihat Detail"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                          </Link>
                          <Link 
                            href={`/e-invoice/${invoice.id}/print`}
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Cetak Invoice"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                              <rect x="6" y="14" width="12" height="8"/>
                            </svg>
                          </Link>
                          {/* Edit button - available for all authenticated users */}
                          <Link 
                            href={`/e-invoice/${invoice.id}/edit`}
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Edit Invoice"
                            style={{ color: 'var(--primary)' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </Link>
                          {isSuperAdmin && (
                            <button 
                              className="btn btn-ghost btn-sm btn-icon"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => {
                                setInvoiceToDelete(invoice);
                                setDeleteModalOpen(true);
                              }}
                              title="Hapus"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
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
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal 
        show={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setInvoiceToDelete(null);
        }}
        onConfirm={handleDelete}
        invoice={invoiceToDelete}
      />
    </div>
  );
}
