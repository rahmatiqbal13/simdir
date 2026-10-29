'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/app/components/Toast';
import { formatRupiah, slugToNomor } from '@/lib/utils/format';
import useAutosave from '@/app/components/useAutosave';
import { safeLocalStorage } from '@/lib/localStorage';

// ============ KOMPONEN ITEM ROW ============
function InvoiceItemRow({ item, index, onUpdate, onRemove, canRemove }) {
  const total = (parseFloat(item.quantity) || 0) * (parseFloat(item.harga_satuan) || 0);

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '0.75rem', textAlign: 'center', width: '50px' }}>
        {index + 1}
      </td>
      <td style={{ padding: '0.75rem' }}>
        <input
          type="text"
          placeholder="Deskripsi item"
          value={item.deskripsi}
          onChange={(e) => onUpdate(index, 'deskripsi', e.target.value)}
          style={{ width: '100%', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '0.5rem' }}
        />
      </td>
      <td style={{ padding: '0.75rem', width: '100px' }}>
        <input
          type="number"
          placeholder="Qty"
          value={item.quantity}
          onChange={(e) => onUpdate(index, 'quantity', e.target.value)}
          style={{ width: '100%', textAlign: 'center', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '0.5rem' }}
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
          style={{ width: '100%', textAlign: 'right', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '0.5rem' }}
          min="0"
        />
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'right', width: '150px', fontFamily: 'var(--font-mono)' }}>
        {formatRupiah(total)}
      </td>
      <td style={{ padding: '0.75rem', width: '50px', textAlign: 'center' }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-icon"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          aria-label="Hapus item"
          style={{
            color: canRemove ? '#dc2626' : 'var(--text-3)',
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
  // params.id sekarang slug nomor invoice (mis. "INV-2026-07-0005"), bukan
  // UUID — lihat lib/utils/format.js nomorToSlug/slugToNomor. UUID asli
  // (dibutuhkan untuk update/delete/FK item) disimpan terpisah di realId
  // setelah invoice-nya ter-fetch.
  const invoiceSlug = params?.id;
  const { error } = useToast();

  const [customers, setCustomers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethodsLoaded, setPaymentMethodsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [realId, setRealId] = useState(null);
  
  // Invoice data
  const [formData, setFormData] = useState({
    customer_id: '',
    tanggal_invoice: '',
    tanggal_jatuh_tempo: '',
    catatan: '',
    payment_method_id: '',
  });
  
  // Items
  const [items, setItems] = useState([
    { deskripsi: '', quantity: 1, harga_satuan: 0, satuan: '' }
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
  
  const [draftFound, setDraftFound] = useState(false);
  const draftKey = `simdir_invoice_edit_draft_${invoiceSlug}`;

  // Draft object for autosave — sama seperti create/page.jsx, supaya
  // perubahan tidak hilang kalau tab tertutup/koneksi putus sebelum sempat
  // klik Simpan (sebelumnya Edit tidak punya proteksi ini sama sekali,
  // padahal ini operasi yang lebih berisiko daripada Create karena bisa
  // menimpa invoice yang sudah ada).
  const draftPayload = useMemo(() => ({
    version: 1,
    formData,
    items,
    pajak,
    diskon,
    biayaPengiriman,
    stempel,
  }), [formData, items, pajak, diskon, biayaPengiriman, stempel]);

  useAutosave(draftPayload, draftKey, !fetchingData && !loading);

  const restoreDraft = () => {
    try {
      const raw = safeLocalStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && draft.version === 1) {
          setFormData(draft.formData || formData);
          setItems(draft.items || items);
          setPajak(draft.pajak || pajak);
          setDiskon(draft.diskon || diskon);
          setBiayaPengiriman(draft.biayaPengiriman || biayaPengiriman);
          setStempel(draft.stempel || stempel);
        }
      }
    } catch (e) {
      console.error('Error restoring draft:', e);
    } finally {
      setDraftFound(false);
    }
  };

  const dismissDraft = () => {
    safeLocalStorage.removeItem(draftKey);
    setDraftFound(false);
  };

  // Fetch invoice data and customers
  useEffect(() => {
    const fetchData = async () => {
      if (!invoiceSlug) {
        console.error('No invoiceSlug provided');
        return;
      }

      try {
        // Fetch customers first
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, kode_pelanggan, nama_pelanggan, alamat, telepon, email')
          .order('nama_pelanggan', { ascending: true });

        if (customersError) {
          console.error('Error fetching customers:', customersError);
          console.error('Customers error details:', JSON.stringify(customersError));
        }
        setCustomers(customersData || []);

        // Fetch invoice directly from invoices table (not view) to ensure all columns are available
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('nomor_invoice', slugToNomor(invoiceSlug))
          .single();

        if (invoiceError) throw invoiceError;

        const resolvedId = invoiceData.id;
        setRealId(invoiceData.id);
        setFormData({
          customer_id: invoiceData.customer_id || '',
          tanggal_invoice: invoiceData.tanggal_invoice || '',
          tanggal_jatuh_tempo: invoiceData.tanggal_jatuh_tempo || '',
          catatan: invoiceData.catatan || '',
          payment_method_id: invoiceData.payment_method_id || '',
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

        // Set diskon & pengiriman from invoice data
        setDiskon({
          aktif: (invoiceData.diskon_nilai || 0) > 0,
          nominal: invoiceData.diskon_nilai || 0,
        });
        setBiayaPengiriman({
          aktif: (invoiceData.biaya_pengiriman || 0) > 0,
          nominal: invoiceData.biaya_pengiriman || 0,
        });

        // Fetch items — pakai UUID asli (resolvedId) yang baru diambil di
        // atas, bukan invoiceSlug (state realId belum ter-update di render
        // yang sama, jadi tidak bisa dipakai langsung di sini).
        const { data: itemsData, error: itemsError } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', resolvedId)
          .order('urutan', { ascending: true });
        
        if (itemsError) {
          console.error('Error fetching items:', itemsError);
          console.error('Items error details:', JSON.stringify(itemsError));
          console.error('Items error message:', itemsError.message);
          console.error('Items error code:', itemsError.code);
          // Don't throw, just continue with empty items
          setItems([{ deskripsi: '', quantity: 1, harga_satuan: 0, satuan: '' }]);
        } else {
          if (itemsData && itemsData.length > 0) {
            setItems(itemsData.map(item => ({
              id: item.id,
              deskripsi: item.deskripsi,
              quantity: item.quantity,
              harga_satuan: item.harga_satuan,
              satuan: item.satuan || '',
            })));
          } else {
            setItems([{ deskripsi: '', quantity: 1, harga_satuan: 0, satuan: '' }]);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        console.error('Error stack:', err.stack);
        error('Gagal memuat data invoice: ' + (err.message || 'Unknown error') + '\n\nCek console browser (F12) untuk detail lebih lanjut.');
      } finally {
        setFetchingData(false);
      }
    };
    
    fetchData();
  }, [supabase, invoiceSlug]);

  // Fetch daftar metode pembayaran untuk dropdown (terpisah dari fetchData
  // di atas karena tidak bergantung pada invoiceSlug).
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const res = await fetch('/api/payment-methods');
        const data = await res.json();
        // Hanya tandai "loaded" kalau fetch benar-benar berhasil (mis. bukan
        // 403 dari role selain super_admin yang buka halaman ini lewat URL
        // langsung) — kalau gagal, dropdown tetap disabled selamanya supaya
        // payment_method_id yang sudah tersimpan tidak bisa diam-diam
        // terhapus lewat interaksi pada daftar yang kosong/tidak lengkap.
        if (res.ok) {
          setPaymentMethods(data || []);
          setPaymentMethodsLoaded(true);
        }
      } catch (err) {
        console.error('Error fetching payment methods:', err);
      }
    };
    fetchPaymentMethods();
  }, []);

  // Cek draft tersimpan SETELAH data asli selesai dimuat — supaya kalau
  // ditemukan, banner menawarkan "Lanjutkan" yang menimpa data asli dengan
  // draft (bukan sebaliknya, race dengan fetchData di atas).
  useEffect(() => {
    if (fetchingData) return;
    try {
      const raw = safeLocalStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && draft.version === 1) setDraftFound(true);
      }
    } catch (e) {
      console.error('Error reading draft:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchingData]);

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
    
    // If calculated ppn is 0 but db has ppn value, use db value
    // Jika pajak tidak aktif, PPN harus 0 (override nilai dari database)
    if (!pajak.aktif) {
      ppnNilai = 0;
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
  const selectedCustomer = customers.find(c => c.id === formData.customer_id);

  // Metode aktif + metode yang sudah terpasang di invoice ini meski sudah
  // dinonaktifkan (supaya dropdown tidak diam-diam menghilangkan pilihan
  // yang sudah ada saat invoice dibuka untuk diedit).
  const selectablePaymentMethods = paymentMethods.filter(
    (m) => m.is_active || m.id === formData.payment_method_id
  );
  const selectedPaymentMethod = paymentMethods.find(m => m.id === formData.payment_method_id);

  const handlePaymentMethodChange = (id) => {
    const method = paymentMethods.find((m) => m.id === id);
    const line = !method
      ? null
      : method.type === 'qr'
        ? `Pembayaran dapat dilakukan dengan scan QRIS "${method.label}" (QR terlampir di bawah).`
        : [
            `Pembayaran dilakukan dengan m-banking melalui menu pembayaran Virtual Akun ke bank lain dan pilih Bank ${method.bank_name}.`,
            `Pembayaran dapat dilakukan pada Nomor Virtual Account: ${method.va_number} , Atas Nama : ${method.label}`,
            method.whatsapp_number
              ? `Bukti Transfer dapat dikirim ke nomor Whatsapp : ${method.whatsapp_number}${method.whatsapp_name ? ` (${method.whatsapp_name})` : ''}`
              : null,
          ].filter(Boolean).join('\n');
    setFormData((prev) => ({
      ...prev,
      payment_method_id: id,
      catatan: line ? (prev.catatan ? `${prev.catatan}\n\n${line}` : line) : prev.catatan,
    }));
  };

  // Handle item update
  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  // Handle add item
  const addItem = () => {
    setItems(prev => [...prev, { deskripsi: '', quantity: 1, harga_satuan: 0, satuan: '' }]);
  };

  // Handle remove item
  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Get status from stempel
  // Catatan: 'final' adalah stempel cetak saja, bukan status database
  const getStatusFromStempel = () => {
    if (stempel.lunas) return 'lunas';
    if (stempel.segera) return 'segera';
    if (stempel.jatuh_tempo) return 'jatuh_tempo';
    if (stempel.dikirim) return 'dikirim';
    if (stempel.disetujui) return 'disetujui';
    return 'dibuat';
  };

  // 5 checkbox status (di luar 'final', yang independen) sebenarnya
  // merepresentasikan satu kolom status — kalau dibiarkan independen,
  // mencentang lebih dari satu diam-diam "menang" lewat prioritas
  // tersembunyi di getStatusFromStempel(). Paksa saling eksklusif di sini
  // supaya UI selalu mencerminkan status yang benar-benar akan tersimpan.
  const STATUS_STEMPEL_KEYS = ['lunas', 'segera', 'jatuh_tempo', 'dikirim', 'disetujui'];
  const setStatusStempel = (key, checked) => {
    setStempel((prev) => {
      const next = { ...prev, [key]: checked };
      if (checked) {
        for (const k of STATUS_STEMPEL_KEYS) {
          if (k !== key) next[k] = false;
        }
      }
      return next;
    });
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_id) {
      error('Silakan pilih pelanggan terlebih dahulu.');
      return;
    }

    if (items.some(item => !item.deskripsi || !item.deskripsi.trim())) {
      error('Semua item harus memiliki deskripsi.');
      return;
    }

    if (!formData.tanggal_invoice || !formData.tanggal_jatuh_tempo) {
      error('Tanggal invoice dan jatuh tempo harus diisi.');
      return;
    }
    if (formData.tanggal_jatuh_tempo < formData.tanggal_invoice) {
      error('Tanggal jatuh tempo tidak boleh sebelum tanggal invoice.');
      return;
    }
    if (total < 0) {
      error('Total tidak boleh negatif — periksa nilai diskon.');
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
          ppn_persen: pajak.aktif && pajak.mode === 'persen' ? (parseFloat(pajak.persen) || 0) : 0,
          ppn_nilai: pajak.aktif ? ppnNilai : 0,
          diskon_nilai: diskon.aktif ? diskonNilai : 0,
          biaya_pengiriman: biayaPengiriman.aktif ? pengirimanNilai : 0,
          total: total,
          catatan: formData.catatan || null,
          terms_conditions: '',
          payment_method_id: formData.payment_method_id || null,
        })
        .eq('id', realId);

      if (invoiceError) {
        // Cek apakah error karena kolom belum ada di database
        if (invoiceError.message && invoiceError.message.includes('Could not find')) {
          throw new Error('Kolom database belum tersedia. Silakan jalankan migration SQL terbaru (lihat folder supabase/migrations/) di Supabase Dashboard → SQL Editor.');
        }
        throw invoiceError;
      }

      // Delete old items
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', realId);

      if (deleteError) throw deleteError;

      // Insert new items
      const itemRecords = items.map((item, index) => ({
        invoice_id: realId,
        deskripsi: item.deskripsi,
        quantity: parseFloat(item.quantity) || 0,
        satuan: item.satuan || null,
        harga_satuan: parseFloat(item.harga_satuan) || 0,
        diskon_persen: 0,
        total: (parseFloat(item.quantity) || 0) * (parseFloat(item.harga_satuan) || 0),
        urutan: index,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemRecords);

      if (itemsError) throw itemsError;

      safeLocalStorage.removeItem(draftKey);
      router.push(`/e-invoice/${invoiceSlug}`);
    } catch (err) {
      console.error('Error updating invoice:', err);
      error('Gagal mengupdate invoice: ' + (err.message || 'Terjadi kesalahan'));
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
          <Link href={`/e-invoice/${invoiceSlug}`} className="btn btn-ghost">
            Batal
          </Link>
        </div>
      </div>

      {/* Draft Banner */}
      {draftFound && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 500 }}>
            Perubahan yang belum tersimpan ditemukan untuk invoice ini.
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={restoreDraft}
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                border: '1px solid #f59e0b',
                padding: '0.5rem 0.75rem',
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Lanjutkan
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={dismissDraft}
              style={{
                padding: '0.5rem 0.75rem',
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Abaikan
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          
          {/* Invoice Header Card */}
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem', alignItems: 'start' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Tanggal Invoice*</span>
                    <input
                      type="date"
                      value={formData.tanggal_invoice}
                      onChange={(e) => setFormData({ ...formData, tanggal_invoice: e.target.value })}
                      style={{ width: '150px', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '0.5rem' }}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Jatuh Tempo*</span>
                    <input
                      type="date"
                      value={formData.tanggal_jatuh_tempo}
                      onChange={(e) => setFormData({ ...formData, tanggal_jatuh_tempo: e.target.value })}
                      style={{ width: '150px', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '0.5rem' }}
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
                    style={{ width: '100%', maxWidth: '400px', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '0.5rem', marginTop: '0.25rem' }}
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
            <div className="card-header" style={{ backgroundColor: 'var(--text-3)', color: 'white' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Item Invoice</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrap">
                <div className="table-scroll">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--surface-3)' }}>
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
                </div>
              </div>
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                {/* Left - Notes */}
                <div>
                  <label>Catatan</label>
                  <textarea
                    value={formData.catatan}
                    onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                    placeholder="Anda bisa menulis catatan tambahan untuk pelanggan Anda di sini."
                    rows={4}

                  />
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Metode Pembayaran (opsional)</label>
                    <select
                      value={formData.payment_method_id || ''}
                      onChange={(e) => handlePaymentMethodChange(e.target.value)}
                      disabled={!paymentMethodsLoaded}
                      style={{ width: '100%', maxWidth: '400px', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '0.5rem', marginTop: '0.25rem' }}
                    >
                      <option value="">
                        {paymentMethodsLoaded ? '-- Pilih metode (opsional) --' : 'Memuat metode pembayaran...'}
                      </option>
                      {selectablePaymentMethods.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.type === 'qr' ? `[QR] ${m.label}` : `[VA] ${m.label}`}
                        </option>
                      ))}
                    </select>
                    {selectedPaymentMethod && (
                      <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--surface-2)', borderRadius: '8px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {selectedPaymentMethod.type === 'qr' ? (
                          <>
                            <img src={selectedPaymentMethod.image_url} alt={selectedPaymentMethod.label} style={{ width: 48, height: 48, objectFit: 'contain', background: 'white', borderRadius: 4 }} />
                            <span>{selectedPaymentMethod.label}</span>
                          </>
                        ) : (
                          <span>{selectedPaymentMethod.bank_name} — {selectedPaymentMethod.va_number}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right - Summary */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.875rem' }}>Sub Total</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatRupiah(subtotal)}</span>
                  </div>
                  
                  {/* Pajak */}
                  <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
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
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-2)' }}>
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
                                border: '1px solid var(--border-strong)',
                                borderRadius: '4px',
                                padding: '0.5rem',
                                fontFamily: 'var(--font-mono)'
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
                              border: '1px solid var(--border-strong)',
                              borderRadius: '4px',
                              padding: '0.5rem',
                              fontFamily: 'var(--font-mono)'
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Diskon */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
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
                        border: '1px solid var(--border-strong)',
                        borderRadius: '4px',
                        padding: '0.5rem',
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: diskon.aktif ? 'var(--surface)' : 'var(--surface-2)'
                      }}
                    />
                  </div>
                  
                  {/* Biaya Pengiriman */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
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
                        border: '1px solid var(--border-strong)',
                        borderRadius: '4px',
                        padding: '0.5rem',
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: biayaPengiriman.aktif ? 'var(--surface)' : 'var(--surface-2)'
                      }}
                    />
                  </div>
                  
                  {/* Total */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '1rem 0',
                    backgroundColor: 'var(--border)',
                    marginTop: '0.5rem',
                    paddingLeft: '1rem',
                    paddingRight: '1rem',
                    borderRadius: '4px'
                  }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700 }}>TOTAL</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
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
                  onChange={(checked) => setStatusStempel('lunas', checked)}
                  label="Lunas"
                />
                <Checkbox
                  checked={stempel.segera}
                  onChange={(checked) => setStatusStempel('segera', checked)}
                  label="Segera"
                />
                <Checkbox
                  checked={stempel.jatuh_tempo}
                  onChange={(checked) => setStatusStempel('jatuh_tempo', checked)}
                  label="Jatuh Tempo"
                />
                <Checkbox
                  checked={stempel.final}
                  onChange={(checked) => setStempel({ ...stempel, final: checked })}
                  label="Final"
                />
                <Checkbox
                  checked={stempel.dikirim}
                  onChange={(checked) => setStatusStempel('dikirim', checked)}
                  label="Dikirim"
                />
                <Checkbox
                  checked={stempel.disetujui}
                  onChange={(checked) => setStatusStempel('disetujui', checked)}
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
            <Link href={`/e-invoice/${invoiceSlug}`} className="btn btn-ghost">
              Batal
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
