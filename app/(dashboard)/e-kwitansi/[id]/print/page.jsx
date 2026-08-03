'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatRupiah, formatDate, terbilang } from '@/lib/utils/format';

export default function PrintKwitansiPage() {
  const params = useParams();
  const kwitansiId = params?.id;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    const savedLogo = localStorage.getItem('simdir_invoice_logo');
    if (savedLogo) setLogo(savedLogo);
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
        <button className="btn btn-primary" onClick={() => window.print()}>
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
          background: 'white', boxSizing: 'border-box', position: 'relative',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            marginBottom: '2rem', borderBottom: '3px solid #1e3a8a', paddingBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {logo && (
                <img src={logo} alt="Logo Lembaga" style={{ maxHeight: '60px', maxWidth: '120px', objectFit: 'contain' }} />
              )}
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e3a8a' }}>KWITANSI</div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Unesa Science Center (USC)
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'monospace' }}>
                {item.nomor_kwitansi}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                Tanggal: {formatDate(item.tanggal)}
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ fontSize: '0.9375rem', color: '#1e293b', lineHeight: 2.2 }}>
            <Row label="Telah terima dari" value={item.terima_dari} />
            <Row label="Uang sejumlah">
              <span style={{ fontWeight: 700, fontSize: '1.125rem', fontFamily: 'monospace', color: '#1e3a8a' }}>
                {formatRupiah(item.jumlah)}
              </span>
            </Row>
            <div style={{
              margin: '0.5rem 0 1rem 148px', padding: '0.75rem 1rem', background: '#f8fafc',
              borderRadius: 8, fontStyle: 'italic', fontSize: '0.875rem', color: '#475569',
            }}>
              ( {terbilang(Math.floor(item.jumlah))} Rupiah )
            </div>
            <Row label="Untuk pembayaran" value={item.untuk_pembayaran} />

            {item.invoice && (
              <Row label="Referensi invoice" value={item.invoice.nomor_invoice} />
            )}
          </div>

          {/* Signature */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3.5rem' }}>
            <div style={{ textAlign: 'center', width: '260px' }}>
              <div style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.25rem' }}>
                Surabaya, {formatDate(item.tanggal)}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '4.5rem' }}>
                Penerima,
              </div>
              <div style={{ borderTop: '1px solid #334155', paddingTop: '0.5rem', fontWeight: 600 }}>
                {item.penerima || ' '}
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

function Row({ label, value, children }) {
  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <div style={{ width: '140px', flexShrink: 0, color: '#64748b' }}>{label}</div>
      <div style={{ color: '#334155' }}>:</div>
      <div style={{ flex: 1, fontWeight: 600 }}>{value}{children}</div>
    </div>
  );
}
