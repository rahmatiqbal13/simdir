'use client'

// Komponen & palet bersama layar TV (Redesign 02): TV Publik (./page.jsx)
// dan TV Internal (../tv-internal/page.jsx). Keduanya digambar pada
// panggung tetap 1920×1080 lalu di-scale agar pas di layar apa pun, jadi
// semua ukuran di sini dalam piksel desain.

import { WeatherIcon, weatherInfo } from '@/app/components/Weather'
import { MONTHS_L, DAYS } from './shared'

export const TV_DARK = {
  bg: '#0a1430', ink: '#ffffff', panel: '#101d42', head: '#14244f', line: '#1c2a55',
  video: '#050b1f', ink2: '#9aa6cc', ink3: '#e4e9f7', ink4: '#6c7aa8', track: '#1f3062', clock: '#f5b915',
  ongoing: '#3ddc97', soon: '#f5b915', upcoming: '#8fa8ff', muted: '#8590ad',
  blockBg: '#1a2a5c', blockFg: '#ffffff', ongoingRow: 'rgba(61,220,151,.08)', dotIdle: '#33447a', tint: '12',
}
export const TV_LIGHT = {
  bg: '#f5f4ef', ink: '#0e1a3a', panel: '#ffffff', head: '#eeece5', line: '#e5e3db',
  video: '#e9e7df', ink2: '#4a5470', ink3: '#2a3556', ink4: '#7a8299', track: '#e5e3db', clock: '#1e3a8a',
  ongoing: '#0b7a4b', soon: '#a86b00', upcoming: '#1e3a8a', muted: '#7a8299',
  blockBg: '#eeece5', blockFg: '#0e1a3a', ongoingRow: 'rgba(11,122,75,.07)', dotIdle: '#d9d6cc', tint: '0f',
}

export const TV_STATUS_LABEL = { ongoing: 'Berlangsung', upcoming_soon: 'Segera', upcoming: 'Mendatang' }
export const tvStatusColor = (st, p) => (st === 'ongoing' ? p.ongoing : st === 'upcoming_soon' ? p.soon : p.upcoming)

// Panggung 1920×1080 yang di-scale & dipusatkan
export function TvStage({ scale, p, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: p.bg, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%', width: 1920, height: 1080,
        transform: `translate(-50%, -50%) scale(${scale.s || 1})`, transformOrigin: 'center',
        background: p.bg, color: p.ink, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: 'var(--font-sans)', WebkitFontSmoothing: 'antialiased',
      }}>
        {children}
      </div>
      <style>{`@keyframes simdirMarquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes tvBlink { 50% { opacity: .25 } }`}</style>
    </div>
  )
}

export function TvClock({ now, p, size = 56, dateSize = 22, short = false }) {
  const hh = now ? String(now.getHours()).padStart(2, '0') : '--'
  const mm = now ? String(now.getMinutes()).padStart(2, '0') : '--'
  const date = now
    ? `${DAYS[now.getDay()]}, ${now.getDate()} ${short ? MONTHS_L[now.getMonth()].slice(0, 3) : MONTHS_L[now.getMonth()]} ${now.getFullYear()}`
    : '—'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: size, lineHeight: 1, letterSpacing: '-.02em', color: p.clock }}>
        {hh}<span style={{ animation: 'tvBlink 1s steps(1) infinite' }}>.</span>{mm}
      </span>
      <span style={{ fontSize: dateSize, color: p.ink2 }}>{date}</span>
    </div>
  )
}

export function TvWeather({ weather, p, iconSize = 50, tempSize = 40, labelSize = 20, height = 76, city = true }) {
  const info = weatherInfo(weather?.code)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '0 32px', height, borderLeft: `1px solid ${p.line}`, borderRight: `1px solid ${p.line}`, flexShrink: 0 }}>
      <span style={{ display: 'flex', color: p.clock }}><WeatherIcon kind={info.kind} size={iconSize} /></span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: tempSize, fontWeight: 500, lineHeight: 1 }}>{weather ? weather.temp : '--'}°C</span>
        <span style={{ fontSize: labelSize, color: p.ink2 }}>{weather ? info.label : 'Memuat…'}{city ? ' · Surabaya' : ''}</span>
      </div>
    </div>
  )
}

export function TvThemeButton({ isDark, onToggle, p, size = 76 }) {
  return (
    <button type="button" onClick={onToggle} aria-label="Ganti tema terang/gelap"
      style={{ width: size, height: size, borderRadius: size * 0.26, border: `2px solid ${p.line}`, background: p.panel, color: p.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
      {isDark
        ? <svg viewBox="0 0 24 24" width={size * 0.45} height={size * 0.45} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        : <svg viewBox="0 0 24 24" width={size * 0.45} height={size * 0.45} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}
    </button>
  )
}

export function TvOffline() {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: 'rgba(229,72,77,.18)', color: '#ff8a80', fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, letterSpacing: '.08em', flexShrink: 0 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#e5484d' }} />OFFLINE
    </span>
  )
}

export function TvProgress({ pct, p, height = 6 }) {
  return (
    <div style={{ flex: 1, height, borderRadius: height / 2, background: p.track, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: '#f5b915', borderRadius: height / 2, transition: 'width 1s linear' }} />
    </div>
  )
}

// QR masukan pengunjung (kritik-saran & penilaian)
export function TvQrRow({ p, qrSize = 96, padding = '18px 28px' }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://managementusc.vercel.app'
  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 24, padding, borderTop: `1px solid ${p.line}` }}>
      {[
        { path: '/kritik-saran', label: 'Kritik & Saran' },
        { path: '/penilaian', label: 'Nilai Fasilitas' },
      ].map(q => (
        <div key={q.path} style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(origin + q.path)}`} alt={`QR ${q.label}`}
            style={{ width: qrSize, height: qrSize, borderRadius: 12, background: '#fff', padding: 6, flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{q.label}</span>
            <span style={{ fontSize: 17, color: p.ink2 }}>Pindai dengan kamera HP</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// Ticker INFO di kaki layar
export function TvTicker({ text }) {
  return (
    <footer style={{ height: 76, flexShrink: 0, display: 'flex', alignItems: 'center', background: '#f5b915', color: '#0a1430', overflow: 'hidden' }}>
      <span style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '0 32px', background: '#0a1430', color: '#f5b915', fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, letterSpacing: '.1em', flexShrink: 0, position: 'relative', zIndex: 1 }}>INFO</span>
      <div style={{ flex: 1, overflow: 'hidden', fontSize: 26, fontWeight: 600 }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', width: 'max-content', animation: 'simdirMarquee 45s linear infinite' }}>
          <span style={{ paddingRight: 80, paddingLeft: 32 }}>{text}</span>
          <span style={{ paddingRight: 80, paddingLeft: 32 }}>{text}</span>
        </div>
      </div>
      <span style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '0 24px', background: '#0a1430', color: '#9aa6cc', fontSize: 15, flexShrink: 0, position: 'relative', zIndex: 1 }}>
        Made by <strong style={{ color: '#f5b915', marginLeft: 6 }}>Rahmat Iqbal</strong>
      </span>
    </footer>
  )
}

export function TvLoading({ error }) {
  return (
    <div style={{ height: '100vh', background: '#0a1430', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, fontFamily: 'var(--font-sans)' }}>
      <div style={{ width: 80, height: 80, borderRadius: 20, border: `10px solid ${error ? '#e5484d' : '#f5b915'}` }} />
      <p style={{ color: error ? '#ff8a80' : '#9aa6cc', fontSize: 20, margin: 0 }}>{error || 'Memuat agenda…'}</p>
    </div>
  )
}
