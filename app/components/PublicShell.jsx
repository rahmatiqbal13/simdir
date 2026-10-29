'use client'

import { useState, useEffect } from 'react'
import ThemeToggle from '@/app/components/ThemeToggle'

// Kerangka halaman form publik (Buku Tamu, Kritik & Saran, Penilaian) —
// Redesign 03 · 3c–3e. Dirancang untuk HP & kiosk: header ringkas, satu
// kolom selebar maks. 560px, tombol utama menempel di bawah (lihat .pub-dock).
export function usePublicBrand() {
  const [brandName, setBrandName] = useState('Direktorat Unesa Science Center')
  const [logoUrl, setLogoUrl] = useState('/images/logo USC.png')
  useEffect(() => {
    fetch('/api/app-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.brand_name) setBrandName(data.brand_name)
        if (data.logo_url) setLogoUrl(data.logo_url)
      })
      .catch(() => {})
  }, [])
  return { brandName, logoUrl }
}

export function PublicHeader({ title, subtitle, logoUrl }) {
  return (
    <header className="pub-header">
      <a href="/agenda" aria-label="Agenda publik" style={{ display: 'flex', flexShrink: 0 }}>
        <img src={logoUrl} alt="" className="pub-header-logo" />
      </a>
      <div className="pub-header-text">
        <span className="pub-header-title">{title}</span>
        <span className="pub-header-sub">{subtitle}</span>
      </div>
      <ThemeToggle style={{ width: 44, height: 44, borderRadius: 12, color: 'var(--text)' }} />
    </header>
  )
}

export default function PublicShell({ title, subtitle, logoUrl, children }) {
  return (
    <div className="pub-page">
      <div className="pub-col">
        <PublicHeader title={title} subtitle={subtitle} logoUrl={logoUrl} />
        {children}
      </div>
    </div>
  )
}

export const todayEyebrow = () => {
  const d = new Date()
  const DOW = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  return `${DOW[d.getDay()]} · ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`
}
