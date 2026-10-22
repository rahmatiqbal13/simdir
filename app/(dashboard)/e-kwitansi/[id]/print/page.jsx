'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatRupiah, formatDate, terbilang } from '@/lib/utils/format';
import { printWithFilename } from '@/lib/utils/print';

export default function PrintKwitansiPage() {
  const params = useParams();
  const kwitansiId = params?.id;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    // Logo institusi dipusatkan di Pengaturan > Nama Instansi & Logo
    // (/pengaturan/branding, lihat app/api/app-settings/route.js) — sebelumnya
    // halaman ini membaca dari localStorage 'simdir_invoice_logo' yang tidak
    // pernah diisi oleh UI manapun, jadi logo tidak pernah tampil.
    fetch('/api/app-settings')
      .then((res) => res.json())
      .then((data) => { if (data.logo_url) setLogo(data.logo_url); })
      .catch(() => {});
  }, []);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kwitansi/${kwitansiId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItem(data);
    } catch (err) {
      console.error('Error fetching kwitansi:', err);
    } finally {
      setLoading(false);
    }
  }, [kwitansiId]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Kwitansi tidak ditemukan</p>
        <Link href="/e-kwitansi" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Kembali ke Daftar Kwitansi
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Print Controls */}
      <div className="no-print" style={{
        position: 'sticky', top: 0, left: 0, right: 0, padding: '1rem', background: 'white',
        borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href={`/e-kwitansi/${kwitansiId}`} className="btn btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Kembali
          </Link>
          <h1 style={{ margin: 0, fontSize: '1.125rem' }}>Preview Kwitansi</h1>
        </div>
        <button className="btn btn-primary" onClick={() => printWithFilename(`Kwitansi ${item?.nomor_kwitansi ?? ''}`)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Cetak / Simpan PDF
        </button>
      </div>

      {/* Kwitansi Content */}
      <div className="invoice-print-scroll no-print-scroll" style={{ overflowX: 'auto' }}>
        <div className="invoice-print-container" style={{
          maxWidth: '210mm', minHeight: '148mm', margin: '0 auto', padding: '20mm',
          background: 'white', boxSizing: 'border-box', position: 'relative', color: '#0f172a',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <h1 style={{ fontSize: '4rem', fontWeight: 900, letterSpacing: '-0.03em', margin: 0, lineHeight: 0.95, color: '#0f172a' }}>
              Kuitansi
            </h1>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.75rem', flexShrink: 0 }}>
              <div style={{ textAlign: 'right', paddingTop: '0.375rem', whiteSpace: 'nowrap' }}>
                <div style={{ fontWeight: 800, letterSpacing: '0.06em', fontSize: '0.8125rem' }}>
                  NO: {item.nomor_kwitansi}
                </div>
                <div style={{ fontWeight: 800, letterSpacing: '0.06em', fontSize: '0.8125rem', marginTop: 6 }}>
                  TANGGAL: {formatDate(item.tanggal).toUpperCase()}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                {logo && (
                  <img src={logo} alt="Logo Lembaga" style={{ height: 72, width: 'auto', maxWidth: 160, objectFit: 'contain', marginLeft: 'auto', display: 'block' }} />
                )}
                <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: 8, lineHeight: 1.5 }}>
                  Unesa Science Center<br />
                  Jalan Ketintang, Surabaya
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <FieldRow label="Telah diterima dari">
            <div style={{ fontWeight: 600 }}>{item.terima_dari}</div>
          </FieldRow>

          <FieldRow label="Uang sejumlah">
            <div style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{formatRupiah(item.jumlah)}</div>
            <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: 2 }}>
              ({terbilang(Math.floor(item.jumlah))} Rupiah)
            </div>
          </FieldRow>

          <FieldRow label="Untuk pembayaran">
            <div>{item.untuk_pembayaran}</div>
          </FieldRow>

          {item.invoice && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', padding: '0.875rem 1rem', border: '1px solid #cbd5e1', borderRadius: 8 }}>
              <div style={{ fontWeight: 800, letterSpacing: '0.04em', fontSize: '0.75rem', flexShrink: 0, paddingTop: 1 }}>CATATAN:</div>
              <div style={{ fontSize: '0.875rem', color: '#334155' }}>
                Kuitansi ini merupakan pelunasan Invoice No. {item.invoice.nomor_invoice}.
              </div>
            </div>
          )}

          {/* Signature */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3.5rem' }}>
            <div style={{ textAlign: 'center', width: '240px' }}>
              <div style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '4.5rem' }}>
                Penerima,
              </div>
              <div style={{ fontWeight: 700 }}>
                {item.penerima ? `(${item.penerima})` : '( )'}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>
                Unesa Science Center
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0',
            textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8',
          }}>
            Dokumen ini digenerate secara elektronik melalui sistem SIMDIR E-Kwitansi
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 15mm 0mm 15mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
          .invoice-print-scroll { overflow: visible !important; }
          .no-print, nav, .sidebar, .mobile-bottom-nav, .bottom-nav,
          [class*="bottom-nav"], [class*="mobile-nav"], [class*="mobile-header"],
          header[class*="mobile"], .app-shell > nav, .app-shell > .sidebar,
          footer:not(.invoice-footer), footer[class*="bottom"], footer[class*="nav"],
          .topbar, header.topbar, .drawer-overlay, .logout-btn, .sidebar-footer,
          .sidebar-brand, .sidebar-section-label, .sidebar-nav, .user-avatar, .user-meta,
          .topbar-actions, .topbar-search, .topbar-title, .topbar-user, .command-palette,
          .modal-backdrop, .spinner, .pwa-install-prompt,
          [role="banner"]:not(.invoice-banner) {
            display: none !important; visibility: hidden !important; opacity: 0 !important;
          }
          .invoice-print-container {
            padding: 10mm 15mm 15mm 15mm !important; margin: 0 !important;
            max-width: 100% !important; width: 100% !important; box-shadow: none !important;
            position: relative !important;
          }
          .app-shell, .main-area, main, #main-content, .content {
            margin: 0 !important; padding: 0 !important; width: 100% !important;
            max-width: 100% !important; overflow: visible !important; display: block !important;
          }
          * { overflow: visible !important; }
          html, body { overflow: visible !important; height: auto !important; min-height: auto !important; max-height: none !important; }
          .invoice-print-container { height: auto !important; min-height: auto !important; max-height: none !important; page-break-before: avoid !important; page-break-after: avoid !important; }
          body > div, body > div > div { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', gap: '1.5rem', paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
      <div style={{ width: '170px', flexShrink: 0, fontWeight: 700, fontSize: '0.9375rem' }}>{label}</div>
      <div style={{ flex: 1, fontSize: '0.9375rem', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}
