'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { agendaDiLayar } from '@/lib/tvLayar'
// MEDIA_CONFIG dihapus — semua media (gambar + YouTube) sekarang dari /api/tv-pamflets
import { MONTHS, getAgendaStatus, sortActiveAgenda, useStageScale, useTheme, useClock } from './shared'
import { useWeather } from '@/app/components/Weather'
import { TV_DARK, TV_LIGHT, TV_STATUS_LABEL, tvStatusColor, TvStage, TvClock, TvWeather, TvThemeButton, TvOffline, TvProgress, TvLoading, TvQrRow, TvTicker, TvHeader, useTvAutoReload } from './TvKit'
import { MediaRotator, useNetworkStatus } from './MediaRotator'

const ROWS_PER_PAGE = 4
const ROTATE_SEC = 15

// ============ HALAMAN UTAMA ============
// TV Publik (Redesign 02 · 2a): agenda terbuka di kiri (40%), media di kanan
// (60%), ticker INFO di bawah. Hanya agenda bertanda "Tampilkan di TV Publik".
export default function AgendaTVPage() {
  useTvAutoReload()
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
      else { setAgenda((data || []).filter(a => agendaDiLayar(a, 'usc'))); setError(null) }
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

  return (
    <TvStage scale={scale} p={p}>
      {/* ── HEADER ── */}
      <TvHeader p={p} logoUrl={logoUrl} title="Unesa Science Center" sub="Selamat datang — agenda & informasi untuk pengunjung">
        {(hp) => <>
          {!isOnline && <TvOffline />}
          <TvWeather weather={weather} p={hp} />
          <TvClock now={now} p={hp} />
          <TvThemeButton isDark={isDark} onToggle={toggle} p={hp} />
        </>}
      </TvHeader>

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
                  <div style={{ height: 96, borderRadius: 22, background: ongoing ? '#f7b500' : p.blockBg, color: ongoing ? '#121735' : p.blockFg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
          <TvQrRow p={p} />
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
                <div style={{ height: '100%', width: !media.total ? '0%' : i < media.idx ? '100%' : i === media.idx ? `${mediaPct}%` : '0%', background: p.accent, transition: 'width 1s linear' }} />
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0, borderRadius: 24, overflow: 'hidden', border: `1px solid ${p.line}`, position: 'relative' }}>
            <MediaRotator p={p} onState={setMedia} layar="usc" />
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

      <TvTicker text={marqueeText} />
    </TvStage>
  )
}
