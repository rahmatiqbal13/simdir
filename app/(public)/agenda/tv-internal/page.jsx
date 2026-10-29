'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { UNIT_COLORS, getUnitColor } from '../tv/unit-colors'
import { MONTHS, useStageScale, useTheme, useClock, sortActiveAgenda, getAgendaStatus } from '../tv/shared'
import { useWeather } from '@/app/components/Weather'
import { TV_DARK, TV_LIGHT, TV_STATUS_LABEL, tvStatusColor, TvStage, TvClock, TvWeather, TvThemeButton, TvProgress, TvLoading } from '../tv/TvKit'
import ProgramKerjaTvPanel from './ProgramKerjaTvPanel'

const ROWS_PER_PAGE = 6
const ROTATE_SEC = 15

// Halaman TV internal — menampilkan SEMUA agenda (internal + publik), tanpa
// panel media/pamflet, tanpa login, dan tanpa entri menu (akses lewat URL
// langsung). Lihat docs/superpowers/specs/2026-07-10-agenda-tv-public-internal-split-design.md
export default function AgendaTVInternalPage() {
  const scale = useStageScale()
  const { isDark, toggle } = useTheme()
  const p = isDark ? TV_DARK : TV_LIGHT
  const now = useClock()
  const weather = useWeather()

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

  const [agenda, setAgenda]           = useState([])
  const [programKerja, setProgramKerja] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (typeof window === 'undefined') return
    try {
      if (!supabase) { setError('Supabase belum dikonfigurasi'); setLoading(false); return }
      const { data, error: err } = await supabase.from('agenda').select('*').order('tanggal_mulai', { ascending: true })
      if (err) {
        console.error('Supabase error:', err)
        setError('Gagal memuat agenda')
      } else { setAgenda(data || []); setError(null) }

      const { data: pkData, error: pkErr } = await supabase
        .from('program_kerja_pui')
        .select('*, unit_kerja(nama, kode)')
      if (pkErr) console.error('Gagal memuat program kerja:', pkErr)
      else setProgramKerja(pkData || [])
    } catch (e) {
      console.error('Load error:', e)
      setError('Terjadi kesalahan')
    }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') load()
  }, [load])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = setInterval(load, 300000)
    return () => clearInterval(id)
  }, [load])

  // Auto-reload halaman setiap 60 menit untuk mencegah stuck — jaring
  // pengaman umum yang sama seperti di TV publik (tv/page.jsx), independen
  // dari fetch-error di atas (yang sudah tertangani dengan tetap
  // menampilkan data lama).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = setTimeout(() => {
      console.log('[TV Internal] Auto-reload after 60 minutes')
      window.location.reload()
    }, 60 * 60 * 1000)
    return () => clearTimeout(id)
  }, [])

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

  if (loading && agenda.length === 0) return <TvLoading />
  if (error && agenda.length === 0) return <TvLoading error={error} />

  return (
    <TvStage scale={scale} p={p}>
      {/* ── HEADER ── */}
      <header style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', borderBottom: `1px solid ${p.line}` }}>
        <div style={{ height: 116, display: 'flex', alignItems: 'center', gap: 28, padding: '0 48px' }}>
          <img src={logoUrl} alt={brandName} style={{ width: 64, height: 64, objectFit: 'contain', background: '#fff', borderRadius: 14, padding: 5 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 38, letterSpacing: '-.02em', lineHeight: 1 }}>Agenda Direktorat</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, letterSpacing: '.12em', padding: '5px 12px', borderRadius: 8, background: '#e5484d', color: '#fff' }}>INTERNAL</span>
            </div>
            <span style={{ fontSize: 20, color: p.ink2 }}>Semua agenda unit kerja · tidak untuk ditampilkan di area publik</span>
          </div>
          <TvWeather weather={weather} p={p} iconSize={42} tempSize={32} labelSize={18} height={68} city={false} />
          <TvClock now={now} p={p} size={50} dateSize={20} short />
          <TvThemeButton isDark={isDark} onToggle={toggle} p={p} size={68} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '12px 48px', borderTop: `1px solid ${p.line}`, overflow: 'hidden' }}>
          {Object.entries(UNIT_COLORS).map(([key, uc]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: p.ink2, whiteSpace: 'nowrap', flexShrink: 0 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: uc.border }} />{uc.name}
            </span>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 15, color: p.ink4, whiteSpace: 'nowrap', flexShrink: 0 }}>
            Made by <strong style={{ color: p.clock }}>Rahmat Iqbal R.P</strong>
          </span>
        </div>
      </header>

      {/* ── MAIN: Agenda | Program Kerja PUI ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '55fr 45fr', gap: 28, padding: '28px 48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: p.panel, borderRadius: 22, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '130px minmax(0,1fr) 170px', gap: 22, padding: '18px 26px', background: p.head, fontFamily: 'var(--font-mono)', fontSize: 16, letterSpacing: '.08em', textTransform: 'uppercase', color: p.ink2 }}>
            <span>Tanggal</span><span>Kegiatan · Unit · Lokasi</span><span>Status</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {rows.length === 0 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: p.ink2 }}>Tidak ada agenda aktif.</div>
            )}
            {rows.map(a => {
              const st = getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai)
              const uc = getUnitColor(a.jenis, a.penyelenggara, a.dihadiri_pimpinan)
              const c = tvStatusColor(st, p)
              const d = new Date(a.tanggal_mulai)
              const unitLabel = (a.dihadiri_pimpinan || a.jenis === 'pimpinan')
                ? (a.nama_pimpinan || 'Pimpinan')
                : ((a.penyelenggara || '').replace(/^External - /, '') || uc.name)
              const t1 = a.waktu_mulai ? a.waktu_mulai.slice(0, 5).replace(':', '.') : ''
              const t2 = a.waktu_selesai ? a.waktu_selesai.slice(0, 5).replace(':', '.') : ''
              return (
                <div key={a.id} style={{
                  flex: 1, maxHeight: 150, display: 'grid', gridTemplateColumns: '130px minmax(0,1fr) 170px', gap: 22, alignItems: 'center', padding: '0 26px',
                  borderTop: `1px solid ${p.line}`, background: st === 'ongoing' ? p.ongoingRow : uc.border + p.tint, boxShadow: `inset 6px 0 0 ${uc.border}`,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 24, fontWeight: 600 }}>{d.getDate()} {MONTHS[d.getMonth()]}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, color: p.ink2 }}>{t1 && t2 ? `${t1}–${t2}` : t1 || 'Sepanjang hari'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 600, lineHeight: 1.15, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{a.judul}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, color: p.ink2, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, color: uc.border, flexShrink: 0, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{unitLabel}</span>
                      {a.lokasi && <><span>·</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.lokasi}</span></>}
                    </div>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 19, fontWeight: 700, color: c }}>
                    <span style={{ width: 11, height: 11, borderRadius: '50%', background: c, flexShrink: 0 }} />{TV_STATUS_LABEL[st]}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 18, padding: '16px 26px', background: p.head }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {Array.from({ length: pages }, (_, i) => (
                <span key={i} style={{ height: 10, width: i === pg ? 36 : 10, borderRadius: 5, background: i === pg ? (isDark ? '#f5b915' : '#1e3a8a') : p.dotIdle, transition: 'width .25s' }} />
              ))}
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, color: p.ink2 }}>Halaman {pg + 1} / {pages}</span>
            <TvProgress pct={(elapsed / ROTATE_SEC) * 100} p={p} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, color: p.ink2 }}>{ROTATE_SEC - elapsed}s</span>
          </div>
        </div>

        <ProgramKerjaTvPanel items={programKerja} p={p} isDark={isDark} />
      </div>
    </TvStage>
  )
}
