'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { TV_LAYAR, TV_LAYAR_UNIT, getOpenStatus, toMin } from '@/lib/tvLayar'
import { MONTHS, formatTime, getAgendaStatus, sortActiveAgenda, useStageScale, useTheme, useClock } from '../shared'
import { getUnitCodeFromPenyelenggara } from '../unit-colors'
import { useWeather } from '@/app/components/Weather'
import { TV_DARK, TV_LIGHT, TvStage, TvClock, TvWeather, TvThemeButton, TvOffline, TvProgress, TvLoading, TvQrRow, TvTicker } from '../TvKit'
import { MediaRotator, useNetworkStatus } from '../MediaRotator'

const ROWS_PER_PAGE = 4
const ROTATE_SEC = 15

const jam = (t) => formatTime(t).replace(':', '.')

// ============ HALAMAN TV UNIT ============
// TV per lokasi unit (Kolam Renang, SSFC): status buka/tutup + jadwal HARI INI
// di kiri (40%), pamflet untuk layar ini di kanan (60%), running text di bawah.
// Agenda = agenda publik (tampil_publik) yang penyelenggaranya unit ini.
export default function TvLayarPage() {
  const { layar } = useParams()
  const cfg = TV_LAYAR_UNIT.includes(layar) ? TV_LAYAR[layar] : null

  const scale                 = useStageScale()
  const { isDark, toggle }    = useTheme()
  const p                     = isDark ? TV_DARK : TV_LIGHT
  const now                   = useClock()
  const weather               = useWeather()
  const isOnline              = useNetworkStatus()

  const [logoUrl, setLogoUrl] = useState('/images/logo USC.png')
  useEffect(() => {
    fetch('/api/app-settings')
      .then((res) => res.json())
      .then((data) => { if (data.logo_url) setLogoUrl(data.logo_url) })
      .catch(() => {})
  }, [])

  const [agenda,  setAgenda]  = useState([])
  const [screen,  setScreen]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    if (typeof window === 'undefined' || !cfg) return
    fetch('/api/tv-screens', { cache: 'no-cache' })
      .then((res) => res.json())
      .then((data) => setScreen(data.find(r => r.slug === layar) || null))
      .catch(() => {})
    try {
      if (!supabase) { setError('Supabase belum dikonfigurasi'); setLoading(false); return }
      const { data, error: err } = await supabase.from('agenda').select('*').eq('tampil_publik', true).order('tanggal_mulai', { ascending: true })
      if (err) {
        console.error('Supabase error:', err)
        setError('Gagal memuat agenda')
      }
      else { setAgenda((data || []).filter(a => getUnitCodeFromPenyelenggara(a.penyelenggara) === cfg.unit)); setError(null) }
    } catch (e) {
      console.error('Load error:', e)
      setError('Terjadi kesalahan')
    }
    finally { setLoading(false) }
  }, [cfg, layar])

  useEffect(() => {
    load()
    const id = setInterval(load, 300000)
    return () => clearInterval(id)
  }, [load])

  const active = useMemo(() => sortActiveAgenda(agenda), [agenda])
  const today = useMemo(() => active
    .filter(a => getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) === 'ongoing')
    .sort((a, b) => (toMin(a.waktu_mulai) ?? -1) - (toMin(b.waktu_mulai) ?? -1)), [active])
  const nextUp = useMemo(() => active
    .filter(a => getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) !== 'ongoing')
    .slice(0, 2), [active])

  // Rotasi halaman jadwal tiap ROTATE_SEC detik
  const [page, setPage] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const pages = Math.max(1, Math.ceil(today.length / ROWS_PER_PAGE))
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
  const rows = today.slice(pg * ROWS_PER_PAGE, pg * ROWS_PER_PAGE + ROWS_PER_PAGE)

  const [media, setMedia] = useState({ idx: 0, total: 0, cur: null, startedAt: Date.now() })
  const mediaPct = media.cur?.type === 'image' && media.cur.duration
    ? Math.min(100, ((now ? now.getTime() : Date.now()) - media.startedAt) / media.cur.duration * 100)
    : 100

  // Keyboard shortcuts: F = fullscreen, T = tema, ←/→ = halaman jadwal
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const handler = (e) => {
      if (e.key === 'f' || e.key === 'F' || e.key === 'F11') {
        e.preventDefault()
        try {
          if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {})
          else document.exitFullscreen?.().catch(() => {})
        } catch {}
      }
      if (e.key === 't' || e.key === 'T') toggle()
      if (e.key === 'ArrowRight') { setPage(x => x + 1); setElapsed(0) }
      if (e.key === 'ArrowLeft') { setPage(x => x - 1 + pagesRef.current); setElapsed(0) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])

  const status = getOpenStatus(screen, now)
  // Kolam outdoor: hujan (kode WMO ≥ 51) → peringatan keselamatan
  const cuacaBuruk = cfg?.peringatanCuaca && weather?.code >= 51
  const badai = cuacaBuruk && weather.code >= 95

  const marqueeText = useMemo(() => {
    const parts = (screen?.running_text || '').split('\n').map(s => s.trim()).filter(Boolean)
    today.forEach(a => parts.push(`${a.judul}${a.waktu_mulai ? ` — ${jam(a.waktu_mulai)}` : ''}${a.lokasi ? `, ${a.lokasi}` : ''}`))
    parts.push('Pindai QR di layar untuk kritik & saran atau menilai fasilitas kami')
    return parts.join('     ◆     ')
  }, [screen, today])

  if (!cfg) return <TvLoading error={`Layar "${layar}" tidak dikenal · gunakan ${TV_LAYAR_UNIT.map(s => `/agenda/tv/${s}`).join(' atau ')}`} />
  if (loading && agenda.length === 0) return <TvLoading />
  if (error && agenda.length === 0) return <TvLoading error={!isOnline ? `${error} · koneksi terputus` : error} />

  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : null

  return (
    <TvStage scale={scale} p={p}>
      {/* ── HEADER ── */}
      <header style={{ height: 128, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 28, padding: '0 56px', borderBottom: `1px solid ${p.line}`, boxShadow: `inset 0 6px 0 ${cfg.accent}` }}>
        <img src={logoUrl} alt="Logo" style={{ width: 72, height: 72, objectFit: 'contain', background: '#fff', borderRadius: 16, padding: 6 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 40, letterSpacing: '-.02em', lineHeight: 1 }}>{cfg.judul}</span>
          <span style={{ fontSize: 21, color: p.ink2 }}>{cfg.sapaan}</span>
        </div>
        {!isOnline && <TvOffline />}
        <TvWeather weather={weather} p={p} />
        <TvClock now={now} p={p} />
        <TvThemeButton isDark={isDark} onToggle={toggle} p={p} />
      </header>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '40fr 60fr', gap: 36, padding: '32px 56px' }}>
        {/* Kiri: status + jadwal hari ini + QR */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: p.panel, borderRadius: 24, overflow: 'hidden' }}>
          {status && (
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 24, padding: '22px 28px', background: status.open ? (isDark ? '#0f3a2a' : '#dcf5e8') : (isDark ? '#3a1618' : '#fde4e4') }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 700, letterSpacing: '.02em', color: status.open ? p.ongoing : '#e5484d', lineHeight: 1 }}>{status.title}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                {status.range && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 600 }}>{status.range}</span>}
                <span style={{ fontSize: 20, color: p.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{status.sub}</span>
              </div>
            </div>
          )}
          {cuacaBuruk && (
            <div style={{ flexShrink: 0, padding: '14px 28px', background: badai ? '#e5484d' : '#f5b915', color: badai ? '#fff' : '#0a1430', fontSize: 21, fontWeight: 700 }}>
              {badai ? '⚠ Badai petir — demi keselamatan, harap keluar dari kolam' : '⚠ Hujan — kolam dapat ditutup sementara demi keselamatan'}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '22px 28px 14px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, letterSpacing: '-.01em' }}>{cfg.jadwalLabel}</span>
            {pages > 1 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: p.ink2 }}>{pg + 1} / {pages}</span>}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {rows.length === 0 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: `1px solid ${p.line}`, fontSize: 24, color: p.ink2, padding: 28, textAlign: 'center' }}>
                {cfg.kosongLabel}
              </div>
            )}
            {rows.map(a => {
              const mulai = toMin(a.waktu_mulai)
              const selesai = toMin(a.waktu_selesai)
              const live = nowMin != null && mulai != null && nowMin >= mulai && (selesai == null || nowMin < selesai)
              const lewat = nowMin != null && selesai != null && nowMin >= selesai
              return (
                <div key={a.id} style={{ flex: 1, maxHeight: 140, display: 'grid', gridTemplateColumns: '150px minmax(0,1fr)', gap: 22, alignItems: 'center', padding: '0 28px', borderTop: `1px solid ${p.line}`, background: live ? p.ongoingRow : 'transparent', opacity: lewat ? 0.45 : 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontFamily: 'var(--font-mono)' }}>
                    <span style={{ fontSize: 32, fontWeight: 600, lineHeight: 1, color: live ? p.ongoing : p.ink }}>{a.waktu_mulai ? jam(a.waktu_mulai) : 'Sehari'}</span>
                    {a.waktu_selesai && <span style={{ fontSize: 19, color: p.ink2 }}>s.d. {jam(a.waktu_selesai)}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, lineHeight: 1.15, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{a.judul}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 20, color: p.ink2, minWidth: 0 }}>
                      {live && <span style={{ fontSize: 17, fontWeight: 700, padding: '3px 12px', borderRadius: 99, background: isDark ? '#12392a' : '#dcf5e8', color: p.ongoing, flexShrink: 0 }}>Sekarang</span>}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.lokasi}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {nextUp.length > 0 && (
            <div style={{ flexShrink: 0, padding: '14px 28px', borderTop: `1px solid ${p.line}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, letterSpacing: '.08em', color: p.ink4 }}>SEGERA</span>
              {nextUp.map(a => {
                const d = new Date(a.tanggal_mulai)
                return (
                  <span key={a.id} style={{ fontSize: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong style={{ fontFamily: 'var(--font-mono)', marginRight: 12 }}>{d.getDate()} {MONTHS[d.getMonth()]}</strong>{a.judul}
                  </span>
                )
              })}
            </div>
          )}

          <TvQrRow p={p} qrSize={84} padding="16px 28px" />
          {pages > 1 && (
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px', background: p.head }}>
              <TvProgress pct={(elapsed / ROTATE_SEC) * 100} p={p} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: p.ink2 }}>{ROTATE_SEC - elapsed}s</span>
            </div>
          )}
        </div>

        {/* Kanan: media untuk layar ini */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {Array.from({ length: Math.max(1, media.total) }, (_, i) => (
              <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: p.track, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: !media.total ? '0%' : i < media.idx ? '100%' : i === media.idx ? `${mediaPct}%` : '0%', background: '#f5b915', transition: 'width 1s linear' }} />
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0, borderRadius: 24, overflow: 'hidden', border: `1px solid ${p.line}`, position: 'relative' }}>
            <MediaRotator p={p} onState={setMedia} layar={layar} />
          </div>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, letterSpacing: '-.01em', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {media.cur?.title || cfg.judul}
              </span>
              <span style={{ fontSize: 21, color: p.ink2 }}>
                {media.cur ? (media.cur.type === 'youtube' ? 'Video · YouTube' : 'Informasi') : 'Unesa Science Center'}
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
