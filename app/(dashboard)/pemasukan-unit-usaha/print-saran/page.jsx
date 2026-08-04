'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatRupiah } from '@/lib/utils/format'

function SaranPrintContent() {
  const params = useSearchParams()
  const tahun = Number(params.get('tahun') ?? new Date().getFullYear())
  const pct = Number(params.get('pct') ?? 80)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [appName, setAppName] = useState('SIMDIR')

  useEffect(() => {
    Promise.all([
      fetch(`/api/pemasukan-unit-usaha/dashboard?tahun=${tahun}`).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/app-settings').then((r) => (r.ok ? r.json() : null)),
    ]).then(([d, s]) => {
      setData(d)
      if (s?.brand_name) setAppName(s.brand_name)
      setLoading(false)
    })
  }, [tahun])

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  const totalIncome = data.grandTotal.totalIncome
  const taken = Math.round(totalIncome * pct / 100)
  const remaining = totalIncome - taken
  const remainingPct = parseFloat((100 - pct).toFixed(1))

  return (
    <div>
      <div className="no-print" style={{
        position: 'sticky', top: 0, left: 0, right: 0, padding: '1rem', background: 'white',
        borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/pemasukan-unit-usaha/saran" className="btn btn-ghost">Kembali</Link>
          <h1 style={{ margin: 0, fontSize: '1.125rem' }}>Preview Saran Anggaran</h1>
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>Cetak / Simpan PDF</button>
      </div>

      <div className="invoice-print-container" style={{ maxWidth: '210mm', margin: '0 auto', padding: '15mm', background: 'white', boxSizing: 'border-box', color: '#1e293b' }}>
        <div style={{ borderBottom: '4px solid #1e3a8a', paddingBottom: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a8a' }}>{appName}</div>
            <div style={{ fontSize: '0.9375rem', color: '#64748b', marginTop: 4 }}>Saran Anggaran — Simulasi Pengambilan Dana</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>SARAN ANGGARAN</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
              Dicetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <Info label="Tahun Referensi" value={tahun} />
          <Info label="Persentase Pengambilan" value={`${pct}%`} />
          <Info label="Sisa Persentase" value={`${remainingPct}%`} />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <SectionTitle>RINGKASAN KEUANGAN</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <Kpi label={`Total Pendapatan ${tahun}`} value={formatRupiah(totalIncome)} color="#1e3a8a" bg="#eff6ff" />
            <Kpi label={`Dana Diambil (${pct}%)`} value={formatRupiah(taken)} color="#16a34a" bg="#f0fdf4" />
            <Kpi label={`Sisa Dana (${remainingPct}%)`} value={formatRupiah(remaining)} color="#ca8a04" bg="#fffbeb" />
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <SectionTitle>NARASI ANGGARAN</SectionTitle>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '1.25rem' }}>
            <p style={{ fontSize: '0.9375rem', color: '#1e40af', lineHeight: 1.7, margin: 0, textAlign: 'justify' }}>
              Dengan total pendapatan tahun <strong>{tahun}</strong> sebesar <strong>{formatRupiah(totalIncome)}</strong>, maka kami berencana untuk melakukan
              pengambilan dana sebesar <strong>{pct}%</strong> dengan total <strong>{formatRupiah(taken)}</strong>, dan masih tersisa dana sebesar{' '}
              <strong>{remainingPct}%</strong> dengan total <strong>{formatRupiah(remaining)}</strong> untuk keperluan operasional dan pengembangan universitas.
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#1e40af', lineHeight: 1.6, margin: '1rem 0 0' }}>
              Pengambilan dana sebesar <strong>{pct}%</strong> ini diharapkan dapat mendukung berbagai program strategis yang telah direncanakan, sementara{' '}
              <strong>{remainingPct}%</strong> sisanya dialokasikan sebagai cadangan anggaran untuk memastikan stabilitas keuangan dan kesiapan menghadapi
              kebutuhan darurat atau peluang investasi di masa mendatang.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <SectionTitle>RINCIAN PEROLEHAN PER UNIT</SectionTitle>
          <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
            <thead>
              <tr style={{ background: '#1e3a8a', color: 'white' }}>
                {['No', 'Unit Usaha', 'Total Pemasukan', `Diambil (${pct}%)`, 'Sisa', 'Proporsi'].map((h) => (
                  <th key={h} style={{ border: '1px solid #cbd5e1', padding: '8px 10px', textAlign: h === 'Unit Usaha' ? 'left' : 'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.units.map((u, i) => {
                const unitTaken = Math.round(u.totalIncome * pct / 100)
                const unitRemaining = u.totalIncome - unitTaken
                const portion = totalIncome > 0 ? (u.totalIncome / totalIncome * 100).toFixed(1) : '0'
                return (
                  <tr key={u.unit.id} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', fontWeight: 600 }}>{u.unit.name}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'right' }}>{formatRupiah(u.totalIncome)}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{formatRupiah(unitTaken)}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'right', color: '#ca8a04' }}>{formatRupiah(unitRemaining)}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'right' }}>{portion}%</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                <td colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '8px 10px' }}>TOTAL KESELURUHAN</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 10px', textAlign: 'right' }}>{formatRupiah(totalIncome)}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 10px', textAlign: 'right', color: '#16a34a' }}>{formatRupiah(taken)}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 10px', textAlign: 'right', color: '#ca8a04' }}>{formatRupiah(remaining)}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 10px', textAlign: 'right' }}>100%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 10, padding: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#854d0e', marginBottom: 8 }}>CATATAN PENTING</div>
          <p style={{ fontSize: '0.8125rem', color: '#854d0e', lineHeight: 1.6, margin: 0 }}>
            Simulasi pengambilan dana ini bersifat rekomendasi berdasarkan data pemasukan tahun {tahun}. Keputusan final mengenai besaran pengambilan dana
            harus mempertimbangkan berbagai faktor termasuk kebutuhan operasional unit usaha, proyeksi pendapatan tahun berikutnya, dan kebijakan keuangan
            universitas yang berlaku.
          </p>
        </div>

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '3rem' }}>Disusun oleh,</div>
            <div style={{ fontWeight: 600 }}>(_________________)</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '3rem' }}>Disetujui oleh,</div>
            <div style={{ fontWeight: 600 }}>(_________________)</div>
          </div>
        </div>

        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
          Dokumen ini digenerate secara otomatis oleh sistem {appName} — Pemasukan Unit Usaha
        </div>
      </div>

      <PrintStyles />
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function Kpi({ label, value, color, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '0.875rem' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 800, color }}>{value}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginBottom: '1rem' }}>{children}</div>
}

function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: A4 portrait; margin: 10mm 15mm; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        html, body { background: white !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
        .no-print, .sidebar, .topbar, .mobile-header, .drawer-overlay, .pwa-install-prompt, .spinner {
          display: none !important; visibility: hidden !important;
        }
        .invoice-print-container { padding: 10mm 15mm !important; margin: 0 !important; max-width: 100% !important; width: 100% !important; }
        .app-shell, .main-area, main, #main-content, .content { margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; overflow: visible !important; }
        * { overflow: visible !important; }
      }
    `}</style>
  )
}

export default function SaranPrintPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Memuat...</div>}>
      <SaranPrintContent />
    </Suspense>
  )
}
