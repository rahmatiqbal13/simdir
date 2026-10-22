'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/format';
import { printWithFilename } from '@/lib/utils/print';

export default function PrintMemoPage() {
  const params = useParams();
  const memoId = params?.id;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState({ brand_name: 'Direktorat Unesa Science Center', logo_url: null });

  useEffect(() => {
    fetch('/api/app-settings')
      .then((res) => res.json())
      .then((data) => setBranding((b) => ({ ...b, ...data })))
      .catch(() => {});
  }, []);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/memo/${memoId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItem(data);
    } catch (err) {
      console.error('Error fetching memo:', err);
    } finally {
      setLoading(false);
    }
  }, [memoId]);

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
        <p>Memo tidak ditemukan</p>
        <Link href="/memo" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Daftar Memo</Link>
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
          <Link href={`/memo/${memoId}`} className="btn btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Kembali
          </Link>
          <h1 style={{ margin: 0, fontSize: '1.125rem' }}>Preview Memo</h1>
        </div>
        <button className="btn btn-primary" onClick={() => printWithFilename(`Memo ${item?.nomor ?? ''}`)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Cetak / Simpan PDF
        </button>
      </div>

      {/* Memo Content */}
      <div className="invoice-print-scroll no-print-scroll" style={{ overflowX: 'auto' }}>
        <div className="invoice-print-container" style={{
          maxWidth: '210mm', minHeight: '297mm', margin: '0 auto', padding: '20mm',
          background: 'white', boxSizing: 'border-box', position: 'relative', color: '#0f172a',
          fontSize: '0.9375rem', lineHeight: 1.6,
        }}>
          {/* Kop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '3px double #0f172a', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
            {branding.logo_url && (
              <img src={branding.logo_url} alt="Logo" style={{ height: 64, width: 'auto', maxWidth: 90, objectFit: 'contain', flexShrink: 0 }} />
            )}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '0.02em' }}>{branding.brand_name}</div>
              <div style={{ fontSize: '0.8125rem', color: '#475569' }}>Jalan Ketintang, Surabaya</div>
            </div>
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '0.15em', textDecoration: 'underline' }}>NOTA DINAS</div>
            <div style={{ fontSize: '0.875rem', marginTop: 2 }}>Nomor: {item.nomor}</div>
          </div>

          {/* Meta block */}
          <table style={{ borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <tbody>
              {[
                ['Yth.', item.kepada],
                ['Dari', item.dibuat_oleh],
                ['Hal', item.perihal],
                ['Tanggal', formatDate(item.tanggal)],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ verticalAlign: 'top', padding: '2px 12px 2px 0', fontWeight: 600, whiteSpace: 'nowrap' }}>{k}</td>
                  <td style={{ verticalAlign: 'top', padding: '2px 0' }}>: {v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '1.25rem' }} />

          {/* Body */}
          <div style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{item.isi}</div>
          <p style={{ marginBottom: '2rem' }}>
            Demikian disampaikan, atas perhatian dan arahan Bapak/Ibu diucapkan terima kasih.
          </p>

          {/* Disposisi box */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Catatan / Disposisi Pimpinan:</div>
            <div style={{ border: '1px solid #0f172a', height: 120, borderRadius: 4 }} />
          </div>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', breakInside: 'avoid' }}>
            {[
              ['Dibuat oleh,', 'Pembuat Memo', item.dibuat_oleh],
              ['Mengetahui,', 'Sekretaris', item.sekretaris],
              ['Menyetujui,', 'Pimpinan', item.kepada],
            ].map(([caption, role, name]) => (
              <div key={role} style={{ textAlign: 'center' }}>
                <div>{caption}</div>
                <div style={{ fontSize: '0.8125rem', color: '#475569' }}>{role}</div>
                <div style={{ height: 72 }} />
                <div style={{ fontWeight: 700 }}>( {name || '.........................'} )</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
            Dokumen ini digenerate secara elektronik melalui sistem SIMDIR
          </div>
        </div>
      </div>

      {/* Print Styles — copied from app/(dashboard)/e-kwitansi/[id]/print/page.jsx */}
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
