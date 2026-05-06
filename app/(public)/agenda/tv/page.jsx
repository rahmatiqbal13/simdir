'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

// Helper functions
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}

const getAgendaStatus = (mulai, selesai) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const start = new Date(mulai)
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  
  const end = new Date(selesai)
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  
  if (today > endDate) return 'completed'
  if (today >= startDate && today <= endDate) return 'ongoing'
  
  const diffTime = startDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays <= 3) return 'upcoming_soon'
  return 'upcoming'
}

const getCountdown = (tanggalMulai) => {
  const now = new Date()
  const start = new Date(tanggalMulai)
  const diffTime = start - now
  
  if (diffTime <= 0) return null
  
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60))
  
  if (diffDays > 0) {
    return { value: diffDays, unit: 'hari', label: `${diffDays} hari lagi` }
  } else if (diffHours > 0) {
    return { value: diffHours, unit: 'jam', label: `${diffHours} jam lagi` }
  } else {
    return { value: diffMinutes, unit: 'menit', label: `${diffMinutes} menit lagi` }
  }
}

// TV-optimized constants
const ROTATE_INTERVAL = 15000 // 15 detik untuk TV

// ============ KOMPONEN STATUS BADGE TV ============
function StatusBadge({ tanggalMulai, tanggalSelesai }) {
  const status = getAgendaStatus(tanggalMulai, tanggalSelesai)
  
  const configs = {
    upcoming: { label: 'Akan Datang', bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' },
    upcoming_soon: { label: 'Segera', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    ongoing: { label: 'Berlangsung', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
    completed: { label: 'Selesai', bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  }
  
  const config = configs[status]
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 1rem',
      borderRadius: '9999px',
      fontSize: '1rem',
      fontWeight: 700,
      background: config.bg,
      color: config.color,
      border: `2px solid ${config.border}`
    }}>
      {status === 'ongoing' && (
        <span style={{ 
          width: '10px', 
          height: '10px', 
          borderRadius: '50%', 
          background: config.color,
          animation: 'pulse 2s infinite'
        }} />
      )}
      {config.label}
    </span>
  )
}

// ============ KOMPONEN JENIS BADGE TV ============
function JenisBadge({ jenis }) {
  const configs = {
    internal: { label: 'Internal', bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' },
    eksternal: { label: 'Eksternal', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    pimpinan: { label: 'Pimpinan', bg: '#fce7f3', color: '#be185d', border: '#fbcfe8' },
  }
  
  const config = configs[jenis] || configs.internal
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      padding: '0.375rem 0.875rem',
      borderRadius: '9999px',
      fontSize: '0.875rem',
      fontWeight: 600,
      background: config.bg,
      color: config.color,
      border: `2px solid ${config.border}`
    }}>
      {config.label}
    </span>
  )
}

// ============ KOMPONEN COUNTDOWN BADGE TV ============
function CountdownBadge({ tanggalMulai, tanggalSelesai }) {
  const status = getAgendaStatus(tanggalMulai, tanggalSelesai)
  const countdown = getCountdown(tanggalMulai)
  
  if (status === 'ongoing') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: 700,
        background: '#059669',
        color: 'white'
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: '1.25rem', height: '1.25rem' }}>
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Sedang Berlangsung
      </span>
    )
  }
  
  if (status === 'completed') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: 600,
        background: '#f1f5f9',
        color: '#64748b'
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        Selesai
      </span>
    )
  }
  
  if (!countdown) return null
  
  const isUrgent = countdown.unit === 'jam' || countdown.unit === 'menit'
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 1rem',
      borderRadius: '10px',
      fontSize: '1rem',
      fontWeight: 700,
      background: isUrgent ? '#fee2e2' : '#e0f2fe',
      color: isUrgent ? '#dc2626' : '#0284c7',
      border: `2px solid ${isUrgent ? '#fecaca' : '#bae6fd'}`
    }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {countdown.label}
    </span>
  )
}

// ============ KOMPONEN AGENDA CARD TV ============
function AgendaCard({ item }) {
  const status = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
  
  const statusColors = {
    upcoming: '#4f46e5',
    upcoming_soon: '#d97706',
    ongoing: '#059669',
    completed: '#64748b',
  }
  
  const color = statusColors[status]
  const startDate = new Date(item.tanggal_mulai)
  const isMultiDay = item.tanggal_mulai !== item.tanggal_selesai

  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      border: '3px solid #e2e8f0',
      overflow: 'hidden',
      boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.15)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header with Date */}
      <div style={{ display: 'flex', borderBottom: '3px solid #e2e8f0' }}>
        {/* Date Box */}
        <div style={{
          width: '120px',
          padding: '1.5rem',
          background: `${color}15`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: `4px solid ${color}`,
          flexShrink: 0
        }}>
          <span style={{
            fontSize: '1rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: color
          }}>
            {startDate.toLocaleDateString('id-ID', { month: 'short' })}
          </span>
          <span style={{
            fontSize: '3rem',
            fontWeight: 800,
            color: color,
            lineHeight: 1
          }}>
            {startDate.getDate()}
          </span>
          <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>
            {startDate.toLocaleDateString('id-ID', { weekday: 'short' })}
          </span>
        </div>

        {/* Title & Badges */}
        <div style={{ flex: 1, padding: '1.5rem', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <StatusBadge tanggalMulai={item.tanggal_mulai} tanggalSelesai={item.tanggal_selesai} />
            <JenisBadge jenis={item.jenis} />
          </div>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: 1.3,
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {item.judul}
          </h3>
          {/* Countdown Badge */}
          <div style={{ marginTop: '0.75rem' }}>
            <CountdownBadge tanggalMulai={item.tanggal_mulai} tanggalSelesai={item.tanggal_selesai} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Info Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
          {/* Date Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.125rem', color: '#475569' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.5rem', height: '1.5rem', color, flexShrink: 0 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
              {isMultiDay
                ? `${formatDate(item.tanggal_mulai)} - ${formatDate(item.tanggal_selesai)}`
                : formatDate(item.tanggal_mulai)
              }
            </span>
          </div>

          {/* Time */}
          {(item.waktu_mulai || item.waktu_selesai) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.125rem', color: '#475569' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.5rem', height: '1.5rem', color, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {item.waktu_mulai || '--:--'} - {item.waktu_selesai || '--:--'} WIB
              </span>
            </div>
          )}

          {/* Location */}
          {item.lokasi && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.125rem', color: '#475569' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.5rem', height: '1.5rem', color, flexShrink: 0 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{item.lokasi}</span>
            </div>
          )}

          {/* Organizer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.125rem', color: '#475569' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.5rem', height: '1.5rem', color, flexShrink: 0 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{item.penyelenggara}</span>
          </div>

          {/* PIC atau Disposisi */}
          {item.jenis === 'pimpinan' && item.disposisi ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.125rem', color: '#be185d' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.5rem', height: '1.5rem', color: '#be185d', flexShrink: 0 }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <polyline points="17 11 19 13 23 9" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                Disposisi ke: {item.disposisi}
              </span>
            </div>
          ) : item.pic && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.125rem', color: '#475569' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.5rem', height: '1.5rem', color, flexShrink: 0 }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                PIC: {item.pic.startsWith('Manual: ') ? item.pic.replace('Manual: ', '') : item.pic}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {item.deskripsi && (
          <p style={{
            marginTop: 'auto',
            paddingTop: '1rem',
            borderTop: '2px solid #e2e8f0',
            fontSize: '1rem',
            color: '#64748b',
            lineHeight: 1.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical'
          }}>
            {item.deskripsi}
          </p>
        )}
      </div>
    </div>
  )
}

// ============ KOMPONEN NAVIGASI DOTS TV ============
function NavigationDots({ total, current, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          style={{
            width: i === current ? '3rem' : '1.25rem',
            height: '1.25rem',
            borderRadius: '9999px',
            background: i === current ? '#4f46e5' : '#cbd5e1',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        />
      ))}
    </div>
  )
}

// ============ KOMPONEN PROGRESS BAR TV ============
function ProgressBar({ progress }) {
  return (
    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
          borderRadius: '9999px',
          transition: 'width 0.1s linear'
        }}
      />
    </div>
  )
}

// ============ KOMPONEN RUNNING TEXT ============
function RunningText({ agenda }) {
  const ongoing = agenda.filter(item => {
    const status = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
    return status === 'ongoing'
  })
  
  const upcoming = agenda.filter(item => {
    const status = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
    return status === 'upcoming' || status === 'upcoming_soon'
  })
  
  const getText = () => {
    let texts = []
    
    if (ongoing.length > 0) {
      texts.push(`📢 SEDANG BERLANGSUNG: ${ongoing.map(a => a.judul).join(' | ')}`)
    }
    
    if (upcoming.length > 0) {
      texts.push(`📅 AKAN DATANG: ${upcoming.slice(0, 3).map(a => `${a.judul} (${formatDate(a.tanggal_mulai)})`).join(' | ')}`)
    }
    
    return texts.length > 0 ? texts.join('    •    ') : '📢 Tidak ada agenda aktif saat ini'
  }
  
  return (
    <div style={{
      background: '#0f172a',
      color: 'white',
      padding: '1rem 0',
      overflow: 'hidden',
      whiteSpace: 'nowrap'
    }}>
      <div style={{
        display: 'inline-block',
        animation: 'marquee 30s linear infinite',
        fontSize: '1.25rem',
        fontWeight: 500
      }}>
        {getText()}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{getText()}
      </div>
    </div>
  )
}

// ============ HALAMAN UTAMA TV ============
export default function AgendaTVPage() {
  const [agenda, setAgenda] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [itemsPerView, setItemsPerView] = useState(4)

  // Detect TV screen size
  useEffect(() => {
    const detectScreen = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // TV usually has wider aspect ratio (16:9 or wider)
      // Adjust items per view based on screen size
      if (width >= 1920 && height >= 1080) {
        setItemsPerView(6) // 3x2 grid for large TVs
      } else if (width >= 1280 && height >= 720) {
        setItemsPerView(4) // 2x2 grid for standard TVs
      } else {
        setItemsPerView(4)
      }
    }
    
    detectScreen()
    window.addEventListener('resize', detectScreen)
    return () => window.removeEventListener('resize', detectScreen)
  }, [])

  // Fetch agenda from Supabase
  useEffect(() => {
    const loadAgenda = async () => {
      try {
        setLoading(true)
        if (!supabase) {
          setError('Supabase belum dikonfigurasi')
          setLoading(false)
          return
        }

        const { data, error: supabaseError } = await supabase
          .from('agenda')
          .select('*')
          .order('tanggal_mulai', { ascending: true })

        if (supabaseError) {
          console.error('Error loading agenda:', supabaseError)
          setError('Gagal memuat agenda')
        } else {
          setAgenda(data || [])
          setError(null)
        }
      } catch (err) {
        console.error('Error:', err)
        setError('Terjadi kesalahan')
      } finally {
        setLoading(false)
      }
    }

    loadAgenda()
  }, [])

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Filter agenda - show upcoming, ongoing, and recent completed
  const filteredAgenda = useMemo(() => {
    return agenda.filter(item => {
      const status = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
      return status === 'upcoming' || status === 'upcoming_soon' || status === 'ongoing'
    }).sort((a, b) => new Date(a.tanggal_mulai) - new Date(b.tanggal_mulai))
  }, [agenda])

  // Calculate pages
  const totalPages = Math.ceil(filteredAgenda.length / itemsPerView) || 1
  const currentAgenda = useMemo(() => {
    const start = currentPage * itemsPerView
    return filteredAgenda.slice(start, start + itemsPerView)
  }, [filteredAgenda, currentPage, itemsPerView])

  // Stats
  const stats = useMemo(() => {
    return {
      total: agenda.length,
      upcoming: agenda.filter(item => {
        const status = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
        return status === 'upcoming' || status === 'upcoming_soon'
      }).length,
      ongoing: agenda.filter(item => {
        const status = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
        return status === 'ongoing'
      }).length,
      completed: agenda.filter(item => {
        const status = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
        return status === 'completed'
      }).length,
    }
  }, [agenda])

  // Ref untuk tracking currentPage dalam interval
  const currentPageRef = useRef(currentPage)
  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  // Auto-rotate
  useEffect(() => {
    if (isPaused || totalPages <= 1) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          const nextPage = (currentPageRef.current + 1) % totalPages
          setCurrentPage(nextPage)
          return 0
        }
        return prev + (100 / (ROTATE_INTERVAL / 100))
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPaused, totalPages])

  // Reset progress when page changes
  useEffect(() => {
    setProgress(0)
  }, [currentPage])

  // Calculate grid columns based on items per view
  const getGridColumns = () => {
    if (itemsPerView === 6) return 'repeat(3, 1fr)'
    return 'repeat(2, 1fr)'
  }

  const getGridRows = () => {
    if (itemsPerView === 6) return 'repeat(2, 1fr)'
    return 'repeat(2, 1fr)'
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#f8fafc', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          borderRadius: '20px', 
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          display: 'grid',
          placeItems: 'center',
          color: '#0f172a',
          fontWeight: 800,
          fontSize: '2.5rem'
        }}>
          S
        </div>
        <p style={{ color: '#64748b', fontSize: '1.5rem' }}>Memuat agenda...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#f8fafc', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          borderRadius: '20px', 
          background: '#fee2e2',
          display: 'grid',
          placeItems: 'center',
          color: '#dc2626',
          fontWeight: 800,
          fontSize: '2.5rem'
        }}>
          !
        </div>
        <p style={{ color: '#dc2626', fontSize: '1.5rem' }}>{error}</p>
      </div>
    )
  }

  return (
    <div 
      style={{ 
        height: '100vh', 
        background: '#f8fafc', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header - Compact for TV */}
      <header style={{
        background: 'white',
        borderBottom: '3px solid #e2e8f0',
        padding: '1rem 2rem',
        flexShrink: 0
      }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'grid',
              placeItems: 'center',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: '1.75rem'
            }}>
              S
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '1.5rem', color: '#0f172a' }}>
                SIMDIR
              </strong>
              <span style={{ fontSize: '1rem', color: '#64748b' }}>
                Unesa Science Center
              </span>
            </div>
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
              Agenda Kegiatan
            </h1>
            <p style={{ fontSize: '1.125rem', color: '#64748b' }}>
              {new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            {[
              { label: 'Berlangsung', value: stats.ongoing, color: '#059669' },
              { label: 'Akan Datang', value: stats.upcoming, color: '#4f46e5' },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  textAlign: 'center',
                  padding: '0.75rem 1.5rem',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  minWidth: '120px'
                }}
              >
                <div style={{ fontSize: '2rem', fontWeight: 700, color: item.color }}>
                  {item.value}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content - Fill remaining space */}
      <main style={{ 
        flex: 1, 
        padding: '1.5rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Agenda Grid - Fill available space */}
        {filteredAgenda.length > 0 ? (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: getGridColumns(),
              gridTemplateRows: getGridRows(),
              gap: '1.5rem',
              flex: 1,
              minHeight: 0
            }}>
              {currentAgenda.map((item) => (
                <AgendaCard key={item.id} item={item} />
              ))}
            </div>

            {/* Navigation - Compact */}
            {totalPages > 1 && (
              <div style={{
                background: 'white',
                padding: '1rem 2rem',
                borderRadius: '16px',
                border: '3px solid #e2e8f0',
                marginTop: '1rem',
                flexShrink: 0
              }}>
                {/* Progress Bar */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>
                      Halaman {currentPage + 1} dari {totalPages}
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#4f46e5' }}>
                      {Math.round(progress)}% - Ganti dalam {Math.ceil((100 - progress) / 100 * (ROTATE_INTERVAL / 1000))} detik
                    </span>
                  </div>
                  <ProgressBar progress={progress} />
                </div>

                {/* Navigation Dots */}
                <NavigationDots
                  total={totalPages}
                  current={currentPage}
                  onSelect={(page) => {
                    setCurrentPage(page)
                    setProgress(0)
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            background: 'white',
            borderRadius: '20px',
            border: '3px solid #e2e8f0'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '6rem', height: '6rem', color: '#cbd5e1', marginBottom: '1.5rem' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <h3 style={{ fontSize: '2rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
              Tidak ada agenda
            </h3>
            <p style={{ fontSize: '1.25rem', color: '#64748b' }}>
              Tidak ada agenda yang akan datang atau sedang berlangsung.
            </p>
          </div>
        )}
      </main>

      {/* Running Text Footer */}
      <RunningText agenda={agenda} />

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
