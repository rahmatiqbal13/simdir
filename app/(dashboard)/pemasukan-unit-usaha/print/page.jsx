'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatRupiah } from '@/lib/utils/format'
import { printWithFilename } from '@/lib/utils/print'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const MONTH_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTH_NAMES_FULL = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function PrintDashboardContent() {
  const params = useSearchParams()
  const tahun = Number(params.get('tahun') ?? new Date().getFullYear())
  const unitUsahaId = params.get('unit_usaha_id') || null

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [appName, setAppName] = useState('SIMDIR')

  useEffect(() => {
    fetch(`/api/pemasukan-unit-usaha/dashboard?tahun=${tahun}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false) })
    fetch('/api/app-settings').then((r) => (r.ok ? r.json() : null)).then((s) => { if (s?.brand_name) setAppName(s.brand_name) })
  }, [tahun])

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  const activeUnits = unitUsahaId ? data.units.filter((u) => u.unit.id === unitUsahaId) : data.units
  const selectedUnitData = unitUsahaId ? data.units.find((u) => u.unit.id === unitUsahaId) : null
  const unitName = selectedUnitData?.unit.name ?? 'Semua Unit Usaha'

  const barData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const income = activeUnits.reduce((s, u) => s + (u.months.find((m) => m.month === month)?.income ?? 0), 0)
    const target = activeUnits.reduce((s, u) => s + (u.months.find((m) => m.month === month)?.effectiveTarget ?? 0), 0)
    return { name: MONTH_SHORT[month], Pemasukan: income, Target: target }
  })

  const displayGrand = selectedUnitData
    ? { annualTarget: selectedUnitData.annualTarget, totalIncome: selectedUnitData.totalIncome, achievementPct: selectedUnitData.achievementPct }
    : data.grandTotal

  const totalUnits = activeUnits.length
  const achievedUnits = activeUnits.filter((u) => u.achievementPct >= 100).length
  const notAchievedUnits = activeUnits.filter((u) => u.achievementPct > 0 && u.achievementPct < 100).length
  const noTargetUnits = activeUnits.filter((u) => u.annualTarget === 0).length

  return (
    <div>
      <div className="no-print" style={{
        position: 'sticky', top: 0, left: 0, right: 0, padding: '1rem', background: 'white',
        borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/pemasukan-unit-usaha" className="btn btn-ghost">Kembali</Link>
          <h1 style={{ margin: 0, fontSize: '1.125rem' }}>Preview Laporan Pemasukan Unit Usaha</h1>
        </div>
        <button className="btn btn-primary" onClick={() => printWithFilename(`Rekap Pemasukan Unit Usaha ${tahun}${unitUsahaId ? ` - ${unitName}` : ''}`)}>Cetak / Simpan PDF</button>
      </div>

      <div className="invoice-print-container" style={{ maxWidth: '210mm', margin: '0 auto', padding: '15mm', background: 'white', boxSizing: 'border-box', color: '#1e293b' }}>
        <div style={{ borderBottom: '4px solid #1e3a8a', paddingBottom: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a8a' }}>{appName}</div>
            <div style={{ fontSize: '0.9375rem', color: '#64748b', marginTop: 4 }}>Laporan Pemasukan Unit Usaha</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>LAPORAN REKAPITULASI</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Tahun Anggaran {tahun}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
              Dicetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <Info label="Periode" value={`Tahun ${tahun}`} />
          <Info label="Unit" value={unitName} />
          <Info label="Jumlah Unit" value={`${totalUnits} unit`} />
          <Info label="Status" value={`${achievedUnits} tercapai, ${notAchievedUnits} belum, ${noTargetUnits} tanpa target`} />
        </div>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e3a8a', marginBottom: 8 }}>NARASI LAPORAN</div>
          <p style={{ fontSize: '0.875rem', color: '#1e40af', lineHeight: 1.6, margin: 0 }}>
            Pada tahun anggaran <strong>{tahun}</strong>, {appName} mencatat total pendapatan dari <strong>{totalUnits} unit usaha</strong> sebesar{' '}
            <strong>{formatRupiah(displayGrand.totalIncome)}</strong>. Dari total target yang ditetapkan sebesar <strong>{formatRupiah(displayGrand.annualTarget)}</strong>,
            capaian keseluruhan mencapai <strong>{displayGrand.achievementPct}%</strong>. Terdapat <strong>{achievedUnits} unit usaha</strong> yang telah mencapai target,{' '}
            <strong>{notAchievedUnits} unit usaha</strong> yang masih dalam proses pencapaian, dan <strong>{noTargetUnits} unit usaha</strong> yang belum menetapkan target.
            {displayGrand.totalIncome >= displayGrand.annualTarget
              ? ` Total pendapatan mengalami surplus sebesar ${formatRupiah(displayGrand.totalIncome - displayGrand.annualTarget)}.`
              : ` Masih terdapat defisit sebesar ${formatRupiah(displayGrand.annualTarget - displayGrand.totalIncome)} yang perlu dikejar.`}
          </p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <SectionTitle>GRAFIK REALISASI VS TARGET</SectionTitle>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={4} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}Jt`} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatRupiah(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Pemasukan" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Target" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <SectionTitle>RINGKASAN PER UNIT USAHA</SectionTitle>
          <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
            <thead>
              <tr style={{ background: '#1e3a8a', color: 'white' }}>
                {['No', 'Unit Usaha', 'Target', 'Realisasi', 'Capaian', 'Status'].map((h) => (
                  <th key={h} style={{ border: '1px solid #cbd5e1', padding: '8px 10px', textAlign: h === 'Unit Usaha' ? 'left' : 'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeUnits.map((u, i) => (
                <tr key={u.unit.id} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', fontWeight: 600 }}>{u.unit.name}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'right' }}>{u.annualTarget > 0 ? formatRupiah(u.annualTarget) : '-'}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>{formatRupiah(u.totalIncome)}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center' }}>{u.annualTarget > 0 ? `${u.achievementPct}%` : '-'}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center' }}>
                    {u.annualTarget === 0 ? 'Tanpa Target' : u.achievementPct >= 100 ? 'Tercapai' : u.achievementPct >= 70 ? 'Hampir' : 'Belum'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                <td colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '8px 10px' }}>TOTAL KESELURUHAN</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 10px', textAlign: 'right' }}>{formatRupiah(displayGrand.annualTarget)}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 10px', textAlign: 'right' }}>{formatRupiah(displayGrand.totalIncome)}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 10px', textAlign: 'center' }}>{displayGrand.achievementPct}%</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 10px' }} />
              </tr>
            </tfoot>
          </table>
        </div>

        {activeUnits.map((u) => (
          <div key={u.unit.id} style={{ pageBreakBefore: 'always', paddingTop: '1rem' }}>
            <div style={{ borderBottom: '2px solid #1e3a8a', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800 }}>{u.unit.name}</div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Detail Pemasukan Bulanan — Tahun {tahun}</div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: u.achievementPct >= 100 ? '#16a34a' : u.achievementPct >= 70 ? '#ca8a04' : '#dc2626' }}>
                {u.achievementPct}%
              </div>
            </div>
            <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Bulan', 'Target Efektif', 'Realisasi', 'Selisih', 'Status'].map((h) => (
                    <th key={h} style={{ border: '1px solid #cbd5e1', padding: '6px 10px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {u.months.map((m) => (
                  <tr key={m.month}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 10px', fontWeight: 600 }}>{MONTH_NAMES_FULL[m.month]}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 10px', textAlign: 'right' }}>{m.effectiveTarget > 0 ? formatRupiah(m.effectiveTarget) : '-'}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 10px', textAlign: 'right', fontWeight: 700 }}>{m.income !== null ? formatRupiah(m.income) : '-'}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 10px', textAlign: 'right', color: m.surplus >= 0 ? '#16a34a' : '#dc2626' }}>
                      {m.income !== null ? `${m.surplus >= 0 ? '+' : ''}${formatRupiah(m.surplus)}` : '-'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 10px', textAlign: 'center' }}>
                      {m.status === 'achieved' ? 'Tercapai' : m.status === 'notachieved' ? 'Belum' : m.status === 'pending' ? 'Pending' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '3rem' }}>Mengetahui,</div>
            <div style={{ fontWeight: 600 }}>(_________________)</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '3rem' }}>
              Surabaya, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
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

export default function PrintDashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Memuat...</div>}>
      <PrintDashboardContent />
    </Suspense>
  )
}
