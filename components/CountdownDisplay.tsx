'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAgendaStatus } from '@/lib/agenda-status'

const pad = (n) => String(n).padStart(2, '0')

function parseDuration(ms) {
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  return { d, h, m, s }
}

function useNow() {
  const [now, setNow] = useState(null)
  
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  
  return now
}

function TimeBlock({ value, label }) {
  return (
    <span className="countdown-segment">
      <span className="countdown-value">{pad(value)}</span>
      <span className="countdown-label-text">{label}</span>
    </span>
  )
}

function CountdownTimer({ remainingMs, showSeconds = false }) {
  const { d, h, m, s } = useMemo(() => parseDuration(remainingMs), [remainingMs])
  return (
    <div className="countdown-timer">
      <TimeBlock value={d} label="hari" />
      <span className="countdown-sep">:</span>
      <TimeBlock value={h} label="jam" />
      <span className="countdown-sep">:</span>
      <TimeBlock value={m} label="mnt" />
      {showSeconds && (
        <>
          <span className="countdown-sep">:</span>
          <TimeBlock value={s} label="dtk" />
        </>
      )}
    </div>
  )
}

function ProgressBar({ progressPct }) {
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${progressPct}%` }} />
    </div>
  )
}

export function CountdownDisplay({
  tanggalMulai,
  tanggalSelesai,
}) {
  const now = useNow()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { status, remainingMs, progressPct } = useMemo(
    () => getAgendaStatus(tanggalMulai, tanggalSelesai, now || new Date()),
    [tanggalMulai, tanggalSelesai, now]
  )

  // Prevent hydration mismatch by rendering a placeholder until mounted
  if (!mounted || !now) {
    return (
      <div className="countdown-box countdown-normal">
        <span className="countdown-label">Menghitung mundur</span>
        <div className="countdown-timer">
          <TimeBlock value={0} label="hari" />
          <span className="countdown-sep">:</span>
          <TimeBlock value={0} label="jam" />
          <span className="countdown-sep">:</span>
          <TimeBlock value={0} label="mnt" />
        </div>
      </div>
    )
  }

  if (status === 'selesai') {
    const daysPassed = Math.floor((now.getTime() - tanggalSelesai.getTime()) / 86_400_000)
    return (
      <div className="countdown-box countdown-done">
        <span className="countdown-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="0.875rem" height="0.875rem">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Berakhir {daysPassed} hari lalu
        </span>
      </div>
    )
  }

  if (status === 'berlangsung') {
    return (
      <div className="countdown-box countdown-active">
        <span className="countdown-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="0.875rem" height="0.875rem">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Sedang berlangsung
        </span>
        <CountdownTimer remainingMs={remainingMs} showSeconds={true} />
        <ProgressBar progressPct={progressPct} />
        <span className="countdown-remaining">tersisa</span>
      </div>
    )
  }

  const isUrgent = status === 'akan_datang_segera'
  const diffDays = Math.ceil(remainingMs / 86_400_000)

  return (
    <div className={`countdown-box ${isUrgent ? 'countdown-urgent' : 'countdown-normal'}`}>
      <span className="countdown-label">
        {isUrgent ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="0.875rem" height="0.875rem">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Segera dimulai — H−{diffDays}
          </>
        ) : (
          'Menghitung mundur'
        )}
      </span>
      <CountdownTimer remainingMs={remainingMs} showSeconds={true} />
    </div>
  )
}
