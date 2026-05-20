'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

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

const generateCustomerCode = () => {
  const prefix = 'CUST';
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

// ============ KOMPONEN ITEM ROW ============
function InvoiceItemRow({ item, index, onUpdate, onRemove, canRemove }) {
  const total = (parseFloat(item.quantity) || 0) * (parseFloat(item.harga_satuan) || 0);

  return (
    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
      <td style={{ padding: '0.75rem', textAlign: 'center', width: '50px' }}>
        {index + 1}
      </td>
      <td style={{ padding: '0.75rem' }}>
        <input
          type="text"
          placeholder="Deskripsi item"
          value={item.deskripsi}
          onChange={(e) => onUpdate(index, 'deskripsi', e.target.value)}
          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.5rem' }}
        />
      </td>
      <td style={{ padding: '0.75rem', width: '100px' }}>
        <input
          type="number"
          placeholder="Qty"
          value={item.quantity}
          onChange={(e) => onUpdate(index, 'quantity', e.target.value)}
          style={{ width: '100%', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.5rem' }}
          min="0"
          step="0.01"
        />
      </td>
      <td style={{ padding: '0.75rem', width: '150px' }}>
        <input
          type="number"
          placeholder="Harga"
          value={item.harga_satuan}
          onChange={(e) => onUpdate(index, 'harga_satuan', e.target.value)}
          style={{ width: '100%', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.5rem' }}
          min="0"
        />
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'right', width: '150px', fontFamily: 'monospace' }}>
        {formatRupiah(total)}
      </td>
      <td style={{ padding: '0.75rem', width: '50px', textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: canRemove ? '#dc2626' : '#94a3b8', 
            cursor: canRemove ? 'pointer' : 'not-allowed',
            padding: '0.25rem'
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </td>
    </tr>
  );
}

// ============ CHECKBOX COMPONENT ============
function Checkbox({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
      />
      <span style={{ fontSize: '0.875rem' }}>{label}</span>
    </label>
  );
}

// ============ HALAMAN UTAMA ============
export default function CreateInvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCustomers, setFetchingCustomers] = useState(true);
  
  // Mode customer: 'select' | 'new'
  const [customerMode, setCustomerMode] = useState('select');
  
  // Existing customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // New customer data
  const [newCustomer, setNewCustomer] = useState({
    kode_pelanggan: generateCustomerCode(),
    nama_pelanggan: '',
    email: '',
    telepon: '',
    alamat: '',
    npwp: '',
    jenis_pelanggan: 'perorangan',
  });
  
  // Invoice data
  const [formData, setFormData] = useState({
    tanggal_invoice: new Date().toISOString().split('T')[0],
    tanggal_jatuh_tempo: '',
    catatan: '',
  });
  
  // Items
  const [items, setItems] = useState([
    { deskripsi: '', quantity: 1, harga_satuan: 0 }
  ]);
  
  // Additional charges dengan checkbox
  // Pajak bisa mode 'persen' (dihitung otomatis) atau 'nominal' (input manual)
  const [pajak, setPajak] = useState({ 
    aktif: true, 
    mode: 'persen', // 'persen' | 'nominal'
    persen: 11, 
    nominal: 0 
  });
  const [diskon, setDiskon] = useState({ aktif: false, nominal: 0 });
  const [biayaPengiriman, setBiayaPengiriman] = useState({ aktif: false, nominal: 0 });
  
  // Stempel
  const [stempel, setStempel] = useState({
    lunas: false,
    segera: false,
    jatuh_tempo: false,
    final: false,
    dikirim: false,
    disetujui: false,
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('nama_pelanggan', { ascending: true });
        
        if (error) throw error;
        setCustomers(data || []);
        
        // Set default jatuh tempo (14 days from now)
        const today = new Date();
        const twoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
        setFormData(prev => ({
          ...prev,
          tanggal_jatuh_tempo: twoWeeks.toISOString().split('T')[0]
        }));
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setFetchingCustomers(false);
      }
    };
    fetchCustomers();
  }, [supabase]);

  // Calculate totals
  const calculateTotals = useCallback(() => {
    // Subtotal dari items
    let subtotal = 0;
    items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.harga_satuan) || 0;
      subtotal += qty * price;
    });
    
    // Pajak - bisa persen atau nominal
    let ppnNilai = 0;
    if (pajak.aktif) {
      if (pajak.mode === 'persen') {
        ppnNilai = Math.round(subtotal * (parseFloat(pajak.persen) || 0) / 100);
      } else {
        ppnNilai = parseFloat(pajak.nominal) || 0;
      }
    }
    
    // Diskon
    const diskonNilai = diskon.aktif ? (parseFloat(diskon.nominal) || 0) : 0;
    
    // Biaya pengiriman
    const pengirimanNilai = biayaPengiriman.aktif ? (parseFloat(biayaPengiriman.nominal) || 0) : 0;
    
    // Total
    const total = subtotal + ppnNilai - diskonNilai + pengirimanNilai;
    
    return { subtotal, ppnNilai, diskonNilai, pengirimanNilai, total };
  }, [items, pajak, diskon, biayaPengiriman]);

  const { subtotal, ppnNilai, diskonNilai, pengirimanNilai, total } = calculateTotals();

  // Get selected customer info
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Handle item update
  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  // Handle add item
  const addItem = () => {
    setItems(prev => [...prev, { deskripsi: '', quantity: 1, harga_satuan: 0 }]);
  };

  // Handle remove item
  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Get status from stempel
  const getStatusFromStempel = () => {
    if (stempel.lunas) return 'lunas';
    if (stempel.segera) return 'segera';
    if (stempel.jatuh_tempo) return 'jatuh_tempo';
    if (stempel.final) return 'final';
    if (stempel.dikirim) return 'dikirim';
    if (stempel.disetujui) return 'disetujui';
    return 'dibuat';
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let customerId = selectedCustomerId;
    let customerData = selectedCustomer;
    
    // Validasi pelanggan
    if (customerMode === 'select' && !selectedCustomerId) {
      alert('Silakan pilih pelanggan terlebih dahulu.');
      return;
    }
    
    if (customerMode === 'new') {
      if (!newCustomer.nama_pelanggan) {
        alert('Nama pelanggan wajib diisi.');
        return;
      }
    }
    
    if (items.some(item => !item.deskripsi)) {
      alert('Semua item harus memiliki deskripsi.');
      return;
    }
    
    if (!formData.tanggal_invoice || !formData.tanggal_jatuh_tempo) {
      alert('Tanggal invoice dan jatuh tempo harus diisi.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Debug: Log data yang akan dikirim
      console.log('Submitting invoice with data:', {
        customerMode,
        customerId,
        formData,
        subtotal,
        ppnNilai,
        total,
        itemCount: items.length
      });
      
      // Jika mode new customer, buat customer dulu
      if (customerMode === 'new') {
        console.log('Creating new customer:', newCustomer);
        const { data: createdCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            kode_pelanggan: newCustomer.kode_pelanggan,
            nama_pelanggan: newCustomer.nama_pelanggan,
            email: newCustomer.email || null,
            telepon: newCustomer.telepon || null,
            alamat: newCustomer.alamat || null,
            npwp: newCustomer.npwp || null,
            jenis_pelanggan: newCustomer.jenis_pelanggan,
          })
          .select()
          .single();
        
        if (customerError) {
          console.error('Customer creation error:', customerError);
          throw new Error('Gagal membuat pelanggan: ' + customerError.message);
        }
        customerId = createdCustomer.id;
        customerData = createdCustomer;
        console.log('Customer created:', customerId);
      }
      
      // Create invoice
      const status = getStatusFromStempel();
      const invoiceDataToInsert = {
        customer_id: customerId,
        tanggal_invoice: formData.tanggal_invoice,
        tanggal_jatuh_tempo: formData.tanggal_jatuh_tempo,
        status: status,
        subtotal: subtotal,
        ppn_persen: pajak.mode === 'persen' ? (parseFloat(pajak.persen) || 0) : 0,
        ppn_nilai: ppnNilai,
        total: total,
        catatan: formData.catatan || null,
        terms_conditions: '',
      };
      
      console.log('Inserting invoice:', invoiceDataToInsert);
      
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceDataToInsert)
        .select()
        .single();
      
      if (invoiceError) {
        console.error('Invoice creation error:', invoiceError);
        throw new Error('Gagal membuat invoice: ' + invoiceError.message);
      }
      
      console.log('Invoice created:', invoiceData.id);
      
      // Create invoice items
      const itemRecords = items.map((item, index) => ({
        invoice_id: invoiceData.id,
        deskripsi: item.deskripsi,
        quantity: parseFloat(item.quantity) || 0,
        satuan: 'pcs',
        harga_satuan: parseFloat(item.harga_satuan) || 0,
        diskon_persen: 0,
        total: (parseFloat(item.quantity) || 0) * (parseFloat(item.harga_satuan) || 0),
        urutan: index,
      }));
      
      console.log('Inserting items:', itemRecords);
      
      const { data: insertedItems, error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemRecords)
        .select();
      
      if (itemsError) {
        console.error('Items creation error:', itemsError);
        throw new Error('Gagal membuat item invoice: ' + itemsError.message);
      }
      
      console.log('Items created:', insertedItems?.length || 0);
      
      router.push('/e-invoice');
    } catch (err) {
      console.error('Error creating invoice:', err);
      
      // Extract error message from Supabase error
      let errorMessage = 'Terjadi kesalahan pada server';
      
      if (err && typeof err === 'object') {
        // Supabase error format
        if (err.message) {
          errorMessage = err.message;
        } else if (err.error_description) {
          errorMessage = err.error_description;
        } else if (err.details) {
          errorMessage = err.details;
        } else if (err.error) {
          errorMessage = err.error;
        }
        
        // Log additional details if available
        if (err.code) console.error('Error code:', err.code);
        if (err.details) console.error('Error details:', err.details);
        if (err.hint) console.error('Error hint:', err.hint);
      }
      
      alert('Gagal membuat invoice: ' + errorMessage);
      setLoading(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    if (confirm('Apakah Anda yakin ingin mengreset form?')) {
      setCustomerMode('select');
      setSelectedCustomerId('');
      setNewCustomer({
        kode_pelanggan: generateCustomerCode(),
        nama_pelanggan: '',
        email: '',
        telepon: '',
        alamat: '',
        npwp: '',
        jenis_pelanggan: 'perorangan',
      });
      setFormData({
        tanggal_invoice: new Date().toISOString().split('T')[0],
        tanggal_jatuh_tempo: '',
        catatan: '',
      });
      setItems([{ deskripsi: '', quantity: 1, harga_satuan: 0 }]);
      setPajak({ aktif: true, mode: 'persen', persen: 11, nominal: 0 });
      setDiskon({ aktif: false, nominal: 0 });
      setBiayaPengiriman({ aktif: false, nominal: 0 });
      setStempel({
        lunas: false,
        segera: false,
        jatuh_tempo: false,
        final: false,
        dikirim: false,
        disetujui: false,
      });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Buat Invoice</h1>
          <p className="page-subtitle">Buat invoice PDF dan kirim ke pelanggan</p>
        </div>
        <div className="page-actions">
          <Link href="/e-invoice" className="btn btn-ghost">
            Kembali
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          
          {/* Invoice Header Card */}
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
                {/* Left - Logo & Company */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ width: 60, height: 60, background: '#1e3a8a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#f5b915', fontSize: 24, fontWeight: 800 }}>USC</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>Unesa Science Center</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>Universitas Negeri Surabaya</div>
                    </div>
                  </div>
                </div>

                {/* Right - Invoice Info */}
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Invoice No.*</span>
                    <input
                      type="text"
                      value="AUTO"
                      disabled
                      style={{ 
                        width: '120px', 
                        textAlign: 'right',
                        backgroundColor: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        padding: '0.5rem',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Tanggal Invoice*</span>
                    <input
                      type="date"
                      value={formData.tanggal_invoice}
                      onChange={(e) => setFormData({ ...formData, tanggal_invoice: e.target.value })}
                      style={{ width: '150px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.5rem' }}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Jatuh Tempo*</span>
                    <input
                      type="date"
                      value={formData.tanggal_jatuh_tempo}
                      onChange={(e) => setFormData({ ...formData, tanggal_jatuh_tempo: e.target.value })}
                      style={{ width: '150px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.5rem' }}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Section */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-2)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Ditagih kepada</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setCustomerMode('select')}
                  style={{
                    backgroundColor: customerMode === 'select' ? 'var(--primary)' : 'white',
                    color: customerMode === 'select' ? 'white' : 'var(--text-2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Pilih Pelanggan
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setCustomerMode('new')}
                  style={{
                    backgroundColor: customerMode === 'new' ? 'var(--primary)' : 'white',
                    color: customerMode === 'new' ? 'white' : 'var(--text-2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  + Pelanggan Baru
                </button>
              </div>
            </div>
            <div className="card-body">
              {customerMode === 'select' ? (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {fetchingCustomers ? (
                    <div>Memuat data pelanggan...</div>
                  ) : customers.length === 0 ? (
                    <div>
                      <p>Belum ada pelanggan</p>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCustomerMode('new')}>
                        + Buat Pelanggan Baru
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Nama Pelanggan *</label>
                        <select
                          value={selectedCustomerId}
                          onChange={(e) => setSelectedCustomerId(e.target.value)}
                          style={{ width: '100%', maxWidth: '400px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.5rem', marginTop: '0.25rem' }}
                          required
                        >
                          <option value="">-- Pilih Pelanggan --</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.nama_pelanggan}
                            </option>
                          ))}
                        </select>
                      </div>
                      {selectedCustomer && (
                        <div style={{ 
                          marginTop: '0.75rem', 
                          padding: '1rem', 
                          backgroundColor: 'var(--surface-2)', 
                          borderRadius: '8px',
                          fontSize: '0.875rem'
                        }}>
                          <div><strong>{selectedCustomer.nama_pelanggan}</strong></div>
                          {selectedCustomer.alamat && <div style={{ color: 'var(--text-2)' }}>{selectedCustomer.alamat}</div>}
                          {selectedCustomer.telepon && <div style={{ color: 'var(--text-2)' }}>Telp: {selectedCustomer.telepon}</div>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Kode Pelanggan</label>
                    <input
                      type="text"
                      value={newCustomer.kode_pelanggan}
                      disabled
                      style={{ width: '200px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.5rem', marginTop: '0.25rem', fontFamily: 'monospace' }}
                    />
                    <small style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>Dibuat otomatis oleh sistem</small>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Nama Pelanggan *</label>
                    <input
                      type="text"
                      value={newCustomer.nama_pelanggan}
                      onChange={(e) => setNewCustomer({ ...newCustomer, nama_pelanggan: e.target.value })}
                      placeholder="Nama lengkap pelanggan"
                      style={{ width: '100%', maxWidth: '400px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.5rem', marginTop: '0.25rem' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Alamat Pelanggan</label>
                    <textarea
                      value={newCustomer.alamat}
                      onChange={(e) => setNewCustomer({ ...newCustomer, alamat: e.target.value })}
                      placeholder="Alamat lengkap pelanggan..."
                      rows={3}
                      style={{ width: '100%', maxWidth: '400px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.5rem', marginTop: '0.25rem' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '400px' }}>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Telepon</label>
                      <input
                        type="tel"
                        value={newCustomer.telepon}
                        onChange={(e) => setNewCustomer({ ...newCustomer, telepon: e.target.value })}
                        placeholder="0812-3456-7890"
                        style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.5rem', marginTop: '0.25rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Email</label>
                      <input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        placeholder="email@example.com"
                        style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.5rem', marginTop: '0.25rem' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="card">
            <div className="card-header" style={{ backgroundColor: '#64748b', color: 'white' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Item Invoice</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'center', width: '50px', fontSize: '0.875rem', fontWeight: 600 }}>No</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600 }}>Deskripsi *</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', width: '100px', fontSize: '0.875rem', fontWeight: 600 }}>Jumlah</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', width: '150px', fontSize: '0.875rem', fontWeight: 600 }}>Harga Satuan</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', width: '150px', fontSize: '0.875rem', fontWeight: 600 }}>Total</th>
                    <th style={{ padding: '0.75rem', width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <InvoiceItemRow
                      key={index}
                      item={item}
                      index={index}
                      onUpdate={updateItem}
                      onRemove={removeItem}
                      canRemove={items.length > 1}
                    />
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={addItem}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, marginRight: '0.5rem' }}>
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Tambah Item
                </button>
              </div>
            </div>
          </div>

          {/* Summary & Additional Charges */}
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
                {/* Left - Notes */}
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Catatan</label>
                  <textarea
                    value={formData.catatan}
                    onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                    placeholder="Anda bisa menulis catatan tambahan untuk pelanggan Anda di sini."
                    rows={4}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.75rem' }}
                  />
                </div>

                {/* Right - Summary */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.875rem' }}>Sub Total</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatRupiah(subtotal)}</span>
                  </div>
                  
                  {/* Pajak */}
                  <div style={{ padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={pajak.aktif}
                          onChange={(e) => setPajak({ ...pajak, aktif: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Pajak (+)</span>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--text-2)' }}>
                        {formatRupiah(ppnNilai)}
                      </span>
                    </div>
                    
                    {pajak.aktif && (
                      <div style={{ display: 'flex', gap: '1rem', marginLeft: '1.625rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="pajak-mode"
                            checked={pajak.mode === 'persen'}
                            onChange={() => setPajak({ ...pajak, mode: 'persen' })}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.8125rem' }}>Persen (%)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="pajak-mode"
                            checked={pajak.mode === 'nominal'}
                            onChange={() => setPajak({ ...pajak, mode: 'nominal' })}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.8125rem' }}>Nominal</span>
                        </label>
                      </div>
                    )}
                    
                    {pajak.aktif && (
                      <div style={{ marginLeft: '1.625rem', marginTop: '0.5rem' }}>
                        {pajak.mode === 'persen' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="number"
                              value={pajak.persen}
                              onChange={(e) => setPajak({ ...pajak, persen: e.target.value })}
                              style={{ 
                                width: '80px', 
                                textAlign: 'right',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '0.5rem',
                                fontFamily: 'monospace'
                              }}
                              min="0"
                              step="0.01"
                            />
                            <span style={{ fontSize: '0.875rem' }}>%</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginLeft: '0.5rem' }}>
                              = {formatRupiah(ppnNilai)}
                            </span>
                          </div>
                        ) : (
                          <input
                            type="number"
                            value={pajak.nominal}
                            onChange={(e) => setPajak({ ...pajak, nominal: e.target.value })}
                            placeholder="Nominal pajak"
                            style={{ 
                              width: '150px', 
                              textAlign: 'right',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              padding: '0.5rem',
                              fontFamily: 'monospace'
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Diskon */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={diskon.aktif}
                        onChange={(e) => setDiskon({ ...diskon, aktif: e.target.checked })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '0.875rem' }}>Diskon (-)</span>
                    </div>
                    <input
                      type="number"
                      value={diskon.nominal}
                      onChange={(e) => setDiskon({ ...diskon, nominal: e.target.value })}
                      disabled={!diskon.aktif}
                      style={{ 
                        width: '150px', 
                        textAlign: 'right',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        padding: '0.5rem',
                        fontFamily: 'monospace',
                        backgroundColor: diskon.aktif ? 'white' : 'var(--surface-2)'
                      }}
                    />
                  </div>
                  
                  {/* Biaya Pengiriman */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={biayaPengiriman.aktif}
                        onChange={(e) => setBiayaPengiriman({ ...biayaPengiriman, aktif: e.target.checked })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '0.875rem' }}>Biaya Pengiriman (+)</span>
                    </div>
                    <input
                      type="number"
                      value={biayaPengiriman.nominal}
                      onChange={(e) => setBiayaPengiriman({ ...biayaPengiriman, nominal: e.target.value })}
                      disabled={!biayaPengiriman.aktif}
                      style={{ 
                        width: '150px', 
                        textAlign: 'right',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        padding: '0.5rem',
                        fontFamily: 'monospace',
                        backgroundColor: biayaPengiriman.aktif ? 'white' : 'var(--surface-2)'
                      }}
                    />
                  </div>
                  
                  {/* Total */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '1rem 0',
                    backgroundColor: '#e2e8f0',
                    marginTop: '0.5rem',
                    paddingLeft: '1rem',
                    paddingRight: '1rem',
                    borderRadius: '4px'
                  }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700 }}>TOTAL</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'monospace' }}>
                      {formatRupiah(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stempel Section */}
          <div className="card">
            <div className="card-header" style={{ backgroundColor: 'var(--surface-2)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Stempel</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                <Checkbox 
                  checked={stempel.lunas} 
                  onChange={(checked) => setStempel({ ...stempel, lunas: checked })}
                  label="Lunas"
                />
                <Checkbox 
                  checked={stempel.segera} 
                  onChange={(checked) => setStempel({ ...stempel, segera: checked })}
                  label="Segera"
                />
                <Checkbox 
                  checked={stempel.jatuh_tempo} 
                  onChange={(checked) => setStempel({ ...stempel, jatuh_tempo: checked })}
                  label="Jatuh Tempo"
                />
                <Checkbox 
                  checked={stempel.final} 
                  onChange={(checked) => setStempel({ ...stempel, final: checked })}
                  label="Final"
                />
                <Checkbox 
                  checked={stempel.dikirim} 
                  onChange={(checked) => setStempel({ ...stempel, dikirim: checked })}
                  label="Dikirim"
                />
                <Checkbox 
                  checked={stempel.disetujui} 
                  onChange={(checked) => setStempel({ ...stempel, disetujui: checked })}
                  label="Disetujui"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: 16, height: 16 }} />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, marginRight: '0.5rem' }}>
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Simpan
                  </>
                )}
              </button>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleReset}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, marginRight: '0.5rem' }}>
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Reset
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
