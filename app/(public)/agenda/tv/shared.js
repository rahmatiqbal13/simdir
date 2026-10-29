// Helper functions, theme data, dan hooks yang dipakai bersama oleh halaman TV
// publik (./page.jsx) dan halaman TV internal (../tv-internal/page.jsx).
// Komponen visual & palet layar TV ada di ./TvKit.jsx.

import { useState, useEffect, useCallback } from 'react'
import { safeLocalStorage } from '@/lib/localStorage'

export const MONTHS   = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
export const MONTHS_L = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
export const DAYS     = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']

export const formatTime = (t) => {
  if (!t) return '--:--'
  const p = String(t).split(':')
  return `${p[0].padStart(2,'0')}:${(p[1]||'00').padStart(2,'0')}`
}

export const getAgendaStatus = (mulai, selesai) => {
  const today = new Date(); today.setHours(0,0,0,0)
  const s = new Date(mulai); s.setHours(0,0,0,0)
  const e = new Date(selesai); e.setHours(0,0,0,0)
  if (today > e) return 'completed'
  if (today >= s) return 'ongoing'
  return Math.ceil((s - today) / 86400000) <= 3 ? 'upcoming_soon' : 'upcoming'
}

// Buang agenda yang sudah lewat (completed) dan urutkan berdasarkan tanggal+jam
// mulai. Dipakai oleh kedua halaman TV supaya urutan/filter tampilan konsisten.
export const sortActiveAgenda = (agenda) =>
  agenda
    .filter(a => getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) !== 'completed')
    .sort((a, b) => new Date(a.tanggal_mulai + 'T' + (a.waktu_mulai || '00:00')) - new Date(b.tanggal_mulai + 'T' + (b.waktu_mulai || '00:00')))

// ============ TEMA ============
export const DARK = {
  bg: '#0a1228', bg2: '#0f1a3a', card: '#142a5e', card2: '#1a3370',
  border: 'rgba(255,255,255,0.08)', accent: '#f5b915', primary: '#4f7df9',
  text: '#ffffff', text2: 'rgba(255,255,255,0.7)', text3: 'rgba(255,255,255,0.5)',
  success: '#10b981',
  stageBg: 'radial-gradient(ellipse 1920px 600px at 20% 0%, rgba(79,125,249,0.18), transparent 60%), radial-gradient(ellipse 800px 600px at 100% 100%, rgba(245,185,21,0.12), transparent 65%), linear-gradient(180deg, #0a1228 0%, #0f1a3a 100%)',
  rowOngoing: 'linear-gradient(90deg, rgba(16,185,129,0.18), rgba(16,185,129,0.04))',
  rowSoon: 'linear-gradient(90deg, rgba(245,185,21,0.12), transparent)',
  theadBg: 'rgba(255,255,255,0.04)',
  featuredBg: 'linear-gradient(135deg, rgba(245,185,21,0.18), rgba(245,185,21,0.04))',
  featuredBorder: 'rgba(245,185,21,0.3)',
  footerBg: 'linear-gradient(90deg, rgba(245,185,21,0.16), rgba(79,125,249,0.16))',
  statusOngoingBg: 'rgba(16,185,129,0.2)', statusOngoingFg: '#34d399',
  statusSoonBg: 'rgba(245,185,21,0.2)', statusSoonFg: '#f5b915',
  statusUpcomingBg: 'rgba(79,125,249,0.2)', statusUpcomingFg: '#4f7df9',
}
export const LIGHT = {
  bg: '#f5f7fb', bg2: '#ffffff', card: '#ffffff', card2: '#f8fafc',
  border: '#e4e7ee', accent: '#c98800', primary: '#1e3a8a',
  text: '#0f172a', text2: '#475569', text3: '#64748b',
  success: '#047857',
  stageBg: 'radial-gradient(ellipse 1920px 600px at 20% 0%, rgba(30,58,138,0.08), transparent 60%), radial-gradient(ellipse 800px 600px at 100% 100%, rgba(245,185,21,0.10), transparent 65%), linear-gradient(180deg, #f5f7fb 0%, #ffffff 100%)',
  rowOngoing: 'linear-gradient(90deg, rgba(4,120,87,0.10), rgba(4,120,87,0.02))',
  rowSoon: 'linear-gradient(90deg, rgba(245,185,21,0.12), transparent)',
  theadBg: '#f8fafc',
  featuredBg: 'linear-gradient(135deg, rgba(245,185,21,0.18), rgba(245,185,21,0.04))',
  featuredBorder: 'rgba(201,136,0,0.35)',
  footerBg: 'linear-gradient(90deg, rgba(245,185,21,0.18), rgba(30,58,138,0.10))',
  statusOngoingBg: 'rgba(4,120,87,0.12)', statusOngoingFg: '#047857',
  statusSoonBg: 'rgba(245,185,21,0.18)', statusSoonFg: '#b45309',
  statusUpcomingBg: 'rgba(30,58,138,0.10)', statusUpcomingFg: '#1e3a8a',
}

// ============ HOOKS ============
export function useStageScale() {
  const [scale, setScale] = useState({ s: 1, width: 1920, height: 1080 })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const update = () => {
      const w = window.innerWidth || 1920
      const h = window.innerHeight || 1080
      const scaleX = w / 1920
      const scaleY = h / 1080
      const s = Math.min(scaleX, scaleY)
      setScale({ s, width: w, height: h })
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return scale
}

export function useTheme() {
  const [isDark, setIsDark] = useState(true)
  useEffect(() => {
    const s = safeLocalStorage.getItem('simdir-tv-theme')
    if (s === 'light') setIsDark(false)
    else if (s === 'dark') setIsDark(true)
  }, [])
  const toggle = useCallback(() => setIsDark(p => {
    const next = !p
    safeLocalStorage.setItem('simdir-tv-theme', next ? 'dark' : 'light')
    return next
  }), [])
  return { isDark, t: isDark ? DARK : LIGHT, toggle }
}

export function useClock() {
  const [now, setNow] = useState(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}
