'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MEDIA_CONFIG } from './media-config'
import { getUnitColor, UNIT_COLORS } from './unit-colors'

// ============ HELPERS ============
const MONTHS     = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const MONTHS_L   = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const DAYS       = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']

const formatTime = (t) => {
  if (!t) return '--:--'
  const p = String(t).split(':')
  return `${p[0].padStart(2,'0')}:${(p[1]||'00').padStart(2,'0')}`
}

const getAgendaStatus = (mulai, selesai) => {
  const today = new Date(); today.setHours(0,0,0,0)
  const s = new Date(mulai); s.setHours(0,0,0,0)
  const e = new Date(selesai); e.setHours(0,0,0,0)
  if (today > e) return 'completed'
  if (today >= s) return 'ongoing'
  return Math.ceil((s - today) / 86400000) <= 3 ? 'upcoming_soon' : 'upcoming'
}

const getCountdown = (item) => {
  if (!item) return ''
  const st = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
  if (st === 'ongoing') return 'Berlangsung Sekarang'
  const target = new Date(item.tanggal_mulai + 'T' + (item.waktu_mulai || '00:00'))
  const diff = target - new Date()
  if (diff <= 0) return 'Berlangsung Sekarang'
  const dd = Math.floor(diff / 86400000)
  const hh = Math.floor((diff % 86400000) / 3600000)
  const mm = Math.floor((diff % 3600000) / 60000)
  if (dd > 0) return `${dd} hari ${hh} jam lagi`
  if (hh > 0) return `${hh} jam ${mm} menit lagi`
  return `${mm} menit lagi`
}

// ============ TEMA ============
const DARK = {
  bg: '#0a1228', bg2: '#0f1a3a', card: '#142a5e', card2: '#1a3370',
  border: 'rgba(255,255,255,0.08)', accent: '#f5b915', primary: '#4f7df9',
  text: '#ffffff', text2: 'rgba(255,255,255,0.7)', text3: 'rgba(255,255,255,0.5)',
  success: '#10b981',
  stageBg: 'radial-gradient(ellipse 1920px 600px at 20% 0%, rgba(79,125,249,0.18), transparent 60%), radial-gradient(ellipse 800px 600px at 100% 100%, rgba(245,185,21,0.12), transparent 65%), linear-gradient(180deg, #0a1228 0%, #0f1a3a 100%)',
  rowOngoing: 'linear-gradient(90deg, rgba(16,185,129,0.18), rgba(16,185,129,0.04))',
  rowSoon: 'linear-gradient(90deg, rgba(245,185,21,0.12), transparent)',
  theadBg: 'rgba(255,255,255,0.04)',
  featuredBg: 'linear-gradient(135deg, rgba(245,185,21,0.18), rgba(245,185,21,0.04))',
  featuredBorder: 'rgba(245,185,21,0.3)',
  footerBg: 'linear-gradient(90deg, rgba(245,185,21,0.16), rgba(79,125,249,0.16))',
  statusOngoingBg: 'rgba(16,185,129,0.2)', statusOngoingFg: '#34d399',
  statusSoonBg: 'rgba(245,185,21,0.2)', statusSoonFg: '#f5b915',
  statusUpcomingBg: 'rgba(79,125,249,0.2)', statusUpcomingFg: '#4f7df9',
}
const LIGHT = {
  bg: '#f5f7fb', bg2: '#ffffff', card: '#ffffff', card2: '#f8fafc',
  border: '#e4e7ee', accent: '#c98800', primary: '#1e3a8a',
  text: '#0f172a', text2: '#475569', text3: '#94a3b8',
  success: '#047857',
  stageBg: 'radial-gradient(ellipse 1920px 600px at 20% 0%, rgba(30,58,138,0.08), transparent 60%), radial-gradient(ellipse 800px 600px at 100% 100%, rgba(245,185,21,0.10), transparent 65%), linear-gradient(180deg, #f5f7fb 0%, #ffffff 100%)',
  rowOngoing: 'linear-gradient(90deg, rgba(4,120,87,0.10), rgba(4,120,87,0.02))',
  rowSoon: 'linear-gradient(90deg, rgba(245,185,21,0.12), transparent)',
  theadBg: '#f8fafc',
  featuredBg: 'linear-gradient(135deg, rgba(245,185,21,0.18), rgba(245,185,21,0.04))',
  featuredBorder: 'rgba(201,136,0,0.35)',
  footerBg: 'linear-gradient(90deg, rgba(245,185,21,0.18), rgba(30,58,138,0.10))',
  statusOngoingBg: 'rgba(4,120,87,0.12)', statusOngoingFg: '#047857',
  statusSoonBg: 'rgba(245,185,21,0.18)', statusSoonFg: '#b45309',
  statusUpcomingBg: 'rgba(30,58,138,0.10)', statusUpcomingFg: '#1e3a8a',
}

// ============ WMO WEATHER CODES ============
const WMO = {
  0:{icon:'☀️',label:'Cerah'}, 1:{icon:'🌤️',label:'Cerah Berawan'},
  2:{icon:'⛅',label:'Berawan Sebagian'}, 3:{icon:'☁️',label:'Berawan'},
  45:{icon:'🌫️',label:'Berkabut'}, 48:{icon:'🌫️',label:'Kabut'},
  51:{icon:'🌦️',label:'Gerimis Ringan'}, 53:{icon:'🌦️',label:'Gerimis'}, 55:{icon:'🌦️',label:'Gerimis Lebat'},
  61:{icon:'🌧️',label:'Hujan Ringan'}, 63:{icon:'🌧️',label:'Hujan Sedang'}, 65:{icon:'🌧️',label:'Hujan Lebat'},
  80:{icon:'🌦️',label:'Hujan Ringan'}, 81:{icon:'🌧️',label:'Hujan'}, 82:{icon:'⛈️',label:'Hujan Deras'},
  95:{icon:'⛈️',label:'Badai Petir'}, 96:{icon:'⛈️',label:'Badai Petir'}, 99:{icon:'⛈️',label:'Badai Hebat'},
}

const ROTATE_MS = 15000
const DEFAULT_PER_PAGE = 6

// ============ HOOKS ============
function useStageScale() {
  const [scale, setScale] = useState({ 
    sx: 1, 
    sy: 1, 
    s: 1,
    width: 1920, 
    height: 1080,
    is4K: false,
    isPortrait: false 
  })
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const update = () => {
      const w = window.innerWidth || 1920
      const h = window.innerHeight || 1080
      const isPortrait = h > w
      
      // Reference size 1920x1080 (Full HD)
      // For 4K (3840x2160), scale will be 2
      // For 720p (1280x720), scale will be ~0.67
      let sx = w / 1920
      let sy = h / 1080
      
      // Use uniform scale to maintain aspect ratio (use smaller value to fit screen)
      // But limit max scale to 2.5 for very large screens
      let s = Math.min(sx, sy)
      s = Math.max(0.5, Math.min(2.5, s))
      
      // For portrait mode on TV/mobile, adjust differently
      if (isPortrait) {
        // In portrait, prioritize width scaling
        s = Math.min(w / 1080, 2.5)
        s = Math.max(0.5, s)
      }
      
      setScale({ 
        sx, 
        sy, 
        s,
        width: w, 
        height: h,
        is4K: w >= 3840 || h >= 2160,
        isPortrait 
      })
    }
    
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  
  return scale
}

// Hook untuk menghitung rows per page secara dinamis
function useDynamicRowsPerPage(containerRef, scale) {
  const [rowsPerPage, setRowsPerPage] = useState(6)
  
  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return
    
    const calculateRows = () => {
      const container = containerRef.current
      if (!container) return
      
      // Get container height
      const containerHeight = container.clientHeight
      
      // Header height (approx 60px at scale 1)
      const headerHeight = 60 * (scale?.s || 1)
      
      // Row minimum height (approx 85px at scale 1)
      const minRowHeight = Math.max(70, 85 * (scale?.s || 1))
      
      // Available height for rows
      const availableHeight = containerHeight - headerHeight
      
      // Calculate max rows
      const maxRows = Math.max(4, Math.min(14, Math.floor(availableHeight / minRowHeight)))
      
      setRowsPerPage(maxRows)
    }
    
    calculateRows()
    
    // Check if ResizeObserver is available (some older TV browsers don't support it)
    if (typeof ResizeObserver !== 'undefined') {
      try {
        const observer = new ResizeObserver(calculateRows)
        observer.observe(containerRef.current)
        return () => observer.disconnect()
      } catch (err) {
        console.warn('ResizeObserver error:', err)
      }
    }
    
    // Fallback: use window resize event
    const handleResize = () => calculateRows()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [containerRef, scale?.s])
  
  return rowsPerPage
}

function useTheme() {
  const [isDark, setIsDark] = useState(true)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const s = localStorage.getItem('simdir-tv-theme')
      if (s === 'light') setIsDark(false)
      else if (s === 'dark') setIsDark(true)
    } catch {}
  }, [])
  const toggle = useCallback(() => setIsDark(p => {
    const next = !p
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('simdir-tv-theme', next ? 'dark' : 'light') } catch {}
    }
    return next
  }), [])
  return { isDark, t: isDark ? DARK : LIGHT, toggle }
}

function useClock() {
  const [now, setNow] = useState(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function useWeather() {
  const [weather, setWeather] = useState(null)
  const fetch_ = useCallback(async () => {
    if (typeof window === 'undefined') return
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-7.3076&longitude=112.6748&current=temperature_2m,weather_code&timezone=Asia%2FJakarta')
      if (!r.ok) throw new Error()
      const d = await r.json()
      setWeather({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code })
    } catch { setWeather(null) }
  }, [])
  useEffect(() => {
    if (typeof window === 'undefined') return
    fetch_()
    const id = setInterval(fetch_, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetch_])
  return weather
}

// ============ MEDIA ROTATOR ============
const MediaRotator = ({ t }) => {
  const [idx, setIdx]             = useState(0)
  const [fading, setFading]       = useState(false)
  const [imgErr, setImgErr]       = useState(false)
  const [dbPamflets, setDbPamflets] = useState([])
  const playerRef   = useRef(null)
  const timerRef    = useRef(null)
  const plLenRef    = useRef(0)
  const plIdxRef    = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const load = async () => {
      try {
        // Use absolute URL to avoid connection issues
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        const res = await fetch(`${baseUrl}/api/tv-pamflets`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          // Add cache control to prevent caching issues
          cache: 'no-cache'
        })
        if (res.ok) {
          const data = await res.json()
          setDbPamflets(data || [])
        } else {
          console.warn('TV Pamflets API returned:', res.status)
          setDbPamflets([])
        }
      } catch (err) {
        console.warn('Failed to load TV pamflets:', err)
        setDbPamflets([])
      }
    }
    
    load()
    
    // Only set interval if window is available
    let id
    if (typeof window !== 'undefined') {
      id = setInterval(load, 5 * 60 * 1000)
    }
    
    return () => {
      if (id) clearInterval(id)
    }
  }, [])

  const playlist = useMemo(() => {
    const yt = MEDIA_CONFIG.playlist.filter(m => m.type === 'youtube')
    const imgs = dbPamflets.map(p => ({ type: 'image', src: p.src_url, title: p.title, duration: p.duration * 1000 }))
    return [...yt, ...imgs]
  }, [dbPamflets])

  // Ref selalu up-to-date — dipakai di callback YouTube agar tidak stale
  const playlistRef = useRef(playlist)
  useEffect(() => { playlistRef.current = playlist }, [playlist])

  const cur = playlist.length > 0 ? playlist[idx % Math.max(1, playlist.length)] : null

  // next tidak bergantung playlist.length — gunakan playlistRef agar selalu current
  const next = useCallback(() => {
    setFading(true)
    setTimeout(() => {
      setIdx(p => (p + 1) % Math.max(1, playlistRef.current.length))
      setImgErr(false)
      setFading(false)
    }, 600)
  }, [])

  // Ref untuk next — agar onStateChange YouTube tidak perlu di-recreate
  const nextRef = useRef(next)
  useEffect(() => { nextRef.current = next }, [next])

  // Timer untuk slide gambar
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (cur?.type === 'youtube') return
    const dur = cur?.duration || MEDIA_CONFIG.SLIDE_DURATION
    timerRef.current = setInterval(() => nextRef.current(), dur)
    return () => clearInterval(timerRef.current)
  }, [idx, cur])

  // YouTube player — hanya dibuat ulang jika URL playlist berubah
  const ytUrlRef = useRef(null)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    if (cur?.type !== 'youtube') {
      // Keluar dari YouTube → bersihkan player
      if (playerRef.current?.destroy) { playerRef.current.destroy(); playerRef.current = null }
      ytUrlRef.current = null
      return
    }
    const url = cur.url
    if (ytUrlRef.current === url && playerRef.current) return // sudah berjalan, tidak perlu dibuat ulang
    ytUrlRef.current = url
    const listMatch = url.match(/list=([^&]+)/)
    const listId = listMatch?.[1] || ''
    const init = () => {
      if (playerRef.current?.destroy) { playerRef.current.destroy(); playerRef.current = null }
      plLenRef.current = 0
      plIdxRef.current = 0
      
      // Check if YT API is available
      if (!window.YT?.Player) {
        console.warn('YouTube API not available')
        return
      }
      
      try {
        playerRef.current = new window.YT.Player('yt-tv-player', {
          playerVars: { listType: 'playlist', list: listId, autoplay: 1, mute: 1, rel: 0, modestbranding: 1, controls: 0, iv_load_policy: 3 },
          events: {
            onReady: (e) => {
              try {
                e.target.mute()
                // getPlaylist() sering null di onReady — coba ulang sampai berhasil
                const tryLen = () => {
                  const pl = e.target.getPlaylist?.()
                  if (pl?.length) { plLenRef.current = pl.length; return }
                  setTimeout(tryLen, 800)
                }
                tryLen()
              } catch (err) {
                console.warn('YouTube onReady error:', err)
              }
            },
            onStateChange: (e) => {
              try {
                e.target.mute()
                try { plIdxRef.current = e.target.getPlaylistIndex() } catch {}
                // Tangkap panjang playlist jika belum diketahui
                if (!plLenRef.current) {
                  try { plLenRef.current = e.target.getPlaylist()?.length || 0 } catch {}
                }
                if (e.data === 0) {
                  // Video berakhir — cek apakah ini video terakhir di playlist
                  const isLast = plLenRef.current > 0
                    ? plIdxRef.current >= plLenRef.current - 1
                    : true
                  if (isLast) setTimeout(() => nextRef.current(), 1000)
                }
              } catch (err) {
                console.warn('YouTube onStateChange error:', err)
              }
            },
          },
        })
      } catch (err) {
        console.warn('YouTube Player init error:', err)
      }
    }
    
    if (window.YT?.Player) { 
      init() 
    } else {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { 
        try {
          prev?.(); 
          init() 
        } catch (err) {
          console.warn('YouTube API ready error:', err)
        }
      }
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        try {
          const tag = document.createElement('script'); 
          tag.src = 'https://www.youtube.com/iframe_api'; 
          document.head?.appendChild?.(tag)
        } catch (err) {
          console.warn('Failed to load YouTube API:', err)
        }
      }
    }
    return () => { 
      if (playerRef.current?.destroy) { 
        try {
          playerRef.current.destroy(); 
          playerRef.current = null 
        } catch (err) {
          console.warn('YouTube destroy error:', err)
        }
      } 
    }
  }, [cur?.url, cur?.type])

  const total = playlist.length

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      {cur?.type === 'youtube' && (
        <div style={{ position: 'absolute', inset: 0, opacity: fading ? 0 : 1, transition: 'opacity 0.6s ease' }}>
          <div id="yt-tv-player" style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      {cur?.type === 'image' && (
        <div style={{ position: 'absolute', inset: 0, opacity: fading ? 0 : 1, transition: 'opacity 0.6s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.card }}>
          {imgErr ? (
            <div style={{ color: t.text3, textAlign: 'center', fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
              Gambar tidak ditemukan
            </div>
          ) : (
            <img src={cur.src} alt={cur.title} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          )}
        </div>
      )}
      {/* Segment indicators */}
      {total > 1 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, display: 'flex', gap: 2 }}>
          {playlist.map((_, i) => (
            <div key={i} style={{ flex: 1, height: '100%', background: i === (idx % total) ? '#f5b915' : 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ============ FEATURED CARD ============
const FEATURED_ROTATE_MS = 5000

const FeaturedCard = ({ agenda, t }) => {
  const ongoingList = useMemo(() =>
    agenda.filter(a => getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) === 'ongoing')
  , [agenda])

  const fallback = useMemo(() =>
    agenda.find(a => getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) !== 'completed') || null
  , [agenda])

  const isCarousel = ongoingList.length > 1
  const [activeIdx, setActiveIdx] = useState(0)
  const [visible,   setVisible]   = useState(true)

  // Auto-rotate when multiple ongoing
  useEffect(() => {
    if (!isCarousel) { setActiveIdx(0); return }
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setActiveIdx(p => (p + 1) % ongoingList.length)
        setVisible(true)
      }, 400)
    }, FEATURED_ROTATE_MS)
    return () => clearInterval(id)
  }, [isCarousel, ongoingList.length])

  // Reset index when list changes
  useEffect(() => { setActiveIdx(0); setVisible(true) }, [ongoingList.length])

  const item = ongoingList.length > 0 ? ongoingList[activeIdx] : fallback

  if (!item) return (
    <div style={{ background: t.featuredBg, border: `1px solid ${t.featuredBorder}`, borderRadius: 20, padding: '22px 26px', flexShrink: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.accent }}>
        ⭐ Agenda Berikutnya
      </div>
      <div style={{ marginTop: 12, color: t.text2, fontSize: 16 }}>Tidak ada agenda mendatang</div>
    </div>
  )

  const st = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
  const d  = new Date(item.tanggal_mulai)
  const eyebrow = st === 'ongoing'
    ? (isCarousel ? `🔴 Berlangsung (${activeIdx + 1}/${ongoingList.length})` : '🔴 Sedang Berlangsung')
    : '⭐ Agenda Berikutnya'
  const countdown = getCountdown(item)

  return (
    <div style={{ background: t.featuredBg, border: `1px solid ${t.featuredBorder}`, borderRadius: 20, padding: '22px 26px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 280, height: 280, background: 'radial-gradient(circle, rgba(245,185,21,0.25), transparent 65%)', pointerEvents: 'none' }} />

      {/* Content — fade on carousel switch */}
      <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.accent, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          {eyebrow}
        </div>
        <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.018em', color: t.text }}>{item.judul}</h2>
        <div style={{ display: 'grid', gap: 6, fontSize: 14, color: t.text2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>{DAYS[d.getDay()]}, {d.getDate()} {MONTHS_L[d.getMonth()]} · {formatTime(item.waktu_mulai)}</span>
          </div>
          {item.lokasi && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{item.lokasi}</span>
            </div>
          )}
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text3 }}>
            {st === 'ongoing' ? 'STATUS' : 'DIMULAI DALAM'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '-0.02em', color: t.accent, textAlign: 'right' }}>
            {countdown}
          </div>
        </div>
      </div>

      {/* Dot indicators — hanya muncul jika carousel */}
      {isCarousel && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          {ongoingList.map((_, i) => (
            <span key={i} style={{
              width: i === activeIdx ? 20 : 6, height: 6, borderRadius: 999,
              background: i === activeIdx ? t.accent : t.border,
              transition: 'all 0.3s ease', display: 'block',
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ============ TABLE ROW ============
const AgendaTableRow = ({ item, num, t, scale = 1 }) => {
  const st        = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
  const d         = new Date(item.tanggal_mulai)
  const unitColor = getUnitColor(item.jenis, item.penyelenggara)

  // Ongoing: hijau override; lainnya: warna unit
  const rowBg   = st === 'ongoing' ? t.rowOngoing : st === 'upcoming_soon' ? t.rowSoon : unitColor.bg
  const borderL = `5px solid ${st === 'ongoing' ? t.success : unitColor.border}`
  const pleft   = st === 'ongoing' ? 23 : 23

  const statusMap = {
    ongoing:      { txt: 'Berlangsung', bg: t.statusOngoingBg,  fg: t.statusOngoingFg,  pulse: true  },
    upcoming_soon:{ txt: 'Segera',      bg: t.statusSoonBg,     fg: t.statusSoonFg,     pulse: false },
    upcoming:     { txt: 'Akan Datang', bg: t.statusUpcomingBg, fg: t.statusUpcomingFg, pulse: false },
  }
  const sCfg = statusMap[st] || statusMap.upcoming

  const pic = item.jenis === 'pimpinan' && item.disposisi
    ? `→ ${item.disposisi}`
    : (item.pic || '-').replace(/^Manual:\s*/, '')

  // Responsive columns based on scale
  const colWidths = scale < 0.8 
    ? '52px 130px 1fr 180px 160px 120px'  // Smaller screens
    : scale > 1.5 
    ? '80px 180px 1fr 260px 240px 180px'  // 4K screens
    : '68px 160px 1fr 220px 200px 160px'  // Default FHD

  const cell = { padding: `${14 * scale}px 0`, display: 'flex', alignItems: 'center', overflow: 'hidden', minWidth: 0 }

  // Font sizes that scale with screen
  const fs = {
    num: Math.max(16, Math.min(26, 22 * scale)),
    date: Math.max(16, Math.min(24, 22 * scale)),
    month: Math.max(13, Math.min(19, 17 * scale)),
    time: Math.max(11, Math.min(15, 13 * scale)),
    title: Math.max(15, Math.min(21, 19 * scale)),
    badge: Math.max(10, Math.min(14, 12 * scale)),
    loc: Math.max(13, Math.min(17, 16 * scale)),
    pic: Math.max(12, Math.min(16, 15 * scale)),
    status: Math.max(11, Math.min(15, 13 * scale)),
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: colWidths, gap: 12 * scale, paddingLeft: pleft, paddingRight: 20 * scale, alignItems: 'center', borderBottom: `1px solid ${t.border}`, flex: 1, minHeight: 0, background: rowBg, borderLeft: borderL }}>
      <div style={{ ...cell }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fs.num, fontWeight: 700, color: t.text3 }}>
          {String(num).padStart(2, '0')}
        </span>
      </div>
      <div style={{ ...cell, flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
        <div>
          <span style={{ fontSize: fs.date, fontWeight: 700, color: t.text }}>{d.getDate()}</span>
          {' '}
          <span style={{ fontSize: fs.month, fontWeight: 600, color: t.text }}>{MONTHS[d.getMonth()]}</span>
        </div>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fs.time, color: t.text3, letterSpacing: '0.04em' }}>
          {formatTime(item.waktu_mulai)} – {formatTime(item.waktu_selesai)}
        </span>
      </div>
      <div style={{ ...cell, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 4 }}>
        <span style={{ fontSize: fs.title, fontWeight: 700, lineHeight: 1.25, color: t.text, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {item.judul}
        </span>
        {item.penyelenggara && (
          <span style={{
            fontSize: fs.badge, fontWeight: 700,
            color: unitColor.text,
            background: unitColor.bg,
            border: `1.5px solid ${unitColor.border}`,
            padding: `${2}px ${8 * scale}px`, borderRadius: 999,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
            display: 'inline-block',
          }}>
            {item.penyelenggara}
          </span>
        )}
      </div>
      <div style={{ ...cell, gap: 6 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={t.text3} strokeWidth="2" style={{ width: Math.max(14, 16 * scale), height: Math.max(14, 16 * scale), flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span style={{ fontSize: fs.loc, color: t.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.lokasi || '—'}</span>
      </div>
      <div style={{ ...cell }}>
        <span style={{ fontSize: fs.pic, color: t.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pic}</span>
      </div>
      <div style={{ ...cell }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: `${6 * scale}px ${12 * scale}px`, borderRadius: 999, fontSize: fs.status, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', background: sCfg.bg, color: sCfg.fg, whiteSpace: 'nowrap' }}>
          {sCfg.pulse && (
            <span style={{ width: Math.max(6, 8 * scale), height: Math.max(6, 8 * scale), borderRadius: '50%', background: 'currentColor', animation: 'dotpulse 1.5s infinite' }} />
          )}
          {sCfg.txt}
        </span>
      </div>
    </div>
  )
}

// ============ HALAMAN UTAMA ============
export default function AgendaTVPage() {
  const scale                 = useStageScale()
  const { isDark, t, toggle } = useTheme()
  const now                   = useClock()
  const weather               = useWeather()
  const tableContainerRef     = useRef(null)
  const rowsPerPage           = useDynamicRowsPerPage(tableContainerRef, scale)

  // Load fonts
  useEffect(() => {
    if (typeof document === 'undefined') return
    try {
      const link = document.createElement('link')
      link.rel  = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap'
      document.head?.appendChild?.(link)
      return () => { 
        try { 
          if (document.head?.contains?.(link)) {
            document.head?.removeChild?.(link) 
          }
        } catch {} 
      }
    } catch (err) {
      console.warn('Font loading error:', err)
    }
  }, [])

  const [agenda,      setAgenda]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [progress,    setProgress]    = useState(0)

  const load = useCallback(async () => {
    if (typeof window === 'undefined') return
    try {
      if (!supabase) { setError('Supabase belum dikonfigurasi'); setLoading(false); return }
      const { data, error: err } = await supabase.from('agenda').select('*').order('tanggal_mulai', { ascending: true })
      if (err) {
        console.error('Supabase error:', err)
        setError('Gagal memuat agenda')
      }
      else { setAgenda(data || []); setError(null) }
    } catch (e) {
      console.error('Load error:', e)
      setError('Terjadi kesalahan')
    }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { 
    if (typeof window !== 'undefined') {
      load() 
    }
  }, [load])
  
  useEffect(() => { 
    if (typeof window === 'undefined') return
    const id = setInterval(load, 300000); 
    return () => clearInterval(id) 
  }, [load])

  const filtered = useMemo(() =>
    agenda
      .filter(a => getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) !== 'completed')
      .sort((a, b) => new Date(a.tanggal_mulai + 'T' + (a.waktu_mulai || '00:00')) - new Date(b.tanggal_mulai + 'T' + (b.waktu_mulai || '00:00')))
  , [agenda])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / rowsPerPage))

  // Keyboard shortcuts
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  setCurrentPage(p => Math.max(0, p - 1))
      if (e.key === 'ArrowRight') setCurrentPage(p => Math.min(totalPages - 1, p + 1))
      if (e.key === 'f' || e.key === 'F' || e.key === 'F11') {
        e.preventDefault()
        try {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {})
          } else {
            document.exitFullscreen?.().catch(() => {})
          }
        } catch (err) {
          console.warn('Fullscreen error:', err)
        }
      }
      if (e.key === 't' || e.key === 'T') toggle()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle, totalPages])
  const currentRows = useMemo(() => filtered.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage), [filtered, currentPage, rowsPerPage])
  const emptyCount  = Math.max(0, rowsPerPage - currentRows.length)

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

  // Marquee text
  const marqueeText = useMemo(() => {
    const ongoing  = filtered.filter(a => getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) === 'ongoing')
    const upcoming = filtered.filter(a => getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) !== 'ongoing').slice(0, 5)
    const parts = []
    ongoing.forEach(a => parts.push(`🔴 SEDANG BERLANGSUNG: ${a.judul} di ${a.lokasi || '—'}`))
    upcoming.forEach(a => {
      const d = new Date(a.tanggal_mulai)
      parts.push(`📅 ${d.getDate()} ${MONTHS[d.getMonth()]} ${formatTime(a.waktu_mulai)} — ${a.judul} (${a.lokasi || '—'})`)
    })
    parts.push('💡 Untuk info lengkap, kunjungi SIMDIR atau hubungi Sekretariat USC')
    return parts.map(p => `${p} ● `).join('') + parts.map(p => `${p} ● `).join('')
  }, [filtered])

  // Clock values (null saat SSR — cegah hydration mismatch)
  const hh        = now ? String(now.getHours()).padStart(2, '0')   : '--'
  const mm        = now ? String(now.getMinutes()).padStart(2, '0') : '--'
  const dateShort = now ? `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS_L[now.getMonth()]} ${now.getFullYear()}` : '—'
  const dateLong  = dateShort

  // Weather
  const wInfo = weather ? (WMO[weather.code] || { icon: '🌡️', label: 'Tidak Diketahui' }) : null

  if (loading || error) {
    return (
      <div style={{ height: '100vh', background: '#0a1228', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: 16, background: error ? '#7f1d1d' : 'linear-gradient(135deg,#f5b915,#d97706)', display: 'grid', placeItems: 'center', color: error ? '#fca5a5' : '#0f172a', fontWeight: 900, fontSize: 32 }}>
          {error ? '!' : 'S'}
        </div>
        <p style={{ color: error ? '#f87171' : '#64748b', fontSize: 18 }}>{error || 'Memuat agenda...'}</p>
      </div>
    )
  }

  // Responsive columns based on scale
const getCols = (scale) => scale < 0.8 
  ? '52px 130px 1fr 180px 160px 120px'  // Smaller screens
  : scale > 1.5 
  ? '80px 180px 1fr 260px 240px 180px'  // 4K screens
  : '68px 160px 1fr 220px 200px 160px'  // Default FHD

const COLS = '68px 160px 1fr 220px 200px 160px'

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
        <div style={{
          width: 1920, 
          height: 1080,
          background: t.bg,
          backgroundImage: t.stageBg,
          transformOrigin: 'top left',
          transform: `scale(${scale.s})`,
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          color: t.text,
          overflow: 'hidden',
          transition: 'background-color 0.35s ease',
        }}>

          {/* ── HEADER ── */}
          <header style={{ padding: '20px 48px 12px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
            {/* Main row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
              {/* Brand */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                <div style={{ width: 64, height: 64, background: isDark ? '#ffffff' : '#1e3a8a', borderRadius: 16, padding: 6, flexShrink: 0, transition: 'background 0.35s ease' }}>
                  <img src="/images/logo USC.png" alt="USC" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.06em', lineHeight: 1, color: t.text }}>SIMDIR · USC</div>
                  <div style={{ fontSize: 13, color: t.text2, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginTop: 5 }}>Unesa Science Center</div>
                </div>
              </div>

              {/* Title */}
              <div style={{ textAlign: 'center', flex: 1 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '0.04em', color: t.accent }}>AGENDA DIREKTORAT</h1>
                <p style={{ fontSize: 15, color: t.text2, margin: '5px 0 0', textTransform: 'capitalize' }}>{dateLong}</p>
              </div>

              {/* Right: Theme + Weather + Clock + Resolution Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                {/* Resolution indicator (hidden on small screens) */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: 2,
                  padding: '4px 10px',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  minWidth: 60
                }}>
                  <span style={{ fontSize: 10, color: t.text3, fontWeight: 600, letterSpacing: '0.04em' }}>RES</span>
                  <span style={{ fontSize: 12, color: t.accent, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {scale.is4K ? '4K' : scale.width >= 2560 ? 'QHD' : scale.width >= 1920 ? 'FHD' : 'HD'}
                  </span>
                </div>

                {/* Theme toggle */}
                <button
                  onClick={toggle}
                  style={{ background: 'rgba(255,255,255,0.04)', color: t.text, border: `1px solid ${t.border}`, width: 48, height: 66, borderRadius: 14, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
                >
                  {isDark ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                      <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                    </svg>
                  )}
                </button>

                {/* Weather */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.border}`, borderRadius: 14, minWidth: 180 }}>
                  <div style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', fontSize: 30, lineHeight: 1, flexShrink: 0 }}>
                    {wInfo ? wInfo.icon : '🌡️'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', fontFamily: '"JetBrains Mono", monospace', color: t.text }}>
                      {weather ? weather.temp : '--'}<span style={{ color: t.accent }}>°</span>C
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text2, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                      {wInfo ? wInfo.label : 'Memuat…'}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text3, marginTop: 2 }}>Surabaya</div>
                  </div>
                </div>

                {/* Clock */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 48, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: t.text }}>
                    {hh}<span style={{ animation: 'blink 1s steps(1) infinite' }}>:</span>{mm}
                  </div>
                  <div style={{ fontSize: 13, color: t.text2, marginTop: 5, letterSpacing: '0.04em' }}>{dateShort}</div>
                </div>
              </div>
            </div>

            {/* Legend unit kerja — strip kompak baris kedua */}
            <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${t.border}`, display: 'flex', gap: '0 12px', alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
              {Object.entries(UNIT_COLORS).map(([key, uc]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: uc.border, flexShrink: 0, display: 'block' }} />
                  <span style={{ fontSize: 9, fontWeight: 600, color: t.text3, whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>{uc.name}</span>
                </div>
              ))}
            </div>
          </header>

          {/* ── MAIN ── */}
          <main style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 24, padding: '24px 48px', minHeight: 0, overflow: 'hidden' }}>

            {/* LEFT: Table */}
            <div ref={tableContainerRef} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Table head */}
              <div style={{ display: 'grid', gridTemplateColumns: getCols(scale.s), gap: Math.max(10, 16 * scale.s), padding: `${16 * scale.s}px ${24 * scale.s}px`, background: t.theadBg, borderBottom: `1px solid ${t.border}`, fontSize: Math.max(11, 13 * scale.s), fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text2, flexShrink: 0 }}>
                {['No', 'Tanggal', 'Judul Kegiatan', 'Lokasi', 'PIC / Disposisi', 'Status'].map(col => (
                  <div key={col}>{col}</div>
                ))}
              </div>
              {/* Table body */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {currentRows.map((item, i) => (
                  <AgendaTableRow key={item.id} item={item} num={currentPage * rowsPerPage + i + 1} t={t} scale={scale.s} />
                ))}
                {Array.from({ length: emptyCount }).map((_, i) => (
                  <div key={`e${i}`} style={{ flex: 1, minHeight: 0, borderBottom: `1px solid ${t.border}` }} />
                ))}
              </div>
            </div>

            {/* RIGHT: Side panel */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 24, minHeight: 0 }}>

              {/* Featured card */}
              <FeaturedCard agenda={filtered} t={t} />

              {/* Media card */}
              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden', flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text2 }}>
                    <svg viewBox="0 0 24 24" fill={t.accent} style={{ width: 16, height: 16 }}><path d="M21.582 7.176a2.506 2.506 0 0 0-1.768-1.768C18.254 5 12 5 12 5s-6.254 0-7.814.408a2.506 2.506 0 0 0-1.768 1.768C2 8.746 2 12 2 12s0 3.254.418 4.824c.23.864.908 1.538 1.768 1.768C5.746 19 12 19 12 19s6.254 0 7.814-.408a2.506 2.506 0 0 0 1.768-1.768C22 15.254 22 12 22 12s0-3.254-.418-4.824zM10 15V9l5.2 3-5.2 3z"/></svg>
                    Video Profil USC
                  </div>
                </div>
                <div style={{ flex: 1, position: 'relative', background: '#000', minHeight: 0 }}>
                  <MediaRotator t={t} />
                </div>
              </div>

              {/* Pager */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 22px', flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.text3 }}>Halaman</span>
                <div style={{ flex: 1, height: 4, background: t.border, borderRadius: 999, overflow: 'hidden', minWidth: 80 }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${t.accent}, #ffd34d)`, transition: 'width 0.1s linear' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} onClick={() => { setCurrentPage(i); setProgress(0) }} style={{ width: i === currentPage ? 24 : 8, height: 8, borderRadius: 999, background: i === currentPage ? t.accent : t.border, border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
                  ))}
                </div>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: t.text2, fontWeight: 600 }}>
                  {currentPage + 1}/{totalPages}
                </span>
              </div>

              {/* Info panel */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: `1px solid ${t.border}`, flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: t.text3 }}>
                  <span style={{ color: t.text2, fontWeight: 600 }}>{filtered.length}</span> agenda • 
                  <span style={{ color: t.text2, fontWeight: 600 }}>{rowsPerPage}</span> baris/hal
                </div>
                <div style={{ fontSize: 10, color: t.text3, opacity: 0.7 }}>
                  F11: Fullscreen • ← →: Navigasi
                </div>
              </div>
            </aside>
          </main>

          {/* ── FOOTER / MARQUEE ── */}
          <footer style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 24, alignItems: 'center', padding: '18px 48px', background: t.footerBg, borderTop: `1px solid ${t.border}`, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', background: t.accent, color: '#1a1a1a', padding: '8px 16px', borderRadius: 999, flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
              PENGUMUMAN
            </div>
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <span style={{ display: 'inline-block', animation: 'marquee 45s linear infinite', fontSize: 17, fontWeight: 600, color: t.text, letterSpacing: '0.02em' }}>
                {marqueeText}
              </span>
            </div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: t.text3, letterSpacing: '0.04em', fontWeight: 600, flexShrink: 0 }}>
              SIMDIR v2.0 · TV
            </div>
          </footer>
        </div>
      </div>

      <style>{`
        @keyframes blink    { 50% { opacity: 0.2; } }
        @keyframes marquee  { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes dotpulse { 0% { box-shadow: 0 0 0 0 rgba(52,211,153,0.7); } 70% { box-shadow: 0 0 0 10px rgba(52,211,153,0); } 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); } }
        * { box-sizing: border-box; }
        body { margin: 0; -webkit-font-smoothing: antialiased; }
        button:hover { opacity: 0.85; }
      `}</style>
    </>
  )
}
