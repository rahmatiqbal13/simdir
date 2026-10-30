'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAgenda } from '@/context/AgendaContext'
import { useToast } from '@/app/components/Toast'
import { useFocusTrap } from '@/app/components/useFocusTrap'
import ConfirmModal from '@/app/components/ConfirmModal'
import { EmptyStateAgenda, EmptyStateError } from '@/app/components/EmptyState'
import { usePimpinanList } from '@/lib/hooks/usePimpinanList'
import { getUnitColor, getUnitCodeFromPenyelenggara } from '@/app/(public)/agenda/tv/unit-colors'
import { TV_LAYAR, TV_LAYAR_SLUGS, agendaDiLayar } from '@/lib/tvLayar'

// Data constants
const UNIT_KERJA_LIST = [
  { value: 'USC', label: 'USC' },
  { value: 'PUI Keolahragaan', label: 'PUI Keolahragaan' },
  { value: 'PUI Disabilitas', label: 'PUI Disabilitas' },
  { value: 'PUI Seni Budaya', label: 'PUI Seni Budaya' },
  { value: 'Kolam Renang', label: 'Kolam Renang' },
  { value: 'Driving Golf', label: 'Driving Golf' },
  { value: 'ULABK', label: 'ULABK' },
  { value: 'SSFC', label: 'SSFC' },
  { value: 'PUIPT Seni Budaya Majapahitan', label: 'PUIPT Seni Budaya Majapahitan' },
  { value: 'PUIPT DIC', label: 'PUIPT DIC' },
  { value: 'PUIPT SERC', label: 'PUIPT SERC' },
  { value: 'Unesa', label: 'Unesa' },
  { value: 'lainnya', label: 'Lainnya (Input Manual)' }
]

const PIC_LIST = [
  { value: 'Dr. Mochamad Purnomo, S.Pd., M.Kes.', label: 'Dr. Mochamad Purnomo, S.Pd., M.Kes.' },
  { value: 'Dr. Donny Ardy Kusuma, S.Pd., M.Kes.', label: 'Dr. Donny Ardy Kusuma, S.Pd., M.Kes.' },
  { value: 'Aulia Putri Srie Wardani, S.Gz., M.Sc.', label: 'Aulia Putri Srie Wardani, S.Gz., M.Sc.' },
  { value: 'Muhammad Dzul Fikri, S.Or., M.Pd.', label: 'Muhammad Dzul Fikri, S.Or., M.Pd.' },
  { value: 'Moh. Fathur Rohman, S.Pd., M.Pd.', label: 'Moh. Fathur Rohman, S.Pd., M.Pd.' },
  { value: 'Bhekti Lestari, S.Pd., M.Kes.', label: 'Bhekti Lestari, S.Pd., M.Kes.' },
  { value: 'Afif Rusdiawan, S.Pd., M.Kes.', label: 'Afif Rusdiawan, S.Pd., M.Kes.' },
  { value: 'Prof. Dr. Budiyanto, M.Pd.', label: 'Prof. Dr. Budiyanto, M.Pd.' },
  { value: 'Acep Ovel Novari Beny, M.Pd.', label: 'Acep Ovel Novari Beny, M.Pd.' },
  { value: 'Khofidotur Rofiah, S.Pd., M.Pd.', label: 'Khofidotur Rofiah, S.Pd., M.Pd.' },
  { value: 'Dr. Trisakti, M.Si.', label: 'Dr. Trisakti, M.Si.' },
  { value: 'Muhamad Ro\'is Abidin, S.Pd., M.Pd.', label: 'Muhamad Ro\'is Abidin, S.Pd., M.Pd.' },
  { value: 'Raden Roro Maha Kalyana Mitta Anggoro, S.Pd., M.Pd.', label: 'Raden Roro Maha Kalyana Mitta Anggoro, S.Pd., M.Pd.' },
  { value: 'Rahmat Iqbal Rizaldi Pratama, S.Kom.', label: 'Rahmat Iqbal Rizaldi Pratama, S.Kom.' },
  { value: 'Richard Jannuar Ade Irawan W, S.Ak.', label: 'Richard Jannuar Ade Irawan W, S.Ak.' },
  { value: 'Ayub Baharuddin, S.Pd.', label: 'Ayub Baharuddin, S.Pd.' },
  { value: 'Alfina Diva Pratiwi', label: 'Alfina Diva Pratiwi' },
  { value: 'Fajar', label: 'Fajar' },
  { value: 'Heri Purnomo', label: 'Heri Purnomo' },
  { value: 'Ananta Wirajaya', label: 'Ananta Wirajaya' },
  { value: 'Said Ahmadi', label: 'Said Ahmadi' },
  { value: 'Purnomo', label: 'Purnomo' },
  { value: 'Sayyid', label: 'Sayyid' },
  { value: 'Ceko', label: 'Ceko' },
  { value: 'Raya', label: 'Raya' },
  { value: 'Melly', label: 'Melly' },
  { value: 'Majid', label: 'Majid' },
  { value: 'Adi', label: 'Adi' },
  { value: 'Yusuf', label: 'Yusuf' },
  { value: 'lainnya', label: 'Lainnya (Input Manual)' }
]

// Kartu statistik sekaligus jadi filter status (Redesign 03 · 3a)
const STATUS_TABS = [
  { value: 'all', label: 'Semua agenda', dot: 'var(--text-3)' },
  { value: 'ongoing', label: 'Berlangsung', dot: 'var(--success-solid)' },
  { value: 'upcoming', label: 'Mendatang', dot: 'var(--primary)' },
  { value: 'completed', label: 'Selesai', dot: 'var(--border-strong)' },
]

// "Pimpinan" DULU jadi salah satu nilai `jenis` (mutually exclusive dengan
// internal/eksternal) — bermasalah karena event internal yang dihadiri
// pimpinan jadi harus kehilangan identitas unit penyelenggaranya, cuma demi
// menandai kehadiran pimpinan. Sekarang dipisah: `jenis` cuma soal asal
// penyelenggara (internal/eksternal), kehadiran pimpinan jadi flag terpisah
// (`dihadiri_pimpinan` + `nama_pimpinan`) yang independen dari `jenis`.
const JENIS_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'internal', label: 'Internal' },
  { value: 'eksternal', label: 'Eksternal' },
]

const STATUS_PILL = {
  ongoing: { label: 'Berlangsung', cls: 'ongoing' },
  upcoming_soon: { label: 'Segera', cls: 'soon' },
  upcoming: { label: 'Mendatang', cls: 'upcoming' },
  completed: { label: 'Selesai', cls: 'done' },
}

const ITEMS_PER_PAGE = 10
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTHS_L = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

// Helper functions
const fmtHM = (t) => (t ? t.slice(0, 5).replace(':', '.') : '')
const timeRange = (a) => {
  const s = fmtHM(a.waktu_mulai), e = fmtHM(a.waktu_selesai)
  return s && e ? `${s}–${e}` : s || 'Sepanjang hari'
}
const parseDay = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
const dateShort = (iso) => {
  const d = parseDay(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
const cleanPic = (p) => (p ? p.replace(/^Manual: /, '') : '')
const isPimpinan = (a) => !!(a.dihadiri_pimpinan || a.jenis === 'pimpinan')

// Layar TV tempat agenda muncul: semua agenda di TV Internal, sisanya
// mengikuti tampil_publik + target_layar (lihat agendaDiLayar).
const tampilDi = (a) => {
  const unit = getUnitCodeFromPenyelenggara(a.penyelenggara)
  return ['Internal', ...TV_LAYAR_SLUGS.filter(s => agendaDiLayar(a, s, unit)).map(s => TV_LAYAR[s].nama)]
}
const penyelenggaraLabel = (a) => (a.penyelenggara || '').replace(/^External - /, '') || (a.jenis === 'eksternal' ? 'Eksternal' : 'USC')

// Gabungkan tanggal+jam supaya status memperhitungkan jam kejadian, bukan
// cuma tanggalnya (event 14:00-16:00 sebelumnya sudah "Berlangsung" sejak
// 00:00 di hari itu). `T${jam}` tanpa akhiran "Z" diparse sebagai waktu
// lokal browser, bukan UTC — sebelumnya `new Date('YYYY-MM-DD')` diparse
// UTC-midnight, jadi transisi status bisa meleset sampai 7 jam dari
// seharusnya (label UI selalu "WIB").
const toAgendaDateTime = (tanggal, waktu, endOfDay = false) => {
  if (!tanggal) return null
  const time = waktu || (endOfDay ? '23:59:59' : '00:00:00')
  return new Date(`${tanggal}T${time}`)
}

// Get agenda status
const getAgendaStatus = (mulai, selesai, waktuMulai, waktuSelesai) => {
  const now = new Date()
  const start = toAgendaDateTime(mulai, waktuMulai, false)
  const end = toAgendaDateTime(selesai, waktuSelesai, true)

  if (now > end) return 'completed'
  if (now >= start && now <= end) return 'ongoing'

  const diffTime = start - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 3) return 'upcoming_soon'
  return 'upcoming'
}

// Label grup hari: "Hari ini · Selasa, 28 Okt" + tag, atau tanggal lengkap
const dayGroupLabel = (iso) => {
  const d = parseDay(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((d - today) / 864e5)
  const base = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
  if (diff === 0) return { label: `Hari ini · ${base}`, tag: 'Hari ini', tagBg: 'var(--success-50)', tagFg: 'var(--success)' }
  if (diff === 1) return { label: `Besok · ${base}`, tag: 'Besok', tagBg: 'var(--warning-50)', tagFg: 'var(--warning)' }
  return { label: `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_L[d.getMonth()]} ${d.getFullYear()}` }
}

// Penanggung jawab yang ditampilkan: pimpinan (+ disposisi) atau PIC
const personInfo = (a) => {
  if (isPimpinan(a)) {
    const nama = a.nama_pimpinan || (a.jenis === 'pimpinan' ? a.penyelenggara : '') || 'Pimpinan'
    return { text: a.disposisi ? `${nama} → ${a.disposisi}` : nama, color: 'var(--danger)' }
  }
  return { text: cleanPic(a.pic) || '—', color: 'var(--text-2)' }
}

const Icon = {
  plus: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  download: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  search: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  person: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  pin: <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  list: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="6" rx="1.5" /><rect x="3" y="14" width="18" height="6" rx="1.5" /></svg>,
  table: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  edit: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  trash: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  close: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  link: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  tv: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
}

// Badge kecil di samping judul: Pimpinan · Publik · Eksternal
function AgendaBadges({ a }) {
  return (
    <>
      {isPimpinan(a) && <span className="ka-badge" style={{ background: 'var(--danger-50)', color: 'var(--danger)' }}>Pimpinan</span>}
      {a.tampil_publik && <span className="ka-badge" style={{ background: 'var(--primary-50)', color: 'var(--primary)' }}>TV Publik</span>}
      {a.jenis === 'eksternal' && <span className="ka-badge" style={{ background: 'var(--warning-50)', color: 'var(--warning)' }}>Eksternal</span>}
    </>
  )
}

function RowActions({ a, onEdit, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button type="button" className="ka-act" onClick={() => onEdit(a)} aria-label={`Edit ${a.judul}`}>{Icon.edit}</button>
      <button type="button" className="ka-act danger" onClick={() => onDelete(a.id)} aria-label={`Hapus ${a.judul}`}>{Icon.trash}</button>
    </div>
  )
}

// ============ TAMPILAN DAFTAR (dikelompokkan per hari) ============
function AgendaList({ items, canEdit, onEdit, onDelete }) {
  const groups = []
  for (const a of items) {
    const last = groups[groups.length - 1]
    if (last && last.date === a.tanggal_mulai) last.items.push(a)
    else groups.push({ date: a.tanggal_mulai, items: [a] })
  }
  return groups.map(g => {
    const h = dayGroupLabel(g.date)
    return (
      <div key={g.date} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="ka-group-head">
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{h.label}</span>
          {h.tag && <span className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 6, background: h.tagBg, color: h.tagFg }}>{h.tag}</span>}
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{g.items.length}</span>
        </div>
        {g.items.map(a => {
          const st = a._st
          const pill = STATUS_PILL[st]
          const unit = getUnitColor(a.jenis, a.penyelenggara, a.dihadiri_pimpinan)
          const p = personInfo(a)
          const multiDay = a.tanggal_selesai && a.tanggal_selesai !== a.tanggal_mulai
          return (
            <div key={a.id} className={`ka-row ${canEdit ? '' : 'no-actions'}`} style={{ background: st === 'ongoing' ? 'var(--success-50)' : undefined, opacity: st === 'completed' ? 0.6 : 1 }}>
              <div className="ka-row-time">
                <span className="mono" style={{ fontSize: 17, fontWeight: 600 }}>{fmtHM(a.waktu_mulai) || '—'}</span>
                <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  {multiDay ? `s/d ${dateShort(a.tanggal_selesai).replace(/ \d{4}$/, '')}` : (fmtHM(a.waktu_selesai) || 'Sepanjang hari')}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
                  <span className="ka-row-title">{a.judul}</span>
                  <AgendaBadges a={a} />
                </div>
                <div className="ka-row-meta">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: unit.border, flexShrink: 0 }} />{penyelenggaraLabel(a)}</span>
                  {a.lokasi && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{Icon.pin}{a.lokasi}</span>}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: p.color }}>{Icon.person}{p.text}</span>
                </div>
              </div>
              <span className={`status-pill ${pill.cls}`}>{pill.label}</span>
              {canEdit && <RowActions a={a} onEdit={onEdit} onDelete={onDelete} />}
            </div>
          )
        })}
      </div>
    )
  })
}

function Check({ on, onClick, label }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} aria-label={label} onClick={onClick} className={`ka-check ${on ? 'on' : ''}`}>
      {on && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>}
    </button>
  )
}

// ============ TAMPILAN TABEL ============
function AgendaTable({ items, canEdit, onEdit, onDelete, selected, onToggle, onToggleAll }) {
  const allOn = items.length > 0 && items.every(a => selected.has(a.id))
  return (
    <div className="ka-table-wrap">
      <div className={`ka-trow ka-thead ${canEdit ? '' : 'no-actions'}`}>
        {canEdit && <Check on={allOn} onClick={onToggleAll} label="Pilih semua di halaman ini" />}
        <span>Agenda</span><span>Jenis</span><span>Waktu</span><span className="ka-tampil">Tampil di</span><span>Status</span>{canEdit && <span>Aksi</span>}
      </div>
      {items.map(a => {
        const pill = STATUS_PILL[a._st]
        const unit = getUnitColor(a.jenis, a.penyelenggara, a.dihadiri_pimpinan)
        return (
          <div key={a.id} className={`ka-trow ${canEdit ? '' : 'no-actions'}`} style={{ background: selected.has(a.id) ? 'var(--primary-50)' : a._st === 'ongoing' ? 'var(--success-50)' : undefined, opacity: a._st === 'completed' && !selected.has(a.id) ? 0.6 : 1 }}>
            {canEdit && <Check on={selected.has(a.id)} onClick={() => onToggle(a.id)} label={`Pilih ${a.judul}`} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span className="truncate" style={{ fontWeight: 600, fontSize: 14.5 }}>{a.judul}</span>
              <span className="truncate" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', fontSize: 12.5 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: unit.border, flexShrink: 0 }} />{penyelenggaraLabel(a)}{a.lokasi ? ` · ${a.lokasi}` : ''}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <span className="ka-badge" style={{ background: a.jenis === 'eksternal' ? 'var(--warning-50)' : 'var(--primary-50)', color: a.jenis === 'eksternal' ? 'var(--warning)' : 'var(--primary)' }}>{a.jenis === 'eksternal' ? 'Eksternal' : 'Internal'}</span>
              {isPimpinan(a) && <span className="ka-badge" style={{ background: 'var(--danger-50)', color: 'var(--danger)' }}>Pimpinan</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span>{dateShort(a.tanggal_mulai)}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--primary)' }}>{timeRange(a)}</span>
            </div>
            <div className="ka-tampil" style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {tampilDi(a).map(t => <span key={t} className="ka-badge" style={{ background: 'var(--primary-50)', color: 'var(--primary)' }}>{t}</span>)}
            </div>
            <span className={`status-pill ${pill.cls}`} style={{ justifySelf: 'start' }}>{pill.label}</span>
            {canEdit && <RowActions a={a} onEdit={onEdit} onDelete={onDelete} />}
          </div>
        )
      })}
    </div>
  )
}

// ============ FORM AGENDA (panel geser kanan · tambah & edit) ============
function AgendaModal({ item, onSave, onClose, isSaving }) {
  const modalRef = useFocusTrap(true, onClose)
  // Data lama (sebelum dipisahnya "dihadiri pimpinan" dari `jenis`) masih
  // bisa punya jenis === 'pimpinan' di database sampai migrasi dijalankan.
  // Diperlakukan di sini sebagai jenis 'internal' + dihadiri pimpinan, nama
  // pimpinan diambil dari kolom `penyelenggara` lama (satu-satunya tempat
  // itu tersimpan sebelumnya) — supaya modal edit tetap benar untuk data
  // lama maupun baru, dengan atau tanpa migrasi database sudah jalan.
  const isLegacyPimpinan = item?.jenis === 'pimpinan'
  const namaPimpinanValue = item?.nama_pimpinan || (isLegacyPimpinan ? item.penyelenggara : '')

  const [jenis, setJenis] = useState(isLegacyPimpinan ? 'internal' : (item?.jenis || 'internal'))
  const [dihadiriPimpinan, setDihadiriPimpinan] = useState(
    item?.dihadiri_pimpinan != null ? item.dihadiri_pimpinan : isLegacyPimpinan
  )
  const [showManualPic, setShowManualPic] = useState(item?.pic?.startsWith('Manual: ') || false)
  const [showManualPimpinan, setShowManualPimpinan] = useState(false)
  const [showManualUnitKerja, setShowManualUnitKerja] = useState(
    item?.jenis === 'internal' && !!item?.penyelenggara && !UNIT_KERJA_LIST.some(u => u.value === item.penyelenggara)
  )
  const { options: pimpinanOptions, loading: pimpinanLoading } = usePimpinanList()
  const [form, setForm] = useState({
    judul: item?.judul || '',
    tanggal_mulai: item?.tanggal_mulai || '',
    tanggal_selesai: item?.tanggal_selesai || '',
    waktu_mulai: item?.waktu_mulai || '',
    waktu_selesai: item?.waktu_selesai || '',
    lokasi: item?.lokasi || '',
    link_meeting: item?.link_meeting || '',
    deskripsi: item?.deskripsi || '',
    unit_kerja: item?.jenis === 'internal' ? (UNIT_KERJA_LIST.some(u => u.value === item?.penyelenggara) ? item?.penyelenggara : 'lainnya') : '',
    unit_kerja_manual: item?.jenis === 'internal' && !UNIT_KERJA_LIST.some(u => u.value === item?.penyelenggara) ? item?.penyelenggara : '',
    penyelenggara_eksternal: item?.jenis === 'eksternal' ? item.penyelenggara.replace('External - ', '') : '',
    pimpinan_select: '',
    pimpinan_manual: '',
    disposisi_staff: item?.disposisi || '',
    pic_select: item?.pic?.startsWith('Manual: ') ? 'lainnya' : (item?.pic && PIC_LIST.some(p => p.value === item.pic) ? item.pic : ''),
    pic_manual: item?.pic?.startsWith('Manual: ') ? item.pic.replace('Manual: ', '') : '',
    tampil_publik: item?.tampil_publik || false,
    target_layar: item?.target_layar || [],
  })
  const [error, setError] = useState('')
  const [showLink, setShowLink] = useState(!!item?.link_meeting)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Daftar pimpinan sekarang dimuat dari /api/pimpinan (async), bukan
  // konstanta statis — jadi pimpinan_select/pimpinan_manual baru bisa
  // diturunkan dari namaPimpinanValue setelah daftarnya selesai dimuat,
  // sekali saja (sama seperti MemoForm.jsx).
  const [pimpinanFieldInitialized, setPimpinanFieldInitialized] = useState(false)
  useEffect(() => {
    if (pimpinanLoading || pimpinanFieldInitialized) return
    const known = namaPimpinanValue && pimpinanOptions.some(p => p.value === namaPimpinanValue && p.value !== 'lainnya')
    setForm(f => ({
      ...f,
      pimpinan_select: known ? namaPimpinanValue : (namaPimpinanValue ? 'lainnya' : ''),
      pimpinan_manual: known ? '' : (namaPimpinanValue || ''),
    }))
    setShowManualPimpinan(!known && !!namaPimpinanValue)
    setPimpinanFieldInitialized(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pimpinanLoading, pimpinanOptions, pimpinanFieldInitialized])

  const dateError = form.tanggal_mulai && form.tanggal_selesai && new Date(form.tanggal_mulai) > new Date(form.tanggal_selesai)

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!form.judul.trim()) {
      setError('Judul agenda wajib diisi')
      return
    }
    if (!form.tanggal_mulai || !form.tanggal_selesai) {
      setError('Tanggal mulai dan selesai wajib diisi')
      return
    }
    if (new Date(form.tanggal_mulai) > new Date(form.tanggal_selesai)) {
      setError('Tanggal mulai tidak boleh lebih besar dari tanggal selesai')
      return
    }
    if (
      form.tanggal_mulai === form.tanggal_selesai &&
      form.waktu_mulai && form.waktu_selesai &&
      form.waktu_selesai <= form.waktu_mulai
    ) {
      setError('Jam selesai harus lebih besar dari jam mulai (untuk agenda di hari yang sama)')
      return
    }
    if (jenis === 'internal' && !form.unit_kerja) {
      setError('Unit kerja penyelenggara wajib dipilih')
      return
    }
    if (jenis === 'internal' && form.unit_kerja === 'lainnya' && !form.unit_kerja_manual.trim()) {
      setError('Nama unit kerja manual wajib diisi')
      return
    }
    if (jenis === 'eksternal' && !form.penyelenggara_eksternal.trim()) {
      setError('Nama penyelenggara eksternal wajib diisi')
      return
    }
    if (dihadiriPimpinan && !form.pimpinan_select) {
      setError('Nama pimpinan wajib dipilih')
      return
    }
    if (dihadiriPimpinan && form.pimpinan_select === 'lainnya' && !form.pimpinan_manual.trim()) {
      setError('Nama pimpinan manual wajib diisi')
      return
    }

    const picValue = form.pic_select === 'lainnya'
      ? `Manual: ${form.pic_manual}`
      : form.pic_select

    const getPenyelenggara = () => {
      if (jenis === 'internal') {
        return form.unit_kerja === 'lainnya' ? form.unit_kerja_manual : form.unit_kerja
      }
      return `External - ${form.penyelenggara_eksternal}`
    }

    const namaPimpinan = dihadiriPimpinan
      ? (form.pimpinan_select === 'lainnya' ? form.pimpinan_manual : form.pimpinan_select)
      : null

    const newItem = {
      ...(item?.id && { id: item.id }), // Hanya sertakan ID jika edit
      judul: form.judul,
      tanggal_mulai: form.tanggal_mulai,
      tanggal_selesai: form.tanggal_selesai,
      waktu_mulai: form.waktu_mulai || null,
      waktu_selesai: form.waktu_selesai || null,
      lokasi: form.lokasi,
      link_meeting: showLink && form.link_meeting ? form.link_meeting : null,
      jenis,
      penyelenggara: getPenyelenggara(),
      deskripsi: form.deskripsi,
      dihadiri_pimpinan: dihadiriPimpinan,
      nama_pimpinan: namaPimpinan,
      disposisi: dihadiriPimpinan && form.disposisi_staff ? form.disposisi_staff : null,
      pic: dihadiriPimpinan ? null : picValue,
      tampil_publik: form.tampil_publik,
      // Hanya dikirim bila dipilih / perlu dikosongkan, '{}' = otomatis
      ...((form.target_layar.length || item?.target_layar?.length) && { target_layar: form.tampil_publik ? form.target_layar : [] }),
    }
    onSave(newItem)
  }

  // Pratinjau langsung
  const pvUnitName = jenis === 'internal'
    ? (form.unit_kerja === 'lainnya' ? form.unit_kerja_manual : form.unit_kerja) || 'Unit kerja'
    : form.penyelenggara_eksternal || 'Eksternal'
  const pvColor = getUnitColor(jenis, jenis === 'internal' ? pvUnitName : '', dihadiriPimpinan).border
  const pvDate = form.tanggal_mulai ? parseDay(form.tanggal_mulai) : null
  const pv = {
    title: form.judul || 'Judul agenda',
    mon: pvDate ? MONTHS[pvDate.getMonth()] : '—',
    day: pvDate ? pvDate.getDate() : '—',
    time: timeRange(form),
    timeStart: fmtHM(form.waktu_mulai) || 'Sepanjang hari',
    lokasi: form.lokasi || 'Lokasi',
  }

  return (
    <div className="ka-panel-backdrop" onClick={onClose}>
      <div className="ka-panel" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="ka-form-title" onClick={e => e.stopPropagation()}>
        <div className="ka-panel-head">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
            <span className="eyebrow" style={{ fontSize: 11.5, letterSpacing: '.1em' }}>{item?.id ? 'Edit agenda' : 'Agenda baru'}</span>
            <span id="ka-form-title" className="truncate" style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-.015em' }}>
              {item?.id ? form.judul || 'Edit agenda' : 'Buat agenda'}
            </span>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup">{Icon.close}</button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="ka-panel-form">
          <div className="ka-panel-body">
            <div className="ka-form-main">
              <FormStep n="01" title="Kegiatan">
                <div className="ka-grid-2">
                  {[
                    { v: 'internal', label: 'Internal', desc: 'Diselenggarakan unit kerja USC' },
                    { v: 'eksternal', label: 'Eksternal', desc: 'Instansi atau penyelenggara luar' },
                  ].map(j => (
                    <button key={j.v} type="button" onClick={() => setJenis(j.v)} aria-pressed={jenis === j.v}
                      className={`ka-choice ${jenis === j.v ? 'active' : ''}`}>
                      <span className="pub-radio" />
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{j.label}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{j.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="field">
                  <label htmlFor="ka-judul">Judul agenda <span className="pub-req">*</span></label>
                  <input id="ka-judul" value={form.judul} onChange={set('judul')} placeholder="Contoh: Rapat Koordinasi Pimpinan USC" required />
                </div>
                <div className="field">
                  <label htmlFor="ka-desk">Deskripsi <span className="pub-opt">· opsional</span></label>
                  <textarea id="ka-desk" value={form.deskripsi} onChange={set('deskripsi')} rows={2} placeholder="Catatan untuk peserta atau petugas…" style={{ minHeight: 72 }} />
                </div>
              </FormStep>

              <FormStep n="02" title="Waktu">
                <div className="ka-grid-4">
                  <div className="field">
                    <label htmlFor="ka-tm">Tgl mulai <span className="pub-req">*</span></label>
                    <input id="ka-tm" type="date" value={form.tanggal_mulai} onChange={set('tanggal_mulai')} required style={dateError ? { borderColor: 'var(--danger)' } : undefined} />
                  </div>
                  <div className="field">
                    <label htmlFor="ka-ts">Tgl selesai <span className="pub-req">*</span></label>
                    <input id="ka-ts" type="date" value={form.tanggal_selesai} min={form.tanggal_mulai || undefined} onChange={set('tanggal_selesai')} required style={dateError ? { borderColor: 'var(--danger)' } : undefined} />
                  </div>
                  <div className="field">
                    <label htmlFor="ka-jm">Jam mulai</label>
                    <input id="ka-jm" type="time" value={form.waktu_mulai} onChange={set('waktu_mulai')} />
                  </div>
                  <div className="field">
                    <label htmlFor="ka-js">Jam selesai</label>
                    <input id="ka-js" type="time" value={form.waktu_selesai} onChange={set('waktu_selesai')} />
                  </div>
                </div>
                <span style={{ fontSize: 13, color: dateError ? 'var(--danger)' : 'var(--text-3)', fontWeight: dateError ? 600 : 400 }}>
                  {dateError ? 'Tanggal selesai tidak boleh sebelum tanggal mulai.' : 'Semua waktu dalam WIB. Kosongkan jam bila agenda sepanjang hari.'}
                </span>
              </FormStep>

              <FormStep n="03" title="Tempat & penyelenggara">
                <div className="ka-grid-2">
                  <div className="field">
                    <label htmlFor="ka-lokasi">Lokasi</label>
                    <input id="ka-lokasi" value={form.lokasi} onChange={set('lokasi')} placeholder="Ruang Rapat USC, Aula Utama…" />
                  </div>
                  {jenis === 'internal' ? (
                    <div className="field">
                      <label htmlFor="ka-unit">Unit kerja penyelenggara <span className="pub-req">*</span></label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: 14, width: 10, height: 10, borderRadius: 3, background: form.unit_kerja ? pvColor : 'var(--border-strong)', pointerEvents: 'none' }} />
                        <select id="ka-unit" value={form.unit_kerja} style={{ paddingLeft: 34 }}
                          onChange={(e) => { setForm({ ...form, unit_kerja: e.target.value }); setShowManualUnitKerja(e.target.value === 'lainnya') }} required>
                          <option value="">Pilih unit kerja…</option>
                          {UNIT_KERJA_LIST.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                        </select>
                      </div>
                      {showManualUnitKerja && (
                        <input style={{ marginTop: 8 }} value={form.unit_kerja_manual} onChange={set('unit_kerja_manual')} placeholder="Nama unit kerja" required aria-label="Nama unit kerja manual" />
                      )}
                    </div>
                  ) : (
                    <div className="field">
                      <label htmlFor="ka-eks">Nama penyelenggara eksternal <span className="pub-req">*</span></label>
                      <input id="ka-eks" value={form.penyelenggara_eksternal} onChange={set('penyelenggara_eksternal')} placeholder="Contoh: Dinas Pendidikan Jatim" required />
                    </div>
                  )}
                  <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button type="button" className="ka-linkbtn" onClick={() => setShowLink(v => !v)} aria-expanded={showLink}>
                      {Icon.link}{showLink ? 'Hapus link meeting' : 'Tambah link meeting (online)'}
                    </button>
                    {showLink && (
                      <input type="url" value={form.link_meeting} onChange={set('link_meeting')} placeholder="https://zoom.us/j/… atau https://meet.google.com/…" style={{ fontFamily: 'var(--font-mono)', fontSize: 14.5 }} aria-label="Link meeting" />
                    )}
                  </div>
                </div>
              </FormStep>

              <FormStep n="04" title="Penanggung jawab">
                <div className="ka-toggle-row" style={{ background: 'var(--surface-2)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700 }}>Dihadiri pimpinan</span>
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Agenda ditandai merah di TV Internal. PIC diganti nama pimpinan + disposisi.</span>
                  </div>
                  <button type="button" role="switch" aria-checked={dihadiriPimpinan} aria-label="Dihadiri pimpinan" className="switch" onClick={() => setDihadiriPimpinan(v => !v)} />
                </div>
                {dihadiriPimpinan ? (
                  <div className="ka-grid-2">
                    <div className="field">
                      <label htmlFor="ka-pim">Nama pimpinan <span className="pub-req">*</span></label>
                      <select id="ka-pim" value={form.pimpinan_select} disabled={pimpinanLoading} required
                        onChange={(e) => { setForm({ ...form, pimpinan_select: e.target.value }); setShowManualPimpinan(e.target.value === 'lainnya') }}>
                        <option value="">{pimpinanLoading ? 'Memuat daftar pimpinan…' : 'Pilih pimpinan…'}</option>
                        {pimpinanOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                      {showManualPimpinan && (
                        <input style={{ marginTop: 8 }} value={form.pimpinan_manual} onChange={set('pimpinan_manual')} placeholder="Nama pimpinan" required aria-label="Nama pimpinan manual" />
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor="ka-disp">Disposisi bila berhalangan</label>
                      <select id="ka-disp" value={form.disposisi_staff} onChange={set('disposisi_staff')}>
                        <option value="">Tidak ada disposisi</option>
                        {PIC_LIST.filter(s => s.value !== 'lainnya').map(staff => <option key={staff.value} value={staff.value}>{staff.label}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="ka-grid-2">
                    <div className="field">
                      <label htmlFor="ka-pic">PIC kegiatan</label>
                      <select id="ka-pic" value={form.pic_select}
                        onChange={(e) => { setForm({ ...form, pic_select: e.target.value }); setShowManualPic(e.target.value === 'lainnya') }}>
                        <option value="">Pilih PIC…</option>
                        {PIC_LIST.map(pic => <option key={pic.value} value={pic.value}>{pic.label}</option>)}
                      </select>
                    </div>
                    {showManualPic && (
                      <div className="field">
                        <label htmlFor="ka-picm">Nama PIC</label>
                        <input id="ka-picm" value={form.pic_manual} onChange={set('pic_manual')} placeholder="Masukkan nama PIC" />
                      </div>
                    )}
                  </div>
                )}
              </FormStep>

              <FormStep n="05" title="Tampilan" last>
                <div className="ka-toggle-row" style={{ border: '1px solid var(--border)' }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--primary-50)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{Icon.tv}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700 }}>Tampilkan di TV Publik</span>
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Muncul di layar lobi &amp; halaman /agenda. Agenda selalu tampil di TV Internal.</span>
                  </div>
                  <button type="button" role="switch" aria-checked={form.tampil_publik} aria-label="Tampilkan di TV Publik" className="switch" onClick={() => setForm(f => ({ ...f, tampil_publik: !f.tampil_publik }))} />
                </div>
                {form.tampil_publik && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-2)' }}>
                    <span style={{ fontWeight: 600 }}>Layar TV:</span>
                    <button type="button" aria-pressed={!form.target_layar.length} onClick={() => setForm(f => ({ ...f, target_layar: [] }))}
                      className={`ka-layar ${!form.target_layar.length ? 'on' : ''}`}>Otomatis</button>
                    {TV_LAYAR_SLUGS.map(sl => {
                      const on = form.target_layar.includes(sl)
                      return (
                        <button key={sl} type="button" aria-pressed={on} className={`ka-layar ${on ? 'on' : ''}`}
                          onClick={() => setForm(f => ({ ...f, target_layar: on ? f.target_layar.filter(x => x !== sl) : [...f.target_layar, sl] }))}>
                          {TV_LAYAR[sl].nama}
                        </button>
                      )
                    })}
                    {!form.target_layar.length && (
                      <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                        → {tampilDi({ ...form, penyelenggara: form.unit_kerja }).slice(1).join(', ')}
                      </span>
                    )}
                  </div>
                )}
              </FormStep>
            </div>

            <aside className="ka-preview" aria-label="Pratinjau langsung">
              <span className="eyebrow" style={{ fontSize: 11.5, letterSpacing: '.1em' }}>Pratinjau langsung</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Daftar agenda</span>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'grid', gridTemplateColumns: '48px minmax(0,1fr)', gap: 12, alignItems: 'center' }}>
                  <div className="date-block" style={{ width: 48, height: 50 }}><span className="date-block-mon">{pv.mon}</span><span className="date-block-day" style={{ fontSize: 20 }}>{pv.day}</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{pv.title}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}><span className="mono" style={{ color: 'var(--text-2)' }}>{pv.time}</span> · {pv.lokasi}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>TV Internal</span>
                <div style={{ background: '#0b0f2a', borderRadius: 12, padding: '12px 14px', boxShadow: `inset 4px 0 0 ${pvColor}`, display: 'flex', flexDirection: 'column', gap: 5, color: '#fff' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>{pv.title}</span>
                  <span style={{ fontSize: 11.5, color: '#9aa6cc' }}><span style={{ fontWeight: 700, color: pvColor }}>{dihadiriPimpinan ? 'Pimpinan' : pvUnitName}</span> · {pv.lokasi}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>TV Publik</span>
                {form.tampil_publik ? (
                  <div style={{ background: '#0b0f2a', borderRadius: 12, padding: '12px 14px', display: 'grid', gridTemplateColumns: '44px minmax(0,1fr)', gap: 12, alignItems: 'center', color: '#fff' }}>
                    <div style={{ height: 46, borderRadius: 9, background: '#f7b500', color: '#121735', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="mono" style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', opacity: .8 }}>{pv.mon}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, lineHeight: 1 }}>{pv.day}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>{pv.title}</span>
                      <span style={{ fontSize: 11.5, color: '#9aa6cc' }}>{pv.timeStart} · {pv.lokasi}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ border: '1px dashed var(--border-strong)', borderRadius: 12, padding: 16, fontSize: 13, color: 'var(--text-2)', textAlign: 'center' }}>Tidak tampil di layar lobi.</div>
                )}
              </div>
            </aside>
          </div>

          <div className="ka-panel-foot">
            {error
              ? <span role="alert" style={{ fontSize: 13.5, color: 'var(--danger)', fontWeight: 600, flex: 1 }}>{error}</span>
              : <span style={{ fontSize: 13, color: 'var(--text-3)', flex: 1 }}><span className="pub-req">*</span> wajib diisi</span>}
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ padding: '0 22px' }}>
              {isSaving ? 'Menyimpan…' : (item?.id ? 'Perbarui agenda' : 'Simpan agenda')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FormStep({ n, title, last, children }) {
  return (
    <div className="ka-step" style={last ? { borderBottom: 0 } : undefined}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{n}</span>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>{children}</div>
    </div>
  )
}

// Ekspor agenda yang sedang terfilter ke CSV (dibuka Excel/Sheets)
function exportCsv(items) {
  const head = ['Judul', 'Jenis', 'Penyelenggara', 'Tanggal Mulai', 'Tanggal Selesai', 'Jam Mulai', 'Jam Selesai', 'Lokasi', 'PIC / Pimpinan', 'Disposisi', 'TV Publik', 'Status']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = items.map(a => [
    a.judul, a.jenis, penyelenggaraLabel(a), a.tanggal_mulai, a.tanggal_selesai,
    fmtHM(a.waktu_mulai), fmtHM(a.waktu_selesai), a.lokasi,
    isPimpinan(a) ? (a.nama_pimpinan || '') : cleanPic(a.pic), a.disposisi || '',
    a.tampil_publik ? 'Ya' : 'Tidak', STATUS_PILL[a._st]?.label,
  ].map(esc).join(','))
  const blob = new Blob(['﻿' + [head.map(esc).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `agenda-usc-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function AgendaManagePage() {
  const { agenda, loading: agendaLoading, error: agendaError, addAgenda, updateAgenda, deleteAgenda, refreshAgenda } = useAgenda()
  const { success, error: showError } = useToast()

  const [operationLoading, setOperationLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [jenisFilter, setJenisFilter] = useState('all')
  const [pimpinanOnlyFilter, setPimpinanOnlyFilter] = useState(false)
  const [viewMode, setViewMode] = useState('table')
  const [selected, setSelected] = useState(() => new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [userRole, setUserRole] = useState('admin')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    // Get user role from session
    try {
      const sessionData = localStorage.getItem('simdir_session')
      if (sessionData) {
        const decoded = JSON.parse(atob(sessionData))
        if (decoded.role) {
          setUserRole(decoded.role)
        }
      }
    } catch (e) {
      console.error('Error reading user role:', e)
    }
  }, [])

  // Halaman kembali ke 1 setiap filter berubah
  useEffect(() => { setCurrentPage(1); setSelected(new Set()) }, [searchQuery, statusFilter, jenisFilter, pimpinanOnlyFilter])

  const canEdit = ['super_admin', 'admin'].includes(userRole)

  const withStatus = useMemo(() => agenda.map(item => ({
    ...item,
    _st: getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai, item.waktu_mulai, item.waktu_selesai),
  })), [agenda])

  // Calculate stats
  const stats = useMemo(() => ({
    all: withStatus.length,
    upcoming: withStatus.filter(i => i._st === 'upcoming' || i._st === 'upcoming_soon').length,
    ongoing: withStatus.filter(i => i._st === 'ongoing').length,
    completed: withStatus.filter(i => i._st === 'completed').length,
  }), [withStatus])

  // Filter agenda — yang aktif urut terdekat dulu, yang sudah selesai di
  // belakang (terbaru dulu), supaya arsip tidak menutupi agenda mendatang.
  const filteredAgenda = useMemo(() => {
    const q = searchQuery.toLowerCase()
    const start = (a) => toAgendaDateTime(a.tanggal_mulai, a.waktu_mulai)
    return withStatus.filter(item => {
      const matchesSearch = !q ||
        item.judul.toLowerCase().includes(q) ||
        item.lokasi?.toLowerCase().includes(q) ||
        item.penyelenggara?.toLowerCase().includes(q) ||
        item.pic?.toLowerCase().includes(q)

      const matchesJenis = jenisFilter === 'all' || item.jenis === jenisFilter
      const matchesPimpinan = !pimpinanOnlyFilter || isPimpinan(item)
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'upcoming' && (item._st === 'upcoming' || item._st === 'upcoming_soon')) ||
        item._st === statusFilter

      return matchesSearch && matchesJenis && matchesPimpinan && matchesStatus
    }).sort((a, b) => {
      const ad = a._st === 'completed', bd = b._st === 'completed'
      if (ad !== bd) return ad ? 1 : -1
      return ad ? start(b) - start(a) : start(a) - start(b)
    })
  }, [withStatus, searchQuery, jenisFilter, pimpinanOnlyFilter, statusFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAgenda.length / ITEMS_PER_PAGE))
  const paginatedAgenda = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredAgenda.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredAgenda, currentPage])

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleAddNew = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleDelete = (id) => {
    setConfirmDeleteId(id)
  }

  const toggleOne = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(prev => paginatedAgenda.every(a => prev.has(a.id)) ? new Set() : new Set(paginatedAgenda.map(a => a.id)))

  // Aksi massal: jalankan per agenda, laporkan berapa yang berhasil
  const runBulk = async (fn, okMsg) => {
    setOperationLoading(true)
    const items = agenda.filter(a => selected.has(a.id))
    const results = await Promise.allSettled(items.map(fn))
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed) showError(`${failed} dari ${items.length} agenda gagal diproses`)
    else success(okMsg(items.length))
    setSelected(new Set())
    setOperationLoading(false)
  }
  const bulkShowOnTv = () => runBulk(a => updateAgenda(a.id, { tampil_publik: true }), n => `${n} agenda ditampilkan di TV Publik`)
  const bulkDuplicate = () => runBulk(({ id, created_at, updated_at, _st, ...rest }) => addAgenda({ ...rest, judul: `${rest.judul} (salinan)` }), n => `${n} agenda diduplikat`)

  const deletingAgendaItem = confirmDeleteId && confirmDeleteId !== 'bulk' ? agenda.find(a => a.id === confirmDeleteId) : null

  const confirmDeleteAction = async () => {
    if (!confirmDeleteId) return
    if (confirmDeleteId === 'bulk') {
      setConfirmDeleteId(null)
      return runBulk(a => deleteAgenda(a.id), n => `${n} agenda dihapus`)
    }
    setOperationLoading(true)
    try {
      await deleteAgenda(confirmDeleteId)
      success('Agenda berhasil dihapus')
    } catch (err) {
      showError('Gagal menghapus agenda: ' + err.message)
    } finally {
      setOperationLoading(false)
      setConfirmDeleteId(null)
    }
  }

  const handleSave = async (item) => {
    setOperationLoading(true)
    try {
      if (editingItem) {
        await updateAgenda(editingItem.id, item)
        success('Agenda berhasil diperbarui')
      } else {
        await addAgenda(item)
        success('Agenda baru berhasil ditambahkan')
      }
      setShowModal(false)
      setEditingItem(null)
    } catch (err) {
      showError('Gagal menyimpan agenda: ' + err.message)
    } finally {
      setOperationLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setJenisFilter('all')
    setPimpinanOnlyFilter(false)
    setCurrentPage(1)
  }

  const hasFilters = searchQuery || statusFilter !== 'all' || jenisFilter !== 'all' || pimpinanOnlyFilter

  if (agendaLoading) {
    const { SkeletonStatGrid, SkeletonCardList, SkeletonStyles } = require('@/app/components/Skeleton');
    return (
      <>
        <SkeletonStyles />
        <SkeletonStatGrid count={4} />
        <SkeletonCardList count={6} />
      </>
    );
  }

  if (agendaError) {
    return (
      <EmptyStateError
        message={agendaError}
        onRetry={refreshAgenda}
      />
    )
  }

  const firstShown = filteredAgenda.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0
  const lastShown = Math.min(currentPage * ITEMS_PER_PAGE, filteredAgenda.length)

  return (
    <div className="ka">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-title-wrap">
          <h1 className="page-title">Kelola Agenda</h1>
          <p className="page-subtitle">Agenda direktorat &amp; unit kerja — tampil otomatis di TV Internal, dan di TV Publik bila ditandai.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-secondary" onClick={() => exportCsv(filteredAgenda)} disabled={!filteredAgenda.length}>
            {Icon.download}Ekspor
          </button>
          {canEdit && (
            <button type="button" className="btn btn-primary" onClick={handleAddNew}>
              {Icon.plus}Buat Agenda
            </button>
          )}
        </div>
      </div>

      {/* Kartu statistik = filter status */}
      <div className="ka-stats" role="tablist" aria-label="Filter status">
        {STATUS_TABS.map(s => {
          const on = statusFilter === s.value
          return (
            <button key={s.value} type="button" role="tab" aria-selected={on} onClick={() => setStatusFilter(s.value)} className={`ka-stat ${on ? 'active' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, opacity: .85 }}>{s.label}</span>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: on ? 'var(--usc-yellow)' : s.dot }} />
              </div>
              <span className="ka-stat-n">{stats[s.value]}</span>
            </button>
          )
        })}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Toolbar */}
        <div className="ka-toolbar">
          <div className="ka-search">
            {Icon.search}
            <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari judul, lokasi, penyelenggara…" aria-label="Cari agenda" />
          </div>
          <div className="seg" role="group" aria-label="Jenis kegiatan">
            {JENIS_OPTIONS.map(o => (
              <button key={o.value} type="button" className={jenisFilter === o.value ? 'active' : ''} aria-pressed={jenisFilter === o.value} onClick={() => setJenisFilter(o.value)}>{o.label}</button>
            ))}
          </div>
          <button type="button" onClick={() => setPimpinanOnlyFilter(v => !v)} aria-pressed={pimpinanOnlyFilter} className="ka-chip"
            style={pimpinanOnlyFilter ? { background: 'var(--danger-50)', color: 'var(--danger)', borderColor: 'transparent' } : undefined}>
            {Icon.person}Dihadiri pimpinan
          </button>
          {hasFilters && <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>Reset</button>}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{filteredAgenda.length} dari {agenda.length} agenda</span>
          <div className="ka-view" role="group" aria-label="Tampilan">
            <button type="button" aria-label="Tampilan daftar" aria-pressed={viewMode === 'list'} className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>{Icon.list}</button>
            <button type="button" aria-label="Tampilan tabel" aria-pressed={viewMode === 'table'} className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>{Icon.table}</button>
          </div>
        </div>

        {/* Content */}
        {filteredAgenda.length === 0 ? (
          hasFilters ? (
            <div style={{ padding: '56px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Tidak ada agenda yang cocok</span>
              <span style={{ fontSize: 14, color: 'var(--text-3)' }}>Ubah kata kunci atau filter.</span>
              <button type="button" className="btn btn-secondary" onClick={clearFilters} style={{ marginTop: 6 }}>Hapus semua filter</button>
            </div>
          ) : (
            <EmptyStateAgenda onAddNew={handleAddNew} canEdit={canEdit} />
          )
        ) : (
          <>
            <div className={viewMode === 'table' ? 'ka-only-mobile' : undefined}>
              <AgendaList items={paginatedAgenda} canEdit={canEdit} onEdit={handleEdit} onDelete={handleDelete} />
            </div>
            {viewMode === 'table' && (
              <div className="ka-only-desktop">
                <AgendaTable items={paginatedAgenda} canEdit={canEdit} onEdit={handleEdit} onDelete={handleDelete} selected={selected} onToggle={toggleOne} onToggleAll={toggleAll} />
              </div>
            )}
            <div className="ka-pager">
              <span style={{ fontSize: 13.5, color: 'var(--text-2)' }}>Menampilkan {firstShown}–{lastShown} dari {filteredAgenda.length}</span>
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button key={n} type="button" onClick={() => setCurrentPage(n)} aria-current={n === currentPage ? 'page' : undefined} className={`ka-page ${n === currentPage ? 'active' : ''}`}>{n}</button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {canEdit && selected.size > 0 && (
        <div className="ka-bulk" role="toolbar" aria-label="Aksi untuk agenda terpilih">
          <span style={{ fontSize: 14, fontWeight: 600, marginRight: 10 }}><span style={{ color: '#f7b500' }}>{selected.size}</span> dipilih</span>
          <button type="button" onClick={bulkShowOnTv} disabled={operationLoading}>Tampilkan di TV</button>
          <button type="button" onClick={bulkDuplicate} disabled={operationLoading}>Duplikat</button>
          <button type="button" className="danger" onClick={() => setConfirmDeleteId('bulk')} disabled={operationLoading}>Hapus</button>
          <button type="button" className="ghost" onClick={() => setSelected(new Set())} aria-label="Batal pilih">×</button>
        </div>
      )}

      {showModal && (
        <AgendaModal item={editingItem} onSave={handleSave} onClose={() => { setShowModal(false); setEditingItem(null) }} isSaving={operationLoading} />
      )}

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Hapus Agenda"
        message={
          confirmDeleteId === 'bulk'
            ? <><strong>{selected.size} agenda</strong> terpilih akan dihapus permanen. Lanjutkan?</>
            : deletingAgendaItem
            ? <>Agenda <strong>{deletingAgendaItem.judul}</strong> akan dihapus permanen. Lanjutkan?</>
            : 'Agenda ini akan dihapus permanen. Lanjutkan?'
        }
        confirmLabel="Ya, Hapus"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDeleteId(null)}
        busy={operationLoading}
      />
    </div>
  )
}
