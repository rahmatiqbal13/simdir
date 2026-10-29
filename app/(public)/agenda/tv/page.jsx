'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
// MEDIA_CONFIG dihapus — semua media (gambar + YouTube) sekarang dari /api/tv-pamflets
import { MONTHS, getAgendaStatus, sortActiveAgenda, useStageScale, useTheme, useClock } from './shared'
import { useWeather } from '@/app/components/Weather'
import { TV_DARK, TV_LIGHT, TV_STATUS_LABEL, tvStatusColor, TvStage, TvClock, TvWeather, TvThemeButton, TvOffline, TvProgress, TvLoading } from './TvKit'

const ROWS_PER_PAGE = 4
const ROTATE_SEC = 15

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
const MediaRotator = ({ p, onState }) => {
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

  // Network recovery: re-init player saat koneksi kembali. Cuma
  // menghancurkan player lama tidak cukup — effect di bawah baru jalan lagi
  // kalau cur?.url/cur?.type berubah, yang tidak terjadi cuma karena koneksi
  // pulih. reinitNonce dipakai supaya effect itu ikut re-run walau URL sama.
  const [reinitNonce, setReinitNonce] = useState(0)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleOnline = () => {
      console.log('[TV] Network online, re-init player...')
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy() } catch {}
        playerRef.current = null
      }
      ytUrlRef.current = null
      setReinitNonce((n) => n + 1)
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
  }, [cur?.url, cur?.type, reinitNonce])

  const total = playlist.length

  // Laporkan item aktif ke induk (judul, indeks, durasi) untuk bar segmen
  // dan keterangan di bawah media.
  const onStateRef = useRef(onState)
  useEffect(() => { onStateRef.current = onState }, [onState])
  useEffect(() => {
    onStateRef.current?.({ idx: total ? idx % total : 0, total, cur, startedAt: Date.now() })
  }, [idx, total, cur])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: p.video }}>
      {!cur && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: p.ink4 }}>
          <svg viewBox="0 0 24 24" width="72" height="72" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></svg>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 19, letterSpacing: '.06em' }}>BELUM ADA MEDIA · ATUR DI TV PAMFLET</span>
        </div>
      )}
      {cur?.type === 'youtube' && (
        <div style={{ position: 'absolute', inset: 0, opacity: fading ? 0 : 1, transition: 'opacity 0.6s ease', background: '#000' }}>
          <div id="yt-tv-player" style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      {cur?.type === 'image' && (
        <div style={{ position: 'absolute', inset: 0, opacity: fading ? 0 : 1, transition: 'opacity 0.6s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {imgErr ? (
            <div style={{ color: p.ink4, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 19, letterSpacing: '.06em' }}>
              GAMBAR TIDAK DITEMUKAN
            </div>
          ) : (
            <img src={cur.src} alt={cur.title} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          )}
        </div>
      )}
      {cur && (
        <span style={{ position: 'absolute', top: 24, left: 24, fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, letterSpacing: '.08em', padding: '6px 14px', borderRadius: 8, background: '#f5b915', color: '#0a1430' }}>
          {cur.type === 'youtube' ? 'VIDEO' : 'PAMFLET'}
        </span>
      )}
    </div>
  )
}

// ============ HALAMAN UTAMA ============
// TV Publik (Redesign 02 · 2a): agenda terbuka di kiri (40%), media di kanan
// (60%), ticker INFO di bawah. Hanya agenda bertanda "Tampilkan di TV Publik".
export default function AgendaTVPage() {
  const scale                 = useStageScale()
  const { isDark, toggle }    = useTheme()
  const p                     = isDark ? TV_DARK : TV_LIGHT
  const now                   = useClock()
  const weather               = useWeather()
  const isOnline              = useNetworkStatus()

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

  // Rotasi halaman agenda tiap ROTATE_SEC detik
  const [page, setPage] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const pages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const pagesRef = useRef(pages)
  pagesRef.current = pages
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= ROTATE_SEC) { setPage(pg => (pg + 1) % pagesRef.current); return 0 }
        return e + 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])
  const pg = page % pages
  const rows = filtered.slice(pg * ROWS_PER_PAGE, pg * ROWS_PER_PAGE + ROWS_PER_PAGE)

  // Status media aktif (dilaporkan MediaRotator) untuk segmen & keterangan
  const [media, setMedia] = useState({ idx: 0, total: 0, cur: null, startedAt: Date.now() })
  const mediaPct = media.cur?.type === 'image' && media.cur.duration
    ? Math.min(100, ((now ? now.getTime() : Date.now()) - media.startedAt) / media.cur.duration * 100)
    : 100

  // Keyboard shortcuts: F = fullscreen, T = tema, ←/→ = halaman agenda
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
      if (e.key === 'ArrowRight') { setPage(x => x + 1); setElapsed(0) }
      if (e.key === 'ArrowLeft') { setPage(x => x - 1 + pagesRef.current); setElapsed(0) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])

  const marqueeText = useMemo(() => {
    const parts = filtered
      .filter(a => getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) !== 'upcoming')
      .map(a => {
        const d = new Date(a.tanggal_mulai)
        return `${a.judul} — ${d.getDate()} ${MONTHS[d.getMonth()]}${a.waktu_mulai ? `, ${a.waktu_mulai.slice(0, 5).replace(':', '.')}` : ''}${a.lokasi ? `, ${a.lokasi}` : ''}`
      })
    parts.push('Pindai QR di layar untuk kritik & saran atau menilai fasilitas kami')
    parts.push('Agenda lengkap: kunjungi halaman /agenda')
    return parts.join('     ◆     ')
  }, [filtered])

  // Show loading only if no data cached yet
  if (loading && agenda.length === 0) return <TvLoading />
  // Show fatal error only if truly no data
  if (error && agenda.length === 0) return <TvLoading error={!isOnline ? `${error} · koneksi terputus` : error} />

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://managementusc.vercel.app'

  return (
    <TvStage scale={scale} p={p}>
      {/* ── HEADER ── */}
      <header style={{ height: 128, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 28, padding: '0 56px', borderBottom: `1px solid ${p.line}` }}>
        <img src={logoUrl} alt={brandName} style={{ width: 72, height: 72, objectFit: 'contain', background: '#fff', borderRadius: 16, padding: 6 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 40, letterSpacing: '-.02em', lineHeight: 1 }}>Unesa Science Center</span>
          <span style={{ fontSize: 21, color: p.ink2 }}>Selamat datang — agenda &amp; informasi untuk pengunjung</span>
        </div>
        {!isOnline && <TvOffline />}
        <TvWeather weather={weather} p={p} />
        <TvClock now={now} p={p} />
        <TvThemeButton isDark={isDark} onToggle={toggle} p={p} />
      </header>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '40fr 60fr', gap: 36, padding: '32px 56px' }}>
        {/* Kiri: agenda terbuka + QR */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: p.panel, borderRadius: 24, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '24px 28px 16px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, letterSpacing: '-.01em' }}>Agenda terbuka</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: p.ink2 }}>{pg + 1} / {pages}</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {rows.length === 0 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: `1px solid ${p.line}`, fontSize: 24, color: p.ink2, padding: 28, textAlign: 'center' }}>
                Belum ada agenda terbuka dalam waktu dekat.
              </div>
            )}
            {rows.map(a => {
              const st = getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai)
              const d = new Date(a.tanggal_mulai)
              const ongoing = st === 'ongoing'
              const c = tvStatusColor(st, p)
              return (
                <div key={a.id} style={{ flex: 1, maxHeight: 170, display: 'grid', gridTemplateColumns: '96px minmax(0,1fr)', gap: 22, alignItems: 'center', padding: '0 28px', borderTop: `1px solid ${p.line}` }}>
                  <div style={{ height: 92, borderRadius: 18, background: ongoing ? '#0b7a4b' : p.blockBg, color: ongoing ? '#fff' : p.blockFg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', opacity: .8 }}>{MONTHS[d.getMonth()]}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 600, lineHeight: 1 }}>{d.getDate()}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, lineHeight: 1.15, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{a.judul}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 20, color: p.ink2, minWidth: 0 }}>
                      {st !== 'upcoming' && (
                        <span style={{ fontSize: 17, fontWeight: 700, padding: '3px 12px', borderRadius: 99, background: ongoing ? (isDark ? '#12392a' : '#dcf5e8') : (isDark ? '#3a2e0a' : '#fdf0cc'), color: c, flexShrink: 0 }}>{TV_STATUS_LABEL[st]}</span>
                      )}
                      <span style={{ fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{a.waktu_mulai ? a.waktu_mulai.slice(0, 5).replace(':', '.') : 'Sepanjang hari'}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.lokasi}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {/* QR masukan pengunjung */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 24, padding: '18px 28px', borderTop: `1px solid ${p.line}` }}>
            {[
              { path: '/kritik-saran', label: 'Kritik & Saran' },
              { path: '/penilaian', label: 'Nilai Fasilitas' },
            ].map(q => (
              <div key={q.path} style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(origin + q.path)}`} alt={`QR ${q.label}`}
                  style={{ width: 96, height: 96, borderRadius: 12, background: '#fff', padding: 6, flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>{q.label}</span>
                  <span style={{ fontSize: 17, color: p.ink2 }}>Pindai dengan kamera HP</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '18px 28px', background: p.head }}>
            <TvProgress pct={(elapsed / ROTATE_SEC) * 100} p={p} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: p.ink2 }}>{ROTATE_SEC - elapsed}s</span>
          </div>
        </div>

        {/* Kanan: media */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {Array.from({ length: Math.max(1, media.total) }, (_, i) => (
              <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: p.track, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: !media.total ? '0%' : i < media.idx ? '100%' : i === media.idx ? `${mediaPct}%` : '0%', background: '#f5b915', transition: 'width 1s linear' }} />
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0, borderRadius: 24, overflow: 'hidden', border: `1px solid ${p.line}`, position: 'relative' }}>
            <MediaRotator p={p} onState={setMedia} />
          </div>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, letterSpacing: '-.01em', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {media.cur?.title || 'Unesa Science Center'}
              </span>
              <span style={{ fontSize: 21, color: p.ink2 }}>
                {media.cur ? (media.cur.type === 'youtube' ? 'Video · YouTube' : 'Pamflet kegiatan') : brandName}
              </span>
            </div>
            {media.total > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: p.ink2, flexShrink: 0 }}>{media.idx + 1} / {media.total}</span>}
          </div>
        </div>
      </div>

      {/* ── FOOTER / TICKER ── */}
      <footer style={{ height: 76, flexShrink: 0, display: 'flex', alignItems: 'center', background: '#f5b915', color: '#0a1430', overflow: 'hidden' }}>
        <span style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '0 32px', background: '#0a1430', color: '#f5b915', fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, letterSpacing: '.1em', flexShrink: 0, position: 'relative', zIndex: 1 }}>INFO</span>
        <div style={{ flex: 1, overflow: 'hidden', fontSize: 26, fontWeight: 600 }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', width: 'max-content', animation: 'simdirMarquee 45s linear infinite' }}>
            <span style={{ paddingRight: 80, paddingLeft: 32 }}>{marqueeText}</span>
            <span style={{ paddingRight: 80, paddingLeft: 32 }}>{marqueeText}</span>
          </div>
        </div>
        <span style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '0 24px', background: '#0a1430', color: '#9aa6cc', fontSize: 15, flexShrink: 0, position: 'relative', zIndex: 1 }}>
          Made by <strong style={{ color: '#f5b915', marginLeft: 6 }}>Rahmat Iqbal</strong>
        </span>
      </footer>
    </TvStage>
  )
}
