'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

// ============ HELPERS ============
const formatRupiah = (num) => {
  if (!num || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
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
export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params?.id;
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  
  // Invoice data
  const [formData, setFormData] = useState({
    customer_id: '',
    tanggal_invoice: '',
    tanggal_jatuh_tempo: '',
    catatan: '',
  });
  
  // Items
  const [items, setItems] = useState([
    { deskripsi: '', quantity: 1, harga_satuan: 0 }
  ]);
  
  // Additional charges dengan checkbox
  const [pajak, setPajak] = useState({ 
    aktif: true, 
    mode: 'persen', 
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
  
  // Fallback values from database (for display when items are empty)
  const [dbTotals, setDbTotals] = useState({
    subtotal: 0,
    ppn_nilai: 0,
    total: 0,
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Fetch invoice data and customers
  useEffect(() => {
    const fetchData = async () => {
      if (!invoiceId) {
        console.error('No invoiceId provided');
        return;
      }
      
      console.log('Starting fetch with invoiceId:', invoiceId, 'type:', typeof invoiceId);
      
      try {
        console.log('Fetching data for invoice:', invoiceId);
        
        // Fetch customers first
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, kode_pelanggan, nama_pelanggan, alamat, telepon, email')
          .order('nama_pelanggan', { ascending: true });
        
        if (customersError) {
          console.error('Error fetching customers:', customersError);
          console.error('Customers error details:', JSON.stringify(customersError));
        } else {
          console.log('Customers loaded:', customersData?.length || 0, 'customers');
          console.log('First customer:', customersData?.[0]);
        }
        setCustomers(customersData || []);
        
        // Fetch invoice using invoice_summary view
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoice_summary')
          .select('*')
          .eq('id', invoiceId)
          .single();
        
        if (invoiceError) {
          console.error('Error fetching invoice:', invoiceError);
          // Fallback to invoices table
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', invoiceId)
            .single();
          
          if (fallbackError) throw fallbackError;
          
          console.log('Invoice data (fallback):', fallbackData);
          
          setFormData({
            customer_id: fallbackData.customer_id || '',
            tanggal_invoice: fallbackData.tanggal_invoice || '',
            tanggal_jatuh_tempo: fallbackData.tanggal_jatuh_tempo || '',
            catatan: fallbackData.catatan || '',
          });
          
          // Set pajak from invoice data
          if (fallbackData.ppn_nilai > 0) {
            if (fallbackData.ppn_persen > 0) {
              setPajak({
                aktif: true,
                mode: 'persen',
                persen: fallbackData.ppn_persen,
                nominal: fallbackData.ppn_nilai
              });
            } else {
              setPajak({
                aktif: true,
                mode: 'nominal',
                persen: 11,
                nominal: fallbackData.ppn_nilai
              });
            }
          }
          
          // Set stempel from status
          const status = fallbackData.status;
          setStempel({
            lunas: status === 'lunas',
            segera: status === 'segera',
            jatuh_tempo: status === 'jatuh_tempo',
            final: status === 'final',
            dikirim: status === 'dikirim',
            disetujui: status === 'disetujui',
          });
          
          // Set database totals as fallback
          setDbTotals({
            subtotal: fallbackData.subtotal || 0,
            ppn_nilai: fallbackData.ppn_nilai || 0,
            total: fallbackData.total || 0,
          });
        } else {
          console.log('Invoice data:', invoiceData);
          console.log('Subtotal:', invoiceData.subtotal);
          console.log('PPN:', invoiceData.ppn_nilai, 'Persen:', invoiceData.ppn_persen);
          console.log('Total:', invoiceData.total);
          
          setFormData({
            customer_id: invoiceData.customer_id || '',
            tanggal_invoice: invoiceData.tanggal_invoice || '',
            tanggal_jatuh_tempo: invoiceData.tanggal_jatuh_tempo || '',
            catatan: invoiceData.catatan || '',
          });
          
          // Set pajak from invoice data
          if (invoiceData.ppn_nilai > 0 || invoiceData.ppn_persen > 0) {
            if (invoiceData.ppn_persen > 0) {
              setPajak({
                aktif: true,
                mode: 'persen',
                persen: invoiceData.ppn_persen,
                nominal: invoiceData.ppn_nilai || 0
              });
            } else {
              setPajak({
                aktif: true,
                mode: 'nominal',
                persen: 11,
                nominal: invoiceData.ppn_nilai || 0
              });
            }
          } else {
            // Jika tidak ada pajak, set default
            setPajak({
              aktif: false,
              mode: 'persen',
              persen: 11,
              nominal: 0
            });
          }
          
          // Set stempel from status
          const status = invoiceData.status;
          setStempel({
            lunas: status === 'lunas',
            segera: status === 'segera',
            jatuh_tempo: status === 'jatuh_tempo',
            final: status === 'final',
            dikirim: status === 'dikirim',
            disetujui: status === 'disetujui',
          });
          
          // Set database totals as fallback
          setDbTotals({
            subtotal: invoiceData.subtotal || 0,
            ppn_nilai: invoiceData.ppn_nilai || 0,
            total: invoiceData.total || 0,
          });
        }
        
        // Fetch items
        console.log('Fetching items for invoice_id:', invoiceId);
        const { data: itemsData, error: itemsError } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', invoiceId)
          .order('urutan', { ascending: true });
        
        if (itemsError) {
          console.error('Error fetching items:', itemsError);
          console.error('Items error details:', JSON.stringify(itemsError));
          console.error('Items error message:', itemsError.message);
          console.error('Items error code:', itemsError.code);
          // Don't throw, just log and continue with empty items
          console.log('Continuing with empty items...');
          setItems([{ deskripsi: '', quantity: 1, harga_satuan: 0 }]);
        } else {
          console.log('Items data:', itemsData);
          
          if (itemsData && itemsData.length > 0) {
            setItems(itemsData.map(item => ({
              id: item.id,
              deskripsi: item.deskripsi,
              quantity: item.quantity,
              harga_satuan: item.harga_satuan,
            })));
          } else {
            console.log('No items found, using default');
            setItems([{ deskripsi: '', quantity: 1, harga_satuan: 0 }]);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        console.error('Error stack:', err.stack);
        alert('Gagal memuat data invoice: ' + (err.message || 'Unknown error') + '\n\nCek console browser (F12) untuk detail lebih lanjut.');
      } finally {
        setFetchingData(false);
      }
    };
    
    fetchData();
  }, [supabase, invoiceId]);

  // Calculate totals
  const calculateTotals = useCallback(() => {
    // Subtotal dari items
    let subtotal = 0;
    items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.harga_satuan) || 0;
      subtotal += qty * price;
    });
    
    // Fallback to database values if calculated subtotal is 0 but db has values
    // This handles cases where items might not be loaded properly
    if (subtotal === 0 && dbTotals.subtotal > 0) {
      subtotal = dbTotals.subtotal;
    }
    
    // Pajak - bisa persen atau nominal
    let ppnNilai = 0;
    if (pajak.aktif) {
      if (pajak.mode === 'persen') {
        ppnNilai = Math.round(subtotal * (parseFloat(pajak.persen) || 0) / 100);
      } else {
        ppnNilai = parseFloat(pajak.nominal) || 0;
      }
    }
    
    // If calculated ppn is 0 but db has ppn value, use db value
    if (ppnNilai === 0 && dbTotals.ppn_nilai > 0 && !pajak.aktif) {
      ppnNilai = dbTotals.ppn_nilai;
    }
    
    // Diskon
    const diskonNilai = diskon.aktif ? (parseFloat(diskon.nominal) || 0) : 0;
    
    // Biaya pengiriman
    const pengirimanNilai = biayaPengiriman.aktif ? (parseFloat(biayaPengiriman.nominal) || 0) : 0;
    
    // Total
    let total = subtotal + ppnNilai - diskonNilai + pengirimanNilai;
    
    // If calculated total is 0 but db has total value, use db value
    if (total === 0 && dbTotals.total > 0) {
      total = dbTotals.total;
    }
    
    return { subtotal, ppnNilai, diskonNilai, pengirimanNilai, total };
  }, [items, pajak, diskon, biayaPengiriman, dbTotals]);

  const { subtotal, ppnNilai, diskonNilai, pengirimanNilai, total } = calculateTotals();

  // Get selected customer info
  const selectedCustomer = customers.find(c => c.id === formData.customer_id);
  
  // Debug logging
  console.log('Debug - customers count:', customers.length);
  console.log('Debug - formData.customer_id:', formData.customer_id);
  console.log('Debug - selectedCustomer:', selectedCustomer);

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
    
    if (!formData.customer_id) {
      alert('Silakan pilih pelanggan terlebih dahulu.');
      return;
    }
    
    // Filter only valid items (with description)
    const validItems = items.filter(item => item.deskripsi && item.deskripsi.trim() !== '');
    
    if (validItems.length === 0) {
      alert('Invoice harus memiliki minimal satu item dengan deskripsi.');
      return;
    }
    
    if (!formData.tanggal_invoice || !formData.tanggal_jatuh_tempo) {
      alert('Tanggal invoice dan jatuh tempo harus diisi.');
      return;
    }
    
    setLoading(true);
    
    try {
      const status = getStatusFromStempel();
      
      // Update invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          customer_id: formData.customer_id,
          tanggal_invoice: formData.tanggal_invoice,
          tanggal_jatuh_tempo: formData.tanggal_jatuh_tempo,
          status: status,
          subtotal: subtotal,
          ppn_persen: pajak.mode === 'persen' ? (parseFloat(pajak.persen) || 0) : 0,
          ppn_nilai: ppnNilai,
          total: total,
          catatan: formData.catatan || null,
          terms_conditions: '',
        })
        .eq('id', invoiceId);
      
      if (invoiceError) throw invoiceError;
      
      // Delete old items
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoiceId);
      
      if (deleteError) throw deleteError;
      
      // Insert new items (only valid items)
      const itemRecords = validItems.map((item, index) => ({
        invoice_id: invoiceId,
        deskripsi: item.deskripsi,
        quantity: parseFloat(item.quantity) || 0,
        satuan: 'pcs',
        harga_satuan: parseFloat(item.harga_satuan) || 0,
        diskon_persen: 0,
        total: (parseFloat(item.quantity) || 0) * (parseFloat(item.harga_satuan) || 0),
        urutan: index,
      }));
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemRecords);
      
      if (itemsError) throw itemsError;
      
      router.push(`/e-invoice/${invoiceId}`);
    } catch (err) {
      console.error('Error updating invoice:', err);
      alert('Gagal mengupdate invoice: ' + (err.message || 'Terjadi kesalahan'));
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 1rem' }} />
          <p className="muted">Memuat data invoice...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Edit Invoice</h1>
          <p className="page-subtitle">Ubah data invoice yang sudah ada</p>
        </div>
        <div className="page-actions">
          <Link href={`/e-invoice/${invoiceId}`} className="btn btn-ghost">
            Batal
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
            <div className="card-header" style={{ backgroundColor: 'var(--surface-2)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Ditagih kepada</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Pilih Pelanggan *</label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
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
              </div>
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
                    Update Invoice
                  </>
                )}
              </button>
            </div>
            <Link href={`/e-invoice/${invoiceId}`} className="btn btn-ghost">
              Batal
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
