'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useToast } from '@/app/components/Toast'

export default function KelolaUnitUsahaPage() {
  const { success: toastSuccess, error: toastError } = useToast()
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const loadUnits = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/unit-usaha')
      if (res.ok) setUnits(await res.json())
      else toastError('Gagal memuat data unit usaha')
    } catch {
      toastError('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }, [toastError])

  useEffect(() => { loadUnits() }, [loadUnits])

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/unit-usaha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: newName }),
      })
      const data = await res.json()
      if (!res.ok) { toastError(data.error || 'Gagal menambah unit'); return }
      toastSuccess('Unit usaha berhasil ditambahkan')
      setNewName('')
      loadUnits()
    } finally {
      setAdding(false)
    }
  }

  async function toggleActive(unit) {
    const res = await fetch(`/api/unit-usaha/${unit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aktif: !unit.aktif }),
    })
    if (!res.ok) { toastError('Gagal mengubah status unit'); return }
    loadUnits()
    toastSuccess(`Unit berhasil ${!unit.aktif ? 'diaktifkan' : 'dinonaktifkan'}`)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Kelola Unit Usaha</h1>
          <p className="page-subtitle">Kelola daftar unit usaha yang dicatat pemasukannya. Unit yang dinonaktifkan tidak akan muncul di form input, dashboard, maupun laporan baru — data historisnya tetap tersimpan.</p>
        </div>
        <div className="page-actions">
          <Link href="/pemasukan-unit-usaha" className="btn btn-ghost">Kembali ke Dashboard</Link>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 0.75rem' }}>Tambah Unit Usaha Baru</h2>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem' }}>
          <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama unit usaha" style={{ flex: 1 }} />
          <button type="submit" className="btn btn-primary" disabled={adding}>{adding ? 'Menyimpan...' : 'Tambah'}</button>
        </form>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>{['Unit Usaha', 'Status', 'Aksi'].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="text-center muted" style={{ padding: '2rem' }}>Memuat...</td></tr>
              ) : units.length === 0 ? (
                <tr><td colSpan={3} className="text-center muted" style={{ padding: '2rem' }}>Belum ada unit usaha</td></tr>
              ) : units.map((unit) => (
                <tr key={unit.id}>
                  <td style={{ fontWeight: 600 }}>{unit.nama}</td>
                  <td>
                    <span className={`badge ${unit.aktif ? 'badge-success' : 'badge-neutral'}`}>{unit.aktif ? 'Aktif' : 'Nonaktif'}</span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(unit)}>
                      {unit.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
