'use client'

// Pemutar pamflet/video TV + status jaringan, dipakai TV utama (./page.jsx)
// dan TV unit (./[layar]/page.jsx). `layar` menentukan pamflet mana yang
// diambil dari /api/tv-pamflets (yang targetnya kosong = semua layar).

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'

// ============ NETWORK STATUS ============
export function useNetworkStatus() {
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
export const MediaRotator = ({ p, onState, layar = 'usc' }) => {
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
        const res = await fetch(`${baseUrl}/api/tv-pamflets?layar=${encodeURIComponent(layar)}`, {
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
  }, [layar])

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
