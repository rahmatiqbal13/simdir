'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatRupiah } from '@/lib/utils/format'
import { printWithFilename } from '@/lib/utils/print'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer,
  LineChart, Line, ReferenceLine,
} from 'recharts'

const MONTH_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTH_NAMES_FULL = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const fmtAxis = (v) => {
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}Jt`
  return String(v)
}

const growthPct = (a, b) => (a > 0 ? parseFloat((((b - a) / a) * 100).toFixed(1)) : null)
const fmtPct = (p) => (p == null ? '–' : `${p >= 0 ? '+' : ''}${p}%`)
const fmtDiff = (d) => `${d >= 0 ? '+' : '-'}${formatRupiah(Math.abs(d))}`

function PrintKomparasiContent() {
  const params = useSearchParams()
  const currentYear = new Date().getFullYear()
  const yearA = Number(params.get('tahun_a') ?? currentYear - 1)
  const yearB = Number(params.get('tahun_b') ?? currentYear)
  const unitUsahaId = params.get('unit_usaha_id') || ''

  const [dataA, setDataA] = useState(null)
  const [dataB, setDataB] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [appName, setAppName] = useState('SIMDIR')

  useEffect(() => {
    Promise.all([
      fetch(`/api/pemasukan-unit-usaha/dashboard?tahun=${yearA}`),
      fetch(`/api/pemasukan-unit-usaha/dashboard?tahun=${yearB}`),
    ])
      .then(async ([resA, resB]) => {
        if (!resA.ok || !resB.ok) throw new Error('Gagal memuat data komparasi')
        setDataA(await resA.json())
        setDataB(await resB.json())
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    fetch('/api/app-settings').then((r) => (r.ok ? r.json() : null)).then((s) => { if (s?.brand_name) setAppName(s.brand_name) })
  }, [yearA, yearB])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  if (error || !dataA || !dataB) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>{error || 'Data tidak tersedia.'}</p>
        <Link href="/pemasukan-unit-usaha/komparasi" className="btn btn-ghost">Kembali</Link>
      </div>
    )
  }

  const keyA = String(yearA)
  const keyB = String(yearB)

  // Gabungkan daftar unit dari kedua tahun agar unit yang hanya ada di salah satu tahun tetap tampil
  const unitMap = new Map()
  for (const u of [...dataA.units, ...dataB.units]) if (!unitMap.has(u.unit.id)) unitMap.set(u.unit.id, u.unit)
  const allUnits = [...unitMap.values()]
  const selectedUnit = unitUsahaId ? unitMap.get(unitUsahaId) : null
  const unitName = selectedUnit?.name ?? 'Semua Unit Usaha'

  const findUnit = (data, id) => data.units.find((u) => u.unit.id === id)
  const monthIncome = (data, month) => {
    const u = findUnit(data, unitUsahaId)
    return u?.months.find((m) => m.month === month)?.income ?? 0
  }

  const rows = selectedUnit
    ? Array.from({ length: 12 }, (_, i) => {
        const month = i + 1
        const a = monthIncome(dataA, month)
        const b = monthIncome(dataB, month)
        return { key: month, label: MONTH_NAMES_FULL[month], short: MONTH_SHORT[month], a, b }
      })
    : allUnits.map((unit) => {
        const a = findUnit(dataA, unit.id)?.totalIncome ?? 0
        const b = findUnit(dataB, unit.id)?.totalIncome ?? 0
        return { key: unit.id, label: unit.name, short: unit.name, a, b }
      })

  const totalA = selectedUnit ? (findUnit(dataA, unitUsahaId)?.totalIncome ?? 0) : dataA.grandTotal.totalIncome
  const totalB = selectedUnit ? (findUnit(dataB, unitUsahaId)?.totalIncome ?? 0) : dataB.grandTotal.totalIncome
  const diff = totalB - totalA
  const diffPct = growthPct(totalA, totalB)

  const barData = rows.map((r) => ({ name: r.short, [keyA]: r.a, [keyB]: r.b }))
  const growthData = rows.map((r) => ({ name: r.short, 'Pertumbuhan (%)': growthPct(r.a, r.b) }))

  const withGrowth = rows.filter((r) => r.a > 0)
  const naik = rows.filter((r) => r.b > r.a).length
  const turun = rows.filter((r) => r.b < r.a).length
  const best = withGrowth.length ? withGrowth.reduce((m, r) => (growthPct(r.a, r.b) > growthPct(m.a, m.b) ? r : m)) : null
  const worst = withGrowth.length ? withGrowth.reduce((m, r) => (growthPct(r.a, r.b) < growthPct(m.a, m.b) ? r : m)) : null
  const itemLabel = selectedUnit ? 'bulan' : 'unit usaha'

  const cell = { border: '1px solid #cbd5e1', padding: '6px 10px' }

  return (
    <div>
      <div className="no-print" style={{
        position: 'sticky', top: 0, left: 0, right: 0, padding: '1rem', background: 'white',
        borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/pemasukan-unit-usaha/komparasi" className="btn btn-ghost">Kembali</Link>
          <h1 style={{ margin: 0, fontSize: '1.125rem' }}>Preview Laporan Komparasi</h1>
        </div>
        <button className="btn btn-primary" onClick={() => printWithFilename(`Rekap Komparasi Pemasukan ${yearA} vs ${yearB}${selectedUnit ? ` - ${unitName}` : ''}`)}>Cetak / Simpan PDF</button>
      </div>

      <div className="invoice-print-container" style={{ maxWidth: '210mm', margin: '0 auto', padding: '15mm', background: 'white', boxSizing: 'border-box', color: '#1e293b' }}>
        <div style={{ borderBottom: '4px solid #1e3a8a', paddingBottom: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a8a' }}>{appName}</div>
            <div style={{ fontSize: '0.9375rem', color: '#64748b', marginTop: 4 }}>Laporan Pemasukan Unit Usaha</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>LAPORAN KOMPARASI ANTAR TAHUN</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Tahun {yearA} vs {yearB}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
              Dicetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <Info label="Pembanding" value={`${yearA} → ${yearB}`} />
          <Info label="Unit" value={unitName} />
          <Info label={selectedUnit ? 'Periode' : 'Jumlah Unit'} value={selectedUnit ? '12 bulan' : `${allUnits.length} unit`} />
          <Info label="Tren" value={`${naik} naik, ${turun} turun`} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <Stat label={`Total ${yearA}`} value={formatRupiah(totalA)} />
          <Stat label={`Total ${yearB}`} value={formatRupiah(totalB)} />
          <Stat
            label="Selisih"
            value={fmtDiff(diff)}
            sub={fmtPct(diffPct)}
            color={diff >= 0 ? '#16a34a' : '#dc2626'}
          />
        </div>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e3a8a', marginBottom: 8 }}>NARASI LAPORAN</div>
          <p style={{ fontSize: '0.875rem', color: '#1e40af', lineHeight: 1.6, margin: 0 }}>
            Total pemasukan <strong>{unitName}</strong> pada tahun <strong>{yearB}</strong> sebesar <strong>{formatRupiah(totalB)}</strong>,{' '}
            dibandingkan tahun <strong>{yearA}</strong> sebesar <strong>{formatRupiah(totalA)}</strong>.{' '}
            {diff === 0
              ? 'Tidak terdapat perubahan total pemasukan antara kedua tahun.'
              : <>Pemasukan {diff > 0 ? 'meningkat' : 'menurun'} sebesar <strong>{formatRupiah(Math.abs(diff))}</strong>{diffPct != null && <> (<strong>{fmtPct(diffPct)}</strong>)</>}.</>}{' '}
            Dari {rows.length} {itemLabel}, sebanyak <strong>{naik}</strong> mengalami kenaikan dan <strong>{turun}</strong> mengalami penurunan.
            {best && worst && best.key !== worst.key && (
              <> Pertumbuhan tertinggi terjadi pada <strong>{best.label}</strong> ({fmtPct(growthPct(best.a, best.b))}),
                sedangkan terendah pada <strong>{worst.label}</strong> ({fmtPct(growthPct(worst.a, worst.b))}).</>
            )}
          </p>
        </div>

        <div style={{ marginBottom: '2rem', breakInside: 'avoid' }}>
          <SectionTitle>{selectedUnit ? `PEMASUKAN BULANAN ${yearA} VS ${yearB}` : `PEMASUKAN PER UNIT ${yearA} VS ${yearB}`}</SectionTitle>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} angle={selectedUnit ? 0 : -35} textAnchor={selectedUnit ? 'middle' : 'end'} interval={0} height={selectedUnit ? 30 : 70} />
                <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={45} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey={keyA} fill="#1e3a8a" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey={keyB} fill="#10b981" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ marginBottom: '2rem', breakInside: 'avoid' }}>
          <SectionTitle>{selectedUnit ? 'TREN PERTUMBUHAN BULANAN (%)' : 'TREN PERTUMBUHAN PER UNIT (%)'}</SectionTitle>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} angle={selectedUnit ? 0 : -35} textAnchor={selectedUnit ? 'middle' : 'end'} interval={0} height={selectedUnit ? 30 : 70} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={45} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
                <Line type="monotone" dataKey="Pertumbuhan (%)" stroke="#1e3a8a" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <SectionTitle>{selectedUnit ? 'RINCIAN PER BULAN' : 'RINCIAN PER UNIT USAHA'}</SectionTitle>
          <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
            <thead>
              <tr style={{ background: '#1e3a8a', color: 'white' }}>
                {['No', selectedUnit ? 'Bulan' : 'Unit Usaha', keyA, keyB, 'Selisih', '%'].map((h) => (
                  <th key={h} style={{ ...cell, padding: '8px 10px', textAlign: h === 'Bulan' || h === 'Unit Usaha' ? 'left' : 'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const d = r.b - r.a
                return (
                  <tr key={r.key} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc', breakInside: 'avoid' }}>
                    <td style={{ ...cell, textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ ...cell, fontWeight: 600 }}>{r.label}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{formatRupiah(r.a)}</td>
                    <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>{formatRupiah(r.b)}</td>
                    <td style={{ ...cell, textAlign: 'right', color: d >= 0 ? '#16a34a' : '#dc2626' }}>{fmtDiff(d)}</td>
                    <td style={{ ...cell, textAlign: 'center' }}>{fmtPct(growthPct(r.a, r.b))}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                <td colSpan={2} style={{ ...cell, padding: '8px 10px' }}>TOTAL</td>
                <td style={{ ...cell, padding: '8px 10px', textAlign: 'right' }}>{formatRupiah(totalA)}</td>
                <td style={{ ...cell, padding: '8px 10px', textAlign: 'right' }}>{formatRupiah(totalB)}</td>
                <td style={{ ...cell, padding: '8px 10px', textAlign: 'right', color: diff >= 0 ? '#16a34a' : '#dc2626' }}>{fmtDiff(diff)}</td>
                <td style={{ ...cell, padding: '8px 10px', textAlign: 'center' }}>{fmtPct(diffPct)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', breakInside: 'avoid' }}>
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
          Dokumen ini digenerate secara otomatis oleh sistem {appName} — Komparasi Pemasukan Unit Usaha
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

function Stat({ label, value, sub, color = '#1e293b' }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.875rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 800, color, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.8125rem', fontWeight: 700, color }}>{sub}</div>}
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

export default function PrintKomparasiPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Memuat...</div>}>
      <PrintKomparasiContent />
    </Suspense>
  )
}
