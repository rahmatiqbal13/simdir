'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { formatRupiah, formatRupiahShort } from '@/lib/utils/format'

const MAX_PCT = 80

function getYearRange(count = 6, offset = 3) {
  const current = new Date().getFullYear()
  return Array.from({ length: count }, (_, i) => current - offset + i)
}

export default function SaranAnggaranPage() {
  const currentYear = new Date().getFullYear()
  const years = getYearRange(6, 3)

  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pct, setPct] = useState(80)
  const [inputPct, setInputPct] = useState('80')
  const [inputAmount, setInputAmount] = useState('')
  const amountFocused = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/pemasukan-unit-usaha/dashboard?tahun=${year}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return
        setData(d)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [year])

  const totalIncome = data?.grandTotal.totalIncome ?? 0
  const taken = Math.round(totalIncome * pct / 100)
  const remaining = totalIncome - taken

  useEffect(() => {
    if (!amountFocused.current) {
      setInputAmount(totalIncome > 0 ? String(Math.round(totalIncome * pct / 100)) : '')
    }
  }, [pct, totalIncome])

  function syncFromPct(newPct) {
    setPct(newPct)
    setInputPct(String(newPct))
    if (!amountFocused.current && totalIncome > 0) setInputAmount(String(Math.round(totalIncome * newPct / 100)))
  }

  function handleInputChange(val) {
    setInputPct(val)
    const n = parseFloat(val)
    if (!isNaN(n)) {
      const clamped = Math.min(MAX_PCT, Math.max(0, Math.round(n * 10) / 10))
      setPct(clamped)
      if (!amountFocused.current && totalIncome > 0) setInputAmount(String(Math.round(totalIncome * clamped / 100)))
    }
  }

  function handleInputBlur() {
    const n = parseFloat(inputPct)
    let clamped = 0
    if (isNaN(n) || n < 0) clamped = 0
    else if (n > MAX_PCT) clamped = MAX_PCT
    else clamped = Math.round(n * 10) / 10
    setPct(clamped)
    setInputPct(String(clamped))
    setInputAmount(totalIncome > 0 ? String(Math.round(totalIncome * clamped / 100)) : '')
  }

  function handleAmountChange(val) {
    const raw = val.replace(/\D/g, '')
    setInputAmount(raw)
    if (totalIncome > 0 && raw !== '') {
      const amount = Number(raw)
      const computed = Math.min(MAX_PCT, Math.max(0, Math.round((amount / totalIncome) * 1000) / 10))
      setPct(computed)
      setInputPct(String(computed))
    }
  }

  function handleAmountBlur() {
    amountFocused.current = false
    const amount = Number(inputAmount)
    if (!inputAmount || isNaN(amount) || amount <= 0) { setPct(0); setInputPct('0'); setInputAmount('0'); return }
    const maxAllowed = Math.round(totalIncome * MAX_PCT / 100)
    if (amount > maxAllowed) {
      setPct(MAX_PCT); setInputPct(String(MAX_PCT)); setInputAmount(String(maxAllowed))
    } else {
      const computed = Math.round((amount / totalIncome) * 1000) / 10
      setPct(computed); setInputPct(String(computed)); setInputAmount(String(amount))
    }
  }

  const rawAmountNumber = Number(inputAmount)
  const amountExceedsLimit = totalIncome > 0 && rawAmountNumber > Math.round(totalIncome * MAX_PCT / 100)
  const fillWidth = `${(pct / MAX_PCT) * 100}%`

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Saran Anggaran</h1>
          <p className="page-subtitle">Simulasi pengambilan anggaran berdasarkan total pemasukan tahun referensi. Batas maksimal pengambilan 80%.</p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-danger"
            disabled={loading || totalIncome === 0}
            onClick={() => window.open(`/pemasukan-unit-usaha/print-saran?tahun=${year}&pct=${pct}`, '_blank')}
          >
            Cetak PDF
          </button>
          <Link href="/pemasukan-unit-usaha" className="btn btn-ghost">Kembali ke Dashboard</Link>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Tahun Referensi:</span>
          {years.map((y) => (
            <button key={y} className={`btn btn-sm ${year === y ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>

        <div className="alert alert-info" style={{ margin: 0, justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Pemasukan {year}</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800 }}>{loading ? '...' : formatRupiah(totalIncome)}</div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 700 }}>Persentase Pengambilan <span className="muted" style={{ fontWeight: 400 }}>(maks. {MAX_PCT}%)</span></label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="number" min={0} max={MAX_PCT} step={0.1} className="input" value={inputPct}
                onChange={(e) => handleInputChange(e.target.value)} onBlur={handleInputBlur}
                style={{ width: 90, textAlign: 'right' }} />
              <span style={{ fontWeight: 700 }}>%</span>
            </div>
          </div>
          <div style={{ position: 'relative', height: 12, borderRadius: 999, background: 'var(--surface-3)', marginBottom: 6 }}>
            <div style={{ position: 'absolute', inset: 0, width: fillWidth, borderRadius: 999, background: 'var(--primary)', transition: 'width .2s' }} />
            <input type="range" min={0} max={MAX_PCT} step={1} value={pct} onChange={(e) => syncFromPct(Number(e.target.value))}
              style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', height: 12 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[20, 40, 60, 80].map((p) => (
              <button key={p} className={`btn btn-sm ${pct === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => syncFromPct(p)}>{p}%</button>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', background: 'var(--surface-2)' }}>
          <div className="field-label">Atau masukkan nilai anggaran langsung</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700 }}>Rp</span>
            <input
              type="text" inputMode="numeric" className="input" placeholder="Contoh: 800000000"
              value={inputAmount ? Number(inputAmount).toLocaleString('id-ID') : ''}
              onChange={(e) => handleAmountChange(e.target.value)}
              onFocus={() => { amountFocused.current = true }}
              onBlur={handleAmountBlur}
              disabled={loading || totalIncome === 0}
              style={{ flex: 1 }}
            />
          </div>
          {amountExceedsLimit && (
            <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', marginTop: 6 }}>
              Melebihi batas 80%. Nilai akan dikunci ke maks. {formatRupiah(Math.round(totalIncome * MAX_PCT / 100))}
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="alert alert-success" style={{ margin: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Dana Dapat Diambil ({pct}%)</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{loading ? '...' : formatRupiah(taken)}</span>
          </div>
          <div className="alert alert-warning" style={{ margin: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Sisa Pemasukan ({parseFloat((100 - pct).toFixed(1))}%)</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{loading ? '...' : formatRupiah(remaining)}</span>
          </div>
        </div>
      </div>

      {!loading && data && data.units.length > 0 && (
        <div className="table-wrap" style={{ marginTop: '1.5rem' }}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>{['Unit', 'Total Pemasukan', `Dana Diambil (${pct}%)`, 'Sisa', 'Proporsi'].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.units.map((u) => {
                  const unitTaken = Math.round(u.totalIncome * pct / 100)
                  const unitRemaining = u.totalIncome - unitTaken
                  const portion = totalIncome > 0 ? (u.totalIncome / totalIncome) * 100 : 0
                  return (
                    <tr key={u.unit.id}>
                      <td style={{ fontWeight: 600 }}>{u.unit.name}</td>
                      <td className="num muted">{formatRupiahShort(u.totalIncome)}</td>
                      <td className="num" style={{ color: 'var(--success)', fontWeight: 700 }}>{formatRupiahShort(unitTaken)}</td>
                      <td className="num" style={{ color: 'var(--warning)' }}>{formatRupiahShort(unitRemaining)}</td>
                      <td>{portion.toFixed(1)}%</td>
                    </tr>
                  )
                })}
                <tr>
                  <td style={{ fontWeight: 700 }}>Total</td>
                  <td className="num" style={{ fontWeight: 700 }}>{formatRupiahShort(totalIncome)}</td>
                  <td className="num" style={{ fontWeight: 700, color: 'var(--success)' }}>{formatRupiahShort(taken)}</td>
                  <td className="num" style={{ fontWeight: 700, color: 'var(--warning)' }}>{formatRupiahShort(remaining)}</td>
                  <td>100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
