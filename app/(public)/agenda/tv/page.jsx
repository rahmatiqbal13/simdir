'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
// MEDIA_CONFIG dihapus — semua media (gambar + YouTube) sekarang dari /api/tv-pamflets
import { UNIT_COLORS } from './unit-colors'
import { MONTHS, MONTHS_L, DAYS, formatTime, getAgendaStatus, sortActiveAgenda, DARK, LIGHT, useStageScale, useTheme, useClock } from './shared'
import AgendaTvTable from './AgendaTvTable'

// ============ WEATHER ICON COMPONENT ============
function WeatherIcon({ code, size = '1.8vw', color = '#f5b915' }) {
  const s = { width: size, height: size, display: 'block' }
  // Map WMO code to SVG
  const svgs = {
    // Clear / Sunny
    0: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
      </svg>
    ),
    // Mainly clear
    1: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M17.5 19c0-3.037-2.463-5.5-5.5-5.5S6.5 15.963 6.5 19"/><path d="M17.5 19h-11"/><path d="M12 2v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M19.78 4.22l-1.42 1.42"/><circle cx="12" cy="9" r="3.5" fill={color} fillOpacity="0.15"/>
      </svg>
    ),
    // Partly cloudy
    2: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M17.5 19c0-3.037-2.463-5.5-5.5-5.5S6.5 15.963 6.5 19"/><path d="M17.5 19h-11"/><path d="M12 2v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M19.78 4.22l-1.42 1.42"/><path d="M17.5 12a5.5 5.5 0 0 0-5-3.5"/><circle cx="12" cy="9" r="2.5" fill={color} fillOpacity="0.15"/>
      </svg>
    ),
    // Overcast
    3: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M17.5 19c0-3.037-2.463-5.5-5.5-5.5S6.5 15.963 6.5 19"/><path d="M17.5 19h-11"/><path d="M18 13a6 6 0 0 0-6-6"/><path d="M6 13a6 6 0 0 1 6-6"/><rect x="8" y="10" width="8" height="4" rx="2" fill={color} fillOpacity="0.1"/>
      </svg>
    ),
    // Fog
    45: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M4 14h16"/><path d="M4 18h16"/><path d="M4 10h16"/><path d="M6 6h12"/><path d="M8 14l2-4"/><path d="M14 14l-2-4"/>
      </svg>
    ),
    48: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M4 14h16"/><path d="M4 18h16"/><path d="M4 10h16"/><path d="M6 6h12"/><path d="M8 14l2-4"/><path d="M14 14l-2-4"/>
      </svg>
    ),
    // Drizzle
    51: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M17.5 17c0-3.037-2.463-5.5-5.5-5.5S6.5 13.963 6.5 17"/><path d="M17.5 17h-11"/><path d="M8 20l-1 2"/><path d="M12 20v2"/><path d="M16 20l1 2"/>
      </svg>
    ),
    53: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M17.5 17c0-3.037-2.463-5.5-5.5-5.5S6.5 13.963 6.5 17"/><path d="M17.5 17h-11"/><path d="M7 20l-1 2"/><path d="M10 20l-1 2"/><path d="M13 20v2"/><path d="M16 20l1 2"/><path d="M19 20l1 2"/>
      </svg>
    ),
    55: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M17.5 16c0-3.037-2.463-5.5-5.5-5.5S6.5 12.963 6.5 16"/><path d="M17.5 16h-11"/><path d="M6 19l-1 2"/><path d="M9 19l-1 2"/><path d="M12 19v2"/><path d="M15 19l1 2"/><path d="M18 19l1 2"/><path d="M21 19l1 2"/>
      </svg>
    ),
    // Rain
    61: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M17.5 16c0-3.037-2.463-5.5-5.5-5.5S6.5 12.963 6.5 16"/><path d="M17.5 16h-11"/><path d="M8 19l-2 3"/><path d="M12 19l-2 3"/><path d="M16 19l-2 3"/>
      </svg>
    ),
    63: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M17.5 15c0-3.037-2.463-5.5-5.5-5.5S6.5 11.963 6.5 15"/><path d="M17.5 15h-11"/><path d="M7 18l-2 3"/><path d="M10 18l-2 3"/><path d="M13 18l-2 3"/><path d="M16 18l-2 3"/><path d="M19 18l-2 3"/>
      </svg>
    ),
    65: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M17.5 14c0-3.037-2.463-5.5-5.5-5.5S6.5 10.963 6.5 14"/><path d="M17.5 14h-11"/><path d="M6 17l-2 3"/><path d="M9 17l-2 3"/><path d="M12 17l-2 3"/><path d="M15 17l-2 3"/><path d="M18 17l-2 3"/><path d="M21 17l-2 3"/>
      </svg>
    ),
    // Rain showers
    80: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M17.5 16c0-3.037-2.463-5.5-5.5-5.5S6.5 12.963 6.5 16"/><path d="M17.5 16h-11"/><path d="M8 19l-2 3"/><path d="M12 19l-2 3"/><path d="M16 19l-2 3"/>
      </svg>
    ),
    81: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M17.5 15c0-3.037-2.463-5.5-5.5-5.5S6.5 11.963 6.5 15"/><path d="M17.5 15h-11"/><path d="M7 18l-2 3"/><path d="M10 18l-2 3"/><path d="M13 18l-2 3"/><path d="M16 18l-2 3"/><path d="M19 18l-2 3"/>
      </svg>
    ),
    // Heavy rain showers
    82: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M17.5 13c0-3.037-2.463-5.5-5.5-5.5S6.5 9.963 6.5 13"/><path d="M17.5 13h-11"/><path d="M5 16l-2 3"/><path d="M8 16l-2 3"/><path d="M11 16l-2 3"/><path d="M14 16l-2 3"/><path d="M17 16l-2 3"/><path d="M20 16l-2 3"/><path d="M23 16l-2 3"/>
      </svg>
    ),
    // Thunderstorm
    95: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M17.5 14c0-3.037-2.463-5.5-5.5-5.5S6.5 10.963 6.5 14"/><path d="M17.5 14h-11"/><path d="M11 17l-2 3h3l-1 3"/><path d="M15 17l-2 3"/>
      </svg>
    ),
    96: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M17.5 14c0-3.037-2.463-5.5-5.5-5.5S6.5 10.963 6.5 14"/><path d="M17.5 14h-11"/><path d="M11 17l-2 3h3l-1 3"/><path d="M15 17l-2 3"/>
      </svg>
    ),
    99: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <path d="M17.5 13c0-3.037-2.463-5.5-5.5-5.5S6.5 9.963 6.5 13"/><path d="M17.5 13h-11"/><path d="M10 16l-2 3h3l-1 3"/><path d="M14 16l-2 3h3l-1 3"/><path d="M18 16l-2 3"/>
      </svg>
    ),
  }

  // Fallback for unknown codes
  if (!svgs[code]) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
      </svg>
    )
  }
  return svgs[code]
}

// ============ WMO WEATHER CODES ============
const WMO = {
  0: { label: 'Cerah' },
  1: { label: 'Cerah Berawan' },
  2: { label: 'Berawan Sebagian' },
  3: { label: 'Berawan' },
  45: { label: 'Berkabut' },
  48: { label: 'Kabut' },
  51: { label: 'Gerimis Ringan' },
  53: { label: 'Gerimis' },
  55: { label: 'Gerimis Lebat' },
  61: { label: 'Hujan Ringan' },
  63: { label: 'Hujan Sedang' },
  65: { label: 'Hujan Lebat' },
  80: { label: 'Hujan Ringan' },
  81: { label: 'Hujan' },
  82: { label: 'Hujan Deras' },
  95: { label: 'Badai Petir' },
  96: { label: 'Badai Petir' },
  99: { label: 'Badai Hebat' },
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

// ============ NETWORK STATUS ============
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setIsOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return isOnline
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
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        const res = await fetch(`${baseUrl}/api/tv-pamflets`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-cache'
        })
        if (res.ok) {
          const data = await res.json()
          setDbPamflets(data || [])
        }
      } catch (err) {
        console.warn('Failed to load TV pamflets:', err)
      }
    }
    
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const playlist = useMemo(() => {
    return dbPamflets.map(p => {
      if (p.type === 'youtube') {
        return { type: 'youtube', url: p.src_url, title: p.title, duration: p.duration * 1000 }
      }
      return { type: 'image', src: p.src_url, title: p.title, duration: p.duration * 1000 }
    })
  }, [dbPamflets])

  const playlistRef = useRef(playlist)
  useEffect(() => { playlistRef.current = playlist }, [playlist])

  const cur = playlist.length > 0 ? playlist[idx % Math.max(1, playlist.length)] : null

  const next = useCallback(() => {
    setFading(true)
    setTimeout(() => {
      setIdx(p => (p + 1) % Math.max(1, playlistRef.current.length))
      setImgErr(false)
      setFading(false)
    }, 600)
  }, [])

  const nextRef = useRef(next)
  useEffect(() => { nextRef.current = next }, [next])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (cur?.type === 'youtube') return
    const dur = cur?.duration || 15000
    timerRef.current = setInterval(() => nextRef.current(), dur)
    return () => clearInterval(timerRef.current)
  }, [idx, cur])

  // Auto-reload halaman setiap 60 menit untuk mencegah stuck di Android TV
  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = setTimeout(() => {
      console.log('[TV] Auto-reload after 60 minutes')
      window.location.reload()
    }, 60 * 60 * 1000)
    return () => clearTimeout(id)
  }, [])

  // Watchdog: cek player masih hidup setiap 2 menit, jika tidak reload halaman
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (cur?.type !== 'youtube') return
    const id = setInterval(() => {
      try {
        const player = playerRef.current
        const state = player?.getPlayerState?.()
        // -1 = unstarted, 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = cued
        // Jika null/undefined atau error, anggap player mati
        if (state === undefined || state === null) {
          console.warn('[TV Watchdog] Player state invalid, reloading...')
          window.location.reload()
        }
      } catch {
        console.warn('[TV Watchdog] Player check failed, reloading...')
        window.location.reload()
      }
    }, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [cur?.type])

  // Network recovery: re-init player saat koneksi kembali
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleOnline = () => {
      console.log('[TV] Network online, re-init player...')
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy() } catch {}
        playerRef.current = null
      }
      ytUrlRef.current = null
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  const ytUrlRef = useRef(null)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    if (cur?.type !== 'youtube') {
      if (playerRef.current?.destroy) { playerRef.current.destroy(); playerRef.current = null }
      ytUrlRef.current = null
      return
    }
    const url = cur.url
    if (ytUrlRef.current === url && playerRef.current) return
    ytUrlRef.current = url
    const listMatch = url.match(/list=([^&]+)/)
    const listId = listMatch?.[1] || ''
    const init = () => {
      if (playerRef.current?.destroy) { playerRef.current.destroy(); playerRef.current = null }
      plLenRef.current = 0
      plIdxRef.current = 0
      
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
                if (!plLenRef.current) {
                  try { plLenRef.current = e.target.getPlaylist()?.length || 0 } catch {}
                }
                if (e.data === 0) {
                  const isLast = plLenRef.current > 0
                    ? plIdxRef.current >= plLenRef.current - 1
                    : true
                  if (isLast) setTimeout(() => nextRef.current(), 1000)
                }
              } catch (err) {
                console.warn('YouTube onStateChange error:', err)
              }
            },
            onError: (e) => {
              console.warn('YouTube player error:', e.data)
              // Error codes: 2=invalid param, 5=HTML5 error, 100=not found, 101/150=embed not allowed
              // Jika error, reload halaman setelah 5 detik
              setTimeout(() => {
                console.warn('[TV] Reloading due to YouTube error')
                window.location.reload()
              }, 5000)
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

// ============ HALAMAN UTAMA ============
export default function AgendaTVPage() {
  const scale                 = useStageScale()
  const { isDark, t, toggle } = useTheme()
  const now                   = useClock()
  const weather               = useWeather()
  const isOnline              = useNetworkStatus()

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

  const [brandName, setBrandName] = useState('Direktorat Unesa Science Center')
  const [logoUrl, setLogoUrl]     = useState('/images/logo USC.png')
  useEffect(() => {
    fetch('/api/app-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.brand_name) setBrandName(data.brand_name)
        if (data.logo_url) setLogoUrl(data.logo_url)
      })
      .catch(() => {})
  }, [])

  const [agenda,      setAgenda]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  const load = useCallback(async () => {
    if (typeof window === 'undefined') return
    try {
      if (!supabase) { setError('Supabase belum dikonfigurasi'); setLoading(false); return }
      const { data, error: err } = await supabase.from('agenda').select('*').eq('tampil_publik', true).order('tanggal_mulai', { ascending: true })
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

  const filtered = useMemo(() => sortActiveAgenda(agenda), [agenda])

  // Keyboard shortcuts (fullscreen, theme toggle — page navigation is handled
  // inside AgendaTvTable, which owns its own currentPage state)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const handler = (e) => {
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
  }, [toggle])

  const marqueeText = useMemo(() => {
    const ongoing  = filtered.filter(a => getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) === 'ongoing')
    const upcoming = filtered.filter(a => getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) !== 'ongoing').slice(0, 5)
    const parts = []
    ongoing.forEach(a => parts.push(`[BERLANGSUNG] ${a.judul} di ${a.lokasi || '—'}`))
    upcoming.forEach(a => {
      const d = new Date(a.tanggal_mulai)
      parts.push(`[AGENDA] ${d.getDate()} ${MONTHS[d.getMonth()]} ${formatTime(a.waktu_mulai)} — ${a.judul} (${a.lokasi || '—'})`)
    })
    parts.push('[INFO] Untuk info lengkap, kunjungi SIMDIR atau hubungi Sekretariat USC')
    return parts.map(p => `${p}  •  `).join('') + parts.map(p => `${p}  •  `).join('')
  }, [filtered])

  const hh        = now ? String(now.getHours()).padStart(2, '0')   : '--'
  const mm        = now ? String(now.getMinutes()).padStart(2, '0') : '--'
  const dateShort = now ? `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS_L[now.getMonth()]} ${now.getFullYear()}` : '—'
  const dateLong  = dateShort

  const wInfo = weather ? (WMO[weather.code] || { label: 'Tidak Diketahui' }) : null

  // Show loading only if no data cached yet
  if (loading && agenda.length === 0) {
    return (
      <div style={{ height: '100vh', background: '#0a1228', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: 16, background: 'linear-gradient(135deg,#f5b915,#d97706)', display: 'grid', placeItems: 'center', color: '#0f172a', fontWeight: 900, fontSize: 32 }}>
          S
        </div>
        <p style={{ color: '#64748b', fontSize: 18 }}>Memuat agenda...</p>
      </div>
    )
  }

  // Show fatal error only if truly no data
  if (error && agenda.length === 0) {
    return (
      <div style={{ height: '100vh', background: '#0a1228', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: 16, background: '#7f1d1d', display: 'grid', placeItems: 'center', color: '#fca5a5', fontWeight: 900, fontSize: 32 }}>
          !
        </div>
        <p style={{ color: '#f87171', fontSize: 18 }}>{error}</p>
        {!isOnline && <p style={{ color: '#94a3b8', fontSize: 14 }}>Koneksi internet terputus. Periksa jaringan.</p>}
      </div>
    )
  }

  return (
    <>
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        background: '#000', 
        overflow: 'hidden',
        fontSize: '1vw' // Base font size for vw scaling
      }}>
        <div style={{
          width: '100vw', 
          height: '100vh',
          background: t.bg,
          backgroundImage: t.stageBg,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          color: t.text,
          overflow: 'hidden',
        }}>

          {/* ── HEADER ── */}
          <header style={{ 
            padding: '1.5vh 2vw 1vh', 
            borderBottom: `1px solid ${t.border}`, 
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '1vh'
          }}>
            {/* Main row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1vw' }}>
              {/* Brand */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9vw', flexShrink: 0 }}>
                <img src={logoUrl} alt={brandName} style={{ height: '4.5vw', width: 'auto', maxWidth: '4.5vw', objectFit: 'contain', flexShrink: 0 }} />
                <div style={{ fontSize: '1.3vw', fontWeight: 800, letterSpacing: '0.02em', lineHeight: 1.15, color: t.text, maxWidth: '16vw', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brandName}</div>
              </div>

              {/* Title */}
              <div style={{ textAlign: 'center', flex: 1 }}>
                <h1 style={{ fontSize: '1.8vw', fontWeight: 800, margin: 0, letterSpacing: '0.04em', color: t.accent }}>AGENDA DIREKTORAT</h1>
                <p style={{ fontSize: '1vw', color: t.text2, margin: '0.3vh 0 0', textTransform: 'capitalize' }}>{dateLong}</p>
              </div>

              {/* Right: Theme + Weather + Clock */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8vw', flexShrink: 0 }}>
                {/* Theme toggle */}
                <button
                  onClick={toggle}
                  style={{ background: 'rgba(255,255,255,0.04)', color: t.text, border: `1px solid ${t.border}`, width: '2.8vw', height: '4vh', borderRadius: '0.6vw', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}
                >
                  {isDark ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" style={{ width: '1.3vw', height: '1.3vw' }}>
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" style={{ width: '1.3vw', height: '1.3vw' }}>
                      <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                    </svg>
                  )}
                </button>

                {/* Weather */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6vw', padding: '0.8vh 1vw', background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.border}`, borderRadius: '0.6vw', minWidth: '10vw' }}>
                  <div style={{ width: '2.5vw', height: '2.5vw', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <WeatherIcon code={weather?.code} size="2.2vw" color={t.accent} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
                    <div style={{ fontSize: '1.4vw', fontWeight: 800, letterSpacing: '-0.02em', fontFamily: '"JetBrains Mono", monospace', color: t.text }}>
                      {weather ? weather.temp : '--'}<span style={{ color: t.accent }}>°</span>C
                    </div>
                    <div style={{ fontSize: '0.7vw', fontWeight: 600, color: t.text2, marginTop: '0.2vh', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {wInfo ? wInfo.label : 'Memuat…'}
                    </div>
                    <div style={{ fontSize: '0.6vw', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text3, marginTop: '0.1vh' }}>Surabaya</div>
                  </div>
                </div>

                {/* Clock */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '2.8vw', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: t.text }}>
                    {hh}<span style={{ animation: 'blink 1s steps(1) infinite' }}>:</span>{mm}
                  </div>
                  <div style={{ fontSize: '0.8vw', color: t.text2, marginTop: '0.3vh', letterSpacing: '0.04em' }}>{dateShort}</div>
                </div>

                {/* Offline indicator */}
                {!isOnline && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.4vw',
                    padding: '0.6vh 0.8vw',
                    background: 'rgba(185,28,28,0.2)',
                    border: '1px solid rgba(185,28,28,0.4)',
                    borderRadius: '0.5vw',
                    animation: 'pulse 2s infinite',
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" style={{ width: '1.1vw', height: '1.1vw' }}>
                      <path d="M18.36 6.64a9 9 0 0 1 1.66 8.88"/><path d="M5.64 5.64a9 9 0 0 1 12.72 12.72"/><path d="M15.34 15.34A5 5 0 0 1 8.66 8.66"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                    <span style={{ fontSize: '0.7vw', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Offline</span>
                  </div>
                )}
              </div>
            </div>

            {/* Legend unit kerja */}
            <div style={{ paddingTop: '0.8vh', borderTop: `1px solid ${t.border}`, display: 'flex', gap: '0 0.8vw', alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
              {Object.entries(UNIT_COLORS).map(([key, uc]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.3vw', flexShrink: 0 }}>
                  <span style={{ width: '0.45vw', height: '0.45vw', borderRadius: 2, background: uc.border, flexShrink: 0, display: 'block' }} />
                  <span style={{ fontSize: '0.75vw', fontWeight: 600, color: t.text3, whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>{uc.name}</span>
                </div>
              ))}
            </div>
          </header>

          {/* ── MAIN ── */}
          <main style={{
            display: 'grid',
            gridTemplateColumns: '2fr 3fr',
            gap: '1.2vw',
            padding: '1.5vh 1.5vw',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}>

            {/* LEFT: Table (dibatasi 4 baris) + QR Kritik & Saran mengisi sisa ruang */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2vw', minHeight: 0 }}>
              <AgendaTvTable agenda={filtered} t={t} scale={scale} maxRows={4} />

              <div style={{ flex: 1, minHeight: 0, background: t.card, boxShadow: `0 0 0 1px ${t.border}, 0 4px 12px rgba(0,0,0,0.15)`, borderRadius: '0.8vw', display: 'flex', alignItems: 'center', justifyContent: 'space-evenly', padding: '1.5vh' }}>
                {[
                  { path: '/kritik-saran', label: 'Kritik & Saran', hint: 'Scan dengan HP untuk memberi masukan' },
                  { path: '/penilaian', label: 'Penilaian Fasilitas', hint: 'Scan dengan HP untuk memberi penilaian' },
                ].map(({ path, label, hint }) => (
                  <div key={path} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1vh' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + path : 'https://managementusc.vercel.app' + path)}`}
                      alt={`QR ${label}`}
                      style={{ width: '7.5vw', height: '7.5vw', borderRadius: '0.4vw', display: 'block', background: '#fff', padding: '0.4vw', outline: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, outlineOffset: '-1px' }}
                    />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1vw', fontWeight: 800, color: t.text, letterSpacing: '0.02em' }}>{label}</div>
                      <div style={{ fontSize: '0.75vw', color: t.text2, marginTop: '0.3vh', maxWidth: '10vw' }}>{hint}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Side panel */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5vh', minHeight: 0 }}>

              {/* Media card */}
              <div style={{ background: t.card, boxShadow: `0 0 0 1px ${t.border}, 0 4px 12px rgba(0,0,0,0.15)`, borderRadius: '1vw', overflow: 'hidden', flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.2vh 1.4vw', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1vw', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6vw', fontSize: '1vw', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text2 }}>
                    <svg viewBox="0 0 24 24" fill={t.accent} style={{ width: '1.2vw', height: '1.2vw' }}><path d="M21.582 7.176a2.506 2.506 0 0 0-1.768-1.768C18.254 5 12 5 12 5s-6.254 0-7.814.408a2.506 2.506 0 0 0-1.768 1.768C2 8.746 2 12 2 12s0 3.254.418 4.824c.23.864.908 1.538 1.768 1.768C5.746 19 12 19 12 19s6.254 0 7.814-.408a2.506 2.506 0 0 0 1.768-1.768C22 15.254 22 12 22 12s0-3.254-.418-4.824zM10 15V9l5.2 3-5.2 3z"/></svg>
                    Video Profil USC
                  </div>
                </div>
                <div style={{ flex: 1, position: 'relative', background: '#000', minHeight: 0 }}>
                  <MediaRotator t={t} />
                </div>
              </div>

            </aside>
          </main>

          {/* ── FOOTER / MARQUEE ── */}
          <footer style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: '0.8vw', alignItems: 'center', padding: '0.6vh 1.4vw', background: t.footerBg, borderTop: `1px solid ${t.border}`, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4vw', fontSize: '0.75vw', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', background: t.accent, color: '#1a1a1a', padding: '0.35vh 0.8vw', borderRadius: 999, flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '0.75vw', height: '0.75vw' }}><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
              PENGUMUMAN
            </div>
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <span style={{ display: 'inline-block', animation: 'marquee 45s linear infinite', fontSize: '0.9vw', fontWeight: 600, color: t.text, letterSpacing: '0.02em' }}>
                {marqueeText}
              </span>
            </div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7vw', color: t.text3, letterSpacing: '0.04em', fontWeight: 600, flexShrink: 0 }}>
              SIMDIR v2.0 · TV
            </div>
            <div style={{ fontSize: '0.65vw', color: t.text3, flexShrink: 0, padding: '0.3vh 0.7vw', background: t.card, borderRadius: '0.5vw' }}>
              Made by <strong style={{ color: t.accent }}>Rahmat Iqbal</strong>
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
