'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAgenda } from '@/context/AgendaContext'

// Data constants
const UNIT_KERJA_LIST = [
  { value: 'USC', label: 'USC' },
  { value: 'PUI Keolahragaan', label: 'PUI Keolahragaan' },
  { value: 'PUI Disabilitas', label: 'PUI Disabilitas' },
  { value: 'PUI Seni Budaya', label: 'PUI Seni Budaya' },
  { value: 'Kolam Renang', label: 'Kolam Renang' },
  { value: 'Driving Golf', label: 'Driving Golf' },
  { value: 'ULABK', label: 'ULABK' },
  { value: 'SSFC', label: 'SSFC' },
  { value: 'PUIPT Seni Budaya Majapahitan', label: 'PUIPT Seni Budaya Majapahitan' },
  { value: 'PUIPT DIC', label: 'PUIPT DIC' },
  { value: 'PUIPT SERC', label: 'PUIPT SERC' },
  { value: 'Unesa', label: 'Unesa' },
  { value: 'lainnya', label: 'Lainnya (Input Manual)' }
]

const PIC_LIST = [
  { value: 'Dr. Mochamad Purnomo, S.Pd., M.Kes.', label: 'Dr. Mochamad Purnomo, S.Pd., M.Kes.' },
  { value: 'Dr. Donny Ardy Kusuma, S.Pd., M.Kes.', label: 'Dr. Donny Ardy Kusuma, S.Pd., M.Kes.' },
  { value: 'Aulia Putri Srie Wardani, S.Gz., M.Sc.', label: 'Aulia Putri Srie Wardani, S.Gz., M.Sc.' },
  { value: 'Muhammad Dzul Fikri, S.Or., M.Pd.', label: 'Muhammad Dzul Fikri, S.Or., M.Pd.' },
  { value: 'Moh. Fathur Rohman, S.Pd., M.Pd.', label: 'Moh. Fathur Rohman, S.Pd., M.Pd.' },
  { value: 'Bhekti Lestari, S.Pd., M.Kes.', label: 'Bhekti Lestari, S.Pd., M.Kes.' },
  { value: 'Afif Rusdiawan, S.Pd., M.Kes.', label: 'Afif Rusdiawan, S.Pd., M.Kes.' },
  { value: 'Prof. Dr. Budiyanto, M.Pd.', label: 'Prof. Dr. Budiyanto, M.Pd.' },
  { value: 'Acep Ovel Novari Beny, M.Pd.', label: 'Acep Ovel Novari Beny, M.Pd.' },
  { value: 'Khofidotur Rofiah, S.Pd., M.Pd.', label: 'Khofidotur Rofiah, S.Pd., M.Pd.' },
  { value: 'Dr. Trisakti, M.Si.', label: 'Dr. Trisakti, M.Si.' },
  { value: 'Muhamad Ro\'is Abidin, S.Pd., M.Pd.', label: 'Muhamad Ro\'is Abidin, S.Pd., M.Pd.' },
  { value: 'Raden Roro Maha Kalyana Mitta Anggoro, S.Pd., M.Pd.', label: 'Raden Roro Maha Kalyana Mitta Anggoro, S.Pd., M.Pd.' },
  { value: 'Rahmat Iqbal Rizaldi Pratama, S.Kom.', label: 'Rahmat Iqbal Rizaldi Pratama, S.Kom.' },
  { value: 'Richard Jannuar Ade Irawan W, S.Ak.', label: 'Richard Jannuar Ade Irawan W, S.Ak.' },
  { value: 'Ayub Baharuddin, S.Pd.', label: 'Ayub Baharuddin, S.Pd.' },
  { value: 'Alfina Diva Pratiwi', label: 'Alfina Diva Pratiwi' },
  { value: 'Fajar', label: 'Fajar' },
  { value: 'Heri Purnomo', label: 'Heri Purnomo' },
  { value: 'Ananta Wirajaya', label: 'Ananta Wirajaya' },
  { value: 'Said Ahmadi', label: 'Said Ahmadi' },
  { value: 'Purnomo', label: 'Purnomo' },
  { value: 'Sayyid', label: 'Sayyid' },
  { value: 'Ceko', label: 'Ceko' },
  { value: 'Raya', label: 'Raya' },
  { value: 'Melly', label: 'Melly' },
  { value: 'Majid', label: 'Majid' },
  { value: 'Adi', label: 'Adi' },
  { value: 'Yusuf', label: 'Yusuf' },
  { value: 'lainnya', label: 'Lainnya (Input Manual)' }
]

const PIMPINAN_LIST = [
  { value: 'Rektor Unesa', label: 'Rektor Unesa' },
  { value: 'Wakil Rektor I', label: 'Wakil Rektor I' },
  { value: 'Wakil Rektor II', label: 'Wakil Rektor II' },
  { value: 'Wakil Rektor III', label: 'Wakil Rektor III' },
  { value: 'Direktur USC', label: 'Direktur USC' },
  { value: 'Gubernur Jawa Timur', label: 'Gubernur Jawa Timur' },
  { value: 'Walikota Surabaya', label: 'Walikota Surabaya' },
  { value: 'Kepala Dinas', label: 'Kepala Dinas' },
  { value: 'lainnya', label: 'Lainnya (Input Manual)' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status', color: 'var(--text)' },
  { value: 'upcoming', label: 'Akan Datang', color: 'var(--primary)' },
  { value: 'ongoing', label: 'Berlangsung', color: 'var(--success)' },
  { value: 'completed', label: 'Selesai', color: 'var(--text-3)' },
]

const JENIS_OPTIONS = [
  { value: 'all', label: 'Semua Jenis' },
  { value: 'internal', label: 'Internal', color: 'var(--primary)' },
  { value: 'eksternal', label: 'Eksternal', color: 'var(--warning)' },
  { value: 'pimpinan', label: 'Pimpinan', color: 'var(--danger)' },
]

const ITEMS_PER_PAGE = 6

// Helper functions
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  })
}

const formatDateFull = (date) => {
  return new Date(date).toLocaleDateString('id-ID', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// Get agenda status
const getAgendaStatus = (mulai, selesai) => {
  const now = new Date()
  const start = new Date(mulai)
  const end = new Date(selesai)
  
  if (now > end) return 'completed'
  if (now >= start && now <= end) return 'ongoing'
  
  const diffTime = start - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays <= 3) return 'upcoming_soon'
  return 'upcoming'
}

// ============ KOMPONEN STAT CARD ============
function StatCard({ label, value, icon, color, trend }) {
  return (
    <div className="card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <div style={{ 
            width: '2.5rem', 
            height: '2.5rem', 
            borderRadius: 'var(--radius)',
            background: `${color}15`,
            color: color,
            display: 'grid',
            placeItems: 'center'
          }}>
            {icon}
          </div>
          {trend && (
            <span style={{ 
              fontSize: '0.6875rem', 
              color: trend > 0 ? 'var(--success)' : 'var(--text-3)',
              fontWeight: 500
            }}>
              {trend > 0 ? '+' : ''}{trend} hari ini
            </span>
          )}
        </div>
        <p className="muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{label}</p>
        <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</p>
      </div>
    </div>
  )
}

// ============ KOMPONEN STATUS BADGE ============
function StatusBadge({ tanggalMulai, tanggalSelesai }) {
  const status = getAgendaStatus(tanggalMulai, tanggalSelesai)
  
  const configs = {
    upcoming: { label: 'Akan Datang', class: 'badge-blue' },
    upcoming_soon: { label: 'Segera', class: 'badge-amber' },
    ongoing: { label: 'Berlangsung', class: 'badge-green' },
    completed: { label: 'Selesai', class: 'badge-slate' },
  }
  
  const config = configs[status]
  
  return (
    <span className={`badge ${config.class}`}>
      {status === 'ongoing' && (
        <span className="badge-dot" style={{ animation: 'pulse 2s infinite' }} />
      )}
      {config.label}
    </span>
  )
}

// ============ KOMPONEN JENIS BADGE ============
function JenisBadge({ jenis }) {
  const configs = {
    internal: { label: 'Internal', bg: 'var(--primary-bg)', color: 'var(--primary)' },
    eksternal: { label: 'Eksternal', bg: 'var(--warning-bg)', color: 'var(--warning)' },
    pimpinan: { label: 'Pimpinan', bg: 'var(--danger-bg)', color: 'var(--danger)' },
  }
  
  const config = configs[jenis] || configs.internal
  
  return (
    <span 
      className="badge" 
      style={{ 
        background: config.bg,
        color: config.color,
        fontSize: '0.625rem'
      }}
    >
      {config.label}
    </span>
  )
}

// ============ KOMPONEN JENIS TOGGLE ============
function JenisToggle({ value, onChange }) {
  const getButtonStyle = (jenisValue, activeColor) => ({
    flex: 1,
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius)',
    border: 'none',
    background: value === jenisValue ? 'var(--surface)' : 'transparent',
    boxShadow: value === jenisValue ? 'var(--shadow-sm)' : 'none',
    color: value === jenisValue ? activeColor : 'var(--text-2)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.375rem'
  })

  return (
    <div style={{ 
      display: 'flex', 
      gap: '0.5rem', 
      padding: '0.25rem', 
      background: 'var(--surface-2)', 
      borderRadius: 'var(--radius)'
    }}>
      <button
        type="button"
        onClick={() => onChange('internal')}
        style={getButtonStyle('internal', 'var(--primary)')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        Internal
      </button>
      <button
        type="button"
        onClick={() => onChange('eksternal')}
        style={getButtonStyle('eksternal', 'var(--warning)')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        Eksternal
      </button>
      <button
        type="button"
        onClick={() => onChange('pimpinan')}
        style={getButtonStyle('pimpinan', 'var(--danger)')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <path d="M12 2v5" />
          <path d="M12 8l-3-3" />
          <path d="M12 8l3-3" />
        </svg>
        Pimpinan
      </button>
    </div>
  )
}

// ============ KOMPONEN AGENDA CARD ============
function AgendaCard({ item, index, canEdit, onEdit, onDelete }) {
  const status = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
  
  const statusColors = {
    upcoming: 'var(--primary)',
    upcoming_soon: 'var(--warning)',
    ongoing: 'var(--success)',
    completed: 'var(--text-3)',
  }
  
  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div className="card-body">
        <div style={{ display: 'flex', gap: '1rem' }}>
          {/* Date Column */}
          <div style={{ 
            textAlign: 'center',
            minWidth: '60px',
            padding: '0.5rem',
            background: `${statusColors[status]}15`,
            borderRadius: 'var(--radius)',
            color: statusColors[status]
          }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase' }}>
              {new Date(item.tanggal_mulai).toLocaleDateString('id-ID', { month: 'short' })}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {new Date(item.tanggal_mulai).getDate()}
            </div>
            <div style={{ fontSize: '0.625rem' }}>
              {new Date(item.tanggal_mulai).toLocaleDateString('id-ID', { weekday: 'short' })}
            </div>
          </div>
          
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <StatusBadge tanggalMulai={item.tanggal_mulai} tanggalSelesai={item.tanggal_selesai} />
                <JenisBadge jenis={item.jenis} />
              </div>
              {canEdit && (
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    className="ghost icon-only" 
                    onClick={() => onEdit(item)}
                    title="Edit"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button 
                    className="ghost icon-only" 
                    onClick={() => onDelete(item.id)}
                    title="Hapus"
                    style={{ color: 'var(--danger)' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{item.judul}</h4>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
              {(item.waktu_mulai || item.waktu_selesai) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {item.waktu_mulai || '--:--'} - {item.waktu_selesai || '--:--'} WIB
                </span>
              )}
              {item.lokasi && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {item.lokasi}
                </span>
              )}
              {item.link_meeting && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <a href={item.link_meeting} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                    Link Meeting
                  </a>
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {item.penyelenggara}
              </span>
              {item.jenis === 'pimpinan' && item.disposisi ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--danger)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <polyline points="17 11 19 13 23 9" />
                  </svg>
                  Disposisi ke: {item.disposisi}
                </span>
              ) : item.pic && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {item.pic.startsWith('Manual: ') ? item.pic.replace('Manual: ', '') : item.pic}
                </span>
              )}
            </div>
            
            {item.deskripsi && (
              <p className="muted" style={{ fontSize: '0.75rem', marginTop: item.disposisi && item.jenis === 'pimpinan' ? '0.25rem' : '0.5rem' }}>
                {item.deskripsi}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ KOMPONEN AGENDA TABLE ============
function AgendaTable({ items, canEdit, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: '40px' }}>No</th>
            <th>Agenda</th>
            <th style={{ width: '100px' }}>Jenis</th>
            <th style={{ width: '140px' }}>Waktu</th>
            <th>Lokasi</th>
            <th style={{ width: '100px' }}>Status</th>
            {canEdit && <th style={{ width: '80px' }} className="text-center">Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id}>
              <td className="text-center text-muted">{index + 1}</td>
              <td>
                <strong style={{ fontSize: '0.875rem' }}>{item.judul}</strong>
                {item.jenis === 'pimpinan' && item.disposisi && (
                  <p className="muted" style={{ fontSize: '0.6875rem', marginTop: '0.125rem', color: 'var(--danger)' }}>
                    <strong>Disposisi ke:</strong> {item.disposisi}
                  </p>
                )}
                {item.deskripsi && (
                  <p className="muted" style={{ fontSize: '0.6875rem', marginTop: '0.125rem' }}>
                    {item.deskripsi.substring(0, 50)}{item.deskripsi.length > 50 ? '...' : ''}
                  </p>
                )}
              </td>
              <td>
                <JenisBadge jenis={item.jenis} />
              </td>
              <td>
                <div style={{ fontSize: '0.8125rem' }}>{formatDate(item.tanggal_mulai)}</div>
                {item.tanggal_mulai !== item.tanggal_selesai && (
                  <div className="muted" style={{ fontSize: '0.6875rem' }}>
                    s/d {formatDate(item.tanggal_selesai)}
                  </div>
                )}
                {(item.waktu_mulai || item.waktu_selesai) && (
                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--primary)' }}>
                    {item.waktu_mulai || '--:--'} - {item.waktu_selesai || '--:--'}
                  </div>
                )}
              </td>
              <td style={{ fontSize: '0.8125rem' }}>
                {item.lokasi || '-'}
                {item.link_meeting && (
                  <div style={{ marginTop: '0.25rem' }}>
                    <a href={item.link_meeting} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.6875rem', color: 'var(--primary)' }}>
                      Link Meeting
                    </a>
                  </div>
                )}
              </td>
              <td>
                <StatusBadge tanggalMulai={item.tanggal_mulai} tanggalSelesai={item.tanggal_selesai} />
              </td>
              {canEdit && (
                <td className="text-center">
                  <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                    <button 
                      className="ghost icon-only" 
                      onClick={() => onEdit(item)}
                      title="Edit"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button 
                      className="ghost icon-only" 
                      onClick={() => onDelete(item.id)}
                      title="Hapus"
                      style={{ color: 'var(--danger)' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============ KOMPONEN MODAL ============
function AgendaModal({ item, onSave, onClose }) {
  const [jenis, setJenis] = useState(item?.jenis || 'internal')
  const [showManualPic, setShowManualPic] = useState(false)
  const [showManualPimpinan, setShowManualPimpinan] = useState(false)
  const [showManualUnitKerja, setShowManualUnitKerja] = useState(false)
  const [form, setForm] = useState({
    judul: item?.judul || '',
    tanggal_mulai: item?.tanggal_mulai || '',
    tanggal_selesai: item?.tanggal_selesai || '',
    waktu_mulai: item?.waktu_mulai || '',
    waktu_selesai: item?.waktu_selesai || '',
    lokasi: item?.lokasi || '',
    link_meeting: item?.link_meeting || '',
    deskripsi: item?.deskripsi || '',
    unit_kerja: item?.jenis === 'internal' ? (UNIT_KERJA_LIST.some(u => u.value === item?.penyelenggara) ? item?.penyelenggara : 'lainnya') : '',
    unit_kerja_manual: item?.jenis === 'internal' && !UNIT_KERJA_LIST.some(u => u.value === item?.penyelenggara) ? item?.penyelenggara : '',
    penyelenggara_eksternal: item?.jenis === 'eksternal' ? item.penyelenggara.replace('External - ', '') : '',
    pimpinan_select: item?.jenis === 'pimpinan' && PIMPINAN_LIST.some(p => p.value === item.penyelenggara) ? item.penyelenggara : '',
    pimpinan_manual: item?.jenis === 'pimpinan' && !PIMPINAN_LIST.some(p => p.value === item.penyelenggara) ? item.penyelenggara : '',
    disposisi_staff: item?.disposisi || '',
    pic_select: item?.pic && !item?.pic.startsWith('Manual: ') && PIC_LIST.some(p => p.value === item.pic) ? item.pic : '',
    pic_manual: item?.pic?.startsWith('Manual: ') ? item.pic.replace('Manual: ', '') : '',
  })
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!form.judul.trim()) {
      setError('Judul agenda wajib diisi')
      return
    }
    if (!form.tanggal_mulai || !form.tanggal_selesai) {
      setError('Tanggal mulai dan selesai wajib diisi')
      return
    }
    if (new Date(form.tanggal_mulai) > new Date(form.tanggal_selesai)) {
      setError('Tanggal mulai tidak boleh lebih besar dari tanggal selesai')
      return
    }
    if (jenis === 'internal' && form.unit_kerja === 'lainnya' && !form.unit_kerja_manual.trim()) {
      setError('Nama unit kerja manual wajib diisi')
      return
    }

    const picValue = form.pic_select === 'lainnya'
      ? `Manual: ${form.pic_manual}`
      : form.pic_select

    const getPenyelenggara = () => {
      if (jenis === 'internal') {
        return form.unit_kerja === 'lainnya' ? form.unit_kerja_manual : form.unit_kerja
      }
      if (jenis === 'eksternal') return `External - ${form.penyelenggara_eksternal}`
      if (jenis === 'pimpinan') {
        return form.pimpinan_select === 'lainnya' ? form.pimpinan_manual : form.pimpinan_select
      }
      return ''
    }

    const newItem = {
      ...(item?.id && { id: item.id }), // Hanya sertakan ID jika edit
      judul: form.judul,
      tanggal_mulai: form.tanggal_mulai,
      tanggal_selesai: form.tanggal_selesai,
      waktu_mulai: form.waktu_mulai || null,
      waktu_selesai: form.waktu_selesai || null,
      lokasi: form.lokasi,
      link_meeting: form.link_meeting || null,
      jenis,
      penyelenggara: getPenyelenggara(),
      deskripsi: form.deskripsi,
      disposisi: jenis === 'pimpinan' && form.disposisi_staff ? form.disposisi_staff : null,
      pic: jenis === 'pimpinan' ? null : picValue,
    }
    onSave(newItem)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{item?.id ? 'Edit Agenda' : 'Tambah Agenda Baru'}</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="card-form-body">
            {error && (
              <div className="error-msg" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <div className="form-section">
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
                Jenis Kegiatan
              </label>
              <JenisToggle value={jenis} onChange={setJenis} />
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
                Judul Agenda
              </label>
              <input 
                value={form.judul}
                onChange={e => setForm({ ...form, judul: e.target.value })}
                placeholder="Masukkan judul agenda kegiatan"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
                  Tanggal Mulai <span className="muted">*</span>
                </label>
                <input 
                  type="date"
                  value={form.tanggal_mulai}
                  onChange={e => setForm({ ...form, tanggal_mulai: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
                  Tanggal Selesai <span className="muted">*</span>
                </label>
                <input 
                  type="date"
                  value={form.tanggal_selesai}
                  onChange={e => setForm({ ...form, tanggal_selesai: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
                  Jam Mulai <span className="muted" style={{ fontSize: '0.6875rem', fontWeight: 400 }}>(Opsional)</span>
                </label>
                <input 
                  type="time"
                  value={form.waktu_mulai}
                  onChange={e => setForm({ ...form, waktu_mulai: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
                  Jam Selesai <span className="muted" style={{ fontSize: '0.6875rem', fontWeight: 400 }}>(Opsional)</span>
                </label>
                <input 
                  type="time"
                  value={form.waktu_selesai}
                  onChange={e => setForm({ ...form, waktu_selesai: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
                Lokasi Kegiatan
              </label>
              <input 
                value={form.lokasi}
                onChange={e => setForm({ ...form, lokasi: e.target.value })}
                placeholder="Contoh: Ruang Rapat USC, Aula Utama"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
                Link Meeting <span className="muted" style={{ fontSize: '0.6875rem', fontWeight: 400 }}>(Zoom/Google Meet - Opsional)</span>
              </label>
              <input 
                type="url"
                value={form.link_meeting}
                onChange={e => setForm({ ...form, link_meeting: e.target.value })}
                placeholder="https://zoom.us/j/... atau https://meet.google.com/..."
              />
              <p className="muted" style={{ fontSize: '0.6875rem', marginTop: '0.25rem' }}>
                Isi jika kegiatan dilakukan secara online
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
                {jenis === 'internal' ? 'Unit Kerja Penyelenggara' : 
                 jenis === 'pimpinan' ? 'Nama Pimpinan/Instansi' : 'Nama Penyelenggara'}
              </label>
              {jenis === 'internal' ? (
                <>
                  <select 
                    value={form.unit_kerja}
                    onChange={(e) => {
                      setForm({ ...form, unit_kerja: e.target.value })
                      setShowManualUnitKerja(e.target.value === 'lainnya')
                    }}
                    required
                  >
                    <option value="">-- Pilih Unit Kerja --</option>
                    {UNIT_KERJA_LIST.map(unit => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                  {showManualUnitKerja && (
                    <input 
                      style={{ marginTop: '0.5rem' }}
                      value={form.unit_kerja_manual}
                      onChange={e => setForm({ ...form, unit_kerja_manual: e.target.value })}
                      placeholder="Masukkan nama unit kerja"
                      required
                    />
                  )}
                </>
              ) : jenis === 'pimpinan' ? (
                <>
                  <select 
                    value={form.pimpinan_select}
                    onChange={(e) => {
                      setForm({ ...form, pimpinan_select: e.target.value })
                      setShowManualPimpinan(e.target.value === 'lainnya')
                    }}
                    required
                  >
                    <option value="">-- Pilih Pimpinan --</option>
                    {PIMPINAN_LIST.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  {showManualPimpinan && (
                    <input 
                      style={{ marginTop: '0.5rem' }}
                      value={form.pimpinan_manual}
                      onChange={e => setForm({ ...form, pimpinan_manual: e.target.value })}
                      placeholder="Masukkan nama pimpinan"
                      required
                    />
                  )}
                </>
              ) : (
                <input 
                  value={form.penyelenggara_eksternal}
                  onChange={e => setForm({ ...form, penyelenggara_eksternal: e.target.value })}
                  placeholder="Masukkan nama penyelenggara external"
                  required
                />
              )}
            </div>

            {jenis === 'pimpinan' && (
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
                  Disposisi ke Staff (jika pimpinan berhalangan)
                </label>
                <select 
                  value={form.disposisi_staff}
                  onChange={e => setForm({ ...form, disposisi_staff: e.target.value })}
                >
                  <option value="">-- Tidak Ada Disposisi --</option>
                  {PIC_LIST.map(staff => (
                    <option key={staff.value} value={staff.value}>{staff.label}</option>
                  ))}
                </select>
                <p className="muted" style={{ fontSize: '0.6875rem', marginTop: '0.25rem' }}>
                  Pilih staff yang mewakili pimpinan jika berhalangan hadir
                </p>
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
                Deskripsi (Opsional)
              </label>
              <textarea 
                value={form.deskripsi}
                onChange={e => setForm({ ...form, deskripsi: e.target.value })}
                placeholder="Tambahkan deskripsi atau catatan tambahan..."
                rows={3}
              />
            </div>

            {jenis !== 'pimpinan' && (
              <div style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Penanggung Jawab (PIC)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: '0.25rem', display: 'block' }}>
                      Pilih PIC
                    </label>
                    <select
                      value={form.pic_select}
                      onChange={(e) => {
                        setForm({ ...form, pic_select: e.target.value })
                        setShowManualPic(e.target.value === 'lainnya')
                      }}
                    >
                      <option value="">-- Pilih --</option>
                      {PIC_LIST.map(pic => (
                        <option key={pic.value} value={pic.value}>{pic.label}</option>
                      ))}
                    </select>
                  </div>
                  {showManualPic && (
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: '0.25rem', display: 'block' }}>
                        Nama PIC Manual
                      </label>
                      <input 
                        type="text" 
                        value={form.pic_manual}
                        onChange={e => setForm({ ...form, pic_manual: e.target.value })}
                        placeholder="Masukkan nama PIC"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="card-form-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary">
              {item?.id ? 'Perbarui' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============ KOMPONEN PAGINATION ============
function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div className="pagination-container">
      <p className="muted" style={{ fontSize: '0.8125rem', textAlign: 'center' }}>
        Menampilkan <strong>{startItem}</strong> - <strong>{endItem}</strong> dari <strong>{totalItems}</strong> agenda
      </p>

      <div className="flex items-center gap-2">
        <button
          className="btn ghost icon-only"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{ minWidth: '2.5rem', minHeight: '2.5rem' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex items-center gap-1 pagination-numbers">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className="btn icon-only"
              style={{ 
                minWidth: '2.25rem',
                minHeight: '2.25rem',
                background: currentPage === page ? 'var(--primary)' : 'var(--surface)',
                color: currentPage === page ? 'white' : 'var(--text)',
                border: currentPage === page ? 'none' : '1px solid var(--border)'
              }}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          className="btn ghost icon-only"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{ minWidth: '2.5rem', minHeight: '2.5rem' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ============ HALAMAN UTAMA ============
export default function AgendaManagePage() {
  const { agenda, loading: agendaLoading, error: agendaError, addAgenda, updateAgenda, deleteAgenda, refreshAgenda } = useAgenda()
  
  // Local loading state for operations
  const [operationLoading, setOperationLoading] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [jenisFilter, setJenisFilter] = useState('all')
  const [viewMode, setViewMode] = useState('card')
  const [currentPage, setCurrentPage] = useState(1)
  const [userRole, setUserRole] = useState('admin')
  
  useEffect(() => {
    // Get user role from session
    try {
      const sessionData = localStorage.getItem('simdir_session')
      if (sessionData) {
        const decoded = JSON.parse(atob(sessionData))
        if (decoded.role) {
          setUserRole(decoded.role)
        }
      }
    } catch (e) {
      console.error('Error reading user role:', e)
    }
  }, [])
  
  const canEdit = ['super_admin', 'admin'].includes(userRole)

  const now = new Date()

  // Calculate stats
  const stats = useMemo(() => {
    const total = agenda.length
    const upcoming = agenda.filter(item => {
      const status = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
      return status === 'upcoming' || status === 'upcoming_soon'
    }).length
    const ongoing = agenda.filter(item => {
      const status = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
      return status === 'ongoing'
    }).length
    const completed = agenda.filter(item => {
      const status = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
      return status === 'completed'
    }).length
    return { total, upcoming, ongoing, completed }
  }, [agenda])

  // Filter agenda
  const filteredAgenda = useMemo(() => {
    return agenda.filter(item => {
      const matchesSearch = item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.lokasi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.penyelenggara?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pic?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesJenis = jenisFilter === 'all' || item.jenis === jenisFilter
      
      const status = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'upcoming' && (status === 'upcoming' || status === 'upcoming_soon')) ||
        status === statusFilter
      
      return matchesSearch && matchesJenis && matchesStatus
    }).sort((a, b) => new Date(a.tanggal_mulai) - new Date(b.tanggal_mulai))
  }, [agenda, searchQuery, jenisFilter, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredAgenda.length / ITEMS_PER_PAGE)
  const paginatedAgenda = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredAgenda.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredAgenda, currentPage])

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleAddNew = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus agenda ini?')) {
      setOperationLoading(true)
      try {
        await deleteAgenda(id)
        await refreshAgenda()
      } catch (err) {
        alert('Gagal menghapus agenda: ' + err.message)
      } finally {
        setOperationLoading(false)
      }
    }
  }

  const handleSave = async (item) => {
    setOperationLoading(true)
    try {
      if (editingItem) {
        await updateAgenda(editingItem.id, item)
      } else {
        await addAgenda(item)
      }
      await refreshAgenda()
      setShowModal(false)
      setEditingItem(null)
    } catch (err) {
      alert('Gagal menyimpan agenda: ' + err.message)
    } finally {
      setOperationLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setJenisFilter('all')
    setCurrentPage(1)
  }

  const hasFilters = searchQuery || statusFilter !== 'all' || jenisFilter !== 'all'

  if (agendaLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div>Memuat data agenda...</div>
      </div>
    )
  }

  if (agendaError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
        <h3>Error Loading Agenda</h3>
        <p>{agendaError}</p>
        <button onClick={refreshAgenda} className="btn btn-primary mt-4">
          Coba Lagi
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Stats Section */}
      <div className="stats-grid mb-6">
        <StatCard
          label="Total Agenda"
          value={stats.total}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          color="var(--primary)"
        />
        <StatCard
          label="Akan Datang"
          value={stats.upcoming}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          color="var(--primary)"
        />
        <StatCard
          label="Berlangsung"
          value={stats.ongoing}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          color="var(--success)"
        />
        <StatCard
          label="Selesai"
          value={stats.completed}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          }
          color="var(--text-3)"
        />
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div>
          <h2>Daftar Agenda</h2>
          <p className="muted" style={{ fontSize: '0.9375rem', marginTop: '0.25rem' }}>
            Kelola dan pantau jadwal kegiatan USC
          </p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={handleAddNew}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Agenda
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <div className="filter-group filter-search" style={{ maxWidth: '20rem' }}>
              <svg className="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Cari agenda, lokasi, penyelenggara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="filter-input"
              />
              {searchQuery && (
                <button className="filter-clear-btn" onClick={() => setSearchQuery('')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select
                value={jenisFilter}
                onChange={(e) => setJenisFilter(e.target.value)}
              >
                {JENIS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <div className="flex" style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '0.25rem' }}>
                <button
                  onClick={() => setViewMode('card')}
                  className="btn icon-only"
                  style={{ 
                    background: viewMode === 'card' ? 'var(--surface)' : 'transparent',
                    boxShadow: viewMode === 'card' ? 'var(--shadow-sm)' : 'none',
                    color: viewMode === 'card' ? 'var(--primary)' : 'var(--text-2)'
                  }}
                  title="Card View"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className="btn icon-only"
                  style={{ 
                    background: viewMode === 'table' ? 'var(--surface)' : 'transparent',
                    boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none',
                    color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-2)'
                  }}
                  title="Table View"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
              </div>

              {hasFilters && (
                <button className="btn btn-ghost" onClick={clearFilters}>
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Info */}
      <p className="muted" style={{ fontSize: '0.8125rem', marginBottom: '1rem' }}>
        Menampilkan <strong>{filteredAgenda.length}</strong> dari <strong>{agenda.length}</strong> agenda
      </p>

      {/* Content */}
      {filteredAgenda.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem 1rem' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '3rem', height: '3rem', marginBottom: '1rem', opacity: 0.4 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <h3>{hasFilters ? 'Tidak ada agenda yang sesuai' : 'Belum ada agenda'}</h3>
          <p>
            {hasFilters 
              ? 'Coba ubah filter atau kata kunci pencarian Anda' 
              : canEdit 
                ? 'Klik "Tambah Agenda" untuk membuat agenda baru'
                : 'Tidak ada agenda kegiatan yang tersedia'}
          </p>
          {hasFilters && (
            <button className="btn btn-ghost mt-4" onClick={clearFilters}>
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'card' ? (
            <div className="agenda-cards-container">
              {paginatedAgenda.map((item, index) => (
                <AgendaCard
                  key={item.id}
                  item={item}
                  index={(currentPage - 1) * ITEMS_PER_PAGE + index}
                  canEdit={canEdit}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="agenda-table-view-desktop">
              <AgendaTable
                items={paginatedAgenda}
                canEdit={canEdit}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          )}
          
          {/* Mobile fallback for table view - show cards instead */}
          {viewMode === 'table' && (
            <div className="agenda-table-view-mobile">
              {paginatedAgenda.map((item, index) => (
                <AgendaCard
                  key={item.id}
                  item={item}
                  index={(currentPage - 1) * ITEMS_PER_PAGE + index}
                  canEdit={canEdit}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredAgenda.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </>
      )}

      {showModal && (
        <AgendaModal item={editingItem} onSave={handleSave} onClose={() => { setShowModal(false); setEditingItem(null) }} />
      )}
    </div>
  )
}
