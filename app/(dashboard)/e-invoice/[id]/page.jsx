'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import ConfirmModal from '@/app/components/ConfirmModal';
import { useToast } from '@/app/components/Toast';
import { formatRupiah, formatDate, slugToNomor } from '@/lib/utils/format';
import { INVOICE_STATUS } from '@/lib/invoiceStatus';

const STAMP_LABELS = {
  lunas: 'LUNAS',
  segera: 'SEGERA',
  jatuh_tempo: 'JATUH TEMPO',
  dikirim: 'DIKIRIM',
  disetujui: 'DISETUJUI',
};

// ============ KOMPONEN STAMP ============
function InvoiceStamp({ status }) {
  const stamp = INVOICE_STATUS[status] && STAMP_LABELS[status]
    ? { color: INVOICE_STATUS[status].hex, label: STAMP_LABELS[status] }
    : null;
  if (!stamp) return null;
  
  return (
    <div style={{
      width: 120,
      height: 120,
      borderRadius: '50%',
      border: `4px double ${stamp.color}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: stamp.color,
      fontWeight: 900,
      fontSize: 16,
      textAlign: 'center',
      transform: 'rotate(-15deg)',
      boxShadow: `0 0 0 3px white, 0 0 0 5px ${stamp.color}`,
      backgroundColor: 'rgba(255,255,255,0.95)',
    }}>
      {stamp.label}
    </div>
  );
}

// ============ HALAMAN UTAMA ============
export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  // params.id sekarang berisi slug nomor invoice (mis. "INV-2026-07-0005"),
  // bukan UUID — lihat lib/utils/format.js nomorToSlug/slugToNomor. UUID
  // asli (dibutuhkan untuk update/delete/FK) diambil dari invoice.id
  // setelah data ter-fetch, bukan dari param ini secara langsung.
  const invoiceSlug = params?.id;
  const { error: toastError } = useToast();

  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);

  // Fetch invoice data
  const fetchInvoice = useCallback(async () => {
    if (!invoiceSlug) return;

    setLoading(true);
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoice_summary')
        .select('*')
        .eq('nomor_invoice', slugToNomor(invoiceSlug))
        .single();

      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceData.id)
        .order('urutan', { ascending: true });
      
      if (itemsError) throw itemsError;
      setItems(itemsData || []);
      
      // Get user role (Supabase auth atau localStorage fallback)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(profile?.role || '');
      } else {
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
      }
    } catch (err) {
      console.error('Error fetching invoice:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, invoiceSlug]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // Handle status update
  const updateStatus = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoice.id);

      if (error) throw error;
      setInvoice({ ...invoice, status: newStatus });
    } catch (err) {
      console.error('Error updating status:', err);
      toastError('Gagal mengupdate status');
    }
  };

  // Handle delete
  const actuallyDelete = async () => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id);

      if (error) throw error;
      router.push('/e-invoice');
    } catch (err) {
      console.error('Error deleting invoice:', err);
      toastError('Gagal menghapus invoice');
    }
  };

  const isSuperAdmin = userRole === 'super_admin';

  // Cek apakah ada item dengan diskon
  const hasDiskon = items.some(item => (item.diskon_persen || 0) > 0);

  const statusColors = Object.fromEntries(
    Object.entries(INVOICE_STATUS).map(([key, v]) => [key, v.hex])
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="empty-state">
        <h3>Invoice Tidak Ditemukan</h3>
        <Link href="/e-invoice" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Kembali ke Daftar Invoice
        </Link>
      </div>
    );
  }

  return (
    <>
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Detail Invoice</h1>
          <p className="page-subtitle">{invoice.nomor_invoice}</p>
        </div>
        <div className="page-actions">
          <Link href="/e-invoice" className="btn btn-ghost">
            Kembali
          </Link>
          <Link href={`/e-invoice/${invoiceSlug}/print`} className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Cetak
          </Link>
          {isSuperAdmin && (
            <>
              <Link href={`/e-kwitansi/create?invoice_id=${invoiceSlug}`} className="btn btn-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <path d="M4 2h16v20l-3-2-2 2-2-2-2 2-2-2-2 2-3-2z"/>
                  <line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/>
                </svg>
                Buat Kwitansi
              </Link>
              <Link href={`/e-invoice/${invoiceSlug}/edit`} className="btn btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </Link>
              <button className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Hapus
              </button>
            </>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Invoice Info */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Informasi Invoice</h3>
            <span style={{
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: statusColors[invoice.status] + '20',
              color: statusColors[invoice.status],
            }}>
              {invoice.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Nomor Invoice</div>
                <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{invoice.nomor_invoice}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Tanggal</div>
                  <div>{formatDate(invoice.tanggal_invoice)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Jatuh Tempo</div>
                  <div style={{ color: invoice.status === 'jatuh_tempo' ? '#dc2626' : 'inherit' }}>
                    {formatDate(invoice.tanggal_jatuh_tempo)}
                  </div>
                </div>
              </div>
              {invoice.created_by_name && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Dibuat oleh</div>
                  <div>{invoice.created_by_name}</div>
                </div>
              )}
            </div>

            {/* Stamp */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
              <InvoiceStamp status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Informasi Pelanggan</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Nama</div>
                <div style={{ fontWeight: 600 }}>{invoice.nama_pelanggan}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Kode</div>
                <div>{invoice.kode_pelanggan}</div>
              </div>
              {invoice.customer_telepon && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Telepon</div>
                  <div>{invoice.customer_telepon}</div>
                </div>
              )}
              {invoice.customer_email && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Email</div>
                  <div>{invoice.customer_email}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Item Invoice</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Deskripsi</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Harga</th>
                    {hasDiskon && (
                      <th style={{ textAlign: 'center' }}>Disc</th>
                    )}
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>{item.deskripsi}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}{item.satuan ? ` ${item.satuan}` : ''}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(item.harga_satuan)}</td>
                      {hasDiskon && (
                        <td style={{ textAlign: 'center' }}>{(item.diskon_persen || 0) > 0 ? `${item.diskon_persen}%` : '-'}</td>
                      )}
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 500 }}>{formatRupiah(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Ringkasan</h3>
          </div>
          <div className="card-body">
            <div style={{ maxWidth: '400px', marginLeft: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span style={{ color: 'var(--text-2)' }}>Subtotal</span>
                <span style={{ fontFamily: 'monospace' }}>{formatRupiah(invoice.subtotal)}</span>
              </div>
              {invoice.ppn_nilai > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                  <span style={{ color: 'var(--text-2)' }}>PPN ({invoice.ppn_persen}%)</span>
                  <span style={{ fontFamily: 'monospace' }}>{formatRupiah(invoice.ppn_nilai)}</span>
                </div>
              )}
              {invoice.diskon_nilai > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                  <span style={{ color: 'var(--text-2)' }}>Diskon</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--danger)' }}>-{formatRupiah(invoice.diskon_nilai)}</span>
                </div>
              )}
              {invoice.biaya_pengiriman > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                  <span style={{ color: 'var(--text-2)' }}>Biaya Pengiriman</span>
                  <span style={{ fontFamily: 'monospace' }}>{formatRupiah(invoice.biaya_pengiriman)}</span>
                </div>
              )}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '1rem 0',
                borderTop: '2px solid var(--primary)',
                marginTop: '0.5rem',
              }}>
                <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>TOTAL</span>
                <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', fontFamily: 'monospace' }}>
                  {formatRupiah(invoice.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Update */}
        {isSuperAdmin && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Update Status</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['dibuat', 'dikirim', 'disetujui', 'segera', 'jatuh_tempo', 'lunas'].map((status) => (
                  <button
                    key={status}
                    className="btn btn-sm"
                    onClick={() => setPendingStatus(status)}
                    disabled={invoice.status === status}
                    style={{
                      backgroundColor: invoice.status === status ? statusColors[status] + '40' : 'var(--surface-2)',
                      color: statusColors[status],
                      border: `1px solid ${statusColors[status]}40`,
                    }}
                  >
                    {status.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    <ConfirmModal
      open={confirmOpen}
      title="Hapus Invoice"
      message={<>Yakin ingin menghapus invoice <strong>{invoice.nomor_invoice}</strong>? Tindakan ini tidak dapat dibatalkan.</>}
      confirmLabel="Ya, Hapus"
      onConfirm={async () => { setConfirmOpen(false); await actuallyDelete(); }}
      onCancel={() => setConfirmOpen(false)}
    />
    <ConfirmModal
      open={!!pendingStatus}
      title="Ubah Status Invoice"
      message={
        invoice.status === 'lunas'
          ? <>Invoice ini sudah <strong>LUNAS</strong>. Yakin ingin mengubah statusnya menjadi <strong>{pendingStatus?.replace('_', ' ').toUpperCase()}</strong>?</>
          : <>Ubah status invoice <strong>{invoice.nomor_invoice}</strong> menjadi <strong>{pendingStatus?.replace('_', ' ').toUpperCase()}</strong>?</>
      }
      confirmLabel="Ya, Ubah"
      onConfirm={async () => { const s = pendingStatus; setPendingStatus(null); await updateStatus(s); }}
      onCancel={() => setPendingStatus(null)}
    />
    </>
  );
}
