'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

// ============ KONSTANTA ============
const STATUS_CONFIG = {
  dibuat: { 
    label: 'Dibuat', 
    color: '#64748b', 
    bgColor: '#f1f5f9',
    stamp: null 
  },
  dikirim: { 
    label: 'Dikirim', 
    color: '#3b82f6', 
    bgColor: '#dbeafe',
    stamp: 'dikirim' 
  },
  disetujui: { 
    label: 'Disetujui', 
    color: '#8b5cf6', 
    bgColor: '#ede9fe',
    stamp: 'disetujui' 
  },
  segera: { 
    label: 'Segera', 
    color: '#f59e0b', 
    bgColor: '#fef3c7',
    stamp: 'segera' 
  },
  jatuh_tempo: { 
    label: 'Jatuh Tempo', 
    color: '#dc2626', 
    bgColor: '#fee2e2',
    stamp: 'jatuh_tempo' 
  },
  lunas: { 
    label: 'Lunas', 
    color: '#059669', 
    bgColor: '#d1fae5',
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

const terbilang = (angka) => {
  const bilangan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  
  if (angka < 12) return bilangan[angka];
  if (angka < 20) return bilangan[angka - 10] + ' Belas';
  if (angka < 100) return bilangan[Math.floor(angka / 10)] + ' Puluh ' + bilangan[angka % 10];
  if (angka < 200) return 'Seratus ' + terbilang(angka - 100);
  if (angka < 1000) return bilangan[Math.floor(angka / 100)] + ' Ratus ' + terbilang(angka % 100);
  if (angka < 2000) return 'Seribu ' + terbilang(angka - 1000);
  if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + ' Ribu ' + terbilang(angka % 1000);
  if (angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + ' Juta ' + terbilang(angka % 1000000);
  if (angka < 1000000000000) return terbilang(Math.floor(angka / 1000000000)) + ' Miliar ' + terbilang(angka % 1000000000);
  return 'Angka terlalu besar';
};

// ============ KOMPONEN STAMP/STAMPEL ============
function InvoiceStamp({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.dibuat;
  
  if (!config.stamp) return null;
  
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
      width: 140,
      height: 140,
      borderRadius: '50%',
      border: `4px double ${config.color}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: config.color,
      fontWeight: 900,
      fontSize: 18,
      textAlign: 'center',
      lineHeight: 1.2,
      transform: 'rotate(-20deg)',
      position: 'absolute',
      right: 60,
      top: 200,
      whiteSpace: 'pre-line',
      boxShadow: `0 0 0 4px white, 0 0 0 6px ${config.color}`,
      backgroundColor: 'rgba(255,255,255,0.9)',
      zIndex: 10,
    }}>
      {label}
    </div>
  );
}

// ============ HALAMAN UTAMA ============
export default function PrintInvoicePage() {
  const params = useParams();
  const invoiceId = params?.id;
  
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Fetch invoice data
  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) return;
    
    setLoading(true);
    try {
      // Fetch invoice with customer info
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoice_summary')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);
      
      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('urutan', { ascending: true });
      
      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (err) {
      console.error('Error fetching invoice:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Invoice tidak ditemukan</p>
        <Link href="/e-invoice" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Kembali ke Daftar Invoice
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Print Controls */}
      <div className="no-print" style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        padding: '1rem', 
        background: 'white',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href={`/e-invoice/${invoiceId}`} className="btn btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Kembali
          </Link>
          <h1 style={{ margin: 0, fontSize: '1.125rem' }}>Preview Invoice</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="invoice-print-container" style={{ 
        maxWidth: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        padding: '20mm',
        paddingTop: '100px',
        background: 'white',
        boxSizing: 'border-box',
        position: 'relative',
      }}>
        {/* Stamp */}
        <InvoiceStamp status={invoice.status} />

        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '2rem',
          borderBottom: '3px solid #1e3a8a',
          paddingBottom: '1.5rem',
        }}>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e3a8a' }}>
              INVOICE
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
              Unesa Science Center (USC)
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'monospace' }}>
              {invoice.nomor_invoice}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
              Tanggal: {formatDate(invoice.tanggal_invoice)}
            </div>
          </div>
        </div>

        {/* Company & Customer Info */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          marginBottom: '2rem',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem' }}>
              Dari:
            </div>
            <div style={{ fontWeight: 600 }}>Unesa Science Center</div>
            <div style={{ fontSize: '0.875rem', color: '#475569', marginTop: '0.25rem' }}>
              Universitas Negeri Surabaya
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
              Jalan Ketintang, Surabaya
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Telp: (031) 1234-5678
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem' }}>
              Kepada:
            </div>
            <div style={{ fontWeight: 600 }}>{invoice.nama_pelanggan}</div>
            <div style={{ fontSize: '0.875rem', color: '#475569', marginTop: '0.25rem' }}>
              {invoice.kode_pelanggan}
            </div>
            {invoice.customer_alamat && (
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                {invoice.customer_alamat}
              </div>
            )}
            {invoice.customer_telepon && (
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Telp: {invoice.customer_telepon}
              </div>
            )}
            {invoice.customer_email && (
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Email: {invoice.customer_email}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          marginBottom: '2rem',
          fontSize: '0.875rem',
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #cbd5e1', width: '50px' }}>No</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>Deskripsi</th>
              <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #cbd5e1', width: '80px' }}>Qty</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #cbd5e1', width: '120px' }}>Harga</th>
              <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #cbd5e1', width: '80px' }}>Disc</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #cbd5e1', width: '140px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  {index + 1}
                </td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                  {item.deskripsi}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  {item.quantity} {item.satuan}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontFamily: 'monospace' }}>
                  {formatRupiah(item.harga_satuan)}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  {item.diskon_persen > 0 ? `${item.diskon_persen}%` : '-'}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontFamily: 'monospace', fontWeight: 500 }}>
                  {formatRupiah(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          marginBottom: '2rem',
        }}>
          <div style={{ width: '350px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '0.5rem 0',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <span style={{ color: '#64748b' }}>Subtotal</span>
              <span style={{ fontFamily: 'monospace' }}>{formatRupiah(invoice.subtotal)}</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '0.5rem 0',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <span style={{ color: '#64748b' }}>PPN ({invoice.ppn_persen}%)</span>
              <span style={{ fontFamily: 'monospace' }}>{formatRupiah(invoice.ppn_nilai)}</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '1rem 0',
              borderTop: '2px solid #1e3a8a',
              marginTop: '0.5rem',
            }}>
              <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>TOTAL</span>
              <span style={{ fontWeight: 700, fontSize: '1.25rem', color: '#1e3a8a', fontFamily: 'monospace' }}>
                {formatRupiah(invoice.total)}
              </span>
            </div>
            <div style={{ 
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontStyle: 'italic',
              color: '#475569',
            }}>
              Terbilang: {terbilang(Math.floor(invoice.total))} Rupiah
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          marginBottom: '2rem',
        }}>
          {invoice.catatan && (
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem' }}>
                Catatan:
              </div>
              <div style={{ fontSize: '0.875rem', color: '#475569', whiteSpace: 'pre-wrap' }}>
                {invoice.catatan}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem' }}>
              Terms & Conditions:
            </div>
            <div style={{ fontSize: '0.875rem', color: '#475569' }}>
              {invoice.terms_conditions || 'Pembayaran harus dilakukan sebelum jatuh tempo.'}
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#dc2626' }}>
              Jatuh Tempo: {formatDate(invoice.tanggal_jatuh_tempo)}
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '3rem',
          paddingTop: '2rem',
        }}>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ height: '80px' }}></div>
            <div style={{ borderTop: '1px solid #334155', paddingTop: '0.5rem' }}>
              <div style={{ fontWeight: 600 }}>Dibuat Oleh</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ height: '80px' }}></div>
            <div style={{ borderTop: '1px solid #334155', paddingTop: '0.5rem' }}>
              <div style={{ fontWeight: 600 }}>Mengetahui</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: '3rem',
          paddingTop: '1rem',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#94a3b8',
        }}>
          Dokumen ini digenerate secara elektronik melalui sistem SIMDIR E-Invoice
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 15mm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          
          /* Hide UI elements */
          .no-print,
          nav,
          .sidebar,
          .mobile-bottom-nav,
          .bottom-nav,
          [class*="bottom-nav"],
          [class*="mobile-nav"],
          [class*="mobile-header"],
          header[class*="mobile"],
          .app-shell > nav,
          .app-shell > .sidebar,
          footer:not(.invoice-footer),
          footer[class*="bottom"],
          footer[class*="nav"],
          .topbar,
          header.topbar,
          .drawer-overlay,
          .logout-btn,
          .sidebar-footer,
          .sidebar-brand,
          .sidebar-section-label,
          .sidebar-nav,
          .user-avatar,
          .user-meta,
          .topbar-actions,
          .topbar-search,
          .topbar-title,
          .topbar-user,
          .command-palette,
          .modal-backdrop,
          .spinner,
          [role="banner"]:not(.invoice-banner) {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
          
          /* Main content adjustments */
          .invoice-print-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            position: static !important;
          }
          
          /* Ensure content flows properly */
          .app-shell,
          .main-area,
          main,
          #main-content,
          .content {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
            display: block !important;
          }
          
          /* Table handling */
          table {
            page-break-inside: auto;
            width: 100% !important;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tbody {
            display: table-row-group;
          }
          
          /* Prevent overflow and remove scrollbars */
          * {
            overflow: visible !important;
          }
          
          html, body {
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
          }
          
          /* Force single page or continuous flow */
          .invoice-print-container {
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
          }
          
          /* Ensure full width without margins causing overflow */
          body > div,
          body > div > div {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
