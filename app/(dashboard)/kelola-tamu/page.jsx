'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/app/components/Toast'
import ConfirmModal from '@/app/components/ConfirmModal'
import { useFocusTrap } from '@/app/components/useFocusTrap'

const ITEMS_PER_PAGE = 15

const KEPERLUAN_META = {
  kunjungan_kerja:  { label: 'Kunjungan Kerja',    color: 'var(--info)',    bg: 'var(--info-50)' },
  studi_banding:    { label: 'Studi Banding',      color: 'var(--success)', bg: 'var(--success-50)' },
  kerja_sama:       { label: 'Kerja Sama',         color: 'var(--primary)', bg: 'var(--primary-50)' },
  wawancara_media:  { label: 'Wawancara / Media',  color: 'var(--warning)', bg: 'var(--warning-50)' },
  lainnya:          { label: 'Lainnya',            color: 'var(--text-2)', bg: 'var(--surface-3)' },
}

const selectStyle = { padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }

export default function KelolaTamuPage() {
  const { success, error } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterKeperluan, setFilterKeperluan] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const detailModalRef = useFocusTrap(!!selectedItem, () => setSelectedItem(null))

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
      const res = await fetch('/api/tamu', { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(data || [])
    } catch (err) {
      error('Gagal memuat data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders, error])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = items.filter((it) => {
    if (filterKeperluan && it.keperluan !== filterKeperluan) return false
    if (search) {
      const q = search.toLowerCase()
      const haystack = `${it.nama_lengkap} ${it.instansi} ${it.unit_dituju}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const pageItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  // Kembali ke halaman 1 setiap kali pencarian/filter berubah, dan jangan
  // pernah "terdampar" di halaman yang sudah tidak ada datanya lagi.
  useEffect(() => { setCurrentPage(1) }, [search, filterKeperluan])
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const today = new Date().toDateString()
  const stats = {
    total: items.length,
    hariIni: items.filter((i) => new Date(i.created_at).toDateString() === today).length,
    rombongan: items.reduce((sum, i) => sum + (i.jumlah_rombongan || 1), 0),
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/tamu?id=${deleteItem.id}`, { method: 'DELETE', headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await fetchData()
      if (selectedItem?.id === deleteItem.id) setSelectedItem(null)
      setDeleteItem(null)
      success('Data tamu berhasil dihapus')
    } catch (err) {
      error('Gagal menghapus: ' + err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Daftar Tamu</h1>
          <p className="page-subtitle">Catatan kunjungan tamu yang mengisi buku tamu digital.</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Tamu', value: stats.total },
          { label: 'Hari Ini', value: stats.hariIni },
          { label: 'Total Rombongan', value: stats.rombongan },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, instansi, atau unit…"
          style={{ ...selectStyle, flex: 1, minWidth: 220 }}
        />
        <select value={filterKeperluan} onChange={(e) => setFilterKeperluan(e.target.value)} style={selectStyle}>
          <option value="">Semua Keperluan</option>
          {Object.entries(KEPERLUAN_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
        {(search || filterKeperluan) && (
          <button onClick={() => { setSearch(''); setFilterKeperluan('') }} className="btn btn-ghost">Reset</button>
        )}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {['Tanggal', 'Nama', 'Instansi', 'Keperluan', 'Unit Dituju', 'Rombongan', 'Aksi'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center muted" style={{ padding: '2rem' }}>Memuat…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center muted" style={{ padding: '2rem' }}>Belum ada tamu tercatat</td></tr>
              ) : pageItems.map((item) => {
                const km = KEPERLUAN_META[item.keperluan] || KEPERLUAN_META.lainnya
                return (
                  <tr key={item.id}>
                    <td className="num muted" style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{fmtDate(item.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{item.nama_lengkap}</td>
                    <td>{item.instansi}</td>
                    <td>
                      <span className="badge" style={{ background: km.bg, color: km.color, borderColor: 'transparent' }}>{km.label}</span>
                    </td>
                    <td>{item.unit_dituju}</td>
                    <td className="text-center num">{item.jumlah_rombongan}</td>
                    <td className="text-right">
                      <div style={{ display: 'inline-flex', gap: 10 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelectedItem(item)} title="Detail" aria-label="Lihat detail">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteItem(item)} title="Hapus" aria-label="Hapus data tamu" style={{ color: 'var(--danger)' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <span className="muted" style={{ fontSize: '0.8125rem' }}>
            Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} dari {filtered.length} tamu
          </span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Halaman sebelumnya"
              >
                ‹
              </button>
              <span className="muted" style={{ fontSize: '0.8125rem', padding: '0 0.25rem' }}>
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Halaman berikutnya"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)} ref={detailModalRef} role="dialog" aria-modal="true" aria-labelledby="tamu-detail-title">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3 id="tamu-detail-title">Detail Tamu</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelectedItem(null)} aria-label="Tutup">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Detail label="Nama Lengkap" value={selectedItem.nama_lengkap} />
              <Detail label="Instansi / Asal" value={selectedItem.instansi} />
              {selectedItem.telepon && <Detail label="No. HP" value={selectedItem.telepon} />}
              {selectedItem.email && <Detail label="Email" value={selectedItem.email} />}
              <Detail label="Keperluan" value={(KEPERLUAN_META[selectedItem.keperluan] || KEPERLUAN_META.lainnya).label} />
              {selectedItem.keperluan_detail && <Detail label="Keterangan Keperluan" value={selectedItem.keperluan_detail} />}
              <Detail label="Unit/Fasilitas Dituju" value={selectedItem.unit_dituju} />
              {selectedItem.nama_ditemui && <Detail label="Nama yang Ditemui" value={selectedItem.nama_ditemui} />}
              <Detail label="Jumlah Rombongan" value={String(selectedItem.jumlah_rombongan)} />
              <Detail label="Waktu Kunjungan" value={fmtDate(selectedItem.created_at)} />
              {selectedItem.foto_url && (
                <div>
                  <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 6 }}>Foto</div>
                  <img src={selectedItem.foto_url} alt="Foto tamu" style={{ width: 160, height: 160, objectFit: 'cover', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)' }} />
                </div>
              )}
              {selectedItem.tanda_tangan && (
                <div>
                  <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 6 }}>Tanda Tangan</div>
                  <img src={selectedItem.tanda_tangan} alt="Tanda tangan tamu" style={{ maxWidth: '100%', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)' }} />
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => setSelectedItem(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteItem}
        title="Hapus Data Tamu"
        message={<>Yakin ingin menghapus data kunjungan <strong>{deleteItem?.nama_lengkap}</strong>? Tindakan ini tidak dapat dibatalkan.</>}
        confirmLabel="Ya, Hapus"
        busy={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>{value}</div>
    </div>
  )
}
