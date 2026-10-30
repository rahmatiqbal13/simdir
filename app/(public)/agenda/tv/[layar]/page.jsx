'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { TV_LAYAR, TV_LAYAR_UNIT, getOpenStatus, toMin, agendaDiLayar } from '@/lib/tvLayar'
import { MONTHS, formatTime, getAgendaStatus, sortActiveAgenda, useStageScale, useTheme, useClock } from '../shared'
import { getUnitCodeFromPenyelenggara } from '../unit-colors'
import { useWeather } from '@/app/components/Weather'
import { tvPalette, TvStage, TvClock, TvWeather, TvThemeButton, TvOffline, TvProgress, TvLoading, TvQrRow, TvTicker, TvHeader } from '../TvKit'
import { MediaRotator, useNetworkStatus } from '../MediaRotator'

const ROWS_PER_PAGE = 4
const ROTATE_SEC = 15

const jam = (t) => formatTime(t).replace(':', '.')
const dur = (m) => { const h = Math.floor(m / 60), mm = m % 60; return h ? `${h} j ${mm} m` : `${mm} m` }

// ============ HALAMAN TV UNIT ============
// TV per lokasi unit (Kolam Renang, SSFC): status buka/tutup + jadwal HARI INI
// di kiri (40%), pamflet untuk layar ini di kanan (60%), running text di bawah.
// Agenda = agenda publik yang dipilih untuk layar ini (lihat agendaDiLayar).
export default function TvLayarPage() {
  const { layar } = useParams()
  const cfg = TV_LAYAR_UNIT.includes(layar) ? TV_LAYAR[layar] : null

  const scale                 = useStageScale()
  const { isDark, toggle }    = useTheme()
  const p                     = tvPalette(layar, isDark)
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
      else { setAgenda((data || []).filter(a => agendaDiLayar(a, layar, getUnitCodeFromPenyelenggara(a.penyelenggara)))); setError(null) }
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
  const buka = toMin(status?.buka)
  const tutup = toMin(status?.tutup)
  const openPct = status?.range && nowMin != null && tutup > buka ? Math.max(0, Math.min(100, (nowMin - buka) / (tutup - buka) * 100)) : 0
  const hours = status?.range ? Array.from({ length: Math.max(0, Math.ceil(tutup / 60) - Math.floor(buka / 60)) }, (_, i) => Math.floor(buka / 60) + i) : []

  return (
    <TvStage scale={scale} p={p}>
      {/* ── HEADER ── */}
      <TvHeader layar={layar} p={p} logoUrl={logoUrl} title={cfg.judul} sub={cfg.sapaan}>
        {(hp) => <>
          {!isOnline && <TvOffline />}
          <TvWeather weather={weather} p={hp} />
          <TvClock now={now} p={hp} />
          <TvThemeButton isDark={isDark} onToggle={toggle} p={hp} />
        </>}
      </TvHeader>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '40fr 60fr', gap: 36, padding: '32px 56px' }}>
        {/* Kiri: status + jadwal hari ini + QR */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: p.panel, borderRadius: 24, overflow: 'hidden' }}>
          {status && (
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 18, padding: '24px 30px 22px', background: status.open ? (isDark ? '#0f3a2a' : '#dcf5e8') : (isDark ? '#3a1618' : '#fde4e4') }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 700, letterSpacing: '-.01em', color: status.open ? (isDark ? '#3ddc97' : '#0b7a4b') : '#e5484d', lineHeight: 1 }}>{status.title}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  {status.range && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 600 }}>{status.range}</span>}
                  <span style={{ fontSize: 20, color: p.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {status.sub}{status.open && !screen?.catatan && nowMin != null ? ` · ${dur(tutup - nowMin)} lagi` : ''}
                  </span>
                </div>
              </div>
              {status.range && (layar === 'ssfc' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {hours.map(h => (
                      <div key={h} style={{ flex: 1, height: 28, borderRadius: 5, background: nowMin >= (h + 1) * 60 ? p.accent : nowMin >= h * 60 ? '#f7b500' : p.line }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 17, color: p.ink2 }}>
                    {hours.filter((h, i) => i % 3 === 0).concat(hours.at(-1) + 1).map(h => <span key={h}>{String(h).padStart(2, '0')}</span>)}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ position: 'relative', height: 14, borderRadius: 7, background: p.track }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${openPct}%`, borderRadius: 7, background: '#38bdf8' }} />
                    <div style={{ position: 'absolute', top: '50%', left: `${openPct}%`, width: 32, height: 32, margin: '-16px 0 0 -16px', borderRadius: '50%', background: '#f7b500', border: '5px solid #fff' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 17, color: p.ink2 }}>
                    <span>{jam(status.buka)}</span><span>{jam(status.tutup)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {cuacaBuruk && (
            <div style={{ flexShrink: 0, padding: '14px 28px', background: badai ? '#e5484d' : '#f7b500', color: badai ? '#fff' : '#121735', fontSize: 22, fontWeight: 700 }}>
              {badai ? '⚠ Badai petir — demi keselamatan, harap keluar dari kolam' : '⚠ Hujan — kolam dapat ditutup sementara demi keselamatan'}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '22px 28px 14px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: layar === 'ssfc' ? 700 : 600, letterSpacing: '-.01em', textTransform: layar === 'ssfc' ? 'uppercase' : 'none' }}>{cfg.jadwalLabel}</span>
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
              const waktu = (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, fontFamily: 'var(--font-mono)' }}>
                  <span style={{ fontSize: 31, fontWeight: 600, lineHeight: 1, color: live ? p.ongoing : 'inherit' }}>{a.waktu_mulai ? jam(a.waktu_mulai) : 'Sehari'}</span>
                  {a.waktu_selesai && <span style={{ fontSize: 18, color: p.ink2 }}>s.d. {jam(a.waktu_selesai)}</span>}
                </div>
              )
              const row = { flex: 1, maxHeight: 140, display: 'grid', gap: 18, borderTop: `1px solid ${p.line}`, background: live ? p.ongoingRow : 'transparent', opacity: lewat ? 0.42 : 1 }
              const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

              if (layar === 'ssfc') {
                const pill = live ? (selesai != null ? `${dur(selesai - nowMin)} lagi` : 'Sekarang') : lewat ? 'Selesai' : mulai != null && nowMin != null && nowMin < mulai ? `Mulai ${dur(mulai - nowMin)}` : null
                return (
                  <div key={a.id} style={{ ...row, gridTemplateColumns: '10px 130px minmax(0,1fr)', gap: 20, alignItems: 'center', padding: '0 30px 0 0' }}>
                    <div style={{ alignSelf: 'stretch', background: live ? '#f7b500' : lewat ? 'transparent' : p.accent }} />
                    {waktu}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-.01em', textTransform: 'uppercase', lineHeight: 1.1, ...ellipsis }}>{a.judul}</span>
                        <span style={{ fontSize: 19, color: p.ink2, ...ellipsis }}>{a.lokasi}</span>
                      </div>
                      {pill && <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, padding: '7px 13px', borderRadius: 9, background: live ? '#f7b500' : p.head, color: live ? '#121735' : p.ink2 }}>{pill}</span>}
                    </div>
                  </div>
                )
              }

              return (
                <div key={a.id} style={{ ...row, gridTemplateColumns: '120px 32px minmax(0,1fr)', alignItems: 'stretch', padding: '0 30px' }}>
                  {waktu}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 15, borderLeft: `2px dashed ${p.line2}` }} />
                    <div style={{ position: 'relative', width: 26, height: 26, borderRadius: '50%', background: live ? p.ongoing : p.panel, border: `4px solid ${live ? p.ongoing : lewat ? p.line2 : '#38bdf8'}` }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, lineHeight: 1.2, ...ellipsis }}>{a.judul}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 19, color: p.ink2, minWidth: 0 }}>
                      {live && <span style={{ fontSize: 17, fontWeight: 700, padding: '3px 12px', borderRadius: 99, background: p.ongoingRow, color: p.ongoing, flexShrink: 0 }}>Sekarang</span>}
                      <span style={ellipsis}>{a.lokasi}</span>
                    </span>
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
                <div style={{ height: '100%', width: !media.total ? '0%' : i < media.idx ? '100%' : i === media.idx ? `${mediaPct}%` : '0%', background: p.accent, transition: 'width 1s linear' }} />
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0, borderRadius: 24, overflow: 'hidden', border: `1px solid ${p.line}`, position: 'relative' }}>
            <MediaRotator p={p} onState={setMedia} layar={layar} />
          </div>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: layar === 'ssfc' ? 700 : 600, letterSpacing: '-.01em', lineHeight: 1.1, textTransform: layar === 'ssfc' ? 'uppercase' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {media.cur?.title || cfg.judul}
              </span>
              <span style={{ fontSize: 21, color: p.ink2 }}>
                {media.cur?.type === 'youtube' ? 'Video · YouTube' : `Informasi · ${cfg.judul}`}
              </span>
            </div>
            {media.total > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: p.ink2, flexShrink: 0 }}>{media.idx + 1} / {media.total}</span>}
          </div>
        </div>
      </div>

      <TvTicker text={marqueeText} layar={layar} />
    </TvStage>
  )
}
