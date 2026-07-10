'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
// MEDIA_CONFIG dihapus — semua media (gambar + YouTube) sekarang dari /api/tv-pamflets
import { UNIT_COLORS } from './unit-colors'
import { MONTHS, MONTHS_L, DAYS, formatTime, getAgendaStatus, sortActiveAgenda, DARK, LIGHT, useStageScale, useTheme, useClock } from './shared'
import AgendaTvTable from './AgendaTvTable'

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

  useEffect(() => { setActiveIdx(0); setVisible(true) }, [ongoingList.length])

  const item = ongoingList.length > 0 ? ongoingList[activeIdx] : fallback

  if (!item) return (
    <div style={{ background: t.featuredBg, border: `1px solid ${t.featuredBorder}`, borderRadius: '0.8vw', padding: '2vw', flexShrink: 0 }}>
      <div style={{ fontSize: '0.9vw', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.accent }}>
        ⭐ Agenda Berikutnya
      </div>
      <div style={{ marginTop: '1vw', color: t.text2, fontSize: '1.1vw' }}>Tidak ada agenda mendatang</div>
    </div>
  )

  const st = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
  const d  = new Date(item.tanggal_mulai)
  const eyebrow = st === 'ongoing'
    ? (isCarousel ? `🔴 Berlangsung (${activeIdx + 1}/${ongoingList.length})` : '🔴 Sedang Berlangsung')
    : '⭐ Agenda Berikutnya'
  const countdown = getCountdown(item)

  return (
    <div style={{ background: t.featuredBg, border: `1px solid ${t.featuredBorder}`, borderRadius: '0.8vw', padding: '1.2vw', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-5vw', right: '-4vw', width: '15vw', height: '15vw', background: 'radial-gradient(circle, rgba(245,185,21,0.25), transparent 65%)', pointerEvents: 'none' }} />

      <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        <div style={{ fontSize: '0.75vw', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.accent, marginBottom: '0.6vw', display: 'flex', alignItems: 'center', gap: '0.4vw' }}>
          {eyebrow}
        </div>
        <h2 style={{ margin: '0 0 0.6vw', fontSize: '1.2vw', fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.015em', color: t.text }}>{item.judul}</h2>
        <div style={{ display: 'grid', gap: '0.35vw', fontSize: '0.9vw', color: t.text2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5vw' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" style={{ width: '0.9vw', height: '0.9vw', flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>{DAYS[d.getDay()]}, {d.getDate()} {MONTHS_L[d.getMonth()]} · {formatTime(item.waktu_mulai)}</span>
          </div>
          {item.lokasi && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5vw' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" style={{ width: '0.9vw', height: '0.9vw', flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{item.lokasi}</span>
            </div>
          )}
        </div>
        <div style={{ marginTop: '0.8vw', paddingTop: '0.8vw', borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8vw' }}>
          <div style={{ fontSize: '0.7vw', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.text3 }}>
            {st === 'ongoing' ? 'STATUS' : 'DIMULAI DALAM'}
          </div>
          <div style={{ fontSize: '1.1vw', fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '-0.02em', color: t.accent, textAlign: 'right' }}>
            {countdown}
          </div>
        </div>
      </div>

      {isCarousel && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4vw', marginTop: '0.8vw' }}>
          {ongoingList.map((_, i) => (
            <span key={i} style={{
              width: i === activeIdx ? '1.2vw' : '0.4vw', height: '0.4vw', borderRadius: 999,
              background: i === activeIdx ? t.accent : t.border,
              transition: 'all 0.3s ease', display: 'block',
            }} />
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
    ongoing.forEach(a => parts.push(`🔴 SEDANG BERLANGSUNG: ${a.judul} di ${a.lokasi || '—'}`))
    upcoming.forEach(a => {
      const d = new Date(a.tanggal_mulai)
      parts.push(`📅 ${d.getDate()} ${MONTHS[d.getMonth()]} ${formatTime(a.waktu_mulai)} — ${a.judul} (${a.lokasi || '—'})`)
    })
    parts.push('💡 Untuk info lengkap, kunjungi SIMDIR atau hubungi Sekretariat USC')
    return parts.map(p => `${p} ● `).join('') + parts.map(p => `${p} ● `).join('')
  }, [filtered])

  const hh        = now ? String(now.getHours()).padStart(2, '0')   : '--'
  const mm        = now ? String(now.getMinutes()).padStart(2, '0') : '--'
  const dateShort = now ? `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS_L[now.getMonth()]} ${now.getFullYear()}` : '—'
  const dateLong  = dateShort

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '1vw', flexShrink: 0 }}>
                <div style={{ width: '3.5vw', height: '3.5vw', background: isDark ? '#ffffff' : '#1e3a8a', borderRadius: '0.8vw', padding: '0.3vw', flexShrink: 0 }}>
                  <img src="/images/logo USC.png" alt="USC" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize: '1.8vw', fontWeight: 900, letterSpacing: '0.06em', lineHeight: 1, color: t.text }}>SIMDIR · USC</div>
                  <div style={{ fontSize: '0.85vw', color: t.text2, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginTop: '0.3vh' }}>Unesa Science Center</div>
                </div>
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
                  <div style={{ width: '2.5vw', height: '2.5vw', display: 'grid', placeItems: 'center', fontSize: '1.8vw', lineHeight: 1, flexShrink: 0 }}>
                    {wInfo ? wInfo.icon : '🌡️'}
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
            gridTemplateColumns: '2.2fr 1fr', 
            gap: '1.2vw', 
            padding: '1.5vh 1.5vw', 
            flex: 1,
            minHeight: 0, 
            overflow: 'hidden' 
          }}>

            {/* LEFT: Table */}
            <AgendaTvTable agenda={filtered} t={t} scale={scale} />

            {/* RIGHT: Side panel */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5vh', minHeight: 0 }}>

              {/* Featured card */}
              <FeaturedCard agenda={filtered} t={t} />

              {/* Media card */}
              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '1vw', overflow: 'hidden', flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
          <footer style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '1.2vw', alignItems: 'center', padding: '1.2vh 2vw', background: t.footerBg, borderTop: `1px solid ${t.border}`, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6vw', fontSize: '1vw', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', background: t.accent, color: '#1a1a1a', padding: '0.7vh 1.2vw', borderRadius: 999, flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '1vw', height: '1vw' }}><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
              PENGUMUMAN
            </div>
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <span style={{ display: 'inline-block', animation: 'marquee 45s linear infinite', fontSize: '1.15vw', fontWeight: 600, color: t.text, letterSpacing: '0.02em' }}>
                {marqueeText}
              </span>
            </div>
            {/* QR Code Kritik & Saran */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6vw', flexShrink: 0, background: t.card, padding: '0.6vh 1vw', borderRadius: '0.5vw', border: `1px solid ${t.border}` }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/kritik-saran' : 'https://managementusc.vercel.app/kritik-saran')}`}
                alt="QR Kritik Saran"
                style={{ width: '2.2vw', height: '2.2vw', borderRadius: '0.2vw', display: 'block' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75vw', fontWeight: 700, color: t.text, letterSpacing: '0.04em', lineHeight: 1.2 }}>Kritik & Saran</span>
                <span style={{ fontSize: '0.65vw', color: t.text3, lineHeight: 1.2 }}>Scan dengan HP</span>
              </div>
            </div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9vw', color: t.text3, letterSpacing: '0.04em', fontWeight: 600, flexShrink: 0 }}>
              SIMDIR v2.0 · TV
            </div>
            <div style={{ fontSize: '0.8vw', color: t.text3, flexShrink: 0, padding: '0.5vh 1vw', background: t.card, borderRadius: '0.5vw' }}>
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
