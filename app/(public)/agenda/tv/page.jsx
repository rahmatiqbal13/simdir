'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

// ============ HELPERS ============
const formatDate = (date) =>
  new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

// Strip detik dari "HH:MM:SS" → "HH:MM"
const formatTime = (t) => (t ? t.slice(0, 5) : null)

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

// ============ TEMA ============
const DARK = {
  pageBg:           '#0f172a',
  headerBg:         '#1e293b',
  headerBorder:     '#2d3f55',
  tableBg:          '#1e293b',
  theadBg:          '#0f172a',
  theadBorder:      '#2d3f55',
  rowEven:          'rgba(30,41,59,0.85)',
  rowOdd:           'rgba(15,23,42,0.65)',
  rowOngoing:       'rgba(16,185,129,0.07)',
  rowEmptyEven:     'rgba(30,41,59,0.4)',
  rowEmptyOdd:      'rgba(15,23,42,0.25)',
  rowBorder:        'rgba(51,65,85,0.45)',
  emptyBorder:      'rgba(51,65,85,0.25)',
  colHeader:        '#475569',
  noColor:          '#475569',
  titleColor:       'white',
  subText:          '#64748b',
  mutedText:        '#94a3b8',
  timeMain:         '#cbd5e1',
  navBg:            '#1e293b',
  navBorder:        '#2d3f55',
  tickerBg:         '#020617',
  tickerText:       '#64748b',
  tickerBorder:     '#1e293b',
  ongoingLabelColor:'#34d399',
  countdownColor:   '#818cf8',
  disposisiColor:   '#f9a8d4',
  progressTrackBg:  '#0f172a',
  inactiveDotBg:    '#334155',
}

const LIGHT = {
  pageBg:           '#f1f5f9',
  headerBg:         '#ffffff',
  headerBorder:     '#cbd5e1',
  tableBg:          '#ffffff',
  theadBg:          '#f8fafc',
  theadBorder:      '#e2e8f0',
  rowEven:          'rgba(248,250,252,0.95)',
  rowOdd:           'rgba(241,245,249,0.9)',
  rowOngoing:       'rgba(16,185,129,0.08)',
  rowEmptyEven:     'rgba(248,250,252,0.6)',
  rowEmptyOdd:      'rgba(241,245,249,0.5)',
  rowBorder:        'rgba(203,213,225,0.7)',
  emptyBorder:      'rgba(203,213,225,0.4)',
  colHeader:        '#334155',
  noColor:          '#475569',
  titleColor:       '#0f172a',
  subText:          '#475569',
  mutedText:        '#334155',
  timeMain:         '#1e293b',
  navBg:            '#ffffff',
  navBorder:        '#e2e8f0',
  tickerBg:         '#1e293b',
  tickerText:       '#94a3b8',
  tickerBorder:     '#334155',
  ongoingLabelColor:'#065f46',
  countdownColor:   '#3730a3',
  disposisiColor:   '#9d174d',
  progressTrackBg:  '#e2e8f0',
  inactiveDotBg:    '#94a3b8',
}

// ============ KONSTANTA ============
const ROTATE_MS = 15000
const ROWS_PER_PAGE = 6   // default; ResizeObserver akan sesuaikan (max 6)

// 🎬 KONFIGURASI YOUTUBE VIDEO
// Format: https://www.youtube.com/embed/VIDEO_ID?PARAMS
// atau playlist: https://www.youtube.com/embed/videoseries?list=PLAYLIST_ID&PARAMS
const YOUTUBE_VIDEO_URL = 'https://www.youtube.com/embed/nl6LLK92iWU' // ← Isi URL YouTube di sini (kosong = sembunyikan video)

// Parameter yang otomatis ditambahkan:
// - autoplay=1&mute=1      : Play otomatis dengan mute (wajib browser)
// - loop=1                  : Loop video/playlist terus menerus
// - rel=0                   : Tidak tampilkan video related setelah selesai
// - modestbranding=1        : Minimalkan logo YouTube
// - controls=0              : Sembunyikan kontrol player (opsional)
// - iv_load_policy=3        : Sembunyikan annotation

// Optimized column widths (tanpa Waktu dan Jenis) - Status diperbesar agar terlihat jelas di TV
const COLS = 'minmax(40px, 4%) minmax(90px, 10%) minmax(220px, 30%) minmax(120px, 14%) minmax(130px, 17%) minmax(160px, 25%)'

const getStatusCfg = (isDark) => ({
  upcoming:      { label: 'Akan Datang', color: isDark ? '#818cf8' : '#3730a3', bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.4)'  },
  upcoming_soon: { label: 'Segera',      color: isDark ? '#fbbf24' : '#92400e', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)'  },
  ongoing:       { label: 'Berlangsung', color: isDark ? '#34d399' : '#065f46', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.4)'  },
  completed:     { label: 'Selesai',     color: isDark ? '#94a3b8' : '#475569', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' },
})

const getJenisCfg = (isDark) => ({
  internal:  { label: 'Internal',  color: isDark ? '#a5b4fc' : '#3730a3', bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.4)'  },
  eksternal: { label: 'Eksternal', color: isDark ? '#fcd34d' : '#92400e', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)'  },
  pimpinan:  { label: 'Pimpinan',  color: isDark ? '#f9a8d4' : '#9d174d', bg: 'rgba(236,72,153,0.15)',  border: 'rgba(236,72,153,0.4)'  },
})

const STATUS_ACCENT = {
  upcoming: '#6366f1', upcoming_soon: '#f59e0b', ongoing: '#10b981', completed: '#475569',
}

// ============ HOOK: SCALE LAYAR ============
function useScreenScale() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const update = () => setScale(Math.max(0.8, Math.min(2.0, window.innerWidth / 1920)))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return scale
}

// ============ HOOK: TEMA ============
function useTheme() {
  const [isDark, setIsDark] = useState(true)
  useEffect(() => {
    const saved = localStorage.getItem('tv-theme')
    if (saved === 'light') setIsDark(false)
  }, [])
  const toggle = () => setIsDark(prev => {
    const next = !prev
    localStorage.setItem('tv-theme', next ? 'dark' : 'light')
    return next
  })
  return { isDark, theme: isDark ? DARK : LIGHT, toggle }
}

// ============ VIDEO PLAYER COMPONENT ============
const VideoPlayer = ({ url }) => {
  // Generate src URL dengan parameter loop yang benar
  const getVideoSrc = () => {
    if (!url) return ''
    
    // Base parameters
    const baseParams = 'autoplay=1&mute=1&rel=0&modestbranding=1&controls=0&iv_load_policy=3&loop=1'
    const separator = url.includes('?') ? '&' : '?'
    
    // Jika single video (bukan playlist), perlu tambahkan playlist=VIDEO_ID agar loop berfungsi
    if (url.includes('/embed/') && !url.includes('videoseries')) {
      // Extract VIDEO_ID dari URL
      const match = url.match(/embed\/([^?&]+)/)
      if (match && match[1]) {
        const videoId = match[1]
        return `${url}${separator}${baseParams}&playlist=${videoId}`
      }
    }
    
    // Playlist atau format lain
    return `${url}${separator}${baseParams}`
  }

  return (
    <iframe
      src={getVideoSrc()}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: 'none',
      }}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      title="Tentang USC"
    />
  )
}

// ============ BADGE ============
const Badge = ({ bg, border, color, children, s }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: `${0.3 * s}rem`,
    padding: `${0.3 * s}rem ${0.6 * s}rem`, borderRadius: '9999px',
    fontSize: `${0.95 * s}rem`, fontWeight: 700, whiteSpace: 'nowrap',
    background: bg, border: `${Math.max(1, Math.round(1 * s))}px solid ${border}`, color,
  }}>
    {children}
  </span>
)

// ============ BARIS DATA (div-based, flex: 1) ============
function AgendaRow({ item, rowIndex, s, t, isDark }) {
  const status   = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
  const accent   = STATUS_ACCENT[status]
  const sCfg     = getStatusCfg(isDark)[status]
  const startD   = new Date(item.tanggal_mulai)
  const endD     = new Date(item.tanggal_selesai)
  const multiDay = item.tanggal_mulai !== item.tanggal_selesai
  const isOngoing = status === 'ongoing'
  const cdLabel  = getCountdownLabel(item.tanggal_mulai)

  const pic = (() => {
    if (item.jenis === 'pimpinan' && item.disposisi) return `→ ${item.disposisi}`
    if (item.pic) return item.pic.replace('Manual: ', '')
    return '—'
  })()

  const rowBg = isOngoing
    ? t.rowOngoing
    : rowIndex % 2 === 0 ? t.rowEven : t.rowOdd

  // Padding sel — seragam dengan header, kolom terakhir (Status) diberi padding kanan ekstra
  const cp = `${0.6 * s}rem ${0.6 * s}rem`
  const cpLast = `${0.6 * s}rem ${0.9 * s}rem ${0.6 * s}rem ${0.6 * s}rem` // top right bottom left

  const cellBase = {
    padding: cp,
    display: 'flex', alignItems: 'center',
    overflow: 'hidden',
    borderBottom: `1px solid ${t.rowBorder}`,
    minHeight: 0,
  }

  const clamp2 = {
    overflow: 'hidden', textOverflow: 'ellipsis',
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
  }

  const clamp3 = {
    overflow: 'hidden', textOverflow: 'ellipsis',
    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: COLS,
      flex: 1, minHeight: 0,
      borderLeft: `${Math.max(3, Math.round(4 * s))}px solid ${accent}`,
      background: rowBg,
      transition: 'background 0.2s',
    }}>
      {/* No */}
      <div style={{ ...cellBase, justifyContent: 'center' }}>
        <span style={{ fontSize: `${1.1 * s}rem`, fontWeight: 700, color: t.noColor }}>
          {rowIndex + 1}
        </span>
      </div>

      {/* Tanggal */}
      <div style={{ ...cellBase, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: `${0.05 * s}rem` }}>
        <span style={{ fontSize: `${1.5 * s}rem`, fontWeight: 800, color: accent, lineHeight: 1.1 }}>
          {startD.getDate()}&nbsp;{startD.toLocaleDateString('id-ID', { month: 'short' })}
        </span>
        <span style={{ fontSize: `${0.95 * s}rem`, color: t.subText, lineHeight: 1.2 }}>
          {startD.toLocaleDateString('id-ID', { weekday: 'long' })}
        </span>
        {multiDay && (
          <span style={{ fontSize: `${0.85 * s}rem`, color: t.mutedText, lineHeight: 1.2 }}>
            s/d {endD.getDate()}&nbsp;{endD.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Judul */}
      <div style={{ ...cellBase }}>
        <span style={{ fontSize: `${1.35 * s}rem`, fontWeight: 700, color: t.titleColor, lineHeight: 1.35, ...clamp3 }}>
          {item.judul}
        </span>
      </div>

      {/* Lokasi */}
      <div style={{ ...cellBase }}>
        <span style={{ fontSize: `${1.05 * s}rem`, color: t.mutedText, fontWeight: 500, ...clamp2, lineHeight: 1.35 }}>
          {item.lokasi || '—'}
        </span>
      </div>

      {/* PIC / Disposisi */}
      <div style={{ ...cellBase }}>
        <span style={{
          fontSize: `${1.05 * s}rem`,
          color: item.jenis === 'pimpinan' && item.disposisi ? t.disposisiColor : t.mutedText,
          fontWeight: item.jenis === 'pimpinan' && item.disposisi ? 700 : 500,
          ...clamp2,
          lineHeight: 1.35,
        }}>
          {pic}
        </span>
      </div>

      {/* Status */}
      <div style={{ ...cellBase, padding: cpLast, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: `${0.2 * s}rem`, overflow: 'visible' }}>
        <Badge bg={sCfg.bg} border={sCfg.border} color={sCfg.color} s={s}>
          {isOngoing && (
            <span style={{ width: `${5 * s}px`, height: `${5 * s}px`, borderRadius: '50%', background: sCfg.color, animation: 'pulse 2s infinite', flexShrink: 0 }} />
          )}
          {sCfg.label}
        </Badge>
        {isOngoing && (
          <span style={{ fontSize: `${0.85 * s}rem`, color: t.ongoingLabelColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: `${0.15 * s}rem`, whiteSpace: 'nowrap' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: `${0.85 * s}rem`, height: `${0.85 * s}rem`, flexShrink: 0 }}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Berlangsung
          </span>
        )}
        {!isOngoing && cdLabel && (
          <span style={{ fontSize: `${0.85 * s}rem`, color: t.countdownColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: `${0.15 * s}rem`, whiteSpace: 'nowrap' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: `${0.85 * s}rem`, height: `${0.85 * s}rem`, flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {cdLabel}
          </span>
        )}
      </div>
    </div>
  )
}

// ============ BARIS KOSONG ============
const EmptyRow = ({ rowIndex, s, t }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: COLS,
    flex: 1, minHeight: 0,
    borderLeft: '4px solid transparent',
    background: rowIndex % 2 === 0 ? t.rowEmptyEven : t.rowEmptyOdd,
    borderBottom: `1px solid ${t.emptyBorder}`,
  }}>
    {Array.from({ length: 6 }).map((_, i) => {
      const isLastCol = i === 5
      return (
        <div key={i} style={{ padding: isLastCol ? `${0.6 * s}rem ${0.9 * s}rem ${0.6 * s}rem ${0.6 * s}rem` : `${0.6 * s}rem ${0.6 * s}rem` }} />
      )
    })}
  </div>
)

// ============ PROGRESS BAR ============
const ProgressBar = ({ progress, s, t }) => (
  <div style={{ width: '100%', height: `${Math.max(4, 5 * s)}px`, background: t.progressTrackBg, borderRadius: 9999, overflow: 'hidden' }}>
    <div style={{
      width: `${progress}%`, height: '100%',
      background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
      borderRadius: 9999, transition: 'width 0.1s linear',
    }} />
  </div>
)

// ============ RUNNING TEXT ============
const RunningText = ({ agenda, s, t }) => {
  const ongoing  = agenda.filter(i => getAgendaStatus(i.tanggal_mulai, i.tanggal_selesai) === 'ongoing')
  const upcoming = agenda.filter(i => { const st = getAgendaStatus(i.tanggal_mulai, i.tanggal_selesai); return st === 'upcoming' || st === 'upcoming_soon' })

  const text = (() => {
    const parts = []
    if (ongoing.length)  parts.push(`📢 SEDANG BERLANGSUNG: ${ongoing.map(a => a.judul).join(' | ')}`)
    if (upcoming.length) parts.push(`📅 AKAN DATANG: ${upcoming.slice(0, 5).map(a => `${a.judul} (${formatDate(a.tanggal_mulai)})`).join(' | ')}`)
    return parts.length ? parts.join('    •    ') : '📢 Tidak ada agenda aktif saat ini'
  })()

  return (
    <div style={{ background: t.tickerBg, color: t.tickerText, padding: `${0.6 * s}rem 0`, overflow: 'hidden', whiteSpace: 'nowrap', borderTop: `2px solid ${t.tickerBorder}`, flexShrink: 0 }}>
      <span style={{ display: 'inline-block', animation: 'marquee 40s linear infinite', fontSize: `${1.1 * s}rem`, fontWeight: 500 }}>
        {text}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{text}
      </span>
    </div>
  )
}

// ============ HALAMAN UTAMA ============
export default function AgendaTVPage() {
  const s = useScreenScale()
  const { isDark, theme: t, toggle: toggleTheme } = useTheme()

  const [agenda,      setAgenda]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [progress,    setProgress]    = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE)
  const [videoKey,    setVideoKey]    = useState(0) // Untuk force reload video

  // ResizeObserver: ukur tinggi tbody nyata → hitung baris yang muat
  const tbodyRef = useRef(null)
  useEffect(() => {
    if (!tbodyRef.current) return
    const obs = new ResizeObserver(([entry]) => {
      const h        = entry.contentRect.height
      const minRowH  = Math.max(140, 165 * s)  // baris tinggi agar font lebih besar & mudah dibaca
      const rows     = Math.max(3, Math.min(6, Math.floor(h / minRowH)))
      setRowsPerPage(rows)
    })
    obs.observe(tbodyRef.current)
    return () => obs.disconnect()
  }, [s])

  // Fetch
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

  useEffect(() => {
    load()
  }, [])

  // Auto-refresh setiap 5 menit (300000 ms)
  useEffect(() => {
    const intervalId = setInterval(() => {
      load()
    }, 300000)
    return () => clearInterval(intervalId)
  }, [])

  // Force reload video iframe setelah mount untuk memastikan autoplay berjalan
  useEffect(() => {
    if (YOUTUBE_VIDEO_URL) {
      const timer = setTimeout(() => {
        setVideoKey(prev => prev + 1)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [])

  const filtered = useMemo(() =>
    agenda
      .filter(i => getAgendaStatus(i.tanggal_mulai, i.tanggal_selesai) !== 'completed')
      .sort((a, b) => new Date(a.tanggal_mulai) - new Date(b.tanggal_mulai))
  , [agenda])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const currentRows = useMemo(() => filtered.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage), [filtered, currentPage, rowsPerPage])
  const emptyCount  = Math.max(0, rowsPerPage - currentRows.length)

  const stats = useMemo(() => ({
    ongoing:  agenda.filter(i => getAgendaStatus(i.tanggal_mulai, i.tanggal_selesai) === 'ongoing').length,
    upcoming: agenda.filter(i => { const st = getAgendaStatus(i.tanggal_mulai, i.tanggal_selesai); return st === 'upcoming' || st === 'upcoming_soon' }).length,
  }), [agenda])

  // Carousel
  const pageRef = useRef(currentPage)
  useEffect(() => { pageRef.current = currentPage }, [currentPage])

  useEffect(() => {
    if (totalPages <= 1) return
    const id = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { setCurrentPage((pageRef.current + 1) % totalPages); return 0 }
        return prev + (100 / (ROTATE_MS / 100))
      })
    }, 100)
    return () => clearInterval(id)
  }, [totalPages])

  useEffect(() => { setProgress(0) }, [currentPage])
  useEffect(() => { setCurrentPage(0); setProgress(0) }, [rowsPerPage])

  const secondsLeft = Math.ceil((100 - progress) / 100 * (ROTATE_MS / 1000))

  if (loading || error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{
          width: `${80 * s}px`, height: `${80 * s}px`, borderRadius: `${16 * s}px`,
          background: error ? '#7f1d1d' : 'linear-gradient(135deg,#f59e0b,#d97706)',
          display: 'grid', placeItems: 'center',
          color: error ? '#fca5a5' : '#0f172a', fontWeight: 900, fontSize: `${2.5 * s}rem`,
        }}>{error ? '!' : 'S'}</div>
        <p style={{ color: error ? '#f87171' : '#64748b', fontSize: `${1.4 * s}rem` }}>
          {error || 'Memuat agenda...'}
        </p>
      </div>
    )
  }

  return (
    <div
      style={{ height: '100vh', background: t.pageBg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >

      {/* ── HEADER ── */}
      <header style={{ background: t.headerBg, borderBottom: `2px solid ${t.headerBorder}`, padding: `${0.7 * s}rem ${2 * s}rem`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: `${0.875 * s}rem` }}>
            <div style={{
              width: `${48 * s}px`, height: `${48 * s}px`, borderRadius: `${10 * s}px`,
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              display: 'grid', placeItems: 'center',
              color: '#0f172a', fontWeight: 900, fontSize: `${1.6 * s}rem`,
              boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
            }}>S</div>
            <div>
              <strong style={{ display: 'block', fontSize: `${1.5 * s}rem`, color: t.titleColor, letterSpacing: '0.05em' }}>SIMDIR</strong>
              <span style={{ fontSize: `${1.0 * s}rem`, color: t.subText }}>Unesa Science Center</span>
            </div>
          </div>

          {/* Judul */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: `${2.1 * s}rem`, fontWeight: 700, color: t.titleColor }}>Agenda Kegiatan</h1>
            <p style={{ margin: `${0.2 * s}rem 0 0`, fontSize: `${1.1 * s}rem`, color: t.subText }}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Stats + Toggle Tema */}
          <div style={{ display: 'flex', gap: `${0.75 * s}rem`, alignItems: 'center' }}>
            {[
              { label: 'Berlangsung', value: stats.ongoing,  color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)'  },
              { label: 'Akan Datang', value: stats.upcoming, color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.3)'  },
            ].map((st, i) => (
              <div key={i} style={{
                textAlign: 'center', padding: `${0.5 * s}rem ${1.1 * s}rem`,
                background: st.bg, borderRadius: `${10 * s}px`,
                border: `2px solid ${st.border}`, minWidth: `${90 * s}px`,
              }}>
                <div style={{ fontSize: `${2.2 * s}rem`, fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.value}</div>
                <div style={{ fontSize: `${0.92 * s}rem`, color: t.subText, fontWeight: 600, marginTop: `${0.15 * s}rem` }}>{st.label}</div>
              </div>
            ))}

            {/* Tombol Toggle Tema */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
              style={{
                width: `${44 * s}px`, height: `${44 * s}px`,
                borderRadius: `${10 * s}px`,
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                border: `2px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
                cursor: 'pointer', display: 'grid', placeItems: 'center',
                flexShrink: 0, transition: 'all 0.2s',
              }}
            >
              {isDark ? (
                /* Ikon matahari (mode terang) */
                <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" style={{ width: `${1.4 * s}rem`, height: `${1.4 * s}rem` }}>
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                /* Ikon bulan (mode gelap) */
                <svg viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" style={{ width: `${1.4 * s}rem`, height: `${1.4 * s}rem` }}>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: `${0.75 * s}rem ${1.25 * s}rem ${0.6 * s}rem`, gap: `${0.75 * s}rem` }}>
        
        {/* ── KIRI: AGENDA TABLE ── */}
        <div style={{ flex: YOUTUBE_VIDEO_URL ? 2.5 : 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: `${0.6 * s}rem` }}>
          {filtered.length > 0 ? (
            <>
              {/* Wrapper tabel */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.tableBg, borderRadius: `${12 * s}px`, border: `2px solid ${t.headerBorder}`, overflow: 'hidden', minHeight: 0 }}>

                {/* Header kolom */}
                <div style={{
                  display: 'grid', gridTemplateColumns: COLS,
                  background: t.theadBg, borderBottom: `2px solid ${t.theadBorder}`, flexShrink: 0,
                }}>
                  {['No', 'Tanggal', 'Judul Kegiatan', 'Lokasi', 'PIC / Disposisi', 'Status'].map((col, idx) => {
                    const isLastCol = idx === 5
                    return (
                      <div key={col} style={{
                        padding: isLastCol ? `${0.6 * s}rem ${0.9 * s}rem ${0.6 * s}rem ${0.6 * s}rem` : `${0.6 * s}rem ${0.6 * s}rem`,
                        fontSize: `${0.75 * s}rem`, fontWeight: 700,
                        letterSpacing: '0.03em', textTransform: 'uppercase', color: t.colHeader,
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                      }}>
                        {col}
                      </div>
                    )
                  })}
                </div>

                {/* Tbody — flex column, mengisi sisa tinggi */}
                <div ref={tbodyRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                  {currentRows.map((item, i) => (
                    <AgendaRow
                      key={item.id}
                      item={item}
                      rowIndex={currentPage * rowsPerPage + i}
                      s={s} t={t} isDark={isDark}
                    />
                  ))}
                  {Array.from({ length: emptyCount }).map((_, i) => (
                    <EmptyRow key={`e${i}`} rowIndex={currentRows.length + i} s={s} t={t} />
                  ))}
                </div>
              </div>

              {/* Navigasi carousel */}
              {totalPages > 1 && (
                <div style={{
                  background: t.navBg, borderRadius: `${10 * s}px`, border: `2px solid ${t.navBorder}`,
                  padding: `${0.55 * s}rem ${1.25 * s}rem`,
                  display: 'flex', alignItems: 'center', gap: `${1.25 * s}rem`, flexShrink: 0,
                }}>
                  <span style={{ fontSize: `${1.0 * s}rem`, color: t.subText, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Hal. {currentPage + 1}/{totalPages} &nbsp;·&nbsp; {filtered.length} agenda &nbsp;·&nbsp; {rowsPerPage} baris
                  </span>

                  <div style={{ flex: 1 }}><ProgressBar progress={progress} s={s} t={t} /></div>

                  <span style={{ fontSize: `${1.0 * s}rem`, color: '#6366f1', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {`Ganti dalam ${secondsLeft}s`}
                  </span>

                  <div style={{ display: 'flex', gap: `${0.45 * s}rem` }}>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button key={i} onClick={() => { setCurrentPage(i); setProgress(0) }} style={{
                        width: i === currentPage ? `${1.75 * s}rem` : `${0.65 * s}rem`,
                        height: `${0.65 * s}rem`, borderRadius: 9999, padding: 0,
                        background: i === currentPage ? '#6366f1' : t.inactiveDotBg,
                        border: 'none', cursor: 'pointer', transition: 'all 0.3s ease',
                      }} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: t.tableBg, borderRadius: `${14 * s}px`, border: `2px solid ${t.headerBorder}` }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: `${5 * s}rem`, height: `${5 * s}rem`, color: t.colHeader, marginBottom: `${1 * s}rem` }}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h3 style={{ fontSize: `${1.6 * s}rem`, fontWeight: 600, color: t.subText, margin: 0 }}>Tidak ada agenda</h3>
              <p style={{ fontSize: `${1 * s}rem`, color: t.mutedText, marginTop: `${0.4 * s}rem` }}>
                Tidak ada agenda yang akan datang atau sedang berlangsung.
              </p>
            </div>
          )}
        </div>

        {/* ── KANAN: YOUTUBE VIDEO ── */}
        {YOUTUBE_VIDEO_URL && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.tableBg, borderRadius: `${12 * s}px`, border: `2px solid ${t.headerBorder}`, overflow: 'hidden', minHeight: 0 }}>
            {/* Video Header */}
            <div style={{
              background: t.theadBg, 
              borderBottom: `2px solid ${t.theadBorder}`, 
              padding: `${0.55 * s}rem ${0.85 * s}rem`,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: `${0.5 * s}rem`,
            }}>
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: `${1.2 * s}rem`, height: `${1.2 * s}rem`, color: '#ef4444' }}>
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
              <span style={{
                fontSize: `${0.9 * s}rem`,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: t.colHeader,
              }}>
                Tentang USC
              </span>
            </div>
            
            {/* Video Player */}
            <div style={{ flex: 1, position: 'relative', background: '#000', minHeight: 0 }}>
              <VideoPlayer key={videoKey} url={YOUTUBE_VIDEO_URL} />
            </div>
          </div>
        )}
      </main>

      {/* ── RUNNING TEXT ── */}
      <RunningText agenda={agenda} s={s} t={t} />

      <style jsx global>{`
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  )
}
