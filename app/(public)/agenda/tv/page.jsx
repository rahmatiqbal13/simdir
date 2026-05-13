'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getUnitColor, UNIT_COLORS } from './unit-colors'
import { MEDIA_CONFIG, getActiveMedia, getPlaylistLength } from './media-config'

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

// ============ TEMA ============
const DARK = {
  pageBg: '#0f172a', headerBg: '#1e293b', headerBorder: '#2d3f55',
  tableBg: '#1e293b', theadBg: '#0f172a', theadBorder: '#2d3f55',
  rowEven: 'rgba(30,41,59,0.85)', rowOdd: 'rgba(15,23,42,0.65)',
  rowOngoing: 'rgba(16,185,129,0.07)',
  rowEmptyEven: 'rgba(30,41,59,0.4)', rowEmptyOdd: 'rgba(15,23,42,0.25)',
  rowBorder: 'rgba(51,65,85,0.45)', emptyBorder: 'rgba(51,65,85,0.25)',
  colHeader: '#475569', noColor: '#475569', titleColor: 'white',
  subText: '#64748b', mutedText: '#94a3b8', timeMain: '#cbd5e1',
  navBg: '#1e293b', navBorder: '#2d3f55',
  tickerBg: '#020617', tickerText: '#64748b', tickerBorder: '#1e293b',
  ongoingLabelColor: '#34d399', countdownColor: '#818cf8', disposisiColor: '#f9a8d4',
  progressTrackBg: '#0f172a', inactiveDotBg: '#334155',
}

const LIGHT = {
  pageBg: '#f1f5f9', headerBg: '#ffffff', headerBorder: '#cbd5e1',
  tableBg: '#ffffff', theadBg: '#f8fafc', theadBorder: '#e2e8f0',
  rowEven: 'rgba(248,250,252,0.95)', rowOdd: 'rgba(241,245,249,0.9)',
  rowOngoing: 'rgba(16,185,129,0.08)',
  rowEmptyEven: 'rgba(248,250,252,0.6)', rowEmptyOdd: 'rgba(241,245,249,0.5)',
  rowBorder: 'rgba(203,213,225,0.7)', emptyBorder: 'rgba(203,213,225,0.4)',
  colHeader: '#334155', noColor: '#475569', titleColor: '#0f172a',
  subText: '#475569', mutedText: '#334155', timeMain: '#1e293b',
  navBg: '#ffffff', navBorder: '#e2e8f0',
  tickerBg: '#1e293b', tickerText: '#94a3b8', tickerBorder: '#334155',
  ongoingLabelColor: '#065f46', countdownColor: '#3730a3', disposisiColor: '#9d174d',
  progressTrackBg: '#e2e8f0', inactiveDotBg: '#94a3b8',
}

// ============ KONSTANTA ============
const ROTATE_MS = 15000

// Grid columns: No | Tanggal | Judul | Unit Kerja | Lokasi | PIC | Status
const getCols = (isSmallScreen) => isSmallScreen
  ? 'minmax(30px, 4%) minmax(70px, 10%) minmax(130px, 22%) minmax(90px, 12%) minmax(80px, 11%) minmax(95px, 16%) minmax(100px, 25%)'
  : 'minmax(35px, 3%) minmax(80px, 8%) minmax(180px, 24%) minmax(100px, 11%) minmax(100px, 10%) minmax(110px, 14%) minmax(140px, 30%)'

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



// ============ HOOK: SCALE LAYAR ============
// Landscape: referensi lebar 1920px | Portrait: referensi lebar 1080px
function useScreenScale(isVertical = false) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const update = () => {
      if (isVertical) {
        setScale(Math.max(0.7, Math.min(1.5, window.innerWidth / 1080)))
      } else {
        setScale(Math.max(0.8, Math.min(2.0, window.innerWidth / 1920)))
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [isVertical])
  return scale
}

// ============ HOOK: DETEKSI UKURAN LAYAR ============
function useScreenSize() {
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  useEffect(() => {
    const update = () => setIsSmallScreen(window.innerWidth <= 1920)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return isSmallScreen
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

// ============ HOOK: ORIENTASI ============
function useOrientation() {
  const [isVertical, setIsVertical] = useState(false)
  useEffect(() => {
    const saved = localStorage.getItem('tv-orientation')
    if (saved === 'vertical') setIsVertical(true)
  }, [])
  const toggle = () => setIsVertical(prev => {
    const next = !prev
    localStorage.setItem('tv-orientation', next ? 'vertical' : 'horizontal')
    return next
  })
  return { isVertical, toggle }
}

// ============ HOOK: REALTIME CLOCK ============
function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

// ============ MEDIA ROTATOR (Video + Gambar Pamflet) ============
// Video YouTube playlist di-play sampai selesai, baru ganti ke pamflet
const MediaRotator = ({ s, t }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [videoEnded, setVideoEnded] = useState(false)
  const playerRef = useRef(null)
  const timerRef = useRef(null)
  const playlistLengthRef = useRef(0)
  const currentVideoIndexRef = useRef(0)
  
  const playlist = MEDIA_CONFIG.playlist
  const currentMedia = playlist[currentIndex]
  
  // Advance ke media berikutnya
  const advanceToNext = useCallback(() => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % playlist.length)
      setImageError(false)
      setVideoEnded(false)
      setIsTransitioning(false)
    }, MEDIA_CONFIG.FADE_DURATION)
  }, [playlist.length])
  
  // Handle timer untuk gambar (bukan untuk video)
  useEffect(() => {
    // Clear timer sebelumnya
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    // Jika tipe youtube, jangan gunakan timer - tunggu video selesai
    if (currentMedia?.type === 'youtube') {
      return
    }
    
    // Jika tipe image, gunakan timer
    const duration = currentMedia?.duration || MEDIA_CONFIG.SLIDE_DURATION
    
    timerRef.current = setInterval(() => {
      advanceToNext()
    }, duration)
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [currentIndex, playlist.length, currentMedia, advanceToNext])
  
  // Initialize YouTube Player
  useEffect(() => {
    if (currentMedia?.type !== 'youtube') return
    
    const url = currentMedia.url
    const listMatch = url.match(/list=([^&]+)/)
    const listId = listMatch?.[1] || ''
    
    const initPlayer = () => {
      if (playerRef.current?.destroy) { 
        playerRef.current.destroy(); 
        playerRef.current = null 
      }
      
      playerRef.current = new window.YT.Player('yt-tv-player', {
        playerVars: {
          listType: 'playlist',
          list: listId,
          autoplay: 1, 
          mute: 1, 
          rel: 0,
          modestbranding: 1, 
          controls: 0, 
          iv_load_policy: 3,
        },
        events: {
          onReady: (e) => {
            e.target.mute()
            // Simpan panjang playlist
            const playlist = e.target.getPlaylist()
            if (playlist) {
              playlistLengthRef.current = playlist.length
            }
          },
          onStateChange: (e) => {
            e.target.mute()
            
            // YouTube Player State:
            // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
            const state = e.data
            
            // Update index video saat ini
            try {
              currentVideoIndexRef.current = e.target.getPlaylistIndex()
            } catch (err) {
              console.log('Could not get playlist index')
            }
            
            // Cek jika video berakhir (state = 0)
            if (state === 0) {
              // Cek apakah ini video terakhir dalam playlist
              const isLastVideo = currentVideoIndexRef.current >= playlistLengthRef.current - 1
              
              if (isLastVideo || playlistLengthRef.current === 0) {
                // Playlist selesai, advance ke media berikutnya
                setTimeout(() => {
                  advanceToNext()
                }, 1000) // Tunggu 1 detik sebelum pindah
              }
            }
          },
        },
      })
    }
    
    if (window.YT?.Player) {
      initPlayer()
    } else {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { prev?.(); initPlayer() }
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
      }
    }
    
    return () => { 
      if (playerRef.current?.destroy) { 
        playerRef.current.destroy(); 
        playerRef.current = null 
      } 
    }
  }, [currentMedia, advanceToNext])
  
  const handleImageError = () => {
    setImageError(true)
  }
  
  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%',
      background: '#000',
    }}>
      {/* Video Container */}
      {currentMedia?.type === 'youtube' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: isTransitioning ? 0 : 1,
            transition: `opacity ${MEDIA_CONFIG.FADE_DURATION}ms ease-in-out`,
          }}
        >
          <div id="yt-tv-player" style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      
      {/* Image Container */}
      {currentMedia?.type === 'image' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: isTransitioning ? 0 : 1,
            transition: `opacity ${MEDIA_CONFIG.FADE_DURATION}ms ease-in-out`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: t.tableBg,
          }}
        >
          {imageError ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: t.subText,
              padding: `${2 * s}rem`,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: `${4 * s}rem`, height: `${4 * s}rem`, marginBottom: `${1 * s}rem` }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span style={{ fontSize: `${1.2 * s}rem`, fontWeight: 500 }}>Pamflet tidak ditemukan</span>
              <span style={{ fontSize: `${0.9 * s}rem`, color: t.mutedText, marginTop: `${0.5 * s}rem` }}>
                {currentMedia.title}
              </span>
            </div>
          ) : (
            <img
              src={currentMedia.src}
              alt={currentMedia.title}
              onError={handleImageError}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                background: '#000',
              }}
            />
          )}
        </div>
      )}
      
      {/* Progress Bar - hanya untuk gambar */}
      {currentMedia?.type === 'image' && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${4 * s}px`,
          background: 'rgba(0,0,0,0.3)',
        }}>
          <MediaProgressBar 
            duration={currentMedia?.duration || MEDIA_CONFIG.SLIDE_DURATION}
            isActive={!isTransitioning}
            s={s}
            color={'#f59e0b'}
          />
        </div>
      )}
      
      {/* Label Media Type */}
      <div style={{
        position: 'absolute',
        top: `${0.5 * s}rem`,
        right: `${0.5 * s}rem`,
        padding: `${0.3 * s}rem ${0.6 * s}rem`,
        background: currentMedia?.type === 'image' ? 'rgba(245,158,11,0.9)' : 'rgba(239,68,68,0.9)',
        borderRadius: `${4 * s}px`,
        fontSize: `${0.7 * s}rem`,
        fontWeight: 700,
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {currentMedia?.type === 'image' ? 'Pamflet' : 'Video'}
      </div>
      
      {/* Counter */}
      <div style={{
        position: 'absolute',
        top: `${0.5 * s}rem`,
        left: `${0.5 * s}rem`,
        padding: `${0.3 * s}rem ${0.6 * s}rem`,
        background: 'rgba(0,0,0,0.6)',
        borderRadius: `${4 * s}px`,
        fontSize: `${0.7 * s}rem`,
        fontWeight: 600,
        color: '#fff',
      }}>
        {currentIndex + 1} / {playlist.length}
      </div>
    </div>
  )
}

// Progress bar untuk media
const MediaProgressBar = ({ duration, isActive, s, color }) => {
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    if (!isActive) {
      setProgress(0)
      return
    }
    
    const interval = 100 // update setiap 100ms
    const step = (100 / duration) * interval
    
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100
        return prev + step
      })
    }, interval)
    
    return () => clearInterval(timer)
  }, [duration, isActive])
  
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'rgba(255,255,255,0.1)',
    }}>
      <div style={{
        width: `${progress}%`,
        height: '100%',
        background: color,
        transition: 'width 0.1s linear',
      }} />
    </div>
  )
}

// ============ BADGE ============
const Badge = ({ bg, border, color, children, s, compact }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: `${0.3 * s}rem`,
    padding: `${0.3 * s}rem ${0.6 * s}rem`, borderRadius: '9999px',
    fontSize: `${(compact ? 0.85 : 1.1) * s}rem`, fontWeight: 700, whiteSpace: 'nowrap',
    background: bg, border: `${Math.max(1, Math.round(1 * s))}px solid ${border}`, color,
  }}>
    {children}
  </span>
)

// ============ BARIS DATA (LANDSCAPE) ============
function AgendaRow({ item, rowIndex, s, t, isDark, isSmallScreen }) {
  const status    = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
  const unitColor = getUnitColor(item.jenis, item.penyelenggara)
  const sCfg      = getStatusCfg(isDark)[status]
  const startD    = new Date(item.tanggal_mulai)
  const endD      = new Date(item.tanggal_selesai)
  const multiDay  = item.tanggal_mulai !== item.tanggal_selesai
  const isOngoing = status === 'ongoing'
  const cdLabel   = getCountdownLabel(item.tanggal_mulai)
  const pic = (() => {
    if (item.jenis === 'pimpinan' && item.disposisi) return `→ ${item.disposisi}`
    if (item.pic) return item.pic.replace('Manual: ', '')
    return '—'
  })()
  const cp     = `${0.7 * s}rem`
  const cpLast = `${0.7 * s}rem ${0.9 * s}rem ${0.7 * s}rem ${0.7 * s}rem`
  const COLS   = getCols(isSmallScreen)
  const cellBase = { padding: cp, display: 'flex', alignItems: 'center', overflow: 'hidden', borderBottom: `1px solid ${t.rowBorder}`, minHeight: 0 }
  const clamp2 = { overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: COLS, flex: 1, minHeight: 0, borderLeft: `${Math.max(5, Math.round(6 * s))}px solid ${unitColor.border}`, background: isOngoing ? t.rowOngoing : unitColor.bg, transition: 'background 0.2s' }}>
      {/* No */}
      <div style={{ ...cellBase, justifyContent: 'center' }}>
        <span style={{ fontSize: `${1.3 * s}rem`, fontWeight: 700, color: t.noColor }}>{rowIndex + 1}</span>
      </div>
      {/* Tanggal */}
      <div style={{ ...cellBase, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: `${0.05 * s}rem` }}>
        <span style={{ fontSize: `${2.0 * s}rem`, fontWeight: 900, color: unitColor.border, lineHeight: 1.05 }}>
          {startD.getDate()}&nbsp;{startD.toLocaleDateString('id-ID', { month: 'short' })}
        </span>
        <span style={{ fontSize: `${1.0 * s}rem`, color: t.subText, lineHeight: 1.2 }}>
          {startD.toLocaleDateString('id-ID', { weekday: 'long' })}
        </span>
        {multiDay && (
          <span style={{ fontSize: `${0.85 * s}rem`, color: t.mutedText, lineHeight: 1.2 }}>
            s/d {endD.getDate()}&nbsp;{endD.toLocaleDateString('id-ID', { month: 'short' })}
          </span>
        )}
      </div>
      {/* Judul Kegiatan */}
      <div style={{ ...cellBase }}>
        <span style={{ fontSize: `${1.5 * s}rem`, fontWeight: 700, color: t.titleColor, lineHeight: 1.35, ...clamp2 }}>{item.judul}</span>
      </div>
      {/* Unit Kerja - KOLOM BARU */}
      <div style={{ ...cellBase }}>
        <span style={{
          fontSize: `${0.95 * s}rem`,
          fontWeight: 700,
          color: unitColor.text,
          background: unitColor.bg,
          padding: `${0.2 * s}rem ${0.6 * s}rem`,
          borderRadius: `${6 * s}px`,
          border: `2px solid ${unitColor.border}`,
          whiteSpace: 'nowrap',
          boxShadow: `0 0 10px ${unitColor.border}40`,
        }}>
          {unitColor.name}
        </span>
      </div>
      {/* Lokasi */}
      <div style={{ ...cellBase }}>
        <span style={{ fontSize: `${1.1 * s}rem`, color: t.mutedText, fontWeight: 500, ...clamp2, lineHeight: 1.35 }}>{item.lokasi || '—'}</span>
      </div>
      {/* PIC / Disposisi */}
      <div style={{ ...cellBase }}>
        <span style={{ fontSize: `${1.1 * s}rem`, color: item.jenis === 'pimpinan' && item.disposisi ? t.disposisiColor : t.mutedText, fontWeight: item.jenis === 'pimpinan' && item.disposisi ? 700 : 500, ...clamp2, lineHeight: 1.35 }}>{pic}</span>
      </div>
      {/* Status */}
      <div style={{ ...cellBase, padding: cpLast, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: `${0.25 * s}rem`, overflow: 'visible' }}>
        <Badge bg={sCfg.bg} border={sCfg.border} color={sCfg.color} s={s} compact={false}>
          {isOngoing && <span style={{ width: `${5 * s}px`, height: `${5 * s}px`, borderRadius: '50%', background: sCfg.color, animation: 'pulse 2s infinite', flexShrink: 0 }} />}
          {sCfg.label}
        </Badge>
        {isOngoing && (
          <span style={{ fontSize: `${0.95 * s}rem`, color: t.ongoingLabelColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: `${0.2 * s}rem`, whiteSpace: 'nowrap' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: `${0.95 * s}rem`, height: `${0.95 * s}rem`, flexShrink: 0 }}><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Berlangsung
          </span>
        )}
        {!isOngoing && cdLabel && (
          <span style={{ fontSize: `${0.95 * s}rem`, color: t.countdownColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: `${0.2 * s}rem`, whiteSpace: 'nowrap' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: `${0.95 * s}rem`, height: `${0.95 * s}rem`, flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            {cdLabel}
          </span>
        )}
      </div>
    </div>
  )
}

// ============ CARD DATA (PORTRAIT / VERTIKAL) ============
function AgendaCardVertical({ item, index, s, t, isDark }) {
  const status    = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
  const unitColor = getUnitColor(item.jenis, item.penyelenggara)
  const sCfg      = getStatusCfg(isDark)[status]
  const jCfg      = getJenisCfg(isDark)[item.jenis] || getJenisCfg(isDark).internal
  const startD    = new Date(item.tanggal_mulai)
  const endD      = new Date(item.tanggal_selesai)
  const multiDay  = item.tanggal_mulai !== item.tanggal_selesai
  const isOngoing = status === 'ongoing'
  const cdLabel   = getCountdownLabel(item.tanggal_mulai)
  const pic = (() => {
    if (item.jenis === 'pimpinan' && item.disposisi) return `→ ${item.disposisi}`
    if (item.pic) return item.pic.replace('Manual: ', '')
    return null
  })()

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', borderLeft: `${Math.max(5, Math.round(6 * s))}px solid ${unitColor.border}`, background: isOngoing ? t.rowOngoing : unitColor.bg, borderBottom: `1px solid ${t.rowBorder}`, overflow: 'hidden', transition: 'background 0.2s' }}>
      {/* Kolom kiri: Nomor + Tanggal */}
      <div style={{ width: `${6.5 * s}rem`, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `${0.6 * s}rem ${0.5 * s}rem`, borderRight: `1px solid ${t.rowBorder}`, gap: `${0.1 * s}rem` }}>
        <span style={{ fontSize: `${0.75 * s}rem`, fontWeight: 700, color: t.noColor }}>{index + 1}</span>
        <span style={{ fontSize: `${2.0 * s}rem`, fontWeight: 900, color: unitColor.border, lineHeight: 1 }}>{startD.getDate()}</span>
        <span style={{ fontSize: `${0.9 * s}rem`, fontWeight: 700, color: unitColor.border }}>{startD.toLocaleDateString('id-ID', { month: 'short' })}</span>
        <span style={{ fontSize: `${0.78 * s}rem`, color: t.subText }}>{startD.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
        {multiDay && (
          <span style={{ fontSize: `${0.68 * s}rem`, color: t.mutedText, textAlign: 'center', lineHeight: 1.2 }}>
            s/d {endD.getDate()} {endD.toLocaleDateString('id-ID', { month: 'short' })}
          </span>
        )}
      </div>
      {/* Kolom kanan: Detail */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `${0.55 * s}rem ${0.8 * s}rem`, gap: `${0.3 * s}rem` }}>
        <span style={{ fontSize: `${1.3 * s}rem`, fontWeight: 700, color: t.titleColor, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {item.judul}
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${0.4 * s}rem ${0.8 * s}rem` }}>
          {item.lokasi && (
            <span style={{ fontSize: `${0.88 * s}rem`, color: t.mutedText, display: 'flex', alignItems: 'center', gap: `${0.25 * s}rem`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: `${0.88 * s}rem`, height: `${0.88 * s}rem`, flexShrink: 0, color: unitColor.border }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              {item.lokasi}
            </span>
          )}
          {pic && (
            <span style={{ fontSize: `${0.88 * s}rem`, color: item.jenis === 'pimpinan' && item.disposisi ? t.disposisiColor : t.mutedText, fontWeight: item.jenis === 'pimpinan' && item.disposisi ? 700 : 400, display: 'flex', alignItems: 'center', gap: `${0.25 * s}rem`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: `${0.88 * s}rem`, height: `${0.88 * s}rem`, flexShrink: 0, color: unitColor.border }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              {pic}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${0.35 * s}rem`, alignItems: 'center' }}>
          <Badge bg={jCfg.bg} border={jCfg.border} color={jCfg.color} s={s} compact={true}>{jCfg.label}</Badge>
          <Badge bg={sCfg.bg} border={sCfg.border} color={sCfg.color} s={s} compact={true}>
            {isOngoing && <span style={{ width: `${5 * s}px`, height: `${5 * s}px`, borderRadius: '50%', background: sCfg.color, animation: 'pulse 2s infinite', flexShrink: 0 }} />}
            {sCfg.label}
          </Badge>
          {cdLabel && (
            <span style={{ fontSize: `${0.82 * s}rem`, color: t.countdownColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: `${0.2 * s}rem` }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: `${0.82 * s}rem`, height: `${0.82 * s}rem` }}>
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              {cdLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ BARIS KOSONG (LANDSCAPE) ============
const EmptyRow = ({ rowIndex, s, t, isSmallScreen }) => {
  const COLS = getCols(isSmallScreen)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: COLS, flex: 1, minHeight: 0, borderLeft: '5px solid transparent', background: rowIndex % 2 === 0 ? t.rowEmptyEven : t.rowEmptyOdd, borderBottom: `1px solid ${t.emptyBorder}` }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{ padding: i === 6 ? `${0.5 * s}rem ${0.8 * s}rem ${0.5 * s}rem ${0.5 * s}rem` : `${0.5 * s}rem` }} />
      ))}
    </div>
  )
}

// ============ CARD KOSONG (PORTRAIT / VERTIKAL) ============
const EmptyCardVertical = ({ index, s, t }) => (
  <div style={{ flex: 1, minHeight: 0, borderLeft: '6px solid transparent', background: index % 2 === 0 ? t.rowEmptyEven : t.rowEmptyOdd, borderBottom: `1px solid ${t.emptyBorder}` }} />
)

// ============ PROGRESS BAR ============
const ProgressBar = ({ progress, s, t }) => (
  <div style={{ width: '100%', height: `${Math.max(4, 5 * s)}px`, background: t.progressTrackBg, borderRadius: 9999, overflow: 'hidden' }}>
    <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 9999, transition: 'width 0.1s linear' }} />
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

// ============ LEGENDA UNIT KERJA (COMPACT 2 BARIS) ============
const UnitLegend = ({ s, t, isDark }) => {
  // Filter hanya unit internal (bukan kategori unesa, eksternal, pimpinan)
  const internalUnits = Object.entries(UNIT_COLORS)
    .filter(([key]) => !['unesa', 'eksternal', 'pimpinan'].includes(key))
    .map(([_, value]) => value)
  
  const categories = [
    UNIT_COLORS['unesa'],
    UNIT_COLORS['eksternal'],
    UNIT_COLORS['pimpinan'],
  ]

  return (
    <div style={{
      marginTop: `${0.35 * s}rem`,
      paddingTop: `${0.25 * s}rem`,
      borderTop: `1px solid ${t.headerBorder}`,
    }}>
      {/* Baris 1: Unit USC */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${0.15 * s}rem ${0.4 * s}rem`,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: `${0.6 * s}rem`, color: t.subText, fontWeight: 600 }}>Unit USC:</span>
        {internalUnits.map((unit) => (
          <div key={unit.name} style={{
            display: 'flex',
            alignItems: 'center',
            gap: `${0.12 * s}rem`,
          }}>
            <span style={{
              width: `${7 * s}px`,
              height: `${7 * s}px`,
              borderRadius: '2px',
              background: unit.border,
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: `${0.55 * s}rem`,
              color: t.mutedText,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}>{unit.name}</span>
          </div>
        ))}
      </div>
      
      {/* Baris 2: Kategori Lain */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${0.15 * s}rem ${0.4 * s}rem`,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: `${0.15 * s}rem`,
      }}>
        <span style={{ fontSize: `${0.6 * s}rem`, color: t.subText, fontWeight: 600 }}>Lainnya:</span>
        {categories.map((cat) => (
          <div key={cat.name} style={{
            display: 'flex',
            alignItems: 'center',
            gap: `${0.12 * s}rem`,
          }}>
            <span style={{
              width: `${7 * s}px`,
              height: `${7 * s}px`,
              borderRadius: '2px',
              background: cat.border,
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: `${0.55 * s}rem`,
              color: t.mutedText,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}>{cat.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ KOMPONEN CLOCK (INLINE) ============
const ClockInline = ({ now, s, t }) => {
  const hari = now.toLocaleDateString('id-ID', { weekday: 'long' })
  const tanggal = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      marginLeft: `${0.75 * s}rem`,
      paddingLeft: `${0.75 * s}rem`,
      borderLeft: `2px solid ${t.headerBorder}`,
    }}>
      <span style={{
        fontSize: `${0.75 * s}rem`,
        fontWeight: 600,
        color: t.subText,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        lineHeight: 1,
      }}>{hari}, {tanggal}</span>
      <span style={{
        fontSize: `${1.6 * s}rem`,
        fontWeight: 700,
        color: '#6366f1',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.02em',
        lineHeight: 1.2,
      }}>{jam}</span>
    </div>
  )
}

// ============ HALAMAN UTAMA ============
export default function AgendaTVPage() {
  const { isVertical, toggle: toggleOrientation } = useOrientation()
  const s            = useScreenScale(isVertical)
  const isSmallScreen = useScreenSize()
  const { isDark, theme: t, toggle: toggleTheme } = useTheme()
  const now = useClock()
  const COLS = getCols(isSmallScreen)

  const [agenda,      setAgenda]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [progress,    setProgress]    = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(6)

  // ResizeObserver — hitung baris sesuai orientasi
  const tbodyRef = useRef(null)
  useEffect(() => {
    if (!tbodyRef.current) return
    const obs = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height
      // Portrait cards lebih pendek dari baris landscape
      const minRowH = isVertical
        ? Math.max(100, 125 * s)
        : Math.max(110, 130 * s)
      const maxRows = isVertical ? 8 : 7
      setRowsPerPage(Math.max(3, Math.min(maxRows, Math.floor(h / minRowH))))
    })
    obs.observe(tbodyRef.current)
    return () => obs.disconnect()
  }, [s, isVertical])

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

  useEffect(() => { load() }, [])
  useEffect(() => { const id = setInterval(load, 300000); return () => clearInterval(id) }, [])

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
  // Reset halaman saat orientasi berubah
  useEffect(() => { setCurrentPage(0); setProgress(0) }, [isVertical])

  const secondsLeft = Math.ceil((100 - progress) / 100 * (ROTATE_MS / 1000))

  if (loading || error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ width: `${80 * s}px`, height: `${80 * s}px`, borderRadius: `${16 * s}px`, background: error ? '#7f1d1d' : 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'grid', placeItems: 'center', color: error ? '#fca5a5' : '#0f172a', fontWeight: 900, fontSize: `${2.5 * s}rem` }}>
          {error ? '!' : 'S'}
        </div>
        <p style={{ color: error ? '#f87171' : '#64748b', fontSize: `${1.4 * s}rem` }}>{error || 'Memuat agenda...'}</p>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', background: t.pageBg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── HEADER ── */}
      <header style={{ background: t.headerBg, borderBottom: `2px solid ${t.headerBorder}`, padding: `${0.6 * s}rem ${1.5 * s}rem`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: `${0.5 * s}rem` }}>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: `${0.75 * s}rem`, flexShrink: 0 }}>
            <div style={{ width: `${42 * s}px`, height: `${42 * s}px`, borderRadius: `${8 * s}px`, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'grid', placeItems: 'center', color: '#0f172a', fontWeight: 900, fontSize: `${1.4 * s}rem`, boxShadow: '0 4px 14px rgba(245,158,11,0.35)' }}>S</div>
            <div>
              <strong style={{ display: 'block', fontSize: `${1.3 * s}rem`, color: t.titleColor, letterSpacing: '0.05em' }}>SIMDIR</strong>
              <span style={{ fontSize: `${0.9 * s}rem`, color: t.subText }}>Unesa Science Center</span>
            </div>
          </div>

          {/* Judul + Jam Real-time (Inline) */}
          <div style={{ textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h1 style={{ margin: 0, fontSize: `${1.9 * s}rem`, fontWeight: 700, color: t.titleColor }}>
                Agenda Kegiatan
              </h1>
              <ClockInline now={now} s={s} t={t} />
            </div>
          </div>

          {/* Stats + Tombol */}
          <div style={{ display: 'flex', gap: `${0.5 * s}rem`, alignItems: 'center', flexShrink: 0 }}>
            {[
              { label: 'Berlangsung', value: stats.ongoing,  color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
              { label: 'Akan Datang', value: stats.upcoming, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)' },
            ].map((st, i) => (
              <div key={i} style={{ textAlign: 'center', padding: `${0.35 * s}rem ${0.8 * s}rem`, background: st.bg, borderRadius: `${8 * s}px`, border: `2px solid ${st.border}`, minWidth: `${75 * s}px` }}>
                <div style={{ fontSize: `${1.8 * s}rem`, fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.value}</div>
                <div style={{ fontSize: `${0.8 * s}rem`, color: t.subText, fontWeight: 600, marginTop: `${0.1 * s}rem` }}>{st.label}</div>
              </div>
            ))}

            {/* Tombol Toggle Orientasi */}
            <button
              onClick={toggleOrientation}
              title={isVertical ? 'Ganti ke Mode Horizontal (Landscape)' : 'Ganti ke Mode Vertikal (Portrait)'}
              style={{
                width: `${38 * s}px`, height: `${38 * s}px`, borderRadius: `${8 * s}px`,
                background: isVertical ? 'rgba(99,102,241,0.2)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                border: `2px solid ${isVertical ? 'rgba(99,102,241,0.5)' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')}`,
                cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'all 0.2s',
              }}
            >
              {isVertical ? (
                /* Sedang vertikal → tampilkan ikon landscape (klik untuk ke horizontal) */
                <svg viewBox="0 0 24 24" fill="none" stroke={isDark ? '#a5b4fc' : '#6366f1'} strokeWidth="2" style={{ width: `${1.2 * s}rem`, height: `${1.2 * s}rem` }}>
                  <rect x="2" y="6" width="20" height="12" rx="2"/>
                  <path d="M8 21h8M12 18v3"/>
                </svg>
              ) : (
                /* Sedang horizontal → tampilkan ikon portrait (klik untuk ke vertikal) */
                <svg viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#475569'} strokeWidth="2" style={{ width: `${1.2 * s}rem`, height: `${1.2 * s}rem` }}>
                  <rect x="7" y="1" width="10" height="22" rx="2"/>
                  <path d="M11 5h2"/>
                </svg>
              )}
            </button>

            {/* Tombol Toggle Tema */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
              style={{
                width: `${38 * s}px`, height: `${38 * s}px`, borderRadius: `${8 * s}px`,
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                border: `2px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
                cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'all 0.2s',
              }}
            >
              {isDark ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" style={{ width: `${1.2 * s}rem`, height: `${1.2 * s}rem` }}>
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" style={{ width: `${1.2 * s}rem`, height: `${1.2 * s}rem` }}>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Legenda Warna Unit Kerja */}
        <UnitLegend s={s} t={t} isDark={isDark} />
      </header>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: isVertical ? 'column' : 'row', overflow: 'hidden', padding: `${0.5 * s}rem ${1.25 * s}rem ${0.4 * s}rem`, gap: `${0.5 * s}rem` }}>

        {/* Agenda — tabel (landscape) atau card (portrait) */}
        <div style={{ flex: 2.33, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: `${0.4 * s}rem`, minHeight: 0 }}>
          {filtered.length > 0 ? (
            <>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.tableBg, borderRadius: `${10 * s}px`, border: `2px solid ${t.headerBorder}`, overflow: 'hidden', minHeight: 0 }}>

                {/* Header kolom — hanya di landscape */}
                {!isVertical && (
                  <div style={{ display: 'grid', gridTemplateColumns: COLS, background: t.theadBg, borderBottom: `2px solid ${t.theadBorder}`, flexShrink: 0 }}>
                    {['No', 'Tanggal', 'Judul Kegiatan', 'Unit Kerja', 'Lokasi', 'PIC / Disposisi', 'Status'].map((col, idx) => (
                      <div key={col} style={{
                        padding: idx === 6 ? `${0.5 * s}rem ${0.8 * s}rem ${0.5 * s}rem ${0.5 * s}rem` : `${0.5 * s}rem`,
                        fontSize: `${0.85 * s}rem`, fontWeight: 700,
                        letterSpacing: '0.03em', textTransform: 'uppercase', color: t.colHeader,
                        whiteSpace: 'nowrap', display: 'flex', alignItems: 'center',
                      }}>
                        {col}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tbody */}
                <div ref={tbodyRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                  {currentRows.map((item, i) => (
                    isVertical
                      ? <AgendaCardVertical key={item.id} item={item} index={currentPage * rowsPerPage + i} s={s} t={t} isDark={isDark} />
                      : <AgendaRow key={item.id} item={item} rowIndex={currentPage * rowsPerPage + i} s={s} t={t} isDark={isDark} isSmallScreen={isSmallScreen} />
                  ))}
                  {Array.from({ length: emptyCount }).map((_, i) => (
                    isVertical
                      ? <EmptyCardVertical key={`e${i}`} index={currentRows.length + i} s={s} t={t} />
                      : <EmptyRow key={`e${i}`} rowIndex={currentRows.length + i} s={s} t={t} isSmallScreen={isSmallScreen} />
                  ))}
                </div>
              </div>

              {/* Nav carousel */}
              {totalPages > 1 && (
                <div style={{ background: t.navBg, borderRadius: `${10 * s}px`, border: `2px solid ${t.navBorder}`, padding: `${0.55 * s}rem ${1.25 * s}rem`, display: 'flex', alignItems: 'center', gap: `${1.25 * s}rem`, flexShrink: 0 }}>
                  <span style={{ fontSize: `${1.0 * s}rem`, color: t.subText, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Hal. {currentPage + 1}/{totalPages} &nbsp;·&nbsp; {filtered.length} agenda &nbsp;·&nbsp; {rowsPerPage} baris
                  </span>
                  <div style={{ flex: 1 }}><ProgressBar progress={progress} s={s} t={t} /></div>
                  <span style={{ fontSize: `${1.0 * s}rem`, color: '#6366f1', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Ganti dalam {secondsLeft}s
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
              <p style={{ fontSize: `${1 * s}rem`, color: t.mutedText, marginTop: `${0.4 * s}rem` }}>Tidak ada agenda yang akan datang atau sedang berlangsung.</p>
            </div>
          )}
        </div>

        {/* Media Rotator — Video + Pamflet */}
        <div style={{ flex: isVertical ? 2 : 1, display: 'flex', flexDirection: 'column', background: t.tableBg, borderRadius: `${12 * s}px`, border: `2px solid ${t.headerBorder}`, overflow: 'hidden', minHeight: 0 }}>
          <div style={{ background: t.theadBg, borderBottom: `2px solid ${t.theadBorder}`, padding: `${0.55 * s}rem ${0.85 * s}rem`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: `${0.5 * s}rem` }}>
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: `${1.2 * s}rem`, height: `${1.2 * s}rem`, color: '#ef4444' }}>
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
              <span style={{ fontSize: `${0.9 * s}rem`, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.colHeader }}>Galeri USC</span>
            </div>
            <span style={{ fontSize: `${0.75 * s}rem`, color: t.mutedText }}>Video & Pamflet</span>
          </div>
          <div style={{ flex: 1, position: 'relative', background: '#000', minHeight: 0 }}>
            <MediaRotator s={s} t={t} />
          </div>
        </div>
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
