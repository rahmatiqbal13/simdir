'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useToast } from '@/app/components/Toast'
import { formatRupiah, formatRupiahShort } from '@/lib/utils/format'

function getYearRange(count = 5, offset = 2) {
  const current = new Date().getFullYear()
  return Array.from({ length: count }, (_, i) => current - offset + i)
}

export default function KelolaTargetPage() {
  const { success: toastSuccess, error: toastError } = useToast()
  const [units, setUnits] = useState([])
  const [targets, setTargets] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [editMap, setEditMap] = useState({})
  const [saving, setSaving] = useState({})
  const [loading, setLoading] = useState(true)

  const loadUnits = useCallback(async () => {
    const res = await fetch('/api/unit-usaha')
    if (res.ok) setUnits((await res.json()).filter((u) => u.aktif))
  }, [])

  const loadTargets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/target-unit-usaha?tahun=${year}`)
      if (res.ok) setTargets(await res.json())
      else toastError('Gagal memuat data target')
    } catch {
      toastError('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }, [year, toastError])

  useEffect(() => { loadUnits() }, [loadUnits])
  useEffect(() => { loadTargets() }, [loadTargets])

  function getTarget(unitId) { return targets.find((t) => t.unit_usaha_id === unitId) }
  function getEditValue(unitId) {
    if (editMap[unitId] !== undefined) return editMap[unitId]
    const t = getTarget(unitId)
    return t ? String(t.target_tahunan) : ''
  }

  async function saveTarget(unitId) {
    const value = editMap[unitId]
    if (value === undefined) return
    setSaving((s) => ({ ...s, [unitId]: true }))
    try {
      const res = await fetch('/api/target-unit-usaha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit_usaha_id: unitId, tahun: year, target_tahunan: Number(value) || 0 }),
      })
      const data = await res.json()
      if (!res.ok) { toastError(data.error || 'Gagal menyimpan target'); return }
      toastSuccess('Target berhasil disimpan')
      setEditMap((m) => { const n = { ...m }; delete n[unitId]; return n })
      loadTargets()
    } finally {
      setSaving((s) => ({ ...s, [unitId]: false }))
    }
  }

  const years = getYearRange(5, 2)
  const totalAnnual = targets.reduce((s, t) => s + t.target_tahunan, 0)

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Kelola Target</h1>
          <p className="page-subtitle">Atur target pemasukan tahunan per unit usaha. Target bulanan dihitung otomatis (Target Tahunan ÷ 12), dan target efektif per bulan mengikuti rolling carryover dari realisasi bulan sebelumnya.</p>
        </div>
        <div className="page-actions">
          <Link href="/pemasukan-unit-usaha" className="btn btn-ghost">Kembali ke Dashboard</Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
        <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ maxWidth: 120 }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="alert alert-info" style={{ margin: 0, flex: 1 }}>
          <span>Total Target {year}: <strong>{formatRupiah(totalAnnual)}</strong></span>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
          <h3>Memuat data...</h3>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>{['Unit Usaha', 'Target Tahunan (Rp)', 'Target Bulanan', 'Aksi'].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {units.map((unit) => {
                  const editVal = getEditValue(unit.id)
                  const monthly = editVal ? Math.round(Number(editVal) / 12) : 0
                  const isDirty = editMap[unit.id] !== undefined
                  return (
                    <tr key={unit.id}>
                      <td style={{ fontWeight: 600 }}>{unit.nama}</td>
                      <td className="text-right">
                        <input
                          type="number"
                          min="0"
                          className="input"
                          value={editVal}
                          onChange={(e) => setEditMap((m) => ({ ...m, [unit.id]: e.target.value }))}
                          placeholder="0"
                          style={{ maxWidth: 200, textAlign: 'right', display: 'inline-block' }}
                        />
                      </td>
                      <td className="num muted">{formatRupiahShort(monthly)}</td>
                      <td>
                        {isDirty && (
                          <button className="btn btn-primary" onClick={() => saveTarget(unit.id)} disabled={saving[unit.id]}>
                            {saving[unit.id] ? 'Menyimpan...' : 'Simpan'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {units.length === 0 && (
                  <tr><td colSpan={4} className="text-center muted" style={{ padding: '2rem' }}>Belum ada unit usaha aktif</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
