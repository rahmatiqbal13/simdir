'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { getUnitColor } from './unit-colors'
import { formatTime, getAgendaStatus, MONTHS } from './shared'

const ROTATE_MS = 15000

// ============ TABLE ROW ============
// `rowH` adalah tinggi baris dalam piksel (lihat `minRowH` di AgendaTvTable,
// diturunkan dari `scale.s` — sama di kedua halaman). Ukuran font memakai
// `rowH`, BUKAN `cqw` (lebar kontainer) — karena lebar kontainer tabel ini
// berbeda jauh antara halaman publik (~40% layar) dan internal (~100%
// layar), sehingga cqw yang pas di satu konteks jadi terlalu besar/kecil di
// konteks lainnya (judul & tanggal saling tumpang tindih di halaman
// internal). Tinggi baris dihitung dengan cara yang sama di kedua halaman,
// jadi mengikat ukuran font ke situ membuat teks konsisten di keduanya.
function AgendaTableRow({ item, num, t, rowH }) {
  const st        = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
  const d         = new Date(item.tanggal_mulai)
  const unitColor = getUnitColor(item.jenis, item.penyelenggara)

  // Status (ongoing/upcoming_soon) masih dipakai untuk mewarnai baris —
  // hanya badge teks "Status" yang tidak ditampilkan lagi.
  const rowBg   = st === 'ongoing' ? t.rowOngoing : st === 'upcoming_soon' ? t.rowSoon : unitColor.bg
  const borderL = `3px solid ${st === 'ongoing' ? t.success : unitColor.border}`

  return (
    <div className="agenda-tv-row" style={{
      display: 'grid',
      gridTemplateColumns: '1fr 3fr 13fr 5fr',
      gap: '1cqw',
      padding: `${Math.round(rowH * 0.1)}px 1.5cqw`,
      alignItems: 'center',
      borderBottom: `1px solid ${t.border}`,
      flex: 1,
      minHeight: 0,
      background: rowBg,
      borderLeft: borderL
    }}>
      <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', minWidth: 0 }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: `${rowH * 0.3}px`, fontWeight: 700, color: t.text3 }}>
          {String(num).padStart(2, '0')}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: `${Math.round(rowH * 0.04)}px`, overflow: 'hidden', minWidth: 0 }}>
        <div>
          <span style={{ fontSize: `${rowH * 0.22}px`, fontWeight: 700, color: t.text }}>{d.getDate()}</span>
          {' '}
          <span style={{ fontSize: `${rowH * 0.18}px`, fontWeight: 600, color: t.text }}>{MONTHS[d.getMonth()]}</span>
        </div>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: `${rowH * 0.14}px`, color: t.text3, letterSpacing: '0.03em' }}>
          {formatTime(item.waktu_mulai)} – {formatTime(item.waktu_selesai)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: `${Math.round(rowH * 0.03)}px`, overflow: 'hidden', minWidth: 0, width: '100%' }}>
        <span style={{
          fontSize: `${rowH * 0.24}px`,
          fontWeight: 700,
          color: t.text,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}>
          {item.judul}
        </span>
        {item.penyelenggara && (
          <span style={{
            fontSize: `${rowH * 0.15}px`, fontWeight: 700,
            color: unitColor.text,
            background: unitColor.bg,
            border: `1px solid ${unitColor.border}`,
            padding: '0.15em 0.6em', borderRadius: 999,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
            display: 'inline-block',
          }}>
            {item.penyelenggara}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5cqw', overflow: 'hidden', minWidth: 0 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={t.text3} strokeWidth="2" style={{ width: `${rowH * 0.2}px`, height: `${rowH * 0.2}px`, flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span style={{ fontSize: `${rowH * 0.2}px`, color: t.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.lokasi || '—'}</span>
      </div>
    </div>
  )
}

// ============ AGENDA TV TABLE (tabel + pagination + auto-rotate) ============
// Dipakai oleh halaman publik (./page.jsx, di kolom kiri berdampingan dengan
// panel media) dan halaman internal (../tv-internal/page.jsx, full-width
// tanpa panel media). `agenda` harus sudah difilter (buang yang completed)
// dan diurutkan oleh pemanggil — lihat `sortActiveAgenda` di ./shared.js.
// Membutuhkan keyframe CSS `dotpulse` didefinisikan secara global oleh
// halaman pemanggil (lihat <style> di page.jsx / tv-internal/page.jsx).
//
// Lebar kolom (gridTemplateColumns) memakai `fr` supaya proporsional
// terhadap lebar kontainer sendiri (bukan viewport) — lihat AgendaTableRow
// di atas untuk kenapa ukuran FONT baris memakai `rowH` (piksel, dari
// `minRowH` di bawah), bukan `cqw`.
export default function AgendaTvTable({ agenda, t, scale, maxRows }) {
  const [currentPage, setCurrentPage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(maxRows || 6)
  const minRowH = Math.max(70, 85 * scale.s)

  // Kalau `maxRows` diberikan (mis. halaman publik yang berbagi ruang dengan
  // panel media), jumlah baris tetap/fixed — tidak mengisi sisa tinggi
  // kontainer dengan baris kosong. Tanpa `maxRows` (mis. halaman internal
  // full-width), jumlah baris dihitung otomatis dari tinggi kontainer nyata.
  const tbodyRef = useRef(null)
  useEffect(() => {
    if (maxRows) return
    if (typeof window === 'undefined' || !tbodyRef.current) return
    const el = tbodyRef.current
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height
        const rows = Math.max(4, Math.min(14, Math.floor(h / minRowH)))
        setRowsPerPage(rows)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [minRowH, maxRows])

  const totalPages  = Math.max(1, Math.ceil(agenda.length / rowsPerPage))
  const currentRows = useMemo(() => agenda.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage), [agenda, currentPage, rowsPerPage])
  const emptyCount  = Math.max(0, rowsPerPage - currentRows.length)

  // Navigasi halaman lewat panah kiri/kanan keyboard
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  setCurrentPage(p => Math.max(0, p - 1))
      if (e.key === 'ArrowRight') setCurrentPage(p => Math.min(totalPages - 1, p + 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [totalPages])

  const pageRef = useRef(currentPage)
  useEffect(() => { pageRef.current = currentPage }, [currentPage])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (totalPages <= 1) { setProgress(0); return }
    const id = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setCurrentPage((pageRef.current + 1) % totalPages)
          return 0
        }
        return prev + (100 / (ROTATE_MS / 100))
      })
    }, 100)
    return () => clearInterval(id)
  }, [totalPages])

  useEffect(() => { setProgress(0) }, [currentPage])
  useEffect(() => { setCurrentPage(0); setProgress(0) }, [totalPages])

  return (
    <div style={{ containerType: 'inline-size', background: t.card, boxShadow: `0 0 0 1px ${t.border}, 0 4px 12px rgba(0,0,0,0.15)`, borderRadius: '0.8vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, height: maxRows ? 'auto' : '100%', flexShrink: maxRows ? 0 : undefined }}>
      {/* Table head */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 3fr 13fr 5fr',
        gap: '1cqw',
        padding: '1.2vh 1.5cqw',
        background: t.theadBg,
        borderBottom: `1px solid ${t.border}`,
        fontSize: '1.5cqw',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: t.text2,
        flexShrink: 0
      }}>
        {['No', 'Tanggal', 'Judul Kegiatan', 'Lokasi'].map(col => (
          <div key={col}>{col}</div>
        ))}
      </div>
      {/* Table body */}
      <div
        ref={tbodyRef}
        style={
          maxRows
            ? { height: `${minRowH * maxRows}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
            : { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
        }
      >
        {currentRows.map((item, i) => (
          <AgendaTableRow key={item.id} item={item} num={currentPage * rowsPerPage + i + 1} t={t} rowH={minRowH} />
        ))}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div key={`e${i}`} style={{ flex: 1, minHeight: 0, borderBottom: `1px solid ${t.border}` }} />
        ))}
      </div>
      {/* Pager */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1cqw', padding: '1.4vh 1.8cqw', borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: '0.9cqw', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.text3 }}>Halaman</span>
        <div style={{ flex: 1, height: '0.6vh', background: t.border, borderRadius: 999, overflow: 'hidden', minWidth: '5cqw' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${t.accent}, #ffd34d)`, transition: 'width 0.1s linear' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.2cqw' }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentPage(i); setProgress(0) }}
              aria-label={`Halaman ${i + 1}`}
              aria-current={i === currentPage ? 'true' : undefined}
              className="pager-dot"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.2cqw', height: '2.2cqw', minWidth: 24, minHeight: 24, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span style={{ display: 'block', width: i === currentPage ? '1.8cqw' : '0.6cqw', height: '0.6cqw', borderRadius: 999, background: i === currentPage ? t.accent : t.border, transition: 'width 0.3s, background-color 0.3s' }} />
            </button>
          ))}
        </div>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.1cqw', color: t.text2, fontWeight: 600 }}>
          {currentPage + 1}/{totalPages}
        </span>
      </div>

      <style>{`
        .pager-dot { transition: transform 0.15s ease; }
        .pager-dot:active { transform: scale(0.96); }

        @keyframes agendaTvRowEnter {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .agenda-tv-row {
          animation: agendaTvRowEnter 350ms cubic-bezier(0.23, 1, 0.32, 1) backwards;
        }
        ${Array.from({ length: 14 }, (_, i) => `.agenda-tv-row:nth-child(${i + 1}) { animation-delay: ${i * 50}ms; }`).join('\n        ')}
      `}</style>
    </div>
  )
}
