'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import ThemeToggle from '@/app/components/ThemeToggle'
import { formatTime, getAgendaStatus } from './tv/shared'

// Helper functions
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
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

// ============ ICS EXPORT ("Tambah ke Kalender") ============
// WIB = UTC+7 sepanjang tahun (tanpa DST), jadi konversi ke UTC cukup
// dikurangi 7 jam — tidak perlu VTIMEZONE penuh, dan hasilnya tetap
// ditampilkan benar di kalender pengunjung apa pun zona waktunya.
function wibToUtcDate(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh = 0, mm = 0, ss = 0] = (timeStr || '00:00:00').split(':').map(Number)
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss) - 7 * 60 * 60 * 1000)
}

function toIcsUtcStamp(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}T${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`
}

function addDaysToDateStr(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  const p = (n) => String(n).padStart(2, '0')
  return `${dt.getUTCFullYear()}${p(dt.getUTCMonth() + 1)}${p(dt.getUTCDate())}`
}

function escapeIcsText(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function buildIcsContent(item) {
  const hasTime = !!(item.waktu_mulai || item.waktu_selesai)
  let dtStart, dtEnd

  if (hasTime) {
    const start = wibToUtcDate(item.tanggal_mulai, item.waktu_mulai || '00:00:00')
    const end = wibToUtcDate(item.tanggal_selesai || item.tanggal_mulai, item.waktu_selesai || item.waktu_mulai || '23:59:00')
    dtStart = `DTSTART:${toIcsUtcStamp(start)}`
    dtEnd = `DTEND:${toIcsUtcStamp(end)}`
  } else {
    // Event tanpa jam spesifik -> all-day. DTEND all-day bersifat exclusive
    // di iCalendar, jadi harus +1 hari dari tanggal selesai sebenarnya.
    dtStart = `DTSTART;VALUE=DATE:${item.tanggal_mulai.replace(/-/g, '')}`
    dtEnd = `DTEND;VALUE=DATE:${addDaysToDateStr(item.tanggal_selesai || item.tanggal_mulai, 1)}`
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SIMDIR//Agenda Direktorat//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:simdir-agenda-${item.id}@usc.ac.id`,
    `DTSTAMP:${toIcsUtcStamp(new Date())}`,
    dtStart,
    dtEnd,
    `SUMMARY:${escapeIcsText(item.judul)}`,
    item.lokasi ? `LOCATION:${escapeIcsText(item.lokasi)}` : null,
    item.deskripsi ? `DESCRIPTION:${escapeIcsText(item.deskripsi)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  return lines.join('\r\n')
}

function downloadIcs(item) {
  const blob = new Blob([buildIcsContent(item)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `agenda-${item.id}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Data akan di-fetch dari Supabase

const ITEMS_PER_VIEW = 4
const ROTATE_INTERVAL = 10000 // 10 detik

// ============ KOMPONEN STATUS BADGE ============
function StatusBadge({ tanggalMulai, tanggalSelesai }) {
  const status = getAgendaStatus(tanggalMulai, tanggalSelesai)
  
  const configs = {
    upcoming: { label: 'Akan Datang', bg: 'var(--primary-50)', color: 'var(--primary)', border: 'var(--primary-100)' },
    upcoming_soon: { label: 'Segera', bg: 'var(--warning-50)', color: 'var(--warning)', border: 'var(--warning-100)' },
    ongoing: { label: 'Berlangsung', bg: 'var(--success-50)', color: 'var(--success)', border: '#a7f3d0' },
    completed: { label: 'Selesai', bg: 'var(--surface-3)', color: 'var(--text-3)', border: 'var(--border)' },
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
    internal: { label: 'Internal', bg: 'var(--primary-50)', color: 'var(--primary)', border: 'var(--primary-100)' },
    eksternal: { label: 'Eksternal', bg: 'var(--warning-50)', color: 'var(--warning)', border: 'var(--warning-100)' },
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

// ============ KOMPONEN BADGE "DIHADIRI PIMPINAN" ============
// Terpisah dari JenisBadge — kehadiran pimpinan independen dari jenis.
function PimpinanBadge() {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '0.25rem 0.625rem',
      borderRadius: '9999px',
      fontSize: '0.6875rem',
      fontWeight: 500,
      background: 'var(--danger-50)',
      color: 'var(--danger)',
      border: '1px solid var(--danger-100)'
    }}>
      Dihadiri Pimpinan
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
        background: 'var(--success)',
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
        background: 'var(--surface-3)',
        color: 'var(--text-3)'
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
      background: isUrgent ? 'var(--danger-50)' : '#e0f2fe',
      color: isUrgent ? 'var(--danger)' : '#0284c7',
      border: `1px solid ${isUrgent ? 'var(--danger-100)' : '#bae6fd'}`
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
    upcoming: 'var(--primary)',
    upcoming_soon: 'var(--warning)',
    ongoing: 'var(--success)',
    completed: 'var(--text-3)',
  }
  // Raw hex mirrors of the tokens above — needed because CSS custom properties
  // can't have a hex alpha suffix appended (see `${hex}15` usage below).
  const statusHex = {
    upcoming: '#1e3a8a',
    upcoming_soon: '#b45309',
    ongoing: '#047857',
    completed: '#64748b',
  }

  const color = statusColors[status]
  const hex = statusHex[status]
  const startDate = new Date(item.tanggal_mulai)
  const endDate = new Date(item.tanggal_selesai)
  const isMultiDay = item.tanggal_mulai !== item.tanggal_selesai

  return (
    <div className="agenda-public-card" style={{
      background: 'var(--surface)',
      borderRadius: '16px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header with Date */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {/* Date Box */}
        <div className="card-date-box" style={{
          width: '80px',
          padding: '1rem',
          background: `${hex}15`,
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
          <span className="weekday" style={{ fontSize: '0.625rem', color: 'var(--text-3)' }}>
            {startDate.toLocaleDateString('id-ID', { weekday: 'short' })}
          </span>
        </div>

        {/* Title & Badges */}
        <div className="card-header-content" style={{ flex: 1, padding: '1rem', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <StatusBadge tanggalMulai={item.tanggal_mulai} tanggalSelesai={item.tanggal_selesai} />
            <JenisBadge jenis={item.jenis} />
            {(item.dihadiri_pimpinan || item.jenis === 'pimpinan') && <PimpinanBadge />}
          </div>
          <h3 className="card-title" style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text)',
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
          <div className="info-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formatTime(item.waktu_mulai)} - {formatTime(item.waktu_selesai)} WIB
              </span>
            </div>
          )}

          {/* Link Meeting */}
          {item.link_meeting && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color: 'var(--primary)', flexShrink: 0 }}>
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
                  color: 'var(--primary)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color, flexShrink: 0 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.lokasi}</span>
            </div>
          )}

          {/* Organizer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color, flexShrink: 0 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.penyelenggara}</span>
          </div>

          {/* PIC, Disposisi, atau nama Pimpinan */}
          {(item.dihadiri_pimpinan || item.jenis === 'pimpinan') ? (
            item.disposisi ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--danger)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color: 'var(--danger)', flexShrink: 0 }}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  Disposisi ke: {item.disposisi}
                </span>
              </div>
            ) : (item.nama_pimpinan || item.jenis === 'pimpinan') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--danger)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color: 'var(--danger)', flexShrink: 0 }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                  <path d="M12 2v5" /><path d="M12 8l-3-3" /><path d="M12 8l3-3" />
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  Pimpinan: {item.nama_pimpinan || item.penyelenggara}
                </span>
              </div>
            )
          ) : item.pic && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
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
            borderTop: '1px solid var(--border)',
            fontSize: '0.8125rem',
            color: 'var(--text-3)',
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

        {/* Tambah ke Kalender — unduh .ics, kompatibel dengan Google/Apple/Outlook */}
        <button
          type="button"
          onClick={() => downloadIcs(item)}
          className="agenda-press-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            alignSelf: 'flex-start',
            marginTop: '0.75rem',
            padding: '0.5rem 0.875rem',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-2)',
            cursor: 'pointer'
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.9375rem', height: '0.9375rem', flexShrink: 0 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="12" y1="14" x2="12" y2="18" />
            <line x1="10" y1="16" x2="14" y2="16" />
          </svg>
          Tambah ke Kalender
        </button>
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
          className="agenda-nav-dot"
          aria-label={`Halaman ${i + 1}`}
          aria-current={i === current ? 'true' : undefined}
          style={{
            width: i === current ? '2rem' : '0.75rem',
            height: '0.75rem',
            borderRadius: '9999px',
            background: i === current ? 'var(--primary)' : '#cbd5e1',
            border: 'none',
            cursor: 'pointer',
            transition: 'width 250ms cubic-bezier(0.23, 1, 0.32, 1), background-color 250ms ease'
          }}
        />
      ))}
    </div>
  )
}

// ============ KOMPONEN PROGRESS BAR ============
function ProgressBar({ progress }) {
  return (
    <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '9999px', overflow: 'hidden' }}>
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, var(--primary), #7c3aed)',
          borderRadius: '9999px',
          transition: 'width 0.1s linear'
        }}
      />
    </div>
  )
}

// ============ HALAMAN UTAMA ============
export default function AgendaPage() {
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

        // Halaman ini publik & tanpa login — hanya agenda yang eksplisit
        // ditandai "Tampilkan di TV Publik" boleh muncul di sini juga
        // (agenda internal punya field disposisi/link_meeting rapat yang
        // tidak boleh terlihat pengunjung anonim). Sama seperti filter yang
        // sudah dipakai /agenda/tv.
        const { data, error: supabaseError } = await supabase
          .from('agenda')
          .select('*')
          .eq('tampil_publik', true)
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
        background: 'var(--surface-2)', 
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
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text)',
          fontWeight: 800,
          fontSize: '1.5rem'
        }}>
          S
        </div>
        <p style={{ color: 'var(--text-3)' }}>Memuat agenda...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'var(--surface-2)', 
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
          background: 'var(--danger-50)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--danger)',
          fontWeight: 800,
          fontSize: '1.5rem'
        }}>
          !
        </div>
        <p style={{ color: 'var(--danger)' }}>{error}</p>
      </div>
    )
  }

  return (
    <div 
      style={{ minHeight: '100vh', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Header */}
      <header className="agenda-public-header" style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
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
            <div className="brand-section" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src={logoUrl} alt={brandName} className="brand-logo" style={{ height: '40px', width: 'auto', maxWidth: '140px', objectFit: 'contain', flexShrink: 0 }} />
              <div className="brand-text">
                <strong style={{ display: 'block', fontSize: '1.0625rem', color: 'var(--text)', lineHeight: 1.25, maxWidth: '260px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {brandName}
                </strong>
              </div>
            </div>

            {/* Title */}
            <div className="title-section" style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.25rem' }}>
                Agenda Kegiatan
              </h1>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-3)' }}>
                Jadwal kegiatan Direktorat Unesa Science Center
              </p>
            </div>

            {/* TV Mode & Login Buttons */}
            <div className="header-buttons" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <ThemeToggle />
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
                  background: 'var(--primary)',
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
              { label: 'Total', value: stats.total, color: 'var(--primary)' },
              { label: 'Berlangsung', value: stats.ongoing, color: 'var(--success)' },
              { label: 'Akan Datang', value: stats.upcoming, color: 'var(--primary)' },
              { label: 'Selesai', value: stats.completed, color: 'var(--text-3)' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="stat-item"
                style={{
                  textAlign: 'center',
                  padding: '0.625rem 1.25rem',
                  background: 'var(--surface-2)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  minWidth: '90px'
                }}
              >
                <div className="stat-value" style={{ fontSize: '1.25rem', fontWeight: 700, color: item.color }}>
                  {item.value}
                </div>
                <div className="stat-label" style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
              className="agenda-press-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                background: showCompleted ? 'var(--surface-3)' : 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '9999px',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: showCompleted ? 'var(--text)' : 'var(--text-3)',
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
                background: 'var(--primary)',
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
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '9999px',
              fontSize: '0.8125rem',
              color: 'var(--text-3)'
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
                  background: 'var(--surface)',
                  padding: '1.5rem',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  {/* Progress Bar */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                      gap: '0.75rem'
                    }}>
                      <button
                        type="button"
                        onClick={() => setIsPaused((v) => !v)}
                        aria-label={isPaused ? 'Lanjutkan putar otomatis' : 'Jeda putar otomatis'}
                        aria-pressed={isPaused}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.25rem 0.625rem',
                          background: 'var(--surface-3)',
                          border: '1px solid var(--border)',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--text-2)',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '0.875rem', height: '0.875rem' }} aria-hidden="true">
                          {isPaused ? (
                            <polygon points="6 3 20 12 6 21 6 3" />
                          ) : (
                            <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>
                          )}
                        </svg>
                        {isPaused ? 'Lanjutkan' : 'Jeda'}
                      </button>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>
                        {isPaused
                          ? 'Putar otomatis dijeda'
                          : `Berganti otomatis dalam ${Math.ceil((100 - progress) / 100 * (ROTATE_INTERVAL / 1000))} detik`}
                      </span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', marginLeft: 'auto' }}>
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
                      className="nav-btn agenda-press-btn"
                      onClick={() => {
                        setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages)
                        setProgress(0)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.25rem',
                        background: 'var(--surface-3)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'var(--text-2)',
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
                      className="nav-btn agenda-press-btn"
                      onClick={() => {
                        setCurrentPage((prev) => (prev + 1) % totalPages)
                        setProgress(0)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.25rem',
                        background: 'var(--primary)',
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
              background: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)'
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '4rem', height: '4rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.5rem' }}>
                Tidak ada agenda
              </h3>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-3)' }}>
                Tidak ada agenda yang akan datang atau sedang berlangsung.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        padding: '1.5rem',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>
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

        @keyframes agendaCardEnter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .agenda-public-card {
          animation: agendaCardEnter 300ms cubic-bezier(0.23, 1, 0.32, 1) backwards;
          transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 200ms ease;
        }
        .agenda-public-grid .agenda-public-card:nth-child(1) { animation-delay: 0ms; }
        .agenda-public-grid .agenda-public-card:nth-child(2) { animation-delay: 50ms; }
        .agenda-public-grid .agenda-public-card:nth-child(3) { animation-delay: 100ms; }
        .agenda-public-grid .agenda-public-card:nth-child(4) { animation-delay: 150ms; }

        @media (hover: hover) and (pointer: fine) {
          .agenda-public-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.12);
          }
        }

        .agenda-press-btn {
          transition: transform 120ms ease-out;
        }
        .agenda-press-btn:active {
          transform: scale(0.97);
        }

        .agenda-nav-dot {
          transition: transform 120ms ease-out, width 250ms cubic-bezier(0.23, 1, 0.32, 1), background-color 250ms ease;
        }
        .agenda-nav-dot:active {
          transform: scale(0.9);
        }
      `}</style>
    </div>
  )
}
