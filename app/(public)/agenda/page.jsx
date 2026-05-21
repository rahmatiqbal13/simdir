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
  // Reset waktu ke 00:00:00 untuk perbandingan tanggal saja
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const start = new Date(mulai)
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  
  const end = new Date(selesai)
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  
  // Cek apakah hari ini sudah lewat dari tanggal selesai (hari berikutnya atau lebih)
  if (today > endDate) return 'completed'
  
  // Cek apakah hari ini dalam rentang tanggal mulai sampai selesai
  if (today >= startDate && today <= endDate) return 'ongoing'
  
  // Hitung selisih hari untuk status upcoming
  const diffTime = startDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays <= 3) return 'upcoming_soon'
  return 'upcoming'
}

// Helper function untuk countdown
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

// Data akan di-fetch dari Supabase

const ITEMS_PER_VIEW = 4
const ROTATE_INTERVAL = 10000 // 10 detik

// ============ KOMPONEN STATUS BADGE ============
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
      gap: '0.375rem',
      padding: '0.375rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      background: config.bg,
      color: config.color,
      border: `1px solid ${config.border}`
    }}>
      {status === 'ongoing' && (
        <span style={{ 
          width: '6px', 
          height: '6px', 
          borderRadius: '50%', 
          background: config.color,
          animation: 'pulse 2s infinite'
        }} />
      )}
      {config.label}
    </span>
  )
}

// ============ KOMPONEN JENIS BADGE ============
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
      gap: '0.25rem',
      padding: '0.25rem 0.625rem',
      borderRadius: '9999px',
      fontSize: '0.6875rem',
      fontWeight: 500,
      background: config.bg,
      color: config.color,
      border: `1px solid ${config.border}`
    }}>
      {config.label}
    </span>
  )
}

// ============ KOMPONEN COUNTDOWN BADGE ============
function CountdownBadge({ tanggalMulai, tanggalSelesai }) {
  const status = getAgendaStatus(tanggalMulai, tanggalSelesai)
  const countdown = getCountdown(tanggalMulai)
  
  if (status === 'ongoing') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.375rem 0.75rem',
        borderRadius: '8px',
        fontSize: '0.75rem',
        fontWeight: 700,
        background: '#059669',
        color: 'white'
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '0.875rem', height: '0.875rem' }}>
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
        gap: '0.375rem',
        padding: '0.375rem 0.75rem',
        borderRadius: '8px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: '#f1f5f9',
        color: '#64748b'
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
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
      gap: '0.375rem',
      padding: '0.375rem 0.75rem',
      borderRadius: '8px',
      fontSize: '0.75rem',
      fontWeight: 700,
      background: isUrgent ? '#fee2e2' : '#e0f2fe',
      color: isUrgent ? '#dc2626' : '#0284c7',
      border: `1px solid ${isUrgent ? '#fecaca' : '#bae6fd'}`
    }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {countdown.label}
    </span>
  )
}

// ============ KOMPONEN AGENDA CARD ============
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
  const endDate = new Date(item.tanggal_selesai)
  const isMultiDay = item.tanggal_mulai !== item.tanggal_selesai

  return (
    <div className="agenda-public-card" style={{
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header with Date */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
        {/* Date Box */}
        <div className="card-date-box" style={{
          width: '80px',
          padding: '1rem',
          background: `${color}15`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: `3px solid ${color}`,
          flexShrink: 0
        }}>
          <span className="month" style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: color
          }}>
            {startDate.toLocaleDateString('id-ID', { month: 'short' })}
          </span>
          <span className="day" style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: color,
            lineHeight: 1
          }}>
            {startDate.getDate()}
          </span>
          <span className="weekday" style={{ fontSize: '0.625rem', color: '#64748b' }}>
            {startDate.toLocaleDateString('id-ID', { weekday: 'short' })}
          </span>
        </div>

        {/* Title & Badges */}
        <div className="card-header-content" style={{ flex: 1, padding: '1rem', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <StatusBadge tanggalMulai={item.tanggal_mulai} tanggalSelesai={item.tanggal_selesai} />
            <JenisBadge jenis={item.jenis} />
          </div>
          <h3 className="card-title" style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: 1.4,
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
          <div style={{ marginTop: '0.5rem' }}>
            <CountdownBadge tanggalMulai={item.tanggal_mulai} tanggalSelesai={item.tanggal_selesai} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="card-body" style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Info Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '0.75rem' }}>
          {/* Date Range */}
          <div className="info-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#475569' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color, flexShrink: 0 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isMultiDay
                ? `${formatDate(item.tanggal_mulai)} - ${formatDate(item.tanggal_selesai)}`
                : formatDate(item.tanggal_mulai)
              }
            </span>
          </div>

          {/* Time */}
          {(item.waktu_mulai || item.waktu_selesai) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#475569' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.waktu_mulai || '--:--'} - {item.waktu_selesai || '--:--'} WIB
              </span>
            </div>
          )}

          {/* Link Meeting */}
          {item.link_meeting && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color: '#4f46e5', flexShrink: 0 }}>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <a 
                href={item.link_meeting} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  color: '#4f46e5',
                  fontWeight: 500,
                  textDecoration: 'none'
                }}
              >
                Join Meeting Online
              </a>
            </div>
          )}

          {/* Location */}
          {item.lokasi && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#475569' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color, flexShrink: 0 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.lokasi}</span>
            </div>
          )}

          {/* Organizer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#475569' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color, flexShrink: 0 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.penyelenggara}</span>
          </div>

          {/* PIC atau Disposisi */}
          {item.jenis === 'pimpinan' && item.disposisi ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#be185d' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color: '#be185d', flexShrink: 0 }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <polyline points="17 11 19 13 23 9" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                Disposisi ke: {item.disposisi}
              </span>
            </div>
          ) : item.pic && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#475569' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color, flexShrink: 0 }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                PIC: {item.pic.startsWith('Manual: ') ? item.pic.replace('Manual: ', '') : item.pic}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {item.deskripsi && (
          <p className="description" style={{
            marginTop: 'auto',
            paddingTop: '0.75rem',
            borderTop: '1px solid #e2e8f0',
            fontSize: '0.8125rem',
            color: '#64748b',
            lineHeight: 1.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {item.deskripsi}
          </p>
        )}
      </div>
    </div>
  )
}

// ============ KOMPONEN NAVIGASI DOTS ============
function NavigationDots({ total, current, onSelect }) {
  return (
    <div className="nav-dots" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          style={{
            width: i === current ? '2rem' : '0.75rem',
            height: '0.75rem',
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

// ============ KOMPONEN PROGRESS BAR ============
function ProgressBar({ progress }) {
  return (
    <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
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

// ============ HALAMAN UTAMA ============
export default function AgendaPage() {
  const [agenda, setAgenda] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

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

  // Update current time every minute for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])

  // Filter agenda
  const filteredAgenda = useMemo(() => {
    return agenda.filter(item => {
      const status = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
      if (status === 'upcoming' || status === 'upcoming_soon' || status === 'ongoing') {
        return true
      }
      if (showCompleted && status === 'completed') {
        return true
      }
      return false
    }).sort((a, b) => new Date(a.tanggal_mulai) - new Date(b.tanggal_mulai))
  }, [agenda, showCompleted])

  // Calculate pages
  const totalPages = Math.ceil(filteredAgenda.length / ITEMS_PER_VIEW)
  const currentAgenda = useMemo(() => {
    const start = currentPage * ITEMS_PER_VIEW
    return filteredAgenda.slice(start, start + ITEMS_PER_VIEW)
  }, [filteredAgenda, currentPage])

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

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(0)
    setProgress(0)
  }, [showCompleted])

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#f8fafc', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          borderRadius: '12px', 
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          display: 'grid',
          placeItems: 'center',
          color: '#0f172a',
          fontWeight: 800,
          fontSize: '1.5rem'
        }}>
          S
        </div>
        <p style={{ color: '#64748b' }}>Memuat agenda...</p>
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
        gap: '1rem'
      }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          borderRadius: '12px', 
          background: '#fee2e2',
          display: 'grid',
          placeItems: 'center',
          color: '#dc2626',
          fontWeight: 800,
          fontSize: '1.5rem'
        }}>
          !
        </div>
        <p style={{ color: '#dc2626' }}>{error}</p>
      </div>
    )
  }

  return (
    <div 
      style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header */}
      <header className="agenda-public-header" style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '1.5rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            {/* Brand */}
            <div className="brand-section" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div className="brand-logo" style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'grid',
                placeItems: 'center',
                color: '#0f172a',
                fontWeight: 800,
                fontSize: '1.5rem'
              }}>
                S
              </div>
              <div className="brand-text">
                <strong style={{ display: 'block', fontSize: '1.25rem', color: '#0f172a' }}>
                  SIMDIR
                </strong>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Unesa Science Center
                </span>
              </div>
            </div>

            {/* Title */}
            <div className="title-section" style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                Agenda Kegiatan
              </h1>
              <p style={{ fontSize: '0.9375rem', color: '#64748b' }}>
                Jadwal kegiatan Direktorat Unesa Science Center
              </p>
            </div>

            {/* TV Mode & Login Buttons */}
            <div className="header-buttons" style={{ display: 'flex', gap: '0.75rem' }}>
              <a
                href="/agenda/tv"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  background: '#0f172a',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textDecoration: 'none'
                }}
                title="Tampilan khusus untuk Smart TV / Layar Besar"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
                  <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
                  <polyline points="17 2 12 7 7 2" />
                </svg>
                <span>Mode TV</span>
              </a>
              <a
                href="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  background: '#4f46e5',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textDecoration: 'none'
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
                <span>Masuk</span>
              </a>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="agenda-stats-bar" style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            marginTop: '1.5rem'
          }}>
            {[
              { label: 'Total', value: stats.total, color: '#4f46e5' },
              { label: 'Berlangsung', value: stats.ongoing, color: '#059669' },
              { label: 'Akan Datang', value: stats.upcoming, color: '#4f46e5' },
              { label: 'Selesai', value: stats.completed, color: '#64748b' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="stat-item"
                style={{
                  textAlign: 'center',
                  padding: '0.625rem 1.25rem',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  minWidth: '90px'
                }}
              >
                <div className="stat-value" style={{ fontSize: '1.25rem', fontWeight: 700, color: item.color }}>
                  {item.value}
                </div>
                <div className="stat-label" style={{ fontSize: '0.625rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="agenda-public-main" style={{ flex: 1, padding: '2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Controls */}
          <div className="agenda-controls" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '2rem',
            flexWrap: 'wrap'
          }}>
            {/* Toggle Show Completed */}
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                background: showCompleted ? '#f1f5f9' : 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '9999px',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: showCompleted ? '#0f172a' : '#64748b',
                cursor: 'pointer'
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                {showCompleted ? (
                  <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                ) : (
                  <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
                )}
              </svg>
              {showCompleted ? 'Sembunyikan Selesai' : 'Tampilkan Selesai'}
            </button>

            {/* Page Info */}
            {totalPages > 1 && (
              <div className="control-badge" style={{
                padding: '0.625rem 1.25rem',
                background: '#4f46e5',
                color: 'white',
                borderRadius: '9999px',
                fontSize: '0.8125rem',
                fontWeight: 600
              }}>
                Halaman {currentPage + 1} dari {totalPages}
              </div>
            )}

            {/* Agenda Count */}
            <div className="control-badge" style={{
              padding: '0.625rem 1.25rem',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '9999px',
              fontSize: '0.8125rem',
              color: '#64748b'
            }}>
              {filteredAgenda.length} agenda
            </div>
          </div>

          {/* Agenda Grid - 4 per view (2x2) */}
          {filteredAgenda.length > 0 ? (
            <>
              <div className="agenda-public-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                {currentAgenda.map((item) => (
                  <AgendaCard key={item.id} item={item} />
                ))}
              </div>

              {/* Navigation */}
              {totalPages > 1 && (
                <div className="agenda-navigation" style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  {/* Progress Bar */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem'
                    }}>
                      <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                        Berganti otomatis dalam {Math.ceil((100 - progress) / 100 * (ROTATE_INTERVAL / 1000))} detik
                      </span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4f46e5' }}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <ProgressBar progress={progress} />
                  </div>

                  {/* Navigation Buttons & Dots */}
                  <div className="nav-buttons" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}>
                    <button
                      className="nav-btn"
                      onClick={() => {
                        setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages)
                        setProgress(0)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.25rem',
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                      <span className="nav-btn-text">Sebelumnya</span>
                    </button>

                    <NavigationDots
                      total={totalPages}
                      current={currentPage}
                      onSelect={(page) => {
                        setCurrentPage(page)
                        setProgress(0)
                      }}
                    />

                    <button
                      className="nav-btn"
                      onClick={() => {
                        setCurrentPage((prev) => (prev + 1) % totalPages)
                        setProgress(0)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.25rem',
                        background: '#4f46e5',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <span className="nav-btn-text">Selanjutnya</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #e2e8f0'
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '4rem', height: '4rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                Tidak ada agenda
              </h3>
              <p style={{ fontSize: '0.9375rem', color: '#64748b' }}>
                Tidak ada agenda yang akan datang atau sedang berlangsung.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background: 'white',
        borderTop: '1px solid #e2e8f0',
        padding: '1.5rem',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          &copy; 2025 Direktorat Unesa Science Center. All rights reserved.
        </p>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
          Made by <strong>Rahmat Iqbal</strong>
        </p>
      </footer>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
