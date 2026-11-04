'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import ConfirmModal from '@/app/components/ConfirmModal'
import { TV_LAYAR, TV_LAYAR_UNIT, HARI } from '@/lib/tvLayar'

// Urutan hari Senin → Minggu (indeks getDay)
const URUT_HARI = [1, 2, 3, 4, 5, 6, 0]
const KOSONG = { nama: '', hari: [], waktu_mulai: '', waktu_selesai: '', pelatih: '', lokasi: '', aktif: true }

const jam = (t) => (t ? t.slice(0, 5).replace(':', '.') : '')
const hariLabel = (hari) => {
  const h = [...hari].sort((a, b) => URUT_HARI.indexOf(a) - URUT_HARI.indexOf(b))
  if (h.length === 7) return 'Setiap hari'
  if (h.join() === '1,2,3,4,5') return 'Senin – Jumat'
  return h.map(i => HARI[i]).join(', ')
}

// ============ AGENDA KOLAM / AGENDA SSFC ============
// Kelas rutin mingguan (tabel tv_kelas) satu layar unit. Tampil di
// "Kelas hari ini" TV /agenda/tv/<layar>, digabung dengan agenda publik.
export default function JadwalKelasPage() {
  const { layar } = useParams()
  const cfg = TV_LAYAR_UNIT.includes(layar) ? TV_LAYAR[layar] : null

  const [kelas, setKelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(KOSONG)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  const load = useCallback(async () => {
    if (!cfg) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tv-kelas?layar=${layar}`, { cache: 'no-cache' })
      if (!res.ok) throw new Error()
      setKelas(await res.json())
    } catch {
      showMessage('error', 'Gagal memuat daftar kelas')
    } finally {
      setLoading(false)
    }
  }, [cfg, layar])

  useEffect(() => { load() }, [load])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleHari = (i) => setForm(f => ({ ...f, hari: f.hari.includes(i) ? f.hari.filter(x => x !== i) : [...f.hari, i] }))
  const resetForm = () => { setForm(KOSONG); setEditId(null) }
  const startEdit = (k) => {
    setEditId(k.id)
    setForm({ nama: k.nama, hari: k.hari || [], waktu_mulai: k.waktu_mulai?.slice(0, 5) || '', waktu_selesai: k.waktu_selesai?.slice(0, 5) || '', pelatih: k.pelatih || '', lokasi: k.lokasi || '', aktif: k.aktif })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async () => {
    if (!form.nama.trim()) return showMessage('error', 'Masukkan nama kelas')
    if (!form.hari.length) return showMessage('error', 'Pilih minimal satu hari')
    if (!form.waktu_mulai) return showMessage('error', 'Isi jam mulai')
    setSaving(true)
    try {
      const res = await fetch(editId ? `/api/tv-kelas/${editId}` : '/api/tv-kelas', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, layar }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')
      showMessage('success', `Kelas "${data.nama}" ${editId ? 'diperbarui' : 'ditambahkan'}. TV akan update dalam 5 menit.`)
      resetForm()
      load()
    } catch (err) {
      showMessage('error', err.message || 'Gagal menyimpan kelas')
    } finally {
      setSaving(false)
    }
  }

  const toggleAktif = async (k) => {
    try {
      const res = await fetch(`/api/tv-kelas/${k.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aktif: !k.aktif }),
      })
      if (!res.ok) throw new Error()
      setKelas(prev => prev.map(x => (x.id === k.id ? { ...x, aktif: !k.aktif } : x)))
    } catch {
      showMessage('error', 'Gagal mengubah status kelas')
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/tv-kelas/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setKelas(prev => prev.filter(x => x.id !== deleteTarget.id))
      if (editId === deleteTarget.id) resetForm()
      showMessage('success', `Kelas "${deleteTarget.nama}" dihapus`)
      setDeleteTarget(null)
    } catch {
      showMessage('error', 'Gagal menghapus kelas')
    } finally {
      setDeleting(false)
    }
  }

  if (!cfg) return <p style={{ color: 'var(--text-3)' }}>Layar &ldquo;{layar}&rdquo; tidak dikenal.</p>

  const input = { width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }
  const label = { display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text)' }
  const card = { background: 'var(--surface)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)' }
  const chip = (active) => ({
    padding: '0.375rem 0.75rem', borderRadius: '99px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : 'var(--text-2)',
  })
  const smallBtn = { padding: '0.375rem 0.625rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }

  const hariIni = new Date().getDay()
  const jumlahHariIni = kelas.filter(k => k.aktif && k.hari?.includes(hariIni)).length

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Agenda {cfg.nama}</h1>
          <p className="page-subtitle">
            Kelas rutin mingguan untuk TV {cfg.nama}. Kelas yang jatuh hari ini tampil otomatis di &ldquo;{cfg.jadwalLabel}&rdquo;.
          </p>
        </div>
      </div>

      {message.text && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          background: message.type === 'error' ? 'var(--danger-50)' : 'var(--success-50)',
          border: `1px solid ${message.type === 'error' ? 'var(--danger-100)' : 'var(--success-100)'}`,
          color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1rem' }}>{message.type === 'error' ? '✕' : '✓'}</span>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '2rem', alignItems: 'start' }}>
        {/* Form tambah / edit */}
        <div style={card}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem' }}>{editId ? 'Edit Kelas' : 'Tambah Kelas Rutin'}</h2>

          <div style={{ marginBottom: '1rem' }}>
            <label style={label}>Nama kelas</label>
            <input type="text" value={form.nama} onChange={(e) => set('nama', e.target.value)} maxLength={120}
              placeholder={layar === 'ssfc' ? 'mis. Senam Aerobik' : 'mis. Kelas Renang Anak'} style={input} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={label}>Hari</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {URUT_HARI.map(i => (
                <button key={i} type="button" aria-pressed={form.hari.includes(i)} onClick={() => toggleHari(i)} style={chip(form.hari.includes(i))}>{HARI[i]}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={label}>Jam mulai</label>
              <input type="time" value={form.waktu_mulai} onChange={(e) => set('waktu_mulai', e.target.value)} style={input} />
            </div>
            <div>
              <label style={label}>Jam selesai</label>
              <input type="time" value={form.waktu_selesai} onChange={(e) => set('waktu_selesai', e.target.value)} style={input} />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={label}>Pelatih</label>
            <input type="text" value={form.pelatih} onChange={(e) => set('pelatih', e.target.value)} maxLength={120} placeholder="Opsional" style={input} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={label}>Lokasi / area</label>
            <input type="text" value={form.lokasi} onChange={(e) => set('lokasi', e.target.value)} maxLength={120}
              placeholder={layar === 'ssfc' ? 'Opsional — mis. Studio 1' : 'Opsional — mis. Kolam Anak'} style={input} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1.25rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.aktif} onChange={(e) => set('aktif', e.target.checked)} />
            Aktif (tampil di TV)
          </label>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={save} disabled={saving}
              style={{ flex: 1, padding: '0.625rem', background: saving ? 'var(--text-3)' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Tambah Kelas'}
            </button>
            {editId && (
              <button onClick={resetForm} disabled={saving} style={{ ...smallBtn, padding: '0.625rem 1rem', fontSize: '0.875rem' }}>Batal</button>
            )}
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '1rem', lineHeight: 1.6 }}>
            Acara sekali jalan (turnamen, kelas tambahan) tetap lewat Kelola Agenda — aktifkan &ldquo;Tampilkan di TV Publik&rdquo; lalu pilih layar {cfg.nama}.
            Kelas rutin tidak tampil pada hari yang diatur libur/tutup sementara di TV Pamflet.
          </p>
        </div>

        {/* Daftar kelas */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
              Kelas Rutin <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>({kelas.length})</span>
            </h2>
            <a href={`/agenda/tv/${layar}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8125rem', color: 'var(--primary)' }}>Buka layar ↗</a>
          </div>
          {!loading && kelas.length > 0 && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
              Hari ini ({HARI[hariIni]}): {jumlahHariIni ? `${jumlahHariIni} kelas tampil di TV` : 'tidak ada kelas rutin'}
            </p>
          )}

          {loading ? (
            <p style={{ color: 'var(--text-3)' }}>Memuat...</p>
          ) : kelas.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Belum ada kelas rutin. Tambahkan lewat form di samping.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {kelas.map(k => (
                <div key={k.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.75rem', borderRadius: '10px', border: `1px solid ${editId === k.id ? 'var(--primary)' : 'var(--border)'}`, opacity: k.aktif ? 1 : 0.55 }}>
                  <div style={{ flexShrink: 0, width: 72, fontVariantNumeric: 'tabular-nums' }}>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{jam(k.waktu_mulai)}</div>
                    {k.waktu_selesai && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>s.d. {jam(k.waktu_selesai)}</div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {k.nama}{!k.aktif && <span style={{ marginLeft: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-3)' }}>NONAKTIF</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[hariLabel(k.hari || []), k.lokasi, k.pelatih && `Pelatih: ${k.pelatih}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                    <button type="button" onClick={() => toggleAktif(k)} style={smallBtn} title={k.aktif ? 'Sembunyikan dari TV' : 'Tampilkan di TV'}>{k.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
                    <button type="button" onClick={() => startEdit(k)} style={smallBtn}>Edit</button>
                    <button type="button" onClick={() => setDeleteTarget(k)} style={{ ...smallBtn, color: 'var(--danger)' }}>Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Kelas"
        message={deleteTarget ? <>Kelas <strong>{deleteTarget.nama}</strong> akan dihapus permanen. Lanjutkan?</> : ''}
        confirmLabel="Ya, Hapus"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        busy={deleting}
      />
    </div>
  )
}
