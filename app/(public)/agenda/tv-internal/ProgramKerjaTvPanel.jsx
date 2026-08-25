'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

// Urutan tampil yang disukai — cuma hint pengurutan. Tab yang benar-benar
// tampil diambil dari data `items` yang sudah di-fetch (unit_kerja.kode/nama
// hasil join), BUKAN daftar tetap — halaman ini publik/tanpa login jadi
// tidak bisa query tabel unit_kerja langsung (lihat kelola-program-kerja/
// page.jsx untuk penjelasan lengkap kenapa daftar tetap berbahaya: kalau
// kode unit PUI diubah/dihapus di Pengaturan > Unit Kerja, tab dengan kode
// hardcoded akan diam-diam berhenti menampilkan data).
const PUI_ORDER = ['pui-olah', 'pui-dis', 'pui-seni', 'pui-ai']

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

const COLS = '1fr 5fr 2.3fr 2fr 2.3fr 3fr'

// Satu baris tabel — pola sama seperti AgendaTableRow di AgendaTvTable.jsx:
// warna baris & border kiri mengikuti status, ukuran font dari `unitH` (piksel).
function ProgramKerjaRow({ item, num, t, unitH }) {
  const color = statusColor(item.status, t)
  // SPJ (dan % terserap) cuma berarti kalau programnya sudah 'selesai' —
  // sama seperti aturan kolom SPJ yang sudah ada, supaya konsisten (program
  // yang masih berjalan belum punya SPJ final untuk dibandingkan).
  const hasSpj = item.status === 'selesai' && item.nominal_spj !== null && item.nominal_spj !== undefined
  const pct = hasSpj && item.anggaran > 0 ? Math.round((item.nominal_spj / item.anggaran) * 100) : null
  const barColor = pct === null ? t.text3 : pct > 100 ? t.danger || '#ef4444' : pct >= 90 ? t.success : t.accent

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
        {hasSpj ? fmtRupiah(item.nominal_spj) : '-'}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: `${Math.round(unitH * 0.05)}px`, minWidth: 0 }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: `${unitH * 0.15}px`, fontWeight: 700, color: barColor }}>
          {pct !== null ? `${pct}%` : '-'}
        </span>
        {pct !== null && (
          <span style={{ display: 'block', width: '100%', height: Math.max(4, unitH * 0.07), background: t.border, borderRadius: 999, overflow: 'hidden' }}>
            <span style={{ display: 'block', width: `${Math.min(100, pct)}%`, height: '100%', background: barColor, borderRadius: 999 }} />
          </span>
        )}
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

  // Tab diturunkan dari unit_kerja unik yang benar-benar muncul di `items`
  // (bukan daftar kode tetap) — lihat catatan PUI_ORDER di atas.
  const puiTabs = useMemo(() => {
    const seen = new Map()
    for (const it of items) {
      const kode = it.unit_kerja?.kode
      if (!kode || seen.has(kode)) continue
      seen.set(kode, { kode, label: it.unit_kerja?.nama || kode })
    }
    return [...seen.values()].sort((a, b) => {
      const ia = PUI_ORDER.indexOf(a.kode)
      const ib = PUI_ORDER.indexOf(b.kode)
      return (ia === -1 ? PUI_ORDER.length : ia) - (ib === -1 ? PUI_ORDER.length : ib)
    })
  }, [items])

  // currentTab bisa jadi out-of-range kalau `items` berubah dan jumlah tab
  // menyusut — pakai index yang sudah di-clamp untuk baca, state tetap apa
  // adanya (dikoreksi sendiri begitu tab yang hilang muncul lagi).
  const safeTab = puiTabs.length ? Math.min(currentTab, puiTabs.length - 1) : 0

  const itemsByTab = useMemo(
    () => puiTabs.map((tab) => items.filter((it) => it.unit_kerja?.kode === tab.kode)),
    [items, puiTabs]
  )

  const activePui = puiTabs[safeTab]
  const puiItems = itemsByTab[safeTab] || []
  const pageCount = Math.max(1, Math.ceil(puiItems.length / ITEMS_PER_PAGE))
  const pageItems = useMemo(
    () => puiItems.slice(currentPage * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE),
    [puiItems, currentPage]
  )

  const tabRef = useRef(safeTab)
  const pageRef = useRef(currentPage)
  const pageCountRef = useRef(pageCount)
  const tabsLenRef = useRef(puiTabs.length)
  useEffect(() => { tabRef.current = safeTab }, [safeTab])
  useEffect(() => { pageRef.current = currentPage }, [currentPage])
  useEffect(() => { pageCountRef.current = pageCount }, [pageCount])
  useEffect(() => { tabsLenRef.current = puiTabs.length }, [puiTabs.length])

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          const nextPage = pageRef.current + 1
          if (nextPage < pageCountRef.current) {
            setCurrentPage(nextPage)
          } else if (tabsLenRef.current > 0) {
            setCurrentTab((tabRef.current + 1) % tabsLenRef.current)
            setCurrentPage(0)
          }
          return 0
        }
        return prev + (100 / (PAGE_MS / 100))
      })
    }, 100)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { setProgress(0) }, [safeTab, currentPage])
  // Kalau PUI aktif berganti (klik manual) sebelum halamannya habis, mulai dari halaman 1 lagi
  useEffect(() => { setCurrentPage(0) }, [safeTab])

  if (puiTabs.length === 0) {
    return (
      <div style={{
        containerType: 'inline-size', background: t.card, boxShadow: `0 0 0 1px ${t.border}, 0 4px 12px rgba(0,0,0,0.15)`,
        borderRadius: '0.8vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 0, height: '100%', color: t.text3, fontSize: `${unitH * 0.2}px`,
      }}>
        Belum ada data program kerja
      </div>
    )
  }

  const totalAnggaran = puiItems.reduce((sum, it) => sum + Number(it.anggaran || 0), 0)
  const totalSpj = puiItems.reduce((sum, it) => sum + Number(it.nominal_spj || 0), 0)
  const totalPct = totalAnggaran > 0 ? Math.round((totalSpj / totalAnggaran) * 100) : null

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
        {['No', 'Nama Program', 'Anggaran', 'Status', 'SPJ', 'Terserap'].map((col) => <div key={col}>{col}</div>)}
      </div>

      {/* Daftar program (halaman aktif) — tinggi natural, TIDAK diregangkan
          mengisi sisa ruang lagi (beda dari sebelumnya), supaya ruang sisa
          dipakai ringkasan "Total Terserap" di bawah, bukan dibiarkan
          kosong menganggur saat programnya sedikit. */}
      {pageItems.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ textAlign: 'center', color: t.text3, fontSize: `${unitH * 0.2}px` }}>
            Belum ada program kerja
          </div>
        </div>
      ) : (
        <>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {pageItems.map((item, i) => (
              <ProgramKerjaRow key={item.id} item={item} num={currentPage * ITEMS_PER_PAGE + i + 1} t={t} unitH={unitH} />
            ))}
          </div>

          {/* Ringkasan visual "Total Terserap" untuk PUI aktif — mengisi
              ruang kosong di bawah daftar program alih-alih dibiarkan
              kosong, sekaligus jadi jawaban langsung untuk "berapa persen
              anggaran PUI ini sudah terpakai" tanpa mental-math dari dua
              angka mentah (Total Anggaran vs Total SPJ) di header. */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: `${Math.round(unitH * 0.14)}px`, padding: '1cqw 3cqw' }}>
            <div style={{ fontSize: `${unitH * 0.15}px`, color: t.text3, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Total Terserap — {activePui.label}
            </div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: `${unitH * 0.55}px`, fontWeight: 800, color: t.accent, lineHeight: 1 }}>
              {totalPct !== null ? `${totalPct}%` : '—'}
            </div>
            <div style={{ width: '80%', maxWidth: 420, height: Math.max(6, unitH * 0.1), background: t.border, borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, totalPct || 0)}%`, height: '100%', background: `linear-gradient(90deg, ${t.accent}, #ffd34d)`, borderRadius: 999 }} />
            </div>
            <div style={{ fontSize: `${unitH * 0.15}px`, color: t.text2, fontWeight: 600 }}>
              {fmtRupiah(totalSpj)} dari {fmtRupiah(totalAnggaran)}
            </div>
          </div>
        </>
      )}

      {/* Pager */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1cqw', padding: '1.4vh 1.8cqw', borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ flex: 1, height: '0.6vh', background: t.border, borderRadius: 999, overflow: 'hidden', minWidth: '5cqw' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${t.accent}, #ffd34d)`, transition: 'width 0.1s linear' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.2cqw' }}>
          {puiTabs.map((tab, i) => (
            <button
              key={tab.kode}
              onClick={() => { setCurrentTab(i); setProgress(0) }}
              aria-label={tab.label}
              aria-current={i === safeTab ? 'true' : undefined}
              className="pager-dot"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.2cqw', height: '2.2cqw', minWidth: 24, minHeight: 24, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span style={{ display: 'block', width: i === safeTab ? '1.8cqw' : '0.6cqw', height: '0.6cqw', borderRadius: 999, background: i === safeTab ? t.accent : t.border, transition: 'width 0.3s, background-color 0.3s' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
