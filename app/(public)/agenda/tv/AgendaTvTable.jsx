'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { getUnitColor } from './unit-colors'
import { formatTime, getAgendaStatus, MONTHS } from './shared'

const ROTATE_MS = 15000

// ============ TABLE ROW ============
function AgendaTableRow({ item, num, t }) {
  const st        = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
  const d         = new Date(item.tanggal_mulai)
  const unitColor = getUnitColor(item.jenis, item.penyelenggara)

  const rowBg   = st === 'ongoing' ? t.rowOngoing : st === 'upcoming_soon' ? t.rowSoon : unitColor.bg
  const borderL = `0.3vw solid ${st === 'ongoing' ? t.success : unitColor.border}`

  const statusMap = {
    ongoing:      { txt: 'Berlangsung', bg: t.statusOngoingBg,  fg: t.statusOngoingFg,  pulse: true  },
    upcoming_soon:{ txt: 'Segera',      bg: t.statusSoonBg,     fg: t.statusSoonFg,     pulse: false },
    upcoming:     { txt: 'Akan Datang', bg: t.statusUpcomingBg, fg: t.statusUpcomingFg, pulse: false },
  }
  const sCfg = statusMap[st] || statusMap.upcoming

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '4vw 13vw 1fr 18vw 13vw',
      gap: '1vw',
      padding: '1.8vh 1.5vw',
      alignItems: 'center',
      borderBottom: `1px solid ${t.border}`,
      flex: 1,
      minHeight: 0,
      background: rowBg,
      borderLeft: borderL
    }}>
      <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', minWidth: 0 }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.8vw', fontWeight: 700, color: t.text3 }}>
          {String(num).padStart(2, '0')}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '0.4vw', overflow: 'hidden', minWidth: 0 }}>
        <div>
          <span style={{ fontSize: '1.7vw', fontWeight: 700, color: t.text }}>{d.getDate()}</span>
          {' '}
          <span style={{ fontSize: '1.4vw', fontWeight: 600, color: t.text }}>{MONTHS[d.getMonth()]}</span>
        </div>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.1vw', color: t.text3, letterSpacing: '0.03em' }}>
          {formatTime(item.waktu_mulai)} – {formatTime(item.waktu_selesai)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '0.3vw', overflow: 'hidden', minWidth: 0 }}>
        <span style={{
          fontSize: '1.35vw',
          fontWeight: 700,
          lineHeight: 1.3,
          color: t.text,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {item.judul}
        </span>
        {item.penyelenggara && (
          <span style={{
            fontSize: '1vw', fontWeight: 700,
            color: unitColor.text,
            background: unitColor.bg,
            border: `0.1vw solid ${unitColor.border}`,
            padding: '0.2vw 0.6vw', borderRadius: 999,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
            display: 'inline-block',
          }}>
            {item.penyelenggara}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5vw', overflow: 'hidden', minWidth: 0 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={t.text3} strokeWidth="2" style={{ width: '1.2vw', height: '1.2vw', flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span style={{ fontSize: '1.2vw', color: t.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.lokasi || '—'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', minWidth: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4vw', padding: '0.5vw 0.9vw', borderRadius: 999, fontSize: '1vw', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', background: sCfg.bg, color: sCfg.fg, whiteSpace: 'nowrap' }}>
          {sCfg.pulse && (
            <span style={{ width: '0.7vw', height: '0.7vw', borderRadius: '50%', background: 'currentColor', animation: 'dotpulse 1.5s infinite' }} />
          )}
          {sCfg.txt}
        </span>
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
export default function AgendaTvTable({ agenda, t, scale }) {
  const [currentPage, setCurrentPage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(6)

  const tbodyRef = useRef(null)
  useEffect(() => {
    if (typeof window === 'undefined' || !tbodyRef.current) return
    const el = tbodyRef.current
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height
        const minRowH = Math.max(70, 85 * scale.s)
        const rows = Math.max(4, Math.min(14, Math.floor(h / minRowH)))
        setRowsPerPage(rows)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [scale.s])

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
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '0.8vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, height: '100%' }}>
      {/* Table head */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '4vw 13vw 1fr 18vw 13vw',
        gap: '1vw',
        padding: '1.2vh 1.5vw',
        background: t.theadBg,
        borderBottom: `1px solid ${t.border}`,
        fontSize: '1vw',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: t.text2,
        flexShrink: 0
      }}>
        {['No', 'Tanggal', 'Judul Kegiatan', 'Lokasi', 'Status'].map(col => (
          <div key={col}>{col}</div>
        ))}
      </div>
      {/* Table body */}
      <div ref={tbodyRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {currentRows.map((item, i) => (
          <AgendaTableRow key={item.id} item={item} num={currentPage * rowsPerPage + i + 1} t={t} />
        ))}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div key={`e${i}`} style={{ flex: 1, minHeight: 0, borderBottom: `1px solid ${t.border}` }} />
        ))}
      </div>
      {/* Pager */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1vw', padding: '1.4vh 1.8vw', borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: '0.9vw', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.text3 }}>Halaman</span>
        <div style={{ flex: 1, height: '0.6vh', background: t.border, borderRadius: 999, overflow: 'hidden', minWidth: '5vw' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${t.accent}, #ffd34d)`, transition: 'width 0.1s linear' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5vw' }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => { setCurrentPage(i); setProgress(0) }} style={{ width: i === currentPage ? '1.8vw' : '0.6vw', height: '0.6vw', borderRadius: 999, background: i === currentPage ? t.accent : t.border, border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
          ))}
        </div>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.1vw', color: t.text2, fontWeight: 600 }}>
          {currentPage + 1}/{totalPages}
        </span>
      </div>
    </div>
  )
}
