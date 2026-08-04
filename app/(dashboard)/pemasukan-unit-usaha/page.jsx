'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { formatRupiah, formatRupiahShort } from '@/lib/utils/format'
import { useToast } from '@/app/components/Toast'

const MONTH_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const UNIT_COLORS = ['#1e3a8a', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

function getYearRange(count = 6, offset = 3) {
  const current = new Date().getFullYear()
  return Array.from({ length: count }, (_, i) => current - offset + i)
}

const fmtAxis = (v) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}Jt`
  return String(v)
}

export default function PemasukanUnitUsahaPage() {
  const { error: toastError } = useToast()
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedUnit, setSelectedUnit] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/pemasukan-unit-usaha/dashboard?tahun=${year}`)
      if (res.ok) setData(await res.json())
      else toastError('Gagal memuat data dashboard')
    } catch {
      toastError('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }, [year, toastError])

  useEffect(() => { load() }, [load])

  const years = getYearRange(6, 3)

  const activeUnits = useMemo(() => {
    if (!data) return []
    return selectedUnit ? data.units.filter((u) => u.unit.id === selectedUnit) : data.units
  }, [data, selectedUnit])

  const barData = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const income = activeUnits.reduce((s, u) => s + (u.months.find((m) => m.month === month)?.income ?? 0), 0)
    const target = activeUnits.reduce((s, u) => s + (u.months.find((m) => m.month === month)?.effectiveTarget ?? 0), 0)
    return { name: MONTH_SHORT[month], Pemasukan: income, Target: target }
  }), [activeUnits])

  const pieData = useMemo(() => (data?.units ?? [])
    .filter((u) => u.totalIncome > 0)
    .map((u) => ({ name: u.unit.name, value: u.totalIncome })), [data])

  const displayGrand = useMemo(() => {
    if (!data) return { annualTarget: 0, totalIncome: 0, achievementPct: 0 }
    if (selectedUnit) {
      const u = data.units.find((u) => u.unit.id === selectedUnit)
      return u ? { annualTarget: u.annualTarget, totalIncome: u.totalIncome, achievementPct: u.achievementPct } : data.grandTotal
    }
    return data.grandTotal
  }, [data, selectedUnit])

  const alerts = useMemo(() => {
    if (!data) return []
    const result = []
    const notAchieved = data.units.filter((u) => u.achievementPct < 100 && u.annualTarget > 0)
    if (notAchieved.length > 0 && new Date().getMonth() >= 9 && year === new Date().getFullYear()) {
      result.push({ type: 'warning', message: `${notAchieved.length} unit belum mencapai target tahunan ${year}. Segera evaluasi performa.` })
    }
    const currentMonth = new Date().getMonth() + 1
    if (year === new Date().getFullYear() && new Date().getDate() > 5) {
      const hasCurrentMonthData = data.units.some((u) => u.months.some((m) => m.month === currentMonth && m.income !== null))
      if (!hasCurrentMonthData) {
        result.push({ type: 'info', message: `Bulan ${MONTH_SHORT[currentMonth]} belum ada input pemasukan. Segera input data.` })
      }
    }
    const noTarget = data.units.filter((u) => u.annualTarget === 0)
    if (noTarget.length > 0) {
      result.push({ type: 'warning', message: `Target tahun ${year} belum di-set untuk ${noTarget.length} unit. Segera input target.` })
    }
    return result
  }, [data, year])

  async function downloadExcel() {
    setDownloading(true)
    try {
      const params = new URLSearchParams({ tahun: String(year) })
      if (selectedUnit) params.set('unit_usaha_id', selectedUnit)
      const res = await fetch(`/api/pemasukan-unit-usaha/export-excel?${params}`)
      if (!res.ok) throw new Error('Gagal membuat file Excel')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Pemasukan_Unit_Usaha_${year}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toastError(err.message)
    } finally {
      setDownloading(false)
    }
  }

  function printPdf() {
    const params = new URLSearchParams({ tahun: String(year) })
    if (selectedUnit) params.set('unit_usaha_id', selectedUnit)
    window.open(`/pemasukan-unit-usaha/print?${params}`, '_blank')
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Pemasukan Unit Usaha</h1>
          <p className="page-subtitle">Ringkasan realisasi pemasukan terhadap target tahunan, per unit usaha.</p>
        </div>
        <div className="page-actions">
          <Link href="/pemasukan-unit-usaha/input" className="btn btn-secondary">Input Pemasukan</Link>
          <Link href="/pemasukan-unit-usaha/target" className="btn btn-secondary">Kelola Target</Link>
          <Link href="/pemasukan-unit-usaha/unit" className="btn btn-secondary">Kelola Unit</Link>
        </div>
      </div>

      <div className="filter-bar" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
        <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ maxWidth: 120 }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="select" value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} style={{ maxWidth: 240 }}>
          <option value="">Semua Unit Usaha</option>
          {data?.units.map((u) => <option key={u.unit.id} value={u.unit.id}>{u.unit.name}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>Refresh</button>
        <div style={{ flex: 1 }} />
        <Link href="/pemasukan-unit-usaha/komparasi" className="btn btn-ghost">Komparasi Tahun</Link>
        <Link href="/pemasukan-unit-usaha/saran" className="btn btn-ghost">Saran Anggaran</Link>
        <button className="btn btn-danger" onClick={printPdf} disabled={loading || !data}>Cetak PDF</button>
        <button className="btn btn-primary" onClick={downloadExcel} disabled={loading || downloading || !data}>
          {downloading ? 'Mengunduh...' : 'Unduh Excel'}
        </button>
      </div>

      {alerts.map((a, i) => (
        <div key={i} className={`alert alert-${a.type}`} style={{ marginBottom: '0.75rem' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{a.message}</span>
        </div>
      ))}

      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
          <h3>Memuat data...</h3>
        </div>
      ) : !data ? (
        <div className="empty-state">
          <h3>Gagal memuat data</h3>
          <button className="btn btn-primary" onClick={load} style={{ marginTop: '1rem' }}>Coba Lagi</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard label="Target Tahunan" value={formatRupiahShort(displayGrand.annualTarget)} color="var(--primary)" />
            <StatCard label="Total Pemasukan" value={formatRupiahShort(displayGrand.totalIncome)} color="var(--success)" />
            <StatCard label="Capaian Target" value={`${displayGrand.achievementPct}%`} sub={`dari target ${year}`} color={displayGrand.achievementPct >= 100 ? 'var(--success)' : 'var(--warning)'} />
            <StatCard label={selectedUnit ? 'Unit Dipilih' : 'Unit Aktif'} value={selectedUnit ? (data.units.find((u) => u.unit.id === selectedUnit)?.unit.name ?? '-') : `${data.units.length} Unit`} color="var(--info)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1rem' }}>Realisasi vs Target per Bulan</div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barGap={4} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} width={45} />
                    <Tooltip formatter={(v) => formatRupiah(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Pemasukan" fill="var(--success)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Target" fill="var(--primary-100)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1rem' }}>Distribusi Pemasukan per Unit</div>
              {pieData.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                  <p className="muted">Belum ada data pemasukan.</p>
                </div>
              ) : (
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={UNIT_COLORS[i % UNIT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatRupiah(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>{['Unit Usaha', 'Target', 'Realisasi', 'Sisa', 'Capaian', 'Progress'].map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {activeUnits.map((u) => {
                    const sisa = Math.max(0, u.annualTarget - u.totalIncome)
                    return (
                      <tr key={u.unit.id}>
                        <td style={{ fontWeight: 600 }}>{u.unit.name}</td>
                        <td className="num muted">{u.annualTarget > 0 ? formatRupiahShort(u.annualTarget) : '-'}</td>
                        <td className="num" style={{ fontWeight: 700 }}>{formatRupiahShort(u.totalIncome)}</td>
                        <td className="num" style={{ color: 'var(--danger)' }}>{u.annualTarget > 0 ? formatRupiahShort(sisa) : '-'}</td>
                        <td>
                          <span className="badge" style={{
                            background: u.annualTarget === 0 ? 'var(--surface-3)' : u.achievementPct >= 100 ? 'var(--success-50)' : u.achievementPct >= 70 ? 'var(--warning-50)' : 'var(--danger-50)',
                            color: u.annualTarget === 0 ? 'var(--text-2)' : u.achievementPct >= 100 ? 'var(--success)' : u.achievementPct >= 70 ? 'var(--warning)' : 'var(--danger)',
                            borderColor: 'transparent',
                          }}>
                            {u.annualTarget === 0 ? 'Tanpa Target' : `${u.achievementPct}%`}
                          </span>
                        </td>
                        <td style={{ minWidth: 120 }}>
                          {u.annualTarget > 0 && (
                            <div style={{ height: 6, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(u.achievementPct, 100)}%`, height: '100%', background: u.achievementPct >= 100 ? 'var(--success)' : u.achievementPct >= 70 ? 'var(--warning)' : 'var(--danger)' }} />
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {activeUnits.length === 0 && (
                    <tr><td colSpan={6} className="text-center muted" style={{ padding: '2rem' }}>Belum ada unit usaha aktif</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color, fontWeight: 600, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
