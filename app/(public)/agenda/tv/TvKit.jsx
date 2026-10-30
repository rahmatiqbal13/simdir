'use client'

// Komponen & palet bersama layar TV (Redesign 02): TV Publik (./page.jsx)
// dan TV Internal (../tv-internal/page.jsx). Keduanya digambar pada
// panggung tetap 1920×1080 lalu di-scale agar pas di layar apa pun, jadi
// semua ukuran di sini dalam piksel desain.

import { WeatherIcon, weatherInfo } from '@/app/components/Weather'
import { MONTHS_L, DAYS } from './shared'

export const TV_DARK = {
  bg: '#0b0f2a', ink: '#ffffff', panel: '#121838', head: '#171e44', line: '#232b57', line2: '#33407a',
  video: '#060920', ink2: '#a9afcf', ink3: '#e4e9f7', ink4: '#6c7aa8', track: '#232b57', clock: '#f7b500', accent: '#f7b500',
  ongoing: '#3ddc97', soon: '#f7b500', upcoming: '#8fa8ff', muted: '#8590ad',
  blockBg: '#1d2560', blockFg: '#ffffff', ongoingRow: 'rgba(61,220,151,.06)', dotIdle: '#33447a', tint: '12',
}
export const TV_LIGHT = {
  bg: '#f6f5f1', ink: '#121735', panel: '#ffffff', head: '#eeede7', line: '#e4e2da', line2: '#cfccc0',
  video: '#e9e7e0', ink2: '#4b5170', ink3: '#2a3556', ink4: '#7a8299', track: '#e4e2da', clock: '#2b3990', accent: '#f7b500',
  ongoing: '#0b7a4b', soon: '#a86b00', upcoming: '#2b3990', muted: '#7a8299',
  blockBg: '#e8eaf7', blockFg: '#2b3990', ongoingRow: 'rgba(13,122,85,.05)', dotIdle: '#d9d6cc', tint: '0f',
}

// Identitas visual per layar (SIMDIR v3): pita header, warna ticker, dan
// palet panel khusus Kolam/SSFC yang menimpa palet dasar.
export const TV_THEME = {
  usc:   { band: '#2b3990', bandInk2: '#d3d8f7', tick: '#f7b500', tickInk: '#121735', tickLabel: '#2b3990' },
  kolam: {
    band: '#0369a1', bandInk2: '#d4ecf9', tick: '#38bdf8', tickInk: '#03192b', tickLabel: '#03192b',
    dark:  { bg: '#03192b', panel: '#072a45', head: '#0a3352', line: '#0f3f63', line2: '#1d5a85', ink2: '#9cc3dc', track: '#0f3f63', video: '#021220', accent: '#38bdf8', ongoing: '#5eead4', ongoingRow: 'rgba(94,234,212,.07)' },
    light: { bg: '#eaf6fb', panel: '#ffffff', head: '#dcecf3', line: '#cfe5ef', line2: '#9cc7dc', ink: '#062a44', ink2: '#3d6680', track: '#cfe5ef', video: '#dcecf3', accent: '#0284c7', ongoing: '#0f766e', ongoingRow: 'rgba(15,118,110,.06)' },
  },
  ssfc: {
    band: '#7c3aed', tick: '#a78bfa', tickInk: '#0d0b14', tickLabel: '#0d0b14',
    dark:  { bg: '#0d0b14', panel: '#17131f', head: '#1f1a2b', line: '#2a2338', line2: '#2a2338', ink2: '#a79fbd', track: '#2a2338', video: '#08060d', accent: '#a78bfa', ongoing: '#f7b500', ongoingRow: 'rgba(247,181,0,.07)' },
    light: { bg: '#f4f2f8', panel: '#ffffff', head: '#ebe7f3', line: '#e2dcec', line2: '#e2dcec', ink: '#1a1328', ink2: '#554b6b', track: '#e2dcec', video: '#e8e4f0', accent: '#7c3aed', ongoing: '#a86b00', ongoingRow: 'rgba(247,181,0,.08)' },
  },
}
export const tvPalette = (layar, isDark) => ({ ...(isDark ? TV_DARK : TV_LIGHT), ...TV_THEME[layar]?.[isDark ? 'dark' : 'light'] })

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
      <div style={{ height: '100%', width: `${pct}%`, background: p.accent, borderRadius: height / 2, transition: 'width 1s linear' }} />
    </div>
  )
}

// Pita header berwarna (v3). `children(hp)` menerima palet versi "di atas pita"
// untuk cuaca/jam/tombol tema. SSFC: blok ungu miring + judul kapital.
export function TvHeader({ layar = 'usc', p, logoUrl, title, sub, badge, height = 124, children }) {
  const t = TV_THEME[layar] || TV_THEME.usc
  if (layar === 'ssfc') {
    const hp = { ...p, clock: '#f7b500' }
    return (
      <header style={{ height, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 28, padding: '0 56px 0 0', background: p.head, borderBottom: `1px solid ${p.line}` }}>
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', gap: 22, padding: '0 100px 0 56px', background: t.band, color: '#fff', clipPath: 'polygon(0 0,100% 0,calc(100% - 52px) 100%,0 100%)' }}>
          <img src={logoUrl} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain', background: '#fff', borderRadius: 22, padding: 6 }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 54, letterSpacing: '-.01em', lineHeight: 1 }}>SSFC</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 28, letterSpacing: '-.01em', lineHeight: 1, textTransform: 'uppercase' }}>{title}</span>
          <span style={{ fontSize: 21, color: p.ink2 }}>{sub}</span>
        </div>
        {children(hp)}
      </header>
    )
  }
  const hp = { ...p, ink: '#fff', ink2: t.bandInk2, line: 'rgba(255,255,255,.22)', panel: 'rgba(255,255,255,.12)', clock: '#f7b500' }
  return (
    <header style={{ height, flexShrink: 0, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 28, padding: '0 56px', background: t.band, color: '#fff' }}>
      {layar === 'kolam' ? <>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(170deg,rgba(255,255,255,.07) 0 2px,transparent 2px 26px)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 10, background: 'repeating-linear-gradient(90deg,#f7b500 0 56px,#fff 56px 76px,#e5484d 76px 96px,#fff 96px 116px)' }} />
      </> : <>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,.09) 1px,transparent 1px)', backgroundSize: '20px 20px' }} />
        <div style={{ position: 'absolute', left: 880, top: -210, width: 400, height: 400, borderRadius: '50%', border: '44px solid #f7b500', borderLeftColor: 'transparent', borderTopColor: 'transparent', transform: 'rotate(20deg)' }} />
      </>}
      <img src={logoUrl} alt="Logo" style={{ position: 'relative', width: 80, height: 80, objectFit: 'contain', background: '#fff', borderRadius: 22, padding: 6 }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 38, letterSpacing: '-.01em', lineHeight: 1 }}>{title}</span>
          {badge && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, letterSpacing: '.1em', padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,.14)' }}>{badge}</span>}
        </div>
        <span style={{ fontSize: 21, color: t.bandInk2 }}>{sub}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 28 }}>{children(hp)}</div>
    </header>
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

// Ticker di kaki layar, warna mengikuti TV_THEME[layar]
export function TvTicker({ text, layar = 'usc', label = 'INFO' }) {
  const t = TV_THEME[layar] || TV_THEME.usc
  return (
    <footer style={{ height: 78, flexShrink: 0, display: 'flex', alignItems: 'center', background: t.tick, color: t.tickInk, overflow: 'hidden' }}>
      <span style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '0 34px', background: t.tickLabel, color: t.tick, fontFamily: 'var(--font-mono)', fontSize: 21, fontWeight: 600, letterSpacing: '.12em', flexShrink: 0, position: 'relative', zIndex: 1 }}>{label}</span>
      <div style={{ flex: 1, overflow: 'hidden', fontSize: 27, fontWeight: 600 }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', width: 'max-content', animation: 'simdirMarquee 45s linear infinite' }}>
          <span style={{ paddingRight: 80, paddingLeft: 32 }}>{text}</span>
          <span style={{ paddingRight: 80, paddingLeft: 32 }}>{text}</span>
        </div>
      </div>
      <span style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '0 24px', background: t.tickLabel, color: 'rgba(255,255,255,.65)', fontSize: 15, flexShrink: 0, position: 'relative', zIndex: 1 }}>
        Made by <strong style={{ color: t.tick, marginLeft: 6 }}>Rahmat Iqbal</strong>
      </span>
    </footer>
  )
}

export function TvLoading({ error }) {
  return (
    <div style={{ height: '100vh', background: '#0b0f2a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, fontFamily: 'var(--font-sans)' }}>
      <div style={{ width: 80, height: 80, borderRadius: 20, border: `10px solid ${error ? '#e5484d' : '#f7b500'}` }} />
      <p style={{ color: error ? '#ff8a80' : '#9aa6cc', fontSize: 20, margin: 0 }}>{error || 'Memuat agenda…'}</p>
    </div>
  )
}
