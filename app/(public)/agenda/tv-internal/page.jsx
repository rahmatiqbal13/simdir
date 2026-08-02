'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { UNIT_COLORS } from '../tv/unit-colors'
import { MONTHS_L, DAYS, useStageScale, useTheme, useClock, sortActiveAgenda } from '../tv/shared'
import AgendaTvTable from '../tv/AgendaTvTable'
import ProgramKerjaTvPanel from './ProgramKerjaTvPanel'

// Halaman TV internal — menampilkan SEMUA agenda (internal + publik), tanpa
// panel media/pamflet, tanpa login, dan tanpa entri menu (akses lewat URL
// langsung). Lihat docs/superpowers/specs/2026-07-10-agenda-tv-public-internal-split-design.md
export default function AgendaTVInternalPage() {
  const scale = useStageScale()
  const { isDark, t, toggle } = useTheme()
  const now = useClock()

  useEffect(() => {
    if (typeof document === 'undefined') return
    try {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
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

  const filtered = useMemo(() => sortActiveAgenda(agenda), [agenda])

  // Keyboard shortcuts (fullscreen, theme toggle — page navigation is
  // handled inside AgendaTvTable)
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

  const hh        = now ? String(now.getHours()).padStart(2, '0')   : '--'
  const mm        = now ? String(now.getMinutes()).padStart(2, '0') : '--'
  const dateShort = now ? `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS_L[now.getMonth()]} ${now.getFullYear()}` : '—'

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
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000',
      overflow: 'hidden',
      fontSize: '1vw'
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1vw' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9vw', flexShrink: 0 }}>
              <img src={logoUrl} alt={brandName} style={{ height: '4.5vw', width: 'auto', maxWidth: '4.5vw', objectFit: 'contain', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '1.3vw', fontWeight: 800, letterSpacing: '0.02em', lineHeight: 1.15, color: t.text, maxWidth: '16vw', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brandName}</div>
                <div style={{ fontSize: '0.75vw', color: t.text2, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginTop: '0.2vh' }}>Internal</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', flex: 1 }}>
              <h1 style={{ fontSize: '1.8vw', fontWeight: 800, margin: 0, letterSpacing: '0.04em', color: t.accent }}>AGENDA DIREKTORAT — INTERNAL</h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8vw', flexShrink: 0 }}>
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

        {/* ── MAIN: Agenda | Program Kerja PUI, berdampingan ── */}
        <main style={{ flex: 1, minHeight: 0, padding: '1.5vh 1.5vw', overflow: 'hidden', display: 'flex', gap: '1.5vw' }}>
          <div style={{ flex: '0 1 55%', minWidth: 0, height: '100%' }}>
            <AgendaTvTable agenda={filtered} t={t} scale={scale} />
          </div>
          <div style={{ flex: '0 1 45%', minWidth: 0, height: '100%' }}>
            <ProgramKerjaTvPanel items={programKerja} t={t} scale={scale} />
          </div>
        </main>
      </div>

      <style>{`
        @keyframes blink    { 50% { opacity: 0.2; } }
        @keyframes dotpulse { 0% { box-shadow: 0 0 0 0 rgba(52,211,153,0.7); } 70% { box-shadow: 0 0 0 10px rgba(52,211,153,0); } 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); } }
        * { box-sizing: border-box; }
        body { margin: 0; -webkit-font-smoothing: antialiased; }
        button:hover { opacity: 0.85; }
      `}</style>
    </div>
  )
}
