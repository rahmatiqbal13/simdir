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
const ITEMS_PER_PAGE = 4

const fmtRupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

function statusColor(status, p) {
  switch (status) {
    case 'akan_berlangsung': return p.upcoming
    case 'berlangsung': return p.soon
    case 'selesai': return p.ongoing
    default: return p.muted
  }
}

const COLS = 'minmax(0,1fr) 190px 150px'

// Satu baris program: nama + anggaran · status · % terserap
function ProgramKerjaRow({ item, p }) {
  const color = statusColor(item.status, p)
  // SPJ (dan % terserap) cuma berarti kalau programnya sudah 'selesai' —
  // sama seperti aturan kolom SPJ yang sudah ada, supaya konsisten (program
  // yang masih berjalan belum punya SPJ final untuk dibandingkan).
  const hasSpj = item.status === 'selesai' && item.nominal_spj !== null && item.nominal_spj !== undefined
  const pct = hasSpj && item.anggaran > 0 ? Math.round((item.nominal_spj / item.anggaran) * 100) : null
  const barColor = pct === null ? p.ink4 : pct > 100 ? '#e5484d' : pct >= 90 ? p.ongoing : p.soon

  return (
    <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 18, alignItems: 'center', padding: '14px 26px', borderBottom: `1px solid ${p.line}` }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <span style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.nama_program}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: p.ink2 }}>{fmtRupiah(item.anggaran)}</span>
      </div>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, color }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />{STATUS_LABEL[item.status] || item.status}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 19, fontWeight: 600, color: barColor }}>{pct !== null ? `${pct}%` : '—'}</span>
        <div style={{ height: 6, borderRadius: 3, background: p.track, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, pct || 0)}%`, background: barColor }} />
        </div>
      </div>
    </div>
  )
}

// Panel Program Kerja PUI untuk halaman TV internal (Redesign 02 · 2b).
// Rotasi 2 tingkat:
// (1) antar PUI — tab di header, berputar otomatis;
// (2) antar halaman program DALAM 1 PUI kalau lebih dari ITEMS_PER_PAGE —
//     otomatis maju tiap PAGE_MS, baru pindah PUI setelah semua halaman
//     PUI itu selesai ditampilkan (durasi per-PUI = jumlah halaman × PAGE_MS,
//     jadi PUI dengan banyak program tidak "memotong" sisanya).
export default function ProgramKerjaTvPanel({ items, p, isDark }) {
  const [currentTab, setCurrentTab] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [progress, setProgress] = useState(0)

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

  const shell = { display: 'flex', flexDirection: 'column', minHeight: 0, background: p.panel, borderRadius: 22, overflow: 'hidden' }

  if (puiTabs.length === 0) {
    return (
      <div style={{ ...shell, alignItems: 'center', justifyContent: 'center', color: p.ink2, fontSize: 24 }}>
        Belum ada data program kerja
      </div>
    )
  }

  const totalAnggaran = puiItems.reduce((sum, it) => sum + Number(it.anggaran || 0), 0)
  const totalSpj = puiItems.reduce((sum, it) => sum + Number(it.nominal_spj || 0), 0)
  const totalPct = totalAnggaran > 0 ? Math.round((totalSpj / totalAnggaran) * 100) : null

  return (
    <div style={shell}>
      {/* Header: tab PUI + PUI aktif + total anggaran */}
      <div style={{ padding: '20px 26px 16px', display: 'flex', flexDirection: 'column', gap: 14, background: p.head, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, letterSpacing: '.1em', textTransform: 'uppercase', color: p.ink2, whiteSpace: 'nowrap' }}>Program Kerja PUI</span>
          <div style={{ display: 'flex', gap: 6, overflow: 'hidden' }}>
            {puiTabs.map((tab, i) => (
              <button key={tab.kode} type="button" onClick={() => { setCurrentTab(i); setProgress(0) }} aria-current={i === safeTab ? 'true' : undefined}
                style={{ fontSize: 15, fontWeight: 700, padding: '5px 12px', borderRadius: 99, border: 0, cursor: 'pointer', whiteSpace: 'nowrap', background: i === safeTab ? '#f5b915' : 'transparent', color: i === safeTab ? '#0a1430' : p.ink2, fontFamily: 'var(--font-sans)' }}>
                {tab.label.replace(/^PUI(PT)?\s+/i, '')}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1, color: p.clock, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activePui.label}
          </span>
          <span style={{ fontSize: 18, color: p.ink2, whiteSpace: 'nowrap' }}>
            {pageCount > 1 && <span style={{ fontFamily: 'var(--font-mono)', marginRight: 14 }}>Hal {currentPage + 1}/{pageCount}</span>}
            Anggaran <strong style={{ color: p.ink, fontFamily: 'var(--font-mono)' }}>{fmtRupiah(totalAnggaran)}</strong>
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 18, padding: '14px 26px', fontFamily: 'var(--font-mono)', fontSize: 15, letterSpacing: '.08em', textTransform: 'uppercase', color: p.ink2, borderBottom: `1px solid ${p.line}`, flexShrink: 0 }}>
        <span>Program · Anggaran</span><span>Status</span><span>Terserap</span>
      </div>

      {pageItems.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.ink2, fontSize: 22 }}>Belum ada program kerja</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            {pageItems.map((item) => <ProgramKerjaRow key={item.id} item={item} p={p} />)}
          </div>

          {/* Ringkasan "Total terserap" untuk PUI aktif */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 28, padding: '20px 26px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, letterSpacing: '.1em', textTransform: 'uppercase', color: p.ink2 }}>Total terserap</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 72, fontWeight: 600, lineHeight: 1, letterSpacing: '-.03em' }}>{totalPct !== null ? `${totalPct}%` : '—'}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ height: 14, borderRadius: 7, background: p.track, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, totalPct || 0)}%`, background: '#f5b915', borderRadius: 7 }} />
              </div>
              <span style={{ fontSize: 18, color: p.ink2 }}>SPJ {fmtRupiah(totalSpj)} dari {fmtRupiah(totalAnggaran)}</span>
            </div>
          </div>
        </>
      )}

      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '16px 26px', background: p.head, marginTop: 'auto' }}>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: p.track, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#f5b915', borderRadius: 3, transition: 'width 0.1s linear' }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, color: p.ink2 }}>PUI {safeTab + 1} / {puiTabs.length}</span>
      </div>
    </div>
  )
}
