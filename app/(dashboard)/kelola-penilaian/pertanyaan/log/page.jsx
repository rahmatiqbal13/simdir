'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'

const ACTION_META = {
  create: { label: 'Ditambahkan', color: 'var(--success)', bg: 'var(--success-50)' },
  delete: { label: 'Dihapus', color: 'var(--danger)', bg: 'var(--danger-50)' },
}

export default function PertanyaanLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pertanyaan-kritik-saran/log')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memuat log')
      setLogs(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const fmtDateTime = (d) => d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Log Pertanyaan Penilaian</h1>
          <p className="page-subtitle">Riwayat siapa menambah/menghapus pertanyaan penilaian fasilitas — hanya terlihat oleh Super Admin.</p>
        </div>
        <div className="page-actions">
          <Link href="/kelola-penilaian/pertanyaan" className="btn btn-ghost">Kembali</Link>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }} />
        </div>
      ) : error ? (
        <div className="empty-state">
          <p className="muted">{error}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <p className="muted">Belum ada aktivitas tambah/hapus pertanyaan.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {['Waktu', 'Aksi', 'Fasilitas', 'Pertanyaan', 'Oleh'].map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const meta = ACTION_META[log.action] || { label: log.action, color: 'var(--text-3)', bg: 'var(--surface-3)' }
                  return (
                    <tr key={log.id}>
                      <td className="num muted" style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{fmtDateTime(log.created_at)}</td>
                      <td>
                        <span className="badge" style={{ background: meta.bg, color: meta.color, borderColor: 'transparent' }}>{meta.label}</span>
                      </td>
                      <td>{log.fasilitas_name}</td>
                      <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.pertanyaan_text}</td>
                      <td>
                        {log.actor_username ? (
                          <>
                            {log.actor_username}
                            {log.actor_role && <span className="muted" style={{ fontSize: '0.75rem' }}> ({log.actor_role})</span>}
                          </>
                        ) : (
                          <span className="muted">Tidak diketahui</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
