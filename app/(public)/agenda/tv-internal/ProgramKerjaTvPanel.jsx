'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

const PUI_TABS = [
  { kode: 'pui-olah', label: 'PUI Keolahragaan' },
  { kode: 'pui-dis', label: 'PUI Disabilitas' },
  { kode: 'pui-seni', label: 'PUI Seni Budaya' },
  { kode: 'pui-ai', label: 'PUI AI' },
]

const STATUS_LABEL = {
  belum_berjalan: 'Belum Berjalan',
  akan_berlangsung: 'Akan Berlangsung',
  berlangsung: 'Berlangsung',
  selesai: 'Selesai',
}

const PAGE_MS = 10000  // durasi tiap halaman program (dalam 1 PUI) sebelum lanjut
const ITEMS_PER_PAGE = 6

const fmtRupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

function statusColor(status, t) {
  switch (status) {
    case 'akan_berlangsung': return t.primary
    case 'berlangsung': return t.accent
    case 'selesai': return t.success
    default: return t.text3
  }
}

const COLS = '1fr 6fr 3fr 2.6fr 3fr'

// Satu baris tabel — pola sama seperti AgendaTableRow di AgendaTvTable.jsx:
// warna baris & border kiri mengikuti status, ukuran font dari `unitH` (piksel).
function ProgramKerjaRow({ item, num, t, unitH }) {
  const color = statusColor(item.status, t)
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: COLS, gap: '1cqw',
      padding: `${unitH * 0.12}px 1.5cqw`, alignItems: 'center',
      borderBottom: `1px solid ${t.border}`, borderLeft: `3px solid ${color}`,
      background: `${color}14`,
    }}>
      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: `${unitH * 0.2}px`, fontWeight: 700, color: t.text3 }}>
        {String(num).padStart(2, '0')}
      </span>
      <span style={{
        fontSize: `${unitH * 0.19}px`, fontWeight: 700, color: t.text, lineHeight: 1.25,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
      }}>
        {item.nama_program}
      </span>
      <span style={{ fontSize: `${unitH * 0.16}px`, fontWeight: 600, color: t.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {fmtRupiah(item.anggaran)}
      </span>
      <span style={{ fontSize: `${unitH * 0.15}px`, fontWeight: 700, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {STATUS_LABEL[item.status] || item.status}
      </span>
      <span style={{ fontSize: `${unitH * 0.16}px`, fontWeight: 600, color: t.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.status === 'selesai'
          ? (item.nominal_spj !== null && item.nominal_spj !== undefined ? fmtRupiah(item.nominal_spj) : '-')
          : '-'}
      </span>
    </div>
  )
}

// Panel Program Kerja PUI untuk halaman TV internal. Rotasi 2 tingkat:
// (1) antar PUI — 4 dot di pager, klik untuk lompat manual;
// (2) antar halaman program DALAM 1 PUI kalau lebih dari ITEMS_PER_PAGE —
//     otomatis maju tiap PAGE_MS, baru pindah PUI setelah semua halaman
//     PUI itu selesai ditampilkan (durasi per-PUI = jumlah halaman × PAGE_MS,
//     jadi PUI dengan banyak program tidak "memotong" sisanya).
// Pola progress-bar + dot pager meniru AgendaTvTable.jsx supaya kedua panel
// terasa satu sistem visual yang konsisten.
//
// Ukuran teks memakai piksel yang diturunkan dari `scale` (bukan cqw) —
// pola sama seperti `minRowH` di AgendaTvTable.jsx — supaya benar-benar
// terbaca di layar TV besar, bukan cuma proporsional terhadap lebar
// container yang bisa jadi sangat kecil dalam piksel absolut.
export default function ProgramKerjaTvPanel({ items, t, scale }) {
  const [currentTab, setCurrentTab] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [progress, setProgress] = useState(0)
  const unitH = Math.max(70, 90 * scale.s)

  const itemsByTab = useMemo(
    () => PUI_TABS.map((tab) => items.filter((it) => it.unit_kerja?.kode === tab.kode)),
    [items]
  )

  const activePui = PUI_TABS[currentTab]
  const puiItems = itemsByTab[currentTab]
  const pageCount = Math.max(1, Math.ceil(puiItems.length / ITEMS_PER_PAGE))
  const pageItems = useMemo(
    () => puiItems.slice(currentPage * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE),
    [puiItems, currentPage]
  )

  const tabRef = useRef(currentTab)
  const pageRef = useRef(currentPage)
  const pageCountRef = useRef(pageCount)
  useEffect(() => { tabRef.current = currentTab }, [currentTab])
  useEffect(() => { pageRef.current = currentPage }, [currentPage])
  useEffect(() => { pageCountRef.current = pageCount }, [pageCount])

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          const nextPage = pageRef.current + 1
          if (nextPage < pageCountRef.current) {
            setCurrentPage(nextPage)
          } else {
            setCurrentTab((tabRef.current + 1) % PUI_TABS.length)
            setCurrentPage(0)
          }
          return 0
        }
        return prev + (100 / (PAGE_MS / 100))
      })
    }, 100)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { setProgress(0) }, [currentTab, currentPage])
  // Kalau PUI aktif berganti (klik manual) sebelum halamannya habis, mulai dari halaman 1 lagi
  useEffect(() => { setCurrentPage(0) }, [currentTab])

  const totalAnggaran = puiItems.reduce((sum, it) => sum + Number(it.anggaran || 0), 0)
  const totalSpj = puiItems.reduce((sum, it) => sum + Number(it.nominal_spj || 0), 0)

  return (
    <div style={{
      containerType: 'inline-size',
      background: t.card,
      boxShadow: `0 0 0 1px ${t.border}, 0 4px 12px rgba(0,0,0,0.15)`,
      borderRadius: '0.8vw',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      minWidth: 0,
      height: '100%',
    }}>
      {/* Header PUI aktif + ringkasan */}
      <div style={{ padding: `${unitH * 0.16}px 1.5cqw`, background: t.theadBg, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.8cqw' }}>
          <div style={{ fontSize: `${unitH * 0.3}px`, fontWeight: 800, color: t.accent, letterSpacing: '0.02em' }}>
            {activePui.label}
          </div>
          {pageCount > 1 && (
            <span style={{ fontSize: `${unitH * 0.14}px`, color: t.text3, fontWeight: 600 }}>
              Hal {currentPage + 1}/{pageCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1.5cqw', marginTop: `${unitH * 0.08}px`, fontSize: `${unitH * 0.16}px`, color: t.text2, flexWrap: 'wrap' }}>
          <span>Total Anggaran: <strong style={{ color: t.text }}>{fmtRupiah(totalAnggaran)}</strong></span>
          <span>Total SPJ: <strong style={{ color: t.text }}>{fmtRupiah(totalSpj)}</strong></span>
        </div>
      </div>

      {/* Header kolom tabel — pola sama seperti thead AgendaTvTable.jsx */}
      <div style={{
        display: 'grid', gridTemplateColumns: COLS, gap: '1cqw',
        padding: `${unitH * 0.14}px 1.5cqw`, background: t.theadBg, borderBottom: `1px solid ${t.border}`,
        fontSize: `${unitH * 0.14}px`, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
        color: t.text2, flexShrink: 0,
      }}>
        {['No', 'Nama Program', 'Anggaran', 'Status', 'SPJ'].map((col) => <div key={col}>{col}</div>)}
      </div>

      {/* Daftar program (halaman aktif) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: pageItems.length > 0 ? 'flex-start' : 'center', overflow: 'hidden' }}>
        {pageItems.length === 0 ? (
          <div style={{ textAlign: 'center', color: t.text3, fontSize: `${unitH * 0.2}px` }}>
            Belum ada program kerja
          </div>
        ) : (
          pageItems.map((item, i) => (
            <ProgramKerjaRow key={item.id} item={item} num={currentPage * ITEMS_PER_PAGE + i + 1} t={t} unitH={unitH} />
          ))
        )}
      </div>

      {/* Pager */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1cqw', padding: '1.4vh 1.8cqw', borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ flex: 1, height: '0.6vh', background: t.border, borderRadius: 999, overflow: 'hidden', minWidth: '5cqw' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${t.accent}, #ffd34d)`, transition: 'width 0.1s linear' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.2cqw' }}>
          {PUI_TABS.map((tab, i) => (
            <button
              key={tab.kode}
              onClick={() => { setCurrentTab(i); setProgress(0) }}
              aria-label={tab.label}
              aria-current={i === currentTab ? 'true' : undefined}
              className="pager-dot"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.2cqw', height: '2.2cqw', minWidth: 24, minHeight: 24, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span style={{ display: 'block', width: i === currentTab ? '1.8cqw' : '0.6cqw', height: '0.6cqw', borderRadius: 999, background: i === currentTab ? t.accent : t.border, transition: 'width 0.3s, background-color 0.3s' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
