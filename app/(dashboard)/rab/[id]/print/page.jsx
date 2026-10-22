'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatRupiah, formatDate } from '@/lib/utils/format';
import { printWithFilename } from '@/lib/utils/print';

export default function PrintRabPage() {
  const params = useParams();
  const rabId = params?.id;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logo, setLogo] = useState(null);
  const [brandName, setBrandName] = useState('Direktorat Unesa Science Center');
  const [showPenyusun, setShowPenyusun] = useState(true);

  useEffect(() => {
    fetch('/api/app-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.logo_url) setLogo(data.logo_url);
        if (data.brand_name) setBrandName(data.brand_name);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('simdir_rab_show_penyusun');
    if (stored !== null) setShowPenyusun(stored === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('simdir_rab_show_penyusun', showPenyusun);
  }, [showPenyusun]);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rab/${rabId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItem(data);
    } catch (err) {
      console.error('Error fetching RAB:', err);
    } finally {
      setLoading(false);
    }
  }, [rabId]);

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
        <p>RAB tidak ditemukan</p>
        <Link href="/rab" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Daftar RAB</Link>
      </div>
    );
  }

  const categories = Object.values(
    (item.rab_items || []).reduce((acc, it) => {
      if (!acc[it.kategori]) acc[it.kategori] = { kategori: it.kategori, items: [] };
      acc[it.kategori].items.push(it);
      return acc;
    }, {})
  );
  const grandTotal = (item.rab_items || []).reduce((sum, it) => sum + Number(it.total || 0), 0);

  return (
    <div>
      {/* Print Controls */}
      <div className="no-print" style={{
        position: 'sticky', top: 0, left: 0, right: 0, padding: '1rem', background: 'white',
        borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href={`/rab/${rabId}`} className="btn btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Kembali
          </Link>
          <h1 style={{ margin: 0, fontSize: '1.125rem' }}>Preview RAB</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-2)' }}>
            <input
              type="checkbox"
              checked={showPenyusun}
              onChange={(e) => setShowPenyusun(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            Tampilkan Nama Penyusun
          </label>
          <button className="btn btn-primary" onClick={() => printWithFilename(`RAB ${item?.nomor_rab ?? ''}`)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* RAB Content */}
      <div className="invoice-print-scroll" style={{ overflowX: 'auto' }}>
        <div className="invoice-print-container" style={{
          maxWidth: '210mm', minHeight: '297mm', margin: '0 auto', padding: '20mm',
          background: 'white', boxSizing: 'border-box', position: 'relative', color: '#0f172a',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {logo && <img src={logo} alt={brandName} style={{ height: 56, width: 'auto', maxWidth: 140, objectFit: 'contain' }} />}
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, maxWidth: 260 }}>{brandName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>RENCANA ANGGARAN BIAYA</h1>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginTop: 6 }}>NO: {item.nomor_rab}</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>{formatDate(item.tanggal)}</div>
            </div>
          </div>

          {/* Body */}
          <FieldRow label="Nama Kegiatan"><div style={{ fontWeight: 700 }}>{item.nama_kegiatan}</div></FieldRow>
          <FieldRow label="Tahun Anggaran"><div>{item.tahun_anggaran}</div></FieldRow>

          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {categories.map((cat) => {
              const subtotal = cat.items.reduce((sum, it) => sum + Number(it.total || 0), 0);
              return (
                <div key={cat.kategori}>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem', marginBottom: 6 }}>{cat.kategori}</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #0f172a' }}>
                        <th style={{ padding: '4px 6px', textAlign: 'left' }}>Uraian</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right' }}>Volume</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left' }}>Satuan</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right' }}>Harga Satuan</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.items.map((it) => (
                        <tr key={it.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '4px 6px' }}>{it.uraian}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right' }}>{it.volume}</td>
                          <td style={{ padding: '4px 6px' }}>{it.satuan || '-'}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(it.harga_satuan)}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.8125rem', marginTop: 4 }}>
                    Subtotal {cat.kategori}: {formatRupiah(subtotal)}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '1.0625rem', fontWeight: 900, borderTop: '2px solid #0f172a', marginTop: 16, paddingTop: 10 }}>
            TOTAL: {formatRupiah(grandTotal)}
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '3rem', marginTop: '3.5rem' }}>
            {showPenyusun && item.nama_penyusun && (
              <div style={{ textAlign: 'center', width: '220px' }}>
                <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '4.5rem' }}>Penyusun,</div>
                <div style={{ fontWeight: 700 }}>({item.nama_penyusun})</div>
              </div>
            )}
            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '4.5rem' }}>Penanggung Jawab,</div>
              <div style={{ fontWeight: 700 }}>({item.nama_penanggung_jawab})</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
            Dokumen ini digenerate secara elektronik melalui sistem SIMDIR RAB
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
    <div style={{ display: 'flex', gap: '1.5rem', paddingBottom: '0.625rem', marginBottom: '0.625rem', borderBottom: '1px solid #e2e8f0' }}>
      <div style={{ width: '170px', flexShrink: 0, fontWeight: 700, fontSize: '0.875rem' }}>{label}</div>
      <div style={{ flex: 1, fontSize: '0.875rem', lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}
