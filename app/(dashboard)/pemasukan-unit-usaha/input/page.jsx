'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useToast } from '@/app/components/Toast'
import ConfirmModal from '@/app/components/ConfirmModal'
import { formatRupiah } from '@/lib/utils/format'

const MONTH_NAMES_FULL = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const MONTH_OPTS = MONTH_NAMES_FULL.slice(1).map((n, i) => ({ value: i + 1, label: n }))

function getYearRange(count = 6, offset = 3) {
  const current = new Date().getFullYear()
  return Array.from({ length: count }, (_, i) => current - offset + i)
}

const BLANK = { unit_usaha_id: '', tahun: String(new Date().getFullYear()), bulan: '', jumlah: '', keterangan: '' }

export default function InputPemasukanPage() {
  const { success: toastSuccess, error: toastError } = useToast()
  const [units, setUnits] = useState([])
  const [records, setRecords] = useState([])
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterUnit, setFilterUnit] = useState('')
  const [form, setForm] = useState(BLANK)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [deleteItem, setDeleteItem] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadUnits = useCallback(async () => {
    try {
      const res = await fetch('/api/unit-usaha')
      if (res.ok) setUnits((await res.json()).filter((u) => u.aktif))
      else toastError('Gagal memuat data unit usaha')
    } catch {
      toastError('Gagal terhubung ke server')
    }
  }, [toastError])

  const loadRecords = useCallback(async () => {
    const params = new URLSearchParams({ tahun: String(filterYear) })
    if (filterUnit) params.set('unit_usaha_id', filterUnit)
    const res = await fetch(`/api/pemasukan-unit-usaha?${params}`)
    if (res.ok) setRecords(await res.json())
    else toastError('Gagal memuat data pemasukan')
  }, [filterYear, filterUnit, toastError])

  useEffect(() => { loadUnits() }, [loadUnits])
  useEffect(() => { loadRecords() }, [loadRecords])

  const filteredRecords = useMemo(() => {
    let result = [...records]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((r) =>
        (r.unit_usaha?.nama || '').toLowerCase().includes(q) ||
        String(r.tahun).includes(q) ||
        MONTH_NAMES_FULL[r.bulan].toLowerCase().includes(q) ||
        (r.keterangan || '').toLowerCase().includes(q)
      )
    }
    return result.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  }, [records, search])

  function isRecordLocked(r) { return r.locked }

  function openEdit(r) {
    setEditId(r.id)
    setForm({ unit_usaha_id: r.unit_usaha_id, tahun: String(r.tahun), bulan: String(r.bulan), jumlah: String(r.jumlah), keterangan: r.keterangan || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() { setEditId(null); setForm(BLANK) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        unit_usaha_id: form.unit_usaha_id,
        tahun: Number(form.tahun),
        bulan: Number(form.bulan),
        jumlah: Number(form.jumlah) || 0,
        keterangan: form.keterangan || null,
      }
      const res = editId
        ? await fetch(`/api/pemasukan-unit-usaha/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/pemasukan-unit-usaha', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { toastError(data.error || 'Gagal menyimpan data'); return }
      toastSuccess(editId ? 'Data berhasil diperbarui' : 'Data berhasil disimpan')
      setEditId(null)
      setForm(BLANK)
      loadRecords()
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/pemasukan-unit-usaha/${deleteItem.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await loadRecords()
      setDeleteItem(null)
      toastSuccess('Data berhasil dihapus')
    } catch (err) {
      toastError(err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleLock(id) {
    const res = await fetch(`/api/pemasukan-unit-usaha/${id}/lock`, { method: 'POST' })
    if (!res.ok) { toastError('Gagal mengunci data'); return }
    toastSuccess('Data berhasil dikunci')
    loadRecords()
  }

  async function handleUnlock(id) {
    const res = await fetch(`/api/pemasukan-unit-usaha/${id}/unlock`, { method: 'POST' })
    if (!res.ok) { toastError('Gagal membuka kunci'); return }
    toastSuccess('Data berhasil dibuka kunci')
    loadRecords()
  }

  const years = getYearRange(6, 3)

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Input Pemasukan</h1>
          <p className="page-subtitle">Catat realisasi pemasukan bulanan per unit usaha.</p>
        </div>
        <div className="page-actions">
          <Link href="/pemasukan-unit-usaha" className="btn btn-ghost">Kembali ke Dashboard</Link>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 0.25rem' }}>{editId ? 'Edit Pemasukan' : 'Tambah Pemasukan'}</h2>
        <p className="muted" style={{ fontSize: '0.8125rem', marginBottom: '1rem' }}>Satu baris data mewakili realisasi satu unit usaha untuk satu bulan.</p>
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="field-label">Unit Usaha</label>
              <select className="select" required value={form.unit_usaha_id} onChange={(e) => setForm({ ...form, unit_usaha_id: e.target.value })} disabled={!!editId}>
                <option value="">– Pilih Unit –</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Tahun</label>
              <select className="select" value={form.tahun} onChange={(e) => setForm({ ...form, tahun: e.target.value })} disabled={!!editId}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Bulan</label>
              <select className="select" required value={form.bulan} onChange={(e) => setForm({ ...form, bulan: e.target.value })} disabled={!!editId}>
                <option value="">– Pilih Bulan –</option>
                {MONTH_OPTS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Jumlah Pemasukan (Rp)</label>
              <input type="number" min="0" className="input" required placeholder="Contoh: 50000000" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label className="field-label">Keterangan (opsional)</label>
            <input type="text" className="input" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} placeholder="Keterangan pemasukan" />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            {editId && <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Batal</button>}
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <select className="select" value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} style={{ maxWidth: 120 }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="select" value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">Semua Unit</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>{['Unit', 'Tahun', 'Bulan', 'Pemasukan', 'Keterangan', 'Status', 'Aksi'].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr><td colSpan={7} className="text-center muted" style={{ padding: '2rem' }}>Belum ada data pemasukan</td></tr>
              ) : filteredRecords.map((r) => {
                const locked = isRecordLocked(r)
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.unit_usaha?.nama || '-'}</td>
                    <td className="num muted">{r.tahun}</td>
                    <td>{MONTH_NAMES_FULL[r.bulan]}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{formatRupiah(r.jumlah)}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.keterangan || '-'}</td>
                    <td>
                      {locked ? (
                        <span className="badge badge-neutral">Terkunci</span>
                      ) : (
                        <span className="badge badge-success">Terbuka</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        {r.locked ? (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleUnlock(r.id)} title="Buka Kunci">Buka</button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleLock(r.id)} title="Kunci" disabled={locked}>Kunci</button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)} disabled={locked}>Edit</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteItem(r)} disabled={locked}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteItem}
        title="Hapus Data Pemasukan"
        message={<>Yakin ingin menghapus data pemasukan <strong>{deleteItem?.unit_usaha?.nama}</strong> bulan <strong>{deleteItem ? MONTH_NAMES_FULL[deleteItem.bulan] : ''}</strong>?</>}
        confirmLabel="Ya, Hapus"
        busy={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  )
}
