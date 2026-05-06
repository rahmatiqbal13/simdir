'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

// ============ HELPERS ============
const formatDate = (date) =>
  new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

const getAgendaStatus = (mulai, selesai) => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = new Date(mulai); start.setHours(0, 0, 0, 0)
  const end   = new Date(selesai); end.setHours(0, 0, 0, 0)
  if (today > end)    return 'completed'
  if (today >= start) return 'ongoing'
  const days = Math.ceil((start - today) / 86400000)
  return days <= 3 ? 'upcoming_soon' : 'upcoming'
}

const getCountdownLabel = (tanggalMulai) => {
  const diff = new Date(tanggalMulai) - new Date()
  if (diff <= 0) return null
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (d > 0) return `${d} hari lagi`
  if (h > 0) return `${h} jam lagi`
  return `${m} menit lagi`
}

// ============ KONSTANTA ============
const ROTATE_MS = 15000

const STATUS_CFG = {
  upcoming:      { label: 'Akan Datang', color: '#818cf8', bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.4)'  },
  upcoming_soon: { label: 'Segera',      color: '#fbbf24', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)'  },
  ongoing:       { label: 'Berlangsung', color: '#34d399', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.4)'  },
  completed:     { label: 'Selesai',     color: '#94a3b8', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)' },
}

const JENIS_CFG = {
  internal:  { label: 'Internal',  color: '#a5b4fc', bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.35)'  },
  eksternal: { label: 'Eksternal', color: '#fcd34d', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)'  },
  pimpinan:  { label: 'Pimpinan',  color: '#f9a8d4', bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.35)'  },
}

const STATUS_ACCENT = {
  upcoming: '#6366f1', upcoming_soon: '#f59e0b', ongoing: '#10b981', completed: '#475569',
}

// ============ HOOK DETEKSI LAYAR ============
function useScreenScale() {
  const [scale,       setScale]       = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(8)

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      const h = window.innerHeight

      // Scale proporsional terhadap baseline 1920×1080
      // Gunakan lebar layar sebagai acuan skala font/spacing
      const s = Math.max(0.85, Math.min(2.2, w / 1920))
      setScale(s)

      // Estimasi tinggi elemen tetap (dalam px baseline @scale=1)
      // Dikalikan s agar proporsional dengan layar
      const HEADER   = 88   // header
      const TICKER   = 52   // running text
      const PADDING  = 28   // padding main atas+bawah
      const NAV      = 86   // area pagination
      const GAP      = 16   // gap antara tabel dan nav
      const THEAD    = 46   // baris header tabel
      const MIN_ROW  = 90   // tinggi minimum 1 baris data

      const overhead       = (HEADER + TICKER + PADDING + NAV + GAP + THEAD) * s
      const availForRows   = h - overhead
      const rows           = Math.max(3, Math.min(12, Math.floor(availForRows / (MIN_ROW * s))))
      setRowsPerPage(rows)
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return { scale, rowsPerPage }
}

// ============ BADGE ============
function Badge({ bg, border, color, children, scale }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: `${0.35 * scale}rem`,
      padding: `${0.3 * scale}rem ${0.7 * scale}rem`, borderRadius: '9999px',
      fontSize: `${0.82 * scale}rem`, fontWeight: 700, whiteSpace: 'nowrap',
      background: bg, border: `${Math.max(1, Math.round(1.5 * scale))}px solid ${border}`, color,
    }}>
      {children}
    </span>
  )
}

// ============ BARIS TABEL ============
function AgendaRow({ item, index, scale }) {
  const status  = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
  const accent  = STATUS_ACCENT[status]
  const sCfg    = STATUS_CFG[status]
  const jCfg    = JENIS_CFG[item.jenis] || JENIS_CFG.internal
  const startD  = new Date(item.tanggal_mulai)
  const endD    = new Date(item.tanggal_selesai)
  const multiDay = item.tanggal_mulai !== item.tanggal_selesai
  const isOngoing = status === 'ongoing'
  const cdLabel = getCountdownLabel(item.tanggal_mulai)

  const pic = (() => {
    if (item.jenis === 'pimpinan' && item.disposisi) return `→ ${item.disposisi}`
    if (item.pic) return item.pic.replace('Manual: ', '')
    return '—'
  })()

  const rowBg = isOngoing
    ? 'rgba(16,185,129,0.08)'
    : index % 2 === 0 ? 'rgba(30,41,59,0.9)' : 'rgba(15,23,42,0.7)'

  const cell = {
    padding: `${0.65 * scale}rem ${0.9 * scale}rem`,
    verticalAlign: 'middle',
    borderBottom: '1px solid rgba(51,65,85,0.5)',
    overflow: 'hidden',
  }

  const iconSz = `${1.1 * scale}rem`

  return (
    <tr style={{ borderLeft: `${Math.max(3, Math.round(5 * scale))}px solid ${accent}`, background: rowBg }}>

      {/* No */}
      <td style={{ ...cell, textAlign: 'center', color: '#475569', fontWeight: 700, fontSize: `${0.95 * scale}rem` }}>
        {index + 1}
      </td>

      {/* Tanggal */}
      <td style={cell}>
        <div style={{ fontWeight: 800, fontSize: `${1.35 * scale}rem`, color: accent, lineHeight: 1 }}>
          {startD.getDate()}&nbsp;{startD.toLocaleDateString('id-ID', { month: 'short' })}
        </div>
        <div style={{ fontSize: `${0.8 * scale}rem`, color: '#64748b', marginTop: `${0.15 * scale}rem` }}>
          {startD.toLocaleDateString('id-ID', { weekday: 'long' })}
        </div>
        {multiDay && (
          <div style={{ fontSize: `${0.75 * scale}rem`, color: '#475569', marginTop: `${0.1 * scale}rem` }}>
            s/d {endD.getDate()}&nbsp;{endD.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
          </div>
        )}
      </td>

      {/* Judul */}
      <td style={cell}>
        <div style={{
          fontWeight: 700, fontSize: `${1.2 * scale}rem`, color: 'white', lineHeight: 1.35,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {item.judul}
        </div>
      </td>

      {/* Waktu */}
      <td style={cell}>
        {item.waktu_mulai ? (
          <span style={{ color: '#94a3b8', fontSize: `${1 * scale}rem`, fontWeight: 500 }}>
            {item.waktu_mulai}
            {item.waktu_selesai && (
              <>
                <br />
                <span style={{ fontSize: `${0.82 * scale}rem`, color: '#64748b' }}>
                  s/d {item.waktu_selesai}
                </span>
              </>
            )}
          </span>
        ) : <span style={{ color: '#334155', fontSize: `${1 * scale}rem` }}>—</span>}
      </td>

      {/* Lokasi */}
      <td style={cell}>
        <span style={{
          color: '#94a3b8', fontSize: `${1 * scale}rem`, fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {item.lokasi || '—'}
        </span>
      </td>

      {/* PIC / Disposisi */}
      <td style={cell}>
        <span style={{
          color: item.jenis === 'pimpinan' && item.disposisi ? '#f9a8d4' : '#94a3b8',
          fontSize: `${1 * scale}rem`,
          fontWeight: item.jenis === 'pimpinan' && item.disposisi ? 700 : 500,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {pic}
        </span>
      </td>

      {/* Jenis */}
      <td style={{ ...cell, textAlign: 'center' }}>
        <Badge bg={jCfg.bg} border={jCfg.border} color={jCfg.color} scale={scale}>
          {jCfg.label}
        </Badge>
      </td>

      {/* Status + Countdown */}
      <td style={cell}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: `${0.35 * scale}rem`, alignItems: 'flex-start' }}>
          <Badge bg={sCfg.bg} border={sCfg.border} color={sCfg.color} scale={scale}>
            {isOngoing && (
              <span style={{
                width: `${8 * scale}px`, height: `${8 * scale}px`,
                borderRadius: '50%', background: sCfg.color,
                animation: 'pulse 2s infinite', flexShrink: 0,
              }} />
            )}
            {sCfg.label}
          </Badge>

          {isOngoing && (
            <span style={{ fontSize: `${0.78 * scale}rem`, color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: `${0.3 * scale}rem` }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: iconSz, height: iconSz, flexShrink: 0 }}>
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Berlangsung
            </span>
          )}

          {!isOngoing && cdLabel && (
            <span style={{ fontSize: `${0.78 * scale}rem`, color: '#818cf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: `${0.3 * scale}rem` }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: iconSz, height: iconSz, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              {cdLabel}
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}

// ============ PROGRESS BAR ============
function ProgressBar({ progress, scale }) {
  return (
    <div style={{ width: '100%', height: `${Math.max(4, 5 * scale)}px`, background: '#0f172a', borderRadius: 9999, overflow: 'hidden' }}>
      <div style={{
        width: `${progress}%`, height: '100%',
        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
        borderRadius: 9999, transition: 'width 0.1s linear',
      }} />
    </div>
  )
}

// ============ RUNNING TEXT ============
function RunningText({ agenda, scale }) {
  const ongoing  = agenda.filter(i => getAgendaStatus(i.tanggal_mulai, i.tanggal_selesai) === 'ongoing')
  const upcoming = agenda.filter(i => {
    const s = getAgendaStatus(i.tanggal_mulai, i.tanggal_selesai)
    return s === 'upcoming' || s === 'upcoming_soon'
  })

  const text = (() => {
    const parts = []
    if (ongoing.length)  parts.push(`📢 SEDANG BERLANGSUNG: ${ongoing.map(a => a.judul).join(' | ')}`)
    if (upcoming.length) parts.push(`📅 AKAN DATANG: ${upcoming.slice(0, 5).map(a => `${a.judul} (${formatDate(a.tanggal_mulai)})`).join(' | ')}`)
    return parts.length ? parts.join('    •    ') : '📢 Tidak ada agenda aktif saat ini'
  })()

  return (
    <div style={{
      background: '#020617', color: '#64748b',
      padding: `${0.65 * scale}rem 0`,
      overflow: 'hidden', whiteSpace: 'nowrap',
      borderTop: '2px solid #1e293b', flexShrink: 0,
    }}>
      <span style={{
        display: 'inline-block',
        animation: 'marquee 40s linear infinite',
        fontSize: `${1 * scale}rem`, fontWeight: 500,
      }}>
        {text}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{text}
      </span>
    </div>
  )
}

// ============ HALAMAN UTAMA TV ============
export default function AgendaTVPage() {
  const { scale, rowsPerPage } = useScreenScale()

  const [agenda,      setAgenda]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [progress,    setProgress]    = useState(0)
  const [isPaused,    setIsPaused]    = useState(false)

  // Fetch data
  useEffect(() => {
    const load = async () => {
      try {
        if (!supabase) { setError('Supabase belum dikonfigurasi'); return }
        const { data, error: err } = await supabase
          .from('agenda').select('*').order('tanggal_mulai', { ascending: true })
        if (err) setError('Gagal memuat agenda')
        else { setAgenda(data || []); setError(null) }
      } catch { setError('Terjadi kesalahan') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // Filter & sort
  const filtered = useMemo(() =>
    agenda
      .filter(i => getAgendaStatus(i.tanggal_mulai, i.tanggal_selesai) !== 'completed')
      .sort((a, b) => new Date(a.tanggal_mulai) - new Date(b.tanggal_mulai))
  , [agenda])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const currentRows = useMemo(() => {
    const s = currentPage * rowsPerPage
    return filtered.slice(s, s + rowsPerPage)
  }, [filtered, currentPage, rowsPerPage])

  const stats = useMemo(() => ({
    ongoing:  agenda.filter(i => getAgendaStatus(i.tanggal_mulai, i.tanggal_selesai) === 'ongoing').length,
    upcoming: agenda.filter(i => { const s = getAgendaStatus(i.tanggal_mulai, i.tanggal_selesai); return s === 'upcoming' || s === 'upcoming_soon' }).length,
  }), [agenda])

  // Carousel
  const pageRef = useRef(currentPage)
  useEffect(() => { pageRef.current = currentPage }, [currentPage])

  useEffect(() => {
    if (isPaused || totalPages <= 1) return
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
  }, [isPaused, totalPages])

  useEffect(() => { setProgress(0) }, [currentPage])

  // Reset ke halaman 0 jika rowsPerPage berubah (resize)
  useEffect(() => { setCurrentPage(0); setProgress(0) }, [rowsPerPage])

  // ---- Loading / Error ----
  if (loading || error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: `${1.5 * scale}rem` }}>
        <div style={{
          width: `${80 * scale}px`, height: `${80 * scale}px`, borderRadius: `${20 * scale}px`,
          background: error ? '#7f1d1d' : 'linear-gradient(135deg,#f59e0b,#d97706)',
          display: 'grid', placeItems: 'center',
          color: error ? '#fca5a5' : '#0f172a', fontWeight: 900, fontSize: `${2.5 * scale}rem`,
        }}>{error ? '!' : 'S'}</div>
        <p style={{ color: error ? '#f87171' : '#64748b', fontSize: `${1.5 * scale}rem` }}>
          {error || 'Memuat agenda...'}
        </p>
      </div>
    )
  }

  const secondsLeft = Math.ceil((100 - progress) / 100 * (ROTATE_MS / 1000))
  const emptyRows   = Math.max(0, rowsPerPage - currentRows.length)

  return (
    <div
      style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Header ── */}
      <header style={{
        background: '#1e293b', borderBottom: '2px solid #334155',
        padding: `${0.8 * scale}rem ${2.5 * scale}rem`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: `${1 * scale}rem` }}>
            <div style={{
              width: `${52 * scale}px`, height: `${52 * scale}px`, borderRadius: `${12 * scale}px`,
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              display: 'grid', placeItems: 'center',
              color: '#0f172a', fontWeight: 900, fontSize: `${1.75 * scale}rem`,
              boxShadow: '0 4px 12px rgba(245,158,11,0.4)',
            }}>S</div>
            <div>
              <strong style={{ display: 'block', fontSize: `${1.4 * scale}rem`, color: 'white', letterSpacing: '0.05em' }}>
                SIMDIR
              </strong>
              <span style={{ fontSize: `${0.9 * scale}rem`, color: '#64748b' }}>
                Unesa Science Center
              </span>
            </div>
          </div>

          {/* Judul + Tanggal */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: `${1.875 * scale}rem`, fontWeight: 700, color: 'white' }}>
              Agenda Kegiatan
            </h1>
            <p style={{ margin: `${0.2 * scale}rem 0 0`, fontSize: `${1 * scale}rem`, color: '#64748b' }}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Statistik */}
          <div style={{ display: 'flex', gap: `${0.875 * scale}rem` }}>
            {[
              { label: 'Berlangsung', value: stats.ongoing,  color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
              { label: 'Akan Datang', value: stats.upcoming, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)' },
            ].map((s, i) => (
              <div key={i} style={{
                textAlign: 'center',
                padding: `${0.6 * scale}rem ${1.25 * scale}rem`,
                background: s.bg, borderRadius: `${12 * scale}px`,
                border: `2px solid ${s.border}`, minWidth: `${100 * scale}px`,
              }}>
                <div style={{ fontSize: `${2 * scale}rem`, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: `${0.8 * scale}rem`, color: '#64748b', fontWeight: 600, marginTop: `${0.2 * scale}rem` }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        padding: `${0.875 * scale}rem ${1.5 * scale}rem ${0.75 * scale}rem`,
        gap: `${0.75 * scale}rem`,
      }}>

        {filtered.length > 0 ? (
          <>
            {/* Tabel */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              background: '#1e293b', borderRadius: `${14 * scale}px`,
              border: '2px solid #334155',
              overflow: 'hidden',
              minHeight: 0,
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>

                {/* Header kolom */}
                <thead>
                  <tr style={{ background: '#0f172a', borderBottom: '2px solid #334155' }}>
                    {[
                      { label: 'No',             w: '3%'  },
                      { label: 'Tanggal',         w: '11%' },
                      { label: 'Judul Kegiatan',  w: '27%' },
                      { label: 'Waktu',           w: '11%' },
                      { label: 'Lokasi',          w: '16%' },
                      { label: 'PIC / Disposisi', w: '15%' },
                      { label: 'Jenis',           w: '9%'  },
                      { label: 'Status',          w: '14%' },
                    ].map(col => (
                      <th key={col.label} style={{
                        width: col.w,
                        padding: `${0.65 * scale}rem ${0.9 * scale}rem`,
                        textAlign: 'left', fontWeight: 700,
                        fontSize: `${0.75 * scale}rem`,
                        letterSpacing: '0.07em', textTransform: 'uppercase',
                        color: '#475569',
                      }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Data */}
                <tbody>
                  {currentRows.map((item, i) => (
                    <AgendaRow
                      key={item.id}
                      item={item}
                      index={currentPage * rowsPerPage + i}
                      scale={scale}
                    />
                  ))}

                  {/* Baris kosong supaya tabel penuh */}
                  {Array.from({ length: emptyRows }).map((_, i) => (
                    <tr
                      key={`empty-${i}`}
                      style={{
                        borderLeft: '5px solid transparent',
                        background: (currentRows.length + i) % 2 === 0
                          ? 'rgba(30,41,59,0.5)' : 'rgba(15,23,42,0.3)',
                      }}
                    >
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} style={{
                          padding: `${0.65 * scale}rem ${0.9 * scale}rem`,
                          borderBottom: '1px solid rgba(51,65,85,0.3)',
                        }} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Navigasi Carousel */}
            {totalPages > 1 && (
              <div style={{
                background: '#1e293b',
                borderRadius: `${12 * scale}px`,
                border: '2px solid #334155',
                padding: `${0.65 * scale}rem ${1.5 * scale}rem`,
                display: 'flex', alignItems: 'center',
                gap: `${1.5 * scale}rem`, flexShrink: 0,
              }}>
                <span style={{ fontSize: `${0.9 * scale}rem`, color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  Halaman {currentPage + 1} / {totalPages}
                  &nbsp;·&nbsp;{filtered.length} agenda
                  &nbsp;·&nbsp;{rowsPerPage} baris/halaman
                </span>

                <div style={{ flex: 1 }}>
                  <ProgressBar progress={progress} scale={scale} />
                </div>

                <span style={{
                  fontSize: `${0.9 * scale}rem`,
                  color: isPaused ? '#f59e0b' : '#6366f1',
                  fontWeight: 600, whiteSpace: 'nowrap',
                }}>
                  {isPaused ? '⏸ Dijeda' : `Ganti dalam ${secondsLeft}s`}
                </span>

                {/* Dots */}
                <div style={{ display: 'flex', gap: `${0.5 * scale}rem` }}>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => { setCurrentPage(i); setProgress(0) }}
                      style={{
                        width: i === currentPage ? `${2 * scale}rem` : `${0.75 * scale}rem`,
                        height: `${0.75 * scale}rem`,
                        borderRadius: 9999, padding: 0,
                        background: i === currentPage ? '#6366f1' : '#334155',
                        border: 'none', cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#1e293b', borderRadius: `${16 * scale}px`,
            border: '2px solid #334155',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ width: `${5 * scale}rem`, height: `${5 * scale}rem`, color: '#334155', marginBottom: `${1 * scale}rem` }}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <h3 style={{ fontSize: `${1.75 * scale}rem`, fontWeight: 600, color: '#475569', margin: 0 }}>
              Tidak ada agenda
            </h3>
            <p style={{ fontSize: `${1.1 * scale}rem`, color: '#334155', marginTop: `${0.5 * scale}rem` }}>
              Tidak ada agenda yang akan datang atau sedang berlangsung.
            </p>
          </div>
        )}
      </main>

      {/* ── Running Text ── */}
      <RunningText agenda={agenda} scale={scale} />

      <style jsx global>{`
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  )
}
