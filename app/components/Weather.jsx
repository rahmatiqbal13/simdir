'use client'

import { useState, useEffect } from 'react'

// Cuaca kampus Unesa Lidah Wetan (Surabaya) dari Open-Meteo — tanpa API key.
// Dipakai topbar dashboard, kartu sapaan mobile, dan kedua layar TV.
const URL = 'https://api.open-meteo.com/v1/forecast?latitude=-7.3076&longitude=112.6748&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FJakarta'
const CACHE_KEY = 'simdir_weather'
const CACHE_MS = 15 * 60 * 1000

// Kode WMO → label Indonesia + jenis ikon (sun | cloud | rain)
export function weatherInfo(code) {
  if (code == null) return { label: '—', kind: 'cloud' }
  if (code <= 1) return { label: 'Cerah', kind: 'sun' }
  if (code === 2) return { label: 'Cerah berawan', kind: 'cloud' }
  if (code === 3) return { label: 'Berawan', kind: 'cloud' }
  if (code < 50) return { label: 'Berkabut', kind: 'cloud' }
  if (code < 60) return { label: 'Gerimis', kind: 'rain' }
  if (code < 90) return { label: 'Hujan', kind: 'rain' }
  return { label: 'Badai petir', kind: 'rain' }
}

export function useWeather({ refreshMs = 10 * 60 * 1000 } = {}) {
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    let alive = true
    const load = async (useCache) => {
      if (useCache) {
        try {
          const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null')
          if (c && Date.now() - c.at < CACHE_MS) { setWeather(c.data); return }
        } catch {}
      }
      try {
        const r = await fetch(URL)
        const d = await r.json()
        const c = d.current
        if (!c || !alive) return
        const data = {
          temp: Math.round(c.temperature_2m),
          code: c.weather_code,
          hum: Math.round(c.relative_humidity_2m),
          wind: Math.round(c.wind_speed_10m),
        }
        setWeather(data)
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })) } catch {}
      } catch {}
    }
    load(true)
    const id = setInterval(() => load(false), refreshMs)
    return () => { alive = false; clearInterval(id) }
  }, [refreshMs])

  return weather
}

export function WeatherIcon({ kind = 'cloud', size = 18, strokeWidth = 2 }) {
  const common = { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth, 'aria-hidden': true }
  if (kind === 'sun') {
    return <svg {...common}><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  }
  if (kind === 'rain') {
    return <svg {...common}><path d="M7 15h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.2 8 3.5 3.5 0 0 0 7 15z" /><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3" /></svg>
  }
  return <svg {...common}><path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.2 11 3.5 3.5 0 0 0 7 18z" /></svg>
}

// Chip cuaca untuk topbar: ikon · suhu · label · kota
export function WeatherChip() {
  const w = useWeather()
  if (!w) return null
  const info = weatherInfo(w.code)
  return (
    <div className="weather-chip" title={`Kelembapan ${w.hum}% · Angin ${w.wind} km/j`}>
      <span className="weather-chip-icon"><WeatherIcon kind={info.kind} /></span>
      <span className="weather-chip-temp">{w.temp}°C</span>
      <span className="weather-chip-label">{info.label} · Surabaya</span>
    </div>
  )
}
