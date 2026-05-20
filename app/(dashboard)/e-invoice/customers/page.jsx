'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

// ============ HELPERS ============
const generateCustomerCode = () => {
  const prefix = 'CUST';
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

// ============ MODAL FORM CUSTOMER ============
function CustomerFormModal({ show, onClose, onSubmit, customer, isEditing }) {
  const [formData, setFormData] = useState({
    kode_pelanggan: '',
    nama_pelanggan: '',
    email: '',
    telepon: '',
    alamat: '',
    npwp: '',
    jenis_pelanggan: 'perorangan',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer && isEditing) {
      setFormData({
        kode_pelanggan: customer.kode_pelanggan || '',
        nama_pelanggan: customer.nama_pelanggan || '',
        email: customer.email || '',
        telepon: customer.telepon || '',
        alamat: customer.alamat || '',
        npwp: customer.npwp || '',
        jenis_pelanggan: customer.jenis_pelanggan || 'perorangan',
      });
    } else {
      setFormData({
        kode_pelanggan: generateCustomerCode(),
        nama_pelanggan: '',
        email: '',
        telepon: '',
        alamat: '',
        npwp: '',
        jenis_pelanggan: 'perorangan',
      });
    }
  }, [customer, isEditing, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  if (!show) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
            {isEditing ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
          </h3>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="card-form-body">
            <div className="form-group">
              <label className="form-label">Kode Pelanggan <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                type="text"
                className="form-input"
                value={formData.kode_pelanggan}
                disabled
                style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'not-allowed' }}
              />
              <small style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.25rem', display: 'block' }}>
                Kode pelanggan dibuat otomatis oleh sistem
              </small>
            </div>
            <div className="form-group">
              <label className="form-label">Nama Pelanggan <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                type="text"
                className="form-input"
                value={formData.nama_pelanggan}
                onChange={(e) => setFormData({ ...formData, nama_pelanggan: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Telepon</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.telepon}
                  onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Jenis Pelanggan</label>
              <select
                className="form-input"
                value={formData.jenis_pelanggan}
                onChange={(e) => setFormData({ ...formData, jenis_pelanggan: e.target.value })}
              >
                <option value="perorangan">Perorangan</option>
                <option value="perusahaan">Perusahaan</option>
                <option value="instansi">Instansi</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">NPWP</label>
              <input
                type="text"
                className="form-input"
                value={formData.npwp}
                onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                placeholder="00.000.000.0-000.000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Alamat</label>
              <textarea
                className="form-input"
                rows={3}
                value={formData.alamat}
                onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Menyimpan...' : isEditing ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ MODAL HAPUS ============
function DeleteConfirmModal({ show, onClose, onConfirm, customer }) {
  if (!show || !customer) return null;
  
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
            Apakah Anda yakin ingin menghapus pelanggan <strong>{customer.nama_pelanggan}</strong>?
            <br /><br />
            <span style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>
              Pelanggan yang memiliki invoice tidak dapat dihapus.
            </span>
          </p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Hapus Pelanggan
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ HALAMAN UTAMA ============
export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userRole, setUserRole] = useState('');

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching customers...');
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      console.log('Is local/mock:', !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project'));
      
      // Cek apakah mock client aktif
      if (typeof window !== 'undefined' && window.__MOCK_SUPABASE__) {
        console.log('⚠️ WARNING: Using MOCK Supabase client - data is local only!');
      }
      
      // Check supabase client type
      console.log('Supabase client type:', typeof supabase);
      console.log('Supabase from method exists:', typeof supabase.from);
      
      // Check auth status first
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id || 'No user');
      
      // Try raw SQL query via RPC if available
      const { data: countData, error: countError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Count check error:', countError);
      } else {
        console.log('Total customers in table:', countData);
      }
      
      // Try simple query first (without count)
      const simpleResult = await supabase
        .from('customers')
        .select('*')
        .order('nama_pelanggan', { ascending: true });
      
      console.log('Simple query result:', simpleResult);
      console.log('Simple query data length:', simpleResult.data?.length || 0);
      console.log('Simple query error:', simpleResult.error);
      
      // Try with shared client
      const sharedResult = await supabase
        .from('customers')
        .select('*');
      console.log('Shared client result:', sharedResult);
      console.log('Shared client data length:', sharedResult.data?.length || 0);
      
      // Try without ordering
      const rawResult = await supabase
        .from('customers')
        .select('*');
      console.log('Raw query result:', rawResult);
      console.log('Raw query data length:', rawResult.data?.length || 0);
      
      // Try with limit
      const limitResult = await supabase
        .from('customers')
        .select('*')
        .limit(10);
      console.log('Limit query result:', limitResult);
      console.log('Limit query data length:', limitResult.data?.length || 0);
      
      // Try direct fetch
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/customers?select=*`,
          {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            }
          }
        );
        console.log('Direct fetch status:', response.status);
        console.log('Direct fetch statusText:', response.statusText);
        const directData = await response.json();
        console.log('Direct fetch result:', directData);
        console.log('Direct fetch length:', directData?.length || 0);
        
        // Try with specific ID
        const idResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/customers?id=eq.3ccc2235-99b8-493b-a444-549bf9d086ad`,
          {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            }
          }
        );
        const idData = await idResponse.json();
        console.log('Direct fetch by ID result:', idData);
        
        // Check response headers
        console.log('Response headers:', [...response.headers.entries()]);
      } catch (fetchErr) {
        console.error('Direct fetch error:', fetchErr);
      }
      
      // Try query invoices table to compare
      const invoicesResult = await supabase
        .from('invoices')
        .select('*')
        .limit(5);
      console.log('Invoices query result:', invoicesResult);
      console.log('Invoices query data length:', invoicesResult.data?.length || 0);
      
      // Try query with specific ID
      const specificCustomer = await supabase
        .from('customers')
        .select('*')
        .eq('id', '3ccc2235-99b8-493b-a444-549bf9d086ad')
        .single();
      console.log('Specific customer by ID:', specificCustomer);
      
      // Try with explicit schema
      const schemaResult = await supabase
        .schema('public')
        .from('customers')
        .select('*');
      console.log('Schema query result:', schemaResult);
      console.log('Schema query data length:', schemaResult.data?.length || 0);
      
      // Try a direct table info query
      const { data: tableInfo, error: tableError, status, statusText } = await supabase
        .from('customers')
        .select('count');
      console.log('Table info:', tableInfo, 'error:', tableError, 'status:', status, 'statusText:', statusText);
      
      // Check what's in tableInfo
      if (tableInfo && tableInfo.length > 0) {
        console.log('Table info first item:', tableInfo[0]);
        console.log('Table info keys:', Object.keys(tableInfo[0]));
      }
      
      // Try to list all tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      console.log('All tables:', tablesData);
      console.log('Tables error:', tablesError);
      
      // Check if maybe data is in a different schema
      const { data: allSchemas } = await supabase
        .from('information_schema.schemata')
        .select('schema_name');
      console.log('All schemas:', allSchemas);
      
      // Try with count
      let { data, error } = await supabase
        .from('customers')
        .select('*, invoices(count)')
        .order('nama_pelanggan', { ascending: true });
      
      if (error) {
        console.error('Error with count query:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        
        // Fallback to simple query without count
        const simpleResult = await supabase
          .from('customers')
          .select('*')
          .order('nama_pelanggan', { ascending: true });
        
        if (simpleResult.error) {
          console.error('Error with simple query:', simpleResult.error);
          console.error('Simple error code:', simpleResult.error.code);
          console.error('Simple error message:', simpleResult.error.message);
          throw simpleResult.error;
        }
        
        data = simpleResult.data;
        console.log('Customers loaded (simple query):', data?.length || 0);
      } else {
        console.log('Customers loaded (with count):', data?.length || 0);
        console.log('Full response:', data);
      }
      
      console.log('First customer:', data?.[0]);
      console.log('Data type:', typeof data);
      console.log('Is Array:', Array.isArray(data));
      setCustomers(data || []);
      console.log('Customers state set to:', data?.length || 0, 'items');
    } catch (err) {
      console.error('Error fetching customers:', err);
      console.error('Error details:', JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Get user role and wait for auth
  useEffect(() => {
    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('getUserRole - User:', user?.id || 'No user');
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(profile?.role || '');
      }
    };
    getUserRole();
  }, [supabase]);
  
  // Fetch customers after auth state is ready
  useEffect(() => {
    const init = async () => {
      // Wait a bit for auth to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Init - Session exists:', !!session);
      console.log('Init - Session user:', session?.user?.id);
      
      if (session) {
        fetchCustomers();
      } else {
        // Try anyway - might be using RLS disabled
        console.log('No session, fetching anyway...');
        fetchCustomers();
      }
    };
    
    init();
  }, [supabase, fetchCustomers]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const searchLower = searchQuery.toLowerCase();
      return (
        c.nama_pelanggan?.toLowerCase().includes(searchLower) ||
        c.kode_pelanggan?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.telepon?.includes(searchQuery)
      );
    });
  }, [customers, searchQuery]);

  // Handle submit
  const handleSubmit = async (formData) => {
    try {
      if (isEditing && selectedCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({
            nama_pelanggan: formData.nama_pelanggan,
            email: formData.email,
            telepon: formData.telepon,
            alamat: formData.alamat,
            npwp: formData.npwp,
            jenis_pelanggan: formData.jenis_pelanggan,
          })
          .eq('id', selectedCustomer.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customers')
          .insert({
            kode_pelanggan: formData.kode_pelanggan,
            nama_pelanggan: formData.nama_pelanggan,
            email: formData.email,
            telepon: formData.telepon,
            alamat: formData.alamat,
            npwp: formData.npwp,
            jenis_pelanggan: formData.jenis_pelanggan,
          });
        
        if (error) throw error;
      }
      
      await fetchCustomers();
      setFormModalOpen(false);
      setSelectedCustomer(null);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving customer:', err);
      alert('Gagal menyimpan data pelanggan. Mungkin kode pelanggan sudah digunakan.');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedCustomer) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', selectedCustomer.id);
      
      if (error) throw error;
      
      await fetchCustomers();
      setDeleteModalOpen(false);
      setSelectedCustomer(null);
    } catch (err) {
      console.error('Error deleting customer:', err);
      alert('Gagal menghapus pelanggan. Pelanggan mungkin memiliki invoice.');
    }
  };

  const isSuperAdmin = userRole === 'super_admin';

  const getJenisBadge = (jenis) => {
    const colors = {
      perorangan: { bg: '#e0f2fe', color: '#0369a1' },
      perusahaan: { bg: '#f3e8ff', color: '#7c3aed' },
      instansi: { bg: '#fef3c7', color: '#b45309' },
    };
    const style = colors[jenis] || colors.perorangan;
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        backgroundColor: style.bg,
        color: style.color,
        textTransform: 'capitalize',
      }}>
        {jenis}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Data Pelanggan</h1>
          <p className="page-subtitle">Kelola data pelanggan untuk e-invoice</p>
        </div>
        <div className="page-actions">
          <Link href="/e-invoice" className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Kembali ke Invoice
          </Link>
          {isSuperAdmin && (
            <button 
              className="btn btn-primary"
              onClick={() => {
                setSelectedCustomer(null);
                setIsEditing(false);
                setFormModalOpen(true);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Tambah Pelanggan
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="card mb-4">
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
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
                  placeholder="Cari nama, kode, email, atau telepon..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => setSearchQuery('')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
              </svg>
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Daftar Pelanggan</h3>
          <span className="muted" style={{ fontSize: '0.75rem' }}>
            {filteredCustomers.length} pelanggan
          </span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Pelanggan</th>
                  <th>Jenis</th>
                  <th>Kontak</th>
                  <th>Invoice</th>
                  {isSuperAdmin && <th style={{ textAlign: 'center' }}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '3rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-2)' }}>
                        <div className="spinner" style={{ width: 24, height: 24 }} />
                        Memuat data...
                      </div>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '3rem' }}>
                      <div className="empty-state" style={{ padding: 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, color: 'var(--text-3)', marginBottom: '1rem' }}>
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <p className="muted">Tidak ada pelanggan ditemukan</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                          {customer.kode_pelanggan}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{customer.nama_pelanggan}</div>
                        {customer.npwp && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>
                            NPWP: {customer.npwp}
                          </div>
                        )}
                      </td>
                      <td>{getJenisBadge(customer.jenis_pelanggan)}</td>
                      <td>
                        {customer.email && (
                          <div style={{ fontSize: '0.8125rem' }}>{customer.email}</div>
                        )}
                        {customer.telepon && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{customer.telepon}</div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          backgroundColor: (customer.invoices?.count || 0) > 0 ? '#dbeafe' : '#f3f4f6',
                          color: (customer.invoices?.count || 0) > 0 ? '#1d4ed8' : '#6b7280',
                        }}>
                          {customer.invoices?.count || 0} invoice
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button 
                              className="btn btn-ghost btn-sm btn-icon"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setIsEditing(true);
                                setFormModalOpen(true);
                              }}
                              title="Edit"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button 
                              className="btn btn-ghost btn-sm btn-icon"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setDeleteModalOpen(true);
                              }}
                              title="Hapus"
                              disabled={(customer.invoices?.count || 0) > 0}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <CustomerFormModal 
        show={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setSelectedCustomer(null);
          setIsEditing(false);
        }}
        onSubmit={handleSubmit}
        customer={selectedCustomer}
        isEditing={isEditing}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal 
        show={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedCustomer(null);
        }}
        onConfirm={handleDelete}
        customer={selectedCustomer}
      />
    </div>
  );
}
