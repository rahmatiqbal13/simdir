'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'

// ============ SKALA LIKERT ============
// Interval standar skala Likert 5 poin: (5-1)/5 = 0.8 per kategori.
// Label dipakai konsisten dengan label rating individual yang sudah ada
// di seluruh app (lihat RATING_LABELS di app/(public)/penilaian/page.jsx).
const LIKERT_CATEGORIES = [
  { max: 1.8, label: 'Buruk', color: 'var(--danger)', bg: 'var(--danger-50)' },
  { max: 2.6, label: 'Kurang Baik', color: 'var(--warning)', bg: 'var(--warning-50)' },
  { max: 3.4, label: 'Cukup', color: 'var(--warning)', bg: 'var(--warning-50)' },
  { max: 4.2, label: 'Baik', color: 'var(--info)', bg: 'var(--info-50)' },
  { max: Infinity, label: 'Sangat Baik', color: 'var(--success)', bg: 'var(--success-50)' },
]
const getLikertCategory = (avg) => LIKERT_CATEGORIES.find((c) => avg <= c.max) || LIKERT_CATEGORIES[2]

const ASPEK_META = {
  Sarana: { color: '#3b82f6' },
  Prasarana: { color: '#8b5cf6' },
  Pelayanan: { color: 'var(--warning)' },
  Kebersihan: { color: 'var(--success)' },
  Keamanan: { color: 'var(--danger)' },
  Lainnya: { color: 'var(--text-3)' },
}

const JENIS_META = {
  kritik: { label: 'Kritik', color: 'var(--danger)', bg: 'var(--danger-50)' },
  saran: { label: 'Saran', color: 'var(--warning)', bg: 'var(--warning-50)' },
  permohonan_kelas: { label: 'Permohonan Kelas', color: 'var(--info)', bg: 'var(--info-50)' },
  permohonan_kegiatan: { label: 'Permohonan Kegiatan', color: 'var(--success)', bg: 'var(--success-50)' },
}

const authHeaders = () => {
  try {
    const s = localStorage.getItem('simdir_session')
    if (!s) return { 'Content-Type': 'application/json' }
    const d = JSON.parse(atob(s))
    return { 'Content-Type': 'application/json', authorization: `Bearer ${d.token || d.role || 'session'}` }
  } catch { return { 'Content-Type': 'application/json' } }
}

export default function LaporanPage() {
  const [penilaian, setPenilaian] = useState([])
  const [saran, setSaran] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [penilaianRes, saranRes] = await Promise.all([
        fetch('/api/kritik-saran?limit=2000', { headers: authHeaders() }),
        fetch('/api/saran?limit=2000', { headers: authHeaders() }),
      ])
      const penilaianData = await penilaianRes.json()
      const saranData = await saranRes.json()
      if (!penilaianRes.ok) throw new Error(penilaianData.error || 'Gagal memuat data penilaian')
      if (!saranRes.ok) throw new Error(saranData.error || 'Gagal memuat data kritik & saran')
      setPenilaian(penilaianData || [])
      setSaran(saranData || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Filter berdasar rentang tanggal (opsional)
  const inRange = useCallback((dateStr) => {
    if (!dateFrom && !dateTo) return true
    const d = dateStr?.split('T')[0]
    if (!d) return false
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    return true
  }, [dateFrom, dateTo])

  const filteredPenilaian = useMemo(() => penilaian.filter((p) => inRange(p.created_at)), [penilaian, inRange])
  const filteredSaran = useMemo(() => saran.filter((s) => inRange(s.created_at)), [saran, inRange])

  // ============ AGREGASI PENILAIAN (SKALA LIKERT) ============
  const likertStats = useMemo(() => {
    const ratingItems = []
    filteredPenilaian.forEach((p) => {
      p.items?.forEach((it) => {
        if (it.rating >= 1 && it.rating <= 5) ratingItems.push(it)
      })
    })

    const overallAvg = ratingItems.length
      ? ratingItems.reduce((sum, it) => sum + it.rating, 0) / ratingItems.length
      : 0

    const distribusi = [1, 2, 3, 4, 5].map((n) => ({
      skor: n,
      jumlah: ratingItems.filter((it) => it.rating === n).length,
    }))

    const byFasilitas = {}
    ratingItems.forEach((it) => {
      if (!byFasilitas[it.fasilitas]) byFasilitas[it.fasilitas] = []
      byFasilitas[it.fasilitas].push(it.rating)
    })
    const fasilitasStats = Object.entries(byFasilitas).map(([nama, ratings]) => {
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
      return {
        nama,
        jumlah: ratings.length,
        avg,
        kategori: getLikertCategory(avg),
        distribusi: [1, 2, 3, 4, 5].map((n) => ratings.filter((r) => r === n).length),
      }
    }).sort((a, b) => b.jumlah - a.jumlah)

    const byAspek = {}
    ratingItems.forEach((it) => {
      const aspek = it.aspek || 'Lainnya'
      if (!byAspek[aspek]) byAspek[aspek] = []
      byAspek[aspek].push(it.rating)
    })
    const aspekStats = Object.entries(byAspek).map(([nama, ratings]) => ({
      nama,
      jumlah: ratings.length,
      avg: ratings.reduce((a, b) => a + b, 0) / ratings.length,
    })).sort((a, b) => b.jumlah - a.jumlah)

    return {
      totalResponden: filteredPenilaian.length,
      totalItemDinilai: ratingItems.length,
      overallAvg,
      overallKategori: getLikertCategory(overallAvg),
      indeksPersen: ratingItems.length ? (overallAvg / 5) * 100 : 0,
      distribusi,
      fasilitasStats,
      aspekStats,
    }
  }, [filteredPenilaian])

  // ============ AGREGASI KRITIK & SARAN ============
  const saranStats = useMemo(() => {
    const byJenis = {}
    const byStatus = {}
    const byFasilitas = {}
    filteredSaran.forEach((s) => {
      byJenis[s.jenis] = (byJenis[s.jenis] || 0) + 1
      byStatus[s.status] = (byStatus[s.status] || 0) + 1
      if (s.fasilitas) byFasilitas[s.fasilitas] = (byFasilitas[s.fasilitas] || 0) + 1
    })
    const ditanggapi = (byStatus.selesai || 0) + (byStatus.ditanggapi || 0)
    return {
      total: filteredSaran.length,
      byJenis,
      byStatus,
      byFasilitas: Object.entries(byFasilitas).sort((a, b) => b[1] - a[1]),
      persenDitanggapi: filteredSaran.length ? Math.round((ditanggapi / filteredSaran.length) * 100) : 0,
      terbaru: [...filteredSaran].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8),
    }
  }, [filteredSaran])

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
        <h3>Memuat laporan...</h3>
      </div>
    )
  }

  if (error) {
    return (
      <div className="empty-state">
        <h3>Gagal memuat laporan</h3>
        <p className="muted">{error}</p>
        <button className="btn btn-primary" onClick={fetchData} style={{ marginTop: '1rem' }}>Coba Lagi</button>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Laporan</h1>
          <p className="page-subtitle">Analisis skala Likert penilaian pelanggan, serta ringkasan kritik &amp; saran yang masuk.</p>
        </div>
        <div className="page-actions">
          <Link href="/kelola-penilaian" className="btn btn-secondary">Kelola Penilaian</Link>
          <Link href="/kelola-saran" className="btn btn-secondary">Kelola Kritik &amp; Saran</Link>
        </div>
      </div>

      {/* Filter rentang tanggal */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: '0.8125rem', color: 'var(--text-2)', fontWeight: 600 }}>Dari</label>
        <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ maxWidth: 170 }} />
        <label style={{ fontSize: '0.8125rem', color: 'var(--text-2)', fontWeight: 600 }}>Sampai</label>
        <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ maxWidth: 170 }} />
        {(dateFrom || dateTo) && (
          <button className="btn btn-ghost" onClick={() => { setDateFrom(''); setDateTo('') }}>Reset</button>
        )}
      </div>

      {/* ============ RINGKASAN ============ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Total Penilaian Masuk" value={likertStats.totalResponden} color="var(--primary)" />
        <StatCard
          label="Rata-rata Skor Likert"
          value={likertStats.overallAvg.toFixed(2)}
          suffix="/5"
          color={likertStats.overallKategori.color}
          sub={likertStats.overallKategori.label}
        />
        <StatCard label="Indeks Kepuasan" value={likertStats.indeksPersen.toFixed(0)} suffix="%" color="var(--success)" />
        <StatCard label="Total Kritik & Saran" value={saranStats.total} color="var(--warning)" />
        <StatCard label="Sudah Ditanggapi" value={saranStats.persenDitanggapi} suffix="%" color="var(--info)" />
      </div>

      {/* ============ ANALISIS SKALA LIKERT ============ */}
      <SectionTitle>Analisis Skala Likert — Penilaian Pelanggan</SectionTitle>

      {likertStats.totalItemDinilai === 0 ? (
        <div className="empty-state" style={{ marginBottom: '2rem' }}>
          <p className="muted">Belum ada penilaian bintang pada rentang tanggal ini.</p>
        </div>
      ) : (
        <>
          {/* Distribusi skor keseluruhan */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-body">
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.75rem' }}>
                Distribusi Skor Keseluruhan ({likertStats.totalItemDinilai} penilaian)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {likertStats.distribusi.slice().reverse().map(({ skor, jumlah }) => {
                  const pct = likertStats.totalItemDinilai ? (jumlah / likertStats.totalItemDinilai) * 100 : 0
                  return (
                    <div key={skor} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 70, fontSize: '0.8125rem', color: 'var(--text-2)', flexShrink: 0 }}>{skor} Bintang</span>
                      <div style={{ flex: 1, height: 10, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: getLikertCategory(skor).color, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ width: 90, fontSize: '0.8125rem', color: 'var(--text-3)', textAlign: 'right', flexShrink: 0 }}>
                        {jumlah} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Per Fasilitas */}
          <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {['Fasilitas', 'Jumlah Penilaian', 'Rata-rata Skor', 'Kategori', 'Distribusi 1–5'].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {likertStats.fasilitasStats.map((f) => (
                    <tr key={f.nama}>
                      <td style={{ fontWeight: 600 }}>{f.nama}</td>
                      <td className="num">{f.jumlah}</td>
                      <td className="num" style={{ fontWeight: 700 }}>{f.avg.toFixed(2)}</td>
                      <td>
                        <span className="badge" style={{ background: f.kategori.bg, color: f.kategori.color, borderColor: 'transparent' }}>
                          {f.kategori.label}
                        </span>
                      </td>
                      <td style={{ minWidth: 140 }}>
                        <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--surface-3)' }}>
                          {f.distribusi.map((count, i) => {
                            const pct = f.jumlah ? (count / f.jumlah) * 100 : 0
                            if (pct === 0) return null
                            return <div key={i} style={{ width: `${pct}%`, background: getLikertCategory(i + 1).color }} title={`${i + 1} bintang: ${count}`} />
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per Aspek */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {likertStats.aspekStats.map((a) => {
              const kategori = getLikertCategory(a.avg)
              return (
                <div key={a.nama} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: ASPEK_META[a.nama]?.color || 'var(--text-3)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)' }}>{a.nama}</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: kategori.color }}>{a.avg.toFixed(2)}</div>
                  <div className="muted" style={{ fontSize: '0.75rem' }}>{a.jumlah} penilaian · {kategori.label}</div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ============ KRITIK & SARAN ============ */}
      <SectionTitle>Kritik &amp; Saran Pelanggan</SectionTitle>

      {saranStats.total === 0 ? (
        <div className="empty-state" style={{ marginBottom: '2rem' }}>
          <p className="muted">Belum ada kritik &amp; saran pada rentang tanggal ini.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {Object.entries(JENIS_META).map(([key, meta]) => (
              <div key={key} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: meta.color }}>{saranStats.byJenis[key] || 0}</div>
                <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: 4 }}>{meta.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Fasilitas paling banyak dikomentari */}
            <div className="card">
              <div className="card-body">
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.75rem' }}>
                  Fasilitas Paling Banyak Dikomentari
                </div>
                {saranStats.byFasilitas.length === 0 ? (
                  <p className="muted" style={{ fontSize: '0.8125rem' }}>Belum ada data.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {saranStats.byFasilitas.slice(0, 6).map(([nama, jumlah]) => {
                      const max = saranStats.byFasilitas[0][1]
                      return (
                        <div key={nama} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 130, fontSize: '0.8125rem', color: 'var(--text-2)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nama}</span>
                          <div style={{ flex: 1, height: 10, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
                            <div style={{ width: `${(jumlah / max) * 100}%`, height: '100%', background: 'var(--primary)' }} />
                          </div>
                          <span style={{ width: 24, fontSize: '0.8125rem', color: 'var(--text-3)', textAlign: 'right', flexShrink: 0 }}>{jumlah}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="card">
              <div className="card-body">
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.75rem' }}>
                  Status Tindak Lanjut
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(saranStats.byStatus).map(([status, jumlah]) => (
                    <div key={status} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--text-2)', textTransform: 'capitalize' }}>{status}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{jumlah}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Terbaru */}
          <div className="table-wrap" style={{ marginBottom: '2rem' }}>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>{['Tanggal', 'Jenis', 'Fasilitas', 'Judul/Kegiatan', 'Status'].map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {saranStats.terbaru.map((s) => {
                    const meta = JENIS_META[s.jenis] || JENIS_META.saran
                    return (
                      <tr key={s.id}>
                        <td className="num muted" style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{formatDate(s.created_at)}</td>
                        <td>
                          <span className="badge" style={{ background: meta.bg, color: meta.color, borderColor: 'transparent' }}>{meta.label}</span>
                        </td>
                        <td>{s.fasilitas || '-'}</td>
                        <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.judul || s.nama_kelas_kegiatan || '-'}
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{s.status}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, suffix = '', color, sub }) {
  return (
    <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color }}>{value}{suffix}</div>
      <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.6875rem', color, fontWeight: 600, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 1rem' }}>
      {children}
    </h2>
  )
}
