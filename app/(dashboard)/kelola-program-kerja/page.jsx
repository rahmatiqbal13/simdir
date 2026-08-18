'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@/app/components/Toast'
import ConfirmModal from '@/app/components/ConfirmModal'
import { useUnitKerja } from '@/context/UnitKerjaContext'

// Urutan tampil yang disukai — cuma dipakai sebagai hint pengurutan, BUKAN
// sumber data tab. Tab yang benar-benar tampil diambil dari unit_kerja yang
// kode-nya diawali "pui-" (lihat `puiTabs` di bawah), supaya kalau admin
// mengubah/menghapus/menambah unit kerja PUI lewat Pengaturan > Unit Kerja,
// tab di sini ikut berubah otomatis alih-alih diam-diam rusak (lihat juga
// ProgramKerjaTvPanel.jsx yang punya masalah sama untuk panel TV internal).
const PUI_ORDER = ['pui-olah', 'pui-dis', 'pui-seni', 'pui-ai']

const STATUS_META = {
  belum_berjalan:   { label: 'Belum Berjalan',   bg: 'var(--surface-3)', color: 'var(--text-2)' },
  akan_berlangsung: { label: 'Akan Berlangsung', bg: 'var(--info-50)',   color: 'var(--info)' },
  berlangsung:      { label: 'Berlangsung',      bg: 'var(--warning-50)', color: 'var(--warning)' },
  selesai:          { label: 'Selesai',          bg: 'var(--success-50)', color: 'var(--success)' },
}

const EMPTY_FORM = {
  nama_program: '', deskripsi: '', anggaran: '', status: 'belum_berjalan',
  tanggal_mulai: '', tanggal_selesai: '', nominal_spj: '',
}

const fmtRupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

export default function KelolaProgramKerjaPage() {
  const { success: toastSuccess, error: toastError } = useToast()
  const { units, loading: unitsLoading } = useUnitKerja()

  const puiTabs = useMemo(() => (
    units
      .filter((u) => u.kode?.startsWith('pui-'))
      .map((u) => ({ kode: u.kode, label: u.nama }))
      .sort((a, b) => {
        const ia = PUI_ORDER.indexOf(a.kode)
        const ib = PUI_ORDER.indexOf(b.kode)
        return (ia === -1 ? PUI_ORDER.length : ia) - (ib === -1 ? PUI_ORDER.length : ib)
      })
  ), [units])

  const [activeTab, setActiveTab] = useState('')
  // Pilih tab pertama begitu daftar unit PUI selesai dimuat, dan pindah
  // otomatis kalau tab yang sedang aktif ternyata sudah tidak ada lagi
  // (unit-nya dihapus/kode-nya diubah di Pengaturan > Unit Kerja).
  useEffect(() => {
    if (puiTabs.length === 0) return
    if (!puiTabs.some((t) => t.kode === activeTab)) {
      setActiveTab(puiTabs[0].kode)
    }
  }, [puiTabs, activeTab])

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteItem, setDeleteItem] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const authHeaders = useCallback(() => {
    try {
      const s = localStorage.getItem('simdir_session')
      if (!s) return { 'Content-Type': 'application/json' }
      const d = JSON.parse(atob(s))
      return { 'Content-Type': 'application/json', authorization: `Bearer ${d.token || d.role || 'session'}` }
    } catch { return { 'Content-Type': 'application/json' } }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/program-kerja', { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(data || [])
    } catch (err) {
      toastError('Gagal memuat data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders, toastError])

  useEffect(() => { fetchData() }, [fetchData])

  const activeUnit = useMemo(() => units.find((u) => u.kode === activeTab), [units, activeTab])
  const tabItems = useMemo(
    () => items.filter((it) => it.unit_kerja?.kode === activeTab),
    [items, activeTab]
  )

  const summary = useMemo(() => {
    const totalAnggaran = tabItems.reduce((sum, it) => sum + Number(it.anggaran || 0), 0)
    const totalSpj = tabItems.reduce((sum, it) => sum + Number(it.nominal_spj || 0), 0)
    const byStatus = Object.fromEntries(
      Object.keys(STATUS_META).map((s) => [s, tabItems.filter((it) => it.status === s).length])
    )
    return { totalAnggaran, totalSpj, byStatus }
  }, [tabItems])

  const openCreate = () => {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setForm({
      nama_program: item.nama_program || '',
      deskripsi: item.deskripsi || '',
      anggaran: String(item.anggaran ?? ''),
      status: item.status || 'belum_berjalan',
      tanggal_mulai: item.tanggal_mulai || '',
      tanggal_selesai: item.tanggal_selesai || '',
      nominal_spj: item.nominal_spj !== null && item.nominal_spj !== undefined ? String(item.nominal_spj) : '',
    })
    setShowForm(true)
  }

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nama_program.trim()) return toastError('Nama program wajib diisi')
    if (form.anggaran === '' || Number(form.anggaran) < 0) return toastError('Anggaran wajib diisi dengan angka yang valid')

    setSaving(true)
    try {
      const payload = { ...form, unit_kerja_id: activeUnit?.id }
      const url = editingItem ? `/api/program-kerja/${editingItem.id}` : '/api/program-kerja'
      const method = editingItem ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toastSuccess(editingItem ? 'Program kerja diperbarui' : 'Program kerja ditambahkan')
      setShowForm(false)
      await fetchData()
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/program-kerja/${deleteItem.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) throw new Error((await res.json()).error)
      toastSuccess('Program kerja dihapus')
      setDeleteItem(null)
      await fetchData()
    } catch (err) {
      toastError('Gagal menghapus: ' + err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Program Kerja PUI</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', margin: 0 }}>
            Kelola program kerja, anggaran, status, dan SPJ dari masing-masing PUI
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} disabled={!activeUnit}>+ Tambah Program</button>
      </div>

      {/* Tabs PUI */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {unitsLoading ? (
          <div style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', color: 'var(--text-3)' }}>Memuat unit kerja…</div>
        ) : puiTabs.length === 0 ? (
          <div style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', color: 'var(--text-3)' }}>
            Belum ada unit kerja PUI. Tambahkan di Pengaturan → Unit Kerja dengan kode diawali "pui-".
          </div>
        ) : puiTabs.map((tab) => (
          <button
            key={tab.kode}
            onClick={() => setActiveTab(tab.kode)}
            style={{
              padding: '0.625rem 1rem', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 600,
              color: activeTab === tab.kode ? 'var(--primary)' : 'var(--text-3)',
              borderBottom: activeTab === tab.kode ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ringkasan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={summaryCardStyle}>
          <div style={summaryValueStyle}>{fmtRupiah(summary.totalAnggaran)}</div>
          <div style={summaryLabelStyle}>Total Anggaran</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={summaryValueStyle}>{fmtRupiah(summary.totalSpj)}</div>
          <div style={summaryLabelStyle}>Total SPJ Terpakai</div>
        </div>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div key={key} style={summaryCardStyle}>
            <div style={{ ...summaryValueStyle, color: meta.color }}>{summary.byStatus[key] || 0}</div>
            <div style={summaryLabelStyle}>{meta.label}</div>
          </div>
        ))}
      </div>

      {/* Tabel */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                {['Nama Program', 'Anggaran', 'Status', 'Nominal SPJ', 'Periode', 'Aksi'].map((h) => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>Memuat...</td></tr>
              ) : tabItems.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>Belum ada program kerja untuk unit ini</td></tr>
              ) : tabItems.map((item) => {
                const meta = STATUS_META[item.status] || STATUS_META.belum_berjalan
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--surface-3)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{item.nama_program}</div>
                      {item.deskripsi && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>{item.deskripsi}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>{fmtRupiah(item.anggaran)}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: meta.bg, color: meta.color, whiteSpace: 'nowrap' }}>
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                      {item.nominal_spj !== null && item.nominal_spj !== undefined ? fmtRupiah(item.nominal_spj) : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-2)', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                      {item.tanggal_mulai || item.tanggal_selesai
                        ? `${fmtDate(item.tanggal_mulai)} – ${fmtDate(item.tanggal_selesai)}`
                        : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <button onClick={() => openEdit(item)} className="btn btn-ghost btn-sm" style={{ marginRight: 6 }}>Edit</button>
                      <button onClick={() => setDeleteItem(item)} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>Hapus</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Tambah/Edit */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{editingItem ? 'Edit Program Kerja' : 'Tambah Program Kerja'}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowForm(false)} aria-label="Tutup" style={{ minWidth: 44, minHeight: 44 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field">
                  <label className="field-label">Unit / PUI</label>
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: '0.875rem' }}>
                    {activeUnit?.nama}
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="nama_program">Nama Program *</label>
                  <input id="nama_program" name="nama_program" className="input" value={form.nama_program} onChange={(e) => set('nama_program', e.target.value)} placeholder="Mis. Pelatihan Atlet Difabel" />
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="deskripsi">Deskripsi (opsional)</label>
                  <textarea id="deskripsi" name="deskripsi" className="textarea" rows={3} value={form.deskripsi} onChange={(e) => set('deskripsi', e.target.value)} placeholder="Penjelasan singkat program kerja" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                  <div className="field">
                    <label className="field-label" htmlFor="anggaran">Anggaran (Rp) *</label>
                    <input id="anggaran" name="anggaran" type="number" min="0" step="0.01" className="input" value={form.anggaran} onChange={(e) => set('anggaran', e.target.value)} placeholder="0" />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="status">Status *</label>
                    <select id="status" name="status" className="select" value={form.status} onChange={(e) => set('status', e.target.value)}>
                      {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                  <div className="field">
                    <label className="field-label" htmlFor="tanggal_mulai">Tanggal Mulai <span className="muted">(opsional)</span></label>
                    <input id="tanggal_mulai" name="tanggal_mulai" type="date" className="input" value={form.tanggal_mulai} onChange={(e) => set('tanggal_mulai', e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="tanggal_selesai">Tanggal Selesai <span className="muted">(opsional)</span></label>
                    <input id="tanggal_selesai" name="tanggal_selesai" type="date" className="input" value={form.tanggal_selesai} onChange={(e) => set('tanggal_selesai', e.target.value)} />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="nominal_spj">Nominal SPJ (Rp) <span className="muted">(opsional — isi kalau program sudah selesai)</span></label>
                  <input id="nominal_spj" name="nominal_spj" type="number" min="0" step="0.01" className="input" value={form.nominal_spj} onChange={(e) => set('nominal_spj', e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Tambah Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteItem}
        title="Hapus Program Kerja"
        message={<>Yakin ingin menghapus <strong>{deleteItem?.nama_program}</strong>? Tindakan ini tidak dapat dibatalkan.</>}
        confirmLabel="Ya, Hapus"
        busy={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  )
}

const summaryCardStyle = { background: 'var(--surface)', borderRadius: 12, padding: '1rem 1.25rem', border: '1px solid var(--border)' }
const summaryValueStyle = { fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }
const summaryLabelStyle = { fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, marginTop: 4 }
