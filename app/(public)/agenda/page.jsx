'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import ThemeToggle from '@/app/components/ThemeToggle'
import Link from 'next/link'
import { getAgendaStatus } from './tv/shared'
import { getUnitColor } from './tv/unit-colors'

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

const CAR_PER = 4            // 4 kartu per halaman (2×2)
const ROTATE_SEC = 10        // carousel berganti tiap 10 detik
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const DOW = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const DOW_CAL = ['SN', 'SL', 'RB', 'KM', 'JM', 'SB', 'MG']

const pad2 = (n) => String(n).padStart(2, '0')
const keyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const parseDay = (iso) => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d) }
const hm = (t) => (t ? t.slice(0, 5).replace(':', '.') : '')
const timeRange = (a) => {
  const s = hm(a.waktu_mulai), e = hm(a.waktu_selesai)
  return s && e ? `${s}–${e}` : s || 'Sepanjang hari'
}
const unitName = (a) => (a.penyelenggara || '').replace(/^External - /, '') || 'USC'

// Label hitung mundur + warnanya untuk satu agenda
function countdown(a, now) {
  const st = getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai)
  if (st === 'completed') return { label: 'Selesai', bg: 'var(--surface-2)', fg: 'var(--text-2)' }
  const start = new Date(`${a.tanggal_mulai}T${a.waktu_mulai || '00:00:00'}`)
  const diff = start - now
  if (diff <= 0) return { label: 'Berlangsung', bg: 'var(--success-50)', fg: 'var(--success)' }
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const days = Math.round((parseDay(a.tanggal_mulai) - today) / 864e5)
  if (days >= 1) return { label: days === 1 ? 'Besok' : `${days} hari lagi`, bg: 'var(--info-50)', fg: 'var(--info)' }
  const h = Math.floor(diff / 36e5), m = Math.floor((diff % 36e5) / 6e4)
  return { label: `${h ? `${h} jam ` : ''}${m} mnt lagi`, bg: 'var(--usc-yellow)', fg: '#0e1a3a' }
}

const IconCal = ({ size = 16 }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="12" y1="14" x2="12" y2="18" /><line x1="10" y1="16" x2="14" y2="16" /></svg>
const IconClock = ({ size = 15 }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
const IconPin = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
const IconChev = ({ dir }) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><polyline points={dir === 'l' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} /></svg>

function AgendaCard({ a, now, todayKey }) {
  const d = parseDay(a.tanggal_mulai)
  const cd = countdown(a, now)
  const isToday = a.tanggal_mulai === todayKey
  const done = getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) === 'completed'
  const color = getUnitColor(a.jenis === 'eksternal' ? 'eksternal' : 'internal', a.penyelenggara, false).border
  return (
    <article className="ap-card" style={{ opacity: done ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className={`ap-date ${isToday ? 'today' : ''}`}>
          <span className="date-block-mon">{MON[d.getMonth()]}</span>
          <span className="date-block-day">{d.getDate()}</span>
          <span style={{ fontSize: 10.5, opacity: .8 }}>{DOW[d.getDay()].slice(0, 3)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
          <span className="ap-cd" style={{ background: cd.bg, color: cd.fg }}><IconClock size={12} />{cd.label}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span className="truncate">{unitName(a)}</span>
          </span>
        </div>
      </div>
      <h3 className="ap-card-title">{a.judul}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 14, color: 'var(--text-2)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconClock /><span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>{timeRange(a)}</span> WIB
          {a.tanggal_selesai && a.tanggal_selesai !== a.tanggal_mulai && <span>· s/d {parseDay(a.tanggal_selesai).getDate()} {MON[parseDay(a.tanggal_selesai).getMonth()]}</span>}
        </span>
        {a.lokasi && <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><IconPin />{a.lokasi}</span>}
      </div>
      {a.deskripsi && <p className="ap-desc">{a.deskripsi}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4, flexWrap: 'wrap' }}>
        <button type="button" className="ap-btn" onClick={() => downloadIcs(a)}><IconCal size={15} />Tambah ke kalender</button>
        {a.link_meeting && (
          <a href={a.link_meeting} target="_blank" rel="noopener noreferrer" className="ap-btn primary">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
            Gabung online
          </a>
        )}
      </div>
    </article>
  )
}

export default function AgendaPage() {
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

  const [agenda, setAgenda] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [range, setRange] = useState('all')        // all | today | week
  const [day, setDay] = useState(null)              // 'YYYY-MM-DD' dari kalender
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })
  const [page, setPage] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [now, setNow] = useState(() => new Date())

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

  // Jam (untuk hitung mundur) + detak carousel tiap detik
  const stopped = paused || hovering
  const stoppedRef = useRef(stopped)
  stoppedRef.current = stopped
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date())
      if (!stoppedRef.current) {
        setElapsed(e => {
          if (e + 1 >= ROTATE_SEC) { setPage(p => p + 1); return 0 }
          return e + 1
        })
      }
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const todayKey = keyOf(now)
  const weekEndKey = keyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6))
  const inRange = (a, k) => k === 'all' || (k === 'today'
    ? a.tanggal_mulai <= todayKey && (a.tanggal_selesai || a.tanggal_mulai) >= todayKey
    : a.tanggal_mulai <= weekEndKey && (a.tanggal_selesai || a.tanggal_mulai) >= todayKey)
  const onDay = (a, k) => a.tanggal_mulai <= k && (a.tanggal_selesai || a.tanggal_mulai) >= k

  // Aktif dulu (terdekat), yang selesai di belakang (terbaru dulu)
  const sorted = useMemo(() => {
    const t = (a) => new Date(`${a.tanggal_mulai}T${a.waktu_mulai || '00:00:00'}`)
    const done = (a) => getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) === 'completed'
    return agenda.slice().sort((a, b) => (done(a) - done(b)) || (done(a) ? t(b) - t(a) : t(a) - t(b)))
  }, [agenda])
  const active = sorted.filter(a => getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) !== 'completed')

  const list = useMemo(() => {
    let l = sorted.filter(a => showCompleted || getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) !== 'completed')
    return day ? l.filter(a => onDay(a, day)) : l.filter(a => inRange(a, range))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, showCompleted, day, range, todayKey])

  const pages = Math.max(1, Math.ceil(list.length / CAR_PER))
  const p = page % pages
  const cards = list.slice(p * CAR_PER, p * CAR_PER + CAR_PER)
  const goTo = (i) => { setPage(((i % pages) + pages) % pages); setElapsed(0) }
  useEffect(() => { setPage(0); setElapsed(0) }, [showCompleted, day, range])

  // Agenda unggulan: yang paling dekat & belum lewat jam mulainya
  const feat = active.find(a => new Date(`${a.tanggal_mulai}T${a.waktu_mulai || '00:00:00'}`) > now) || active[0]
  const featCd = useMemo(() => {
    if (!feat) return ''
    const diff = new Date(`${feat.tanggal_mulai}T${feat.waktu_mulai || '00:00:00'}`) - now
    if (diff <= 0) return 'Sedang berlangsung'
    const d = Math.floor(diff / 864e5), h = Math.floor((diff % 864e5) / 36e5), m = Math.floor((diff % 36e5) / 6e4)
    return d > 0 ? `${d} hari ${h} jam` : `${h} jam ${pad2(m)} mnt`
  }, [feat, now])
  const featWhen = feat ? (feat.tanggal_mulai === todayKey ? 'Hari ini' : `${DOW[parseDay(feat.tanggal_mulai).getDay()]}, ${parseDay(feat.tanggal_mulai).getDate()} ${MON[parseDay(feat.tanggal_mulai).getMonth()]}`) : ''

  // Sel kalender (Senin di kiri)
  const cells = useMemo(() => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth()
    const off = (new Date(y, m, 1).getDay() + 6) % 7, nd = new Date(y, m + 1, 0).getDate()
    const out = Array.from({ length: off }, () => null)
    for (let n = 1; n <= nd; n++) {
      const k = `${y}-${pad2(m + 1)}-${pad2(n)}`
      out.push({ n, k, has: agenda.some(a => onDay(a, k)), past: k < todayKey, today: k === todayKey })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calMonth, agenda, todayKey])

  // Strip 7 hari untuk mobile
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const k = keyOf(d)
    return { k, dow: DOW[d.getDay()].slice(0, 3), n: d.getDate(), has: agenda.some(a => onDay(a, k)) }
  })

  const pickDay = (k, past) => {
    if (day === k) { setDay(null); return }
    setDay(k)
    if (past) setShowCompleted(true)
  }

  const dateEyebrow = `${DOW[now.getDay()]} · ${now.getDate()} ${MONL[now.getMonth()]} ${now.getFullYear()}`
  const weekCount = active.filter(a => inRange(a, 'week')).length

  return (
    <div className="ap">
      <header className="ap-header">
        <Link href="/agenda" className="ap-brand">
          <img src={logoUrl} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
            <span className="ap-brand-name">Unesa Science Center</span>
            <span className="ap-brand-sub">{brandName}</span>
          </span>
        </Link>
        <nav className="ap-nav" aria-label="Halaman publik">
          <Link href="/agenda" aria-current="page" className="active">Agenda</Link>
          <Link href="/daftar-tamu">Buku Tamu</Link>
          <Link href="/kritik-saran">Kritik &amp; Saran</Link>
          <Link href="/penilaian">Penilaian</Link>
        </nav>
        <div style={{ flex: 1 }} />
        <ThemeToggle style={{ width: 42, height: 42, borderRadius: 10, color: 'var(--text)' }} />
        <a href="/agenda/tv" className="ap-tvbtn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="2" y="7" width="20" height="15" rx="2" /><polyline points="17 2 12 7 7 2" /></svg>
          Mode TV
        </a>
        <Link href="/login" className="btn btn-primary ap-login">Masuk</Link>
      </header>

      <main className="ap-main">
        <div className="ap-hero">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="eyebrow ap-eyebrow">{dateEyebrow}</span>
            <h1 className="ap-title">Agenda kegiatan</h1>
            <p className="ap-lede">Kelas, kunjungan, dan acara Unesa Science Center yang terbuka untuk umum. {weekCount} agenda dalam 7 hari ke depan.</p>
          </div>
          {feat && (
            <div className="now-card ap-feat">
              <span className="now-card-eyebrow">Berikutnya · {featWhen}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360 }}>
                <span className="ap-feat-title">{feat.judul}</span>
                <span style={{ fontSize: 14.5, color: '#cfd8f3' }}>{timeRange(feat)} WIB{feat.lokasi ? ` · ${feat.lokasi}` : ''}</span>
              </div>
              <div className="ap-feat-foot">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12.5, color: '#cfd8f3' }}>Dimulai dalam</span>
                  <span className="mono ap-feat-cd">{featCd}</span>
                </div>
                <button type="button" className="ap-feat-btn" onClick={() => downloadIcs(feat)}><IconCal />Tambah ke kalender</button>
              </div>
            </div>
          )}
        </div>

        {/* Strip 7 hari (mobile) */}
        <div className="ap-week" role="group" aria-label="Pilih tanggal">
          {week.map(w => (
            <button key={w.k} type="button" onClick={() => pickDay(w.k, false)} aria-pressed={day === w.k} className={`ap-week-day ${day === w.k ? 'active' : ''}`}>
              <span style={{ fontSize: 11.5, fontWeight: 600, opacity: .8 }}>{w.dow}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, lineHeight: 1 }}>{w.n}</span>
              <span className="ap-dot" style={{ background: w.has ? (day === w.k ? 'var(--usc-yellow)' : 'var(--primary)') : 'transparent' }} />
            </button>
          ))}
        </div>

        <div className="ap-grid">
          <aside className="ap-aside">
            <div className="ap-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600 }}>{MONL[calMonth.getMonth()]} {calMonth.getFullYear()}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" className="ap-calnav" aria-label="Bulan sebelumnya" onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}><IconChev dir="l" /></button>
                  <button type="button" className="ap-calnav" aria-label="Bulan berikutnya" onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}><IconChev /></button>
                </div>
              </div>
              <div className="ap-cal-head">{DOW_CAL.map(d => <span key={d}>{d}</span>)}</div>
              <div className="ap-cal">
                {cells.map((c, i) => c ? (
                  <button key={c.k} type="button" onClick={() => pickDay(c.k, c.past)} aria-pressed={day === c.k} aria-label={`${c.n} ${MONL[calMonth.getMonth()]}${c.has ? ', ada agenda' : ''}`}
                    className={`ap-cal-cell ${day === c.k ? 'sel' : ''} ${c.today ? 'today' : ''} ${c.past ? 'past' : ''}`}>
                    {c.n}
                    <span className="ap-dot" style={{ background: c.has ? (day === c.k ? 'var(--usc-yellow)' : 'var(--primary)') : 'transparent' }} />
                  </button>
                ) : <span key={`e${i}`} />)}
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Titik = ada agenda. Klik tanggal untuk memfilter.</span>
            </div>
            <div className="ap-panel" style={{ gap: 10 }}>
              <span className="eyebrow" style={{ fontSize: 11.5, letterSpacing: '.1em' }}>Sedang berkunjung?</span>
              <Link href="/daftar-tamu" className="ap-visit">Isi buku tamu<span>→</span></Link>
              <Link href="/penilaian" className="ap-visit">Nilai fasilitas<span>→</span></Link>
              <Link href="/kritik-saran" className="ap-visit" style={{ borderBottom: 0 }}>Kirim kritik &amp; saran<span>→</span></Link>
            </div>
          </aside>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <div className="ap-filters">
              {[['all', 'Semua mendatang'], ['today', 'Hari ini'], ['week', '7 hari ke depan']].map(([k, label]) => (
                <button key={k} type="button" className={`chip ${!day && range === k ? 'active' : ''}`} aria-pressed={!day && range === k} onClick={() => { setRange(k); setDay(null) }}>
                  {label}<span className="chip-count">{active.filter(a => inRange(a, k)).length}</span>
                </button>
              ))}
              {day && (
                <button type="button" className="chip" onClick={() => setDay(null)} style={{ background: 'var(--usc-yellow)', borderColor: 'var(--usc-yellow)', color: '#0e1a3a', fontWeight: 700 }} aria-label="Hapus filter tanggal">
                  {parseDay(day).getDate()} {MON[parseDay(day).getMonth()]}<span style={{ fontSize: 17, lineHeight: 1 }}>×</span>
                </button>
              )}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }} id="ap-done-label">Tampilkan selesai</span>
              <button type="button" role="switch" aria-checked={showCompleted} aria-labelledby="ap-done-label" className="switch" onClick={() => setShowCompleted(v => !v)} />
            </div>

            {loading ? (
              <div className="ap-cards">{[0, 1, 2, 3].map(i => <div key={i} className="ap-card" style={{ minHeight: 260, animation: 'pulse 1.5s infinite' }} />)}</div>
            ) : error ? (
              <div className="ap-empty"><span className="ap-empty-title">{error}</span><span>Coba muat ulang halaman.</span></div>
            ) : list.length === 0 ? (
              <div className="ap-empty">
                <span className="ap-empty-title">Tidak ada agenda publik</span>
                <span>{day ? 'Pilih tanggal lain di kalender.' : 'Belum ada agenda untuk rentang ini.'}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
                <div className="ap-cards">
                  {cards.map(a => <AgendaCard key={a.id} a={a} now={now} todayKey={todayKey} />)}
                </div>
                {pages > 1 && (
                  <div className="ap-car">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button type="button" className="ap-pause" onClick={() => setPaused(v => !v)} aria-label={paused ? 'Lanjutkan putar otomatis' : 'Jeda putar otomatis'}>
                        {paused
                          ? <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3" /></svg>
                          : <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>}
                        <span className="ap-hide-sm">{paused ? 'Lanjutkan' : 'Jeda'}</span>
                      </button>
                      <span className="ap-hide-sm" style={{ fontSize: 13.5, color: 'var(--text-2)' }} aria-live="off">
                        {stopped ? 'Putar otomatis dijeda' : `Berganti dalam ${ROTATE_SEC - elapsed} detik`}
                      </span>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(elapsed / ROTATE_SEC) * 100}%`, background: 'var(--usc-yellow)', borderRadius: 3, transition: 'width 1s linear' }} />
                      </div>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{p + 1} / {pages}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <button type="button" className="ap-carbtn" onClick={() => goTo(p - 1)} aria-label="Halaman sebelumnya"><IconChev dir="l" /><span className="ap-hide-sm">Sebelumnya</span></button>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {Array.from({ length: pages }, (_, i) => (
                          <button key={i} type="button" onClick={() => goTo(i)} aria-label={`Halaman ${i + 1}`} aria-current={i === p ? 'true' : undefined} className="ap-dotbtn">
                            <span style={{ height: 10, width: i === p ? 30 : 10, borderRadius: 5, background: i === p ? 'var(--primary)' : 'var(--border-strong)', transition: 'width .25s' }} />
                          </button>
                        ))}
                      </div>
                      <button type="button" className="ap-carbtn primary" onClick={() => goTo(p + 1)} aria-label="Halaman selanjutnya"><span className="ap-hide-sm">Selanjutnya</span><IconChev /></button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="ap-footer"><span>© {now.getFullYear()} {brandName}</span><span>Semua waktu dalam WIB</span></footer>
    </div>
  )
}
