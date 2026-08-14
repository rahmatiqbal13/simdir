'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ReferenceLine,
} from 'recharts'
import { useToast } from '@/app/components/Toast'
import { formatRupiah, formatRupiahShort } from '@/lib/utils/format'

const MONTH_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function getYearRange(count = 7, offset = 4) {
  const current = new Date().getFullYear()
  return Array.from({ length: count }, (_, i) => current - offset + i)
}

const fmtAxis = (v) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}Jt`
  return String(v)
}

export default function KomparasiTahunPage() {
  const { error: toastError } = useToast()
  const currentYear = new Date().getFullYear()
  const [yearA, setYearA] = useState(currentYear - 1)
  const [yearB, setYearB] = useState(currentYear)
  const [selectedUnit, setSelectedUnit] = useState('')
  const [dataA, setDataA] = useState(null)
  const [dataB, setDataB] = useState(null)
  const [loading, setLoading] = useState(false)
  const [compared, setCompared] = useState(false)

  const years = getYearRange(7, 4)

  async function handleBandingkan() {
    setLoading(true)
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/pemasukan-unit-usaha/dashboard?tahun=${yearA}`),
        fetch(`/api/pemasukan-unit-usaha/dashboard?tahun=${yearB}`),
      ])
      if (!resA.ok || !resB.ok) throw new Error('Gagal memuat data komparasi')
      setDataA(await resA.json())
      setDataB(await resB.json())
      setCompared(true)
    } catch (err) {
      toastError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function getTotal(data) {
    if (!data) return 0
    if (selectedUnit) return data.units.find((u) => u.unit.id === selectedUnit)?.totalIncome ?? 0
    return data.grandTotal.totalIncome
  }

  const totalA = getTotal(dataA)
  const totalB = getTotal(dataB)
  const diff = totalB - totalA
  const diffPct = totalA > 0 ? Math.round((diff / totalA) * 100) : 0
  const units = dataA?.units ?? dataB?.units ?? []

  const unitBarData = units.map((u) => {
    const uA = dataA?.units.find((x) => x.unit.id === u.unit.id)
    const uB = dataB?.units.find((x) => x.unit.id === u.unit.id)
    return { name: u.unit.name, [String(yearA)]: uA?.totalIncome ?? 0, [String(yearB)]: uB?.totalIncome ?? 0 }
  })

  const monthBarData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const getIncome = (data) => {
      const us = data?.units.filter((u) => u.unit.id === selectedUnit) ?? []
      return us.reduce((s, u) => s + (u.months.find((m) => m.month === month)?.income ?? 0), 0)
    }
    return { name: MONTH_SHORT[month], [String(yearA)]: getIncome(dataA), [String(yearB)]: getIncome(dataB) }
  })

  const barData = selectedUnit ? monthBarData : unitBarData

  const unitGrowthData = units.map((u) => {
    const uA = dataA?.units.find((x) => x.unit.id === u.unit.id)
    const uB = dataB?.units.find((x) => x.unit.id === u.unit.id)
    const a = uA?.totalIncome ?? 0
    const b = uB?.totalIncome ?? 0
    const growth = a > 0 ? parseFloat(((b - a) / a * 100).toFixed(1)) : null
    return { name: u.unit.name, 'Pertumbuhan (%)': growth }
  })

  const monthGrowthData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const getInc = (data) => {
      const us = data?.units.filter((u) => u.unit.id === selectedUnit) ?? []
      return us.reduce((s, u) => s + (u.months.find((m) => m.month === month)?.income ?? 0), 0)
    }
    const a = getInc(dataA)
    const b = getInc(dataB)
    const growth = a > 0 ? parseFloat(((b - a) / a * 100).toFixed(1)) : null
    return { name: MONTH_SHORT[month], 'Pertumbuhan (%)': growth }
  })

  const growthData = selectedUnit ? monthGrowthData : unitGrowthData

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Komparasi Antar Tahun</h1>
          <p className="page-subtitle">Bandingkan pemasukan dua tahun berbeda, per unit usaha atau keseluruhan.</p>
        </div>
        <div className="page-actions">
          <Link href="/pemasukan-unit-usaha" className="btn btn-ghost">Kembali ke Dashboard</Link>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="field-label">Tahun A</label>
          <select className="select" value={yearA} onChange={(e) => setYearA(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Tahun B</label>
          <select className="select" value={yearB} onChange={(e) => setYearB(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Unit Usaha</label>
          <select className="select" value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">Semua Unit</option>
            {units.map((u) => <option key={u.unit.id} value={u.unit.id}>{u.unit.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleBandingkan} disabled={loading}>{loading ? 'Memuat...' : 'Bandingkan'}</button>
      </div>

      {!compared ? (
        <div className="empty-state">
          <p className="muted">Pilih dua tahun lalu klik Bandingkan.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
              <div>
                <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{yearA}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatRupiahShort(totalA)}</div>
              </div>
              <div>
                <span className={`badge ${diff >= 0 ? 'badge-success' : 'badge-danger'}`}>{diff >= 0 ? '+' : ''}{formatRupiahShort(Math.abs(diff))}</span>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: diff >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: 4 }}>
                  {diff >= 0 ? '+' : ''}{diffPct}%
                </div>
                <div className="muted" style={{ fontSize: '0.75rem' }}>Selisih</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{yearB}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatRupiahShort(totalB)}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem' }}>
                {selectedUnit ? `Perbandingan Bulanan ${yearA} vs ${yearB}` : `Perbandingan Total per Unit ${yearA} vs ${yearB}`}
              </div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barGap={2} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} angle={selectedUnit ? 0 : -35} textAnchor={selectedUnit ? 'middle' : 'end'} interval={0} height={selectedUnit ? 30 : 60} />
                    <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} width={45} />
                    <Tooltip formatter={(v) => formatRupiah(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey={String(yearA)} fill="var(--primary)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey={String(yearB)} fill="var(--success)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem' }}>
                {selectedUnit ? 'Tren Pertumbuhan Bulanan (%)' : 'Tren Pertumbuhan per Unit (%)'}
              </div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} angle={selectedUnit ? 0 : -35} textAnchor={selectedUnit ? 'middle' : 'end'} interval={0} height={selectedUnit ? 30 : 60} />
                    <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip formatter={(v) => (v != null ? `${v}%` : '-')} />
                    <ReferenceLine y={0} stroke="var(--text-3)" strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="Pertumbuhan (%)" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>{[selectedUnit ? 'Bulan' : 'Unit Usaha', yearA, yearB, 'Selisih', '%'].map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {selectedUnit
                    ? Array.from({ length: 12 }, (_, i) => {
                        const month = i + 1
                        const uA = dataA.units.find((u) => u.unit.id === selectedUnit)
                        const uB = dataB.units.find((u) => u.unit.id === selectedUnit)
                        const a = uA?.months.find((m) => m.month === month)?.income ?? 0
                        const b = uB?.months.find((m) => m.month === month)?.income ?? 0
                        const d = b - a
                        const pct = a > 0 ? ((d / a) * 100).toFixed(1) : '–'
                        return (
                          <tr key={month}>
                            <td style={{ fontWeight: 600 }}>{MONTH_SHORT[month]}</td>
                            <td className="num muted">{formatRupiahShort(a)}</td>
                            <td className="num" style={{ fontWeight: 700 }}>{formatRupiahShort(b)}</td>
                            <td className="num" style={{ color: d >= 0 ? 'var(--success)' : 'var(--danger)' }}>{d >= 0 ? '+' : ''}{formatRupiahShort(d)}</td>
                            <td>{pct !== '–' ? `${Number(pct) >= 0 ? '+' : ''}${pct}%` : '–'}</td>
                          </tr>
                        )
                      })
                    : dataA.units.map((uA) => {
                        const uB = dataB.units.find((u) => u.unit.id === uA.unit.id)
                        const a = uA.totalIncome
                        const b = uB?.totalIncome ?? 0
                        const d = b - a
                        const pct = a > 0 ? ((d / a) * 100).toFixed(1) : '–'
                        return (
                          <tr key={uA.unit.id}>
                            <td style={{ fontWeight: 600 }}>{uA.unit.name}</td>
                            <td className="num muted">{formatRupiahShort(a)}</td>
                            <td className="num" style={{ fontWeight: 700 }}>{formatRupiahShort(b)}</td>
                            <td className="num" style={{ color: d >= 0 ? 'var(--success)' : 'var(--danger)' }}>{d >= 0 ? '+' : ''}{formatRupiahShort(d)}</td>
                            <td>{pct !== '–' ? `${Number(pct) >= 0 ? '+' : ''}${pct}%` : '–'}</td>
                          </tr>
                        )
                      })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
