'use client'

import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ThemeToggle from '@/app/components/ThemeToggle'
import { formatRupiah } from '@/lib/utils/format'

function getYearRange(count = 6, offset = 3) {
  const current = new Date().getFullYear()
  return Array.from({ length: count }, (_, i) => current - offset + i)
}

export default function PendapatanPublikPage() {
  const [brandName, setBrandName] = useState('Direktorat Unesa Science Center')
  const [logoUrl, setLogoUrl] = useState('/images/logo USC.png')
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/app-settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.brand_name) setBrandName(d.brand_name)
        if (d.logo_url) setLogoUrl(d.logo_url)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/pendapatan-publik?tahun=${year}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Gagal memuat data'))))
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [year])

  const years = getYearRange(6, 3)

  const barData = useMemo(() => (data?.units ?? []).map((u) => ({
    name: u.nama.length > 14 ? u.nama.slice(0, 12) + '…' : u.nama,
    Realisasi: u.realisasi,
  })), [data])

  const fmtAxis = (v) => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}Jt`
    return String(v)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={logoUrl} alt={brandName} style={{ height: 40, width: 'auto', maxWidth: 140, objectFit: 'contain', flexShrink: 0 }} />
            <strong style={{ display: 'block', fontSize: '1.0625rem', color: 'var(--text)', lineHeight: 1.25, maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {brandName}
            </strong>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.25rem' }}>Transparansi Pendapatan Unit Usaha</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', margin: 0 }}>Realisasi pendapatan tahunan, disajikan apa adanya tanpa pembulatan.</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <select
            className="select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ maxWidth: 140 }}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>Memuat data...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--danger)' }}>{error}</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <SummaryCard label="Target Tahunan" value={formatRupiah(data.grand_total.target_tahunan)} color="var(--primary)" />
              <SummaryCard label="Total Realisasi" value={formatRupiah(data.grand_total.realisasi)} color="var(--success)" />
              <SummaryCard
                label="Capaian"
                value={data.grand_total.capaian_pct !== null ? `${data.grand_total.capaian_pct}%` : '-'}
                color={data.grand_total.capaian_pct >= 100 ? 'var(--success)' : 'var(--warning)'}
              />
            </div>

            {barData.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} width={45} />
                      <Tooltip formatter={(v) => formatRupiah(v)} />
                      <Bar dataKey="Realisasi" fill="var(--success)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      {['Unit Usaha', 'Target Tahunan', 'Realisasi', 'Capaian'].map((h) => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Unit Usaha' ? 'left' : 'right', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.units.map((u) => (
                      <tr key={u.nama}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{u.nama}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-2)', borderBottom: '1px solid var(--border)' }}>{u.target_tahunan > 0 ? formatRupiah(u.target_tahunan) : '-'}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{formatRupiah(u.realisasi)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                          {u.capaian_pct !== null ? (
                            <span style={{
                              display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                              background: u.capaian_pct >= 100 ? 'var(--success-50)' : u.capaian_pct >= 70 ? 'var(--warning-50)' : 'var(--danger-50)',
                              color: u.capaian_pct >= 100 ? 'var(--success)' : u.capaian_pct >= 70 ? 'var(--warning)' : 'var(--danger)',
                            }}>
                              {u.capaian_pct}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                    {data.units.length === 0 && (
                      <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>Belum ada data unit usaha aktif</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text)' }}>Total</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text)' }}>{formatRupiah(data.grand_total.target_tahunan)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text)' }}>{formatRupiah(data.grand_total.realisasi)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text)' }}>{data.grand_total.capaian_pct !== null ? `${data.grand_total.capaian_pct}%` : '-'}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-3)', fontSize: '0.75rem' }}>
        Data diperbarui secara berkala oleh {brandName}.
      </footer>
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem', textAlign: 'center' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '1.375rem', fontWeight: 800, color, marginTop: 6 }}>{value}</div>
    </div>
  )
}
