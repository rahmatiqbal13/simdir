'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAgendaStatus } from '@/lib/agenda-status'

const STATUS_CONFIG = {
  akan_datang: { class: 'badge-blue', label: 'Akan Datang' },
  akan_datang_segera: { class: 'badge-amber', label: 'Akan Segera' },
  berlangsung: { class: 'badge-green', label: 'Berlangsung' },
  selesai: { class: 'badge-slate', label: 'Selesai' },
}

export function StatusBadge({ tanggalMulai, tanggalSelesai }) {
  const [now, setNow] = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const { status } = useMemo(
    () => getAgendaStatus(tanggalMulai, tanggalSelesai, now || new Date()),
    [tanggalMulai, tanggalSelesai, now]
  )

  const config = STATUS_CONFIG[status]

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <span className="badge badge-blue">
        <span className="badge-dot" />
        Akan Datang
      </span>
    )
  }

  return (
    <span className={`badge ${config.class}`}>
      <span className="badge-dot" />
      {config.label}
    </span>
  )
}
