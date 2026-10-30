'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAgenda } from '@/lib/hooks/useSupabase';
import { OnboardingFlow, useOnboarding, RestartOnboardingButton } from '@/app/components/Onboarding';
import { SkeletonDashboard } from '@/app/components/Skeleton';
import { useWeather, weatherInfo, WeatherIcon } from '@/app/components/Weather';
import { getPaletteItems } from '@/app/components/navConfig';
import { UNIT_COLORS, getUnitColor } from '@/app/(public)/agenda/tv/unit-colors';

gsap.registerPlugin(useGSAP);

const MONTHS     = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const MONTH_FULL = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const DAYS       = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];

// `T${jam}` tanpa akhiran "Z" diparse sebagai waktu lokal browser (bukan
// UTC) — sama seperti fix di kelola-agenda/page.jsx. Tanpa jam, dianggap
// mulai 00:00 / selesai 23:59:59 hari itu.
const toDateTime = (tanggal, waktu, endOfDay = false) => {
  if (!tanggal) return null;
  const time = waktu || (endOfDay ? '23:59:59' : '00:00:00');
  return new Date(`${tanggal}T${time}`);
};

const getStatus = (mulai, selesai, waktuMulai, waktuSelesai) => {
  const now = new Date();
  const s = toDateTime(mulai, waktuMulai, false);
  const e = toDateTime(selesai, waktuSelesai, true);
  if (now > e) return 'completed';
  if (now >= s) return 'ongoing';
  const days = Math.ceil((s - now) / 864e5);
  return days <= 3 ? 'upcoming_soon' : 'upcoming';
};

const fmtTime = (t) => t ? t.slice(0, 5).replace(':', '.') : '';
const timeRange = (a) => {
  const s = fmtTime(a.waktu_mulai), e = fmtTime(a.waktu_selesai);
  return s && e ? `${s}–${e}` : s || 'Sepanjang hari';
};
const person = (a) => a.disposisi ? `→ ${a.disposisi}` : (a.pic || a.penyelenggara || '');

const STATUS = {
  ongoing:       { label: 'Berlangsung', cls: 'ongoing' },
  upcoming_soon: { label: 'Segera',      cls: 'soon' },
  upcoming:      { label: 'Mendatang',   cls: 'upcoming' },
  completed:     { label: 'Selesai',     cls: 'done' },
};

const TABS = [
  ['all', 'Semua'],
  ['ongoing', 'Berlangsung'],
  ['upcoming_soon', 'Segera'],
  ['upcoming', 'Mendatang'],
];

const fmtDuration = (ms) => {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m} menit`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam`;
  return `${Math.round(h / 24)} hari`;
};

const relDay = (date) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 864e5);
  if (diff === 0) return 'hari ini';
  if (diff === 1) return 'besok';
  if (diff < 7) return DAYS[d.getDay()];
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export default function DashboardPage() {
  const [userName, setUserName] = useState('Admin');
  const [userRole, setUserRole] = useState('');
  const [saranStats, setSaranStats]         = useState({ total: 0, baru: 0, kritik: 0, saran: 0, permohonan: 0 });
  const [penilaianStats, setPenilaianStats] = useState({ total: 0, avgRating: 0 });
  const [statsLoading, setStatsLoading]     = useState(true);
  const [filter, setFilter]                 = useState('all');
  const [now, setNow]                       = useState(() => new Date());

  const { showOnboarding, completeOnboarding, skipOnboarding, resetOnboarding } = useOnboarding('dashboard');
  const { data: agendaData, loading: agendaLoading } = useAgenda();
  const weather = useWeather();

  // Progres agenda berlangsung & hitung mundur diperbarui tiap menit
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const s = localStorage.getItem('simdir_session');
      if (s) { const d = JSON.parse(atob(s)); setUserName(d.full_name || d.username || 'Admin'); setUserRole(d.role || ''); }
    } catch {}
  }, []);

  useEffect(() => {
    async function loadStats() {
      setStatsLoading(true);
      try {
        const session = localStorage.getItem('simdir_session');
        if (!session) return;
        const decoded = JSON.parse(atob(session));
        const headers = { 'Content-Type': 'application/json', authorization: `Bearer ${decoded.token || decoded.role || 'session'}` };

        const [saranRes, penilaianRes] = await Promise.allSettled([
          fetch('/api/saran', { headers }),
          fetch('/api/kritik-saran', { headers }),
        ]);

        if (saranRes.status === 'fulfilled' && saranRes.value.ok) {
          const data = await saranRes.value.json();
          setSaranStats({
            total:      data.length,
            baru:       data.filter(d => d.status === 'baru').length,
            kritik:     data.filter(d => d.jenis === 'kritik').length,
            saran:      data.filter(d => d.jenis === 'saran').length,
            permohonan: data.filter(d => d.jenis === 'permohonan_kelas' || d.jenis === 'permohonan_kegiatan').length,
          });
        }

        if (penilaianRes.status === 'fulfilled' && penilaianRes.value.ok) {
          const data = await penilaianRes.value.json();
          const withRating = data.filter(d => d.overall_rating);
          const avg = withRating.length > 0
            ? (withRating.reduce((s, d) => s + d.overall_rating, 0) / withRating.length).toFixed(1)
            : 0;
          setPenilaianStats({ total: data.length, avgRating: parseFloat(avg) });
        }
      } catch {}
      finally { setStatsLoading(false); }
    }
    loadStats();
  }, []);

  const greeting = (() => {
    const h = now.getHours();
    if (h >= 18) return 'Selamat malam';
    if (h >= 15) return 'Selamat sore';
    if (h >= 11) return 'Selamat siang';
    return 'Selamat pagi';
  })();
  const firstName = userName.split(' ')[0];
  const dateEyebrow = `${DAYS[now.getDay()]} · ${now.getDate()} ${MONTH_FULL[now.getMonth()]} ${now.getFullYear()}`;
  const dateEyebrowShort = `${DAYS[now.getDay()]} · ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  // Agenda aktif (belum selesai), urut tanggal, sudah ditempeli status
  const active = useMemo(() =>
    agendaData
      .map(a => ({ ...a, _st: getStatus(a.tanggal_mulai, a.tanggal_selesai, a.waktu_mulai, a.waktu_selesai) }))
      .filter(a => a._st !== 'completed')
      .sort((a, b) => toDateTime(a.tanggal_mulai, a.waktu_mulai) - toDateTime(b.tanggal_mulai, b.waktu_mulai)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agendaData, now]
  );

  const counts = useMemo(() => ({
    all: active.length,
    ongoing: active.filter(a => a._st === 'ongoing').length,
    upcoming_soon: active.filter(a => a._st === 'upcoming_soon').length,
    upcoming: active.filter(a => a._st === 'upcoming').length,
  }), [active]);

  const filtered = active.filter(a => filter === 'all' || a._st === filter);
  const current = active.find(a => a._st === 'ongoing');
  const next = active.find(a => a._st !== 'ongoing');

  const nowInfo = useMemo(() => {
    if (!current) return null;
    const s = toDateTime(current.tanggal_mulai, current.waktu_mulai);
    const e = toDateTime(current.tanggal_selesai, current.waktu_selesai, true);
    const pct = Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100));
    return { pct, left: fmtDuration(e - now) };
  }, [current, now]);

  const summaryLine = `${counts.ongoing > 0 ? `${counts.ongoing} agenda berlangsung` : 'Tidak ada agenda berlangsung'} · ${counts.upcoming_soon} dimulai dalam 3 hari ke depan.`;

  const quickLinks = useMemo(() => {
    const allowed = new Set(getPaletteItems(userRole || 'admin').map(i => i.href));
    return [
      { href: '/e-invoice/create', check: '/e-invoice', label: 'Buat Invoice', icon: <IconInvoice /> },
      { href: '/e-kwitansi', label: 'E-Kwitansi', icon: <IconReceipt /> },
      { href: '/kelola-tamu', label: 'Daftar Tamu', icon: <IconGuests /> },
      { href: '/laporan', label: 'Laporan', icon: <IconChart /> },
      { href: '/kelola-agenda', label: 'Kelola Agenda', icon: <IconCalendar /> },
      { href: '/pemasukan-unit-usaha', label: 'Unit Usaha', icon: <IconChart /> },
    ].filter(l => allowed.has(l.check || l.href)).slice(0, 4);
  }, [userRole]);

  const containerRef = useRef(null);

  useGSAP(() => {
    if (agendaLoading) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.from('.db-hero', { opacity: 0, y: 16, duration: 0.4 })
      .from('.db-kpi', { opacity: 0, y: 20, scale: 0.97, duration: 0.35, stagger: 0.07 }, '-=0.15')
      .from('.db-agenda-row', { opacity: 0, y: 16, duration: 0.3, stagger: 0.06 }, '-=0.15');
  }, { scope: containerRef, dependencies: [agendaLoading] });

  if (agendaLoading) return <SkeletonDashboard />;

  const wx = weather ? weatherInfo(weather.code) : null;

  return (
    <div ref={containerRef} className="db2">
      <OnboardingFlow pageKey="dashboard" isOpen={showOnboarding} onComplete={completeOnboarding} onSkip={skipOnboarding} />
      {!showOnboarding && (
        <div style={{ position: 'fixed', bottom: 96, right: 20, zIndex: 20 }}>
          <RestartOnboardingButton onClick={resetOnboarding} />
        </div>
      )}

      {/* ── SAPAAN ─────────────────────────────────────────────────────── */}
      <div className="db2-head db-hero">
        <div className="db2-greet">
          <span className="eyebrow db2-only-desktop">{dateEyebrow}</span>
          <span className="eyebrow db2-only-mobile">{dateEyebrowShort}</span>
          <h1 className="db2-title">{greeting}, {firstName}.</h1>
          <p className="db2-only-desktop db2-summary">{summaryLine}</p>
          {wx && (
            <div className="db2-only-mobile-flex db2-weather">
              <span style={{ display: 'flex', color: 'var(--usc-yellow-dark)' }}><WeatherIcon kind={wx.kind} /></span>
              <span className="mono" style={{ fontWeight: 600, color: 'var(--text)' }}>{weather.temp}°</span>
              <span>{wx.label} · Surabaya</span>
            </div>
          )}
        </div>
        <div className="db2-actions">
          <a href="/agenda/tv" target="_blank" rel="noopener" className="btn btn-secondary">
            <IconTv />Buka TV Display
          </a>
          <Link href="/kelola-agenda" className="btn btn-primary">
            <IconPlus />Buat Agenda
          </Link>
        </div>
      </div>

      {/* ── SEKARANG + KPI ─────────────────────────────────────────────── */}
      <div className="db2-top">
        <div className="now-card db-hero">
          {current ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="now-card-eyebrow"><span className="now-card-live" />Sedang berlangsung</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h3 className="now-card-title">{current.judul}</h3>
                <span className="now-card-sub">
                  {timeRange(current)}{current.lokasi ? ` · ${current.lokasi}` : ''}{person(current) ? ` · ${person(current)}` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="now-card-track"><div style={{ width: `${nowInfo.pct}%` }} /></div>
                <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#cfd8f3', gap: 8 }}>
                  <span>{fmtTime(current.waktu_mulai) || '00.00'}</span>
                  <span>Berakhir dalam {nowInfo.left}</span>
                  <span>{fmtTime(current.waktu_selesai) || '23.59'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="now-card-eyebrow">Hari ini</span>
              <h3 className="now-card-title">Tidak ada agenda berlangsung.</h3>
              <span className="now-card-sub">
                {next
                  ? `Semua tenang — agenda berikutnya dimulai ${relDay(toDateTime(next.tanggal_mulai, next.waktu_mulai))}.`
                  : 'Semua tenang — belum ada agenda mendatang.'}
              </span>
            </div>
          )}
          {next && (
            <Link href="/kelola-agenda" className="now-card-foot db2-only-desktop-flex" style={{ color: '#fff' }}>
              <span className="now-card-foot-label">Berikutnya</span>
              <span style={{ flex: 1, minWidth: 0 }} className="truncate">
                {new Date(next.tanggal_mulai).getDate()} {MONTHS[new Date(next.tanggal_mulai).getMonth()]}
                {next.waktu_mulai ? `, ${fmtTime(next.waktu_mulai)}` : ''} · {next.judul}
              </span>
              <IconArrow />
            </Link>
          )}
        </div>

        <div className="db2-kpis">
          <KpiCard
            href="/kelola-agenda"
            label="Total Agenda"
            value={agendaData.length}
            sub={`${counts.ongoing} berlangsung · ${counts.upcoming + counts.upcoming_soon} mendatang`}
            subShort={`${counts.ongoing} berlangsung`}
            icon={<IconCalendar />}
          />
          <KpiCard
            href="/kelola-saran"
            label="Kritik & Saran"
            value={statsLoading ? '—' : saranStats.total}
            sub={saranStats.baru > 0 ? `${saranStats.baru} belum ditinjau` : 'Semua sudah ditinjau'}
            subDanger={saranStats.baru > 0}
            tag={saranStats.baru > 0 ? `${saranStats.baru} baru` : null}
            icon={<IconMessage />}
          />
          <KpiCard
            href="/kelola-penilaian"
            label="Penilaian Fasilitas"
            label2="Penilaian"
            value={penilaianStats.avgRating > 0 ? String(penilaianStats.avgRating).replace('.', ',') : '—'}
            unit={penilaianStats.avgRating > 0 ? '/ 5' : null}
            sub={penilaianStats.total > 0 ? `dari ${penilaianStats.total} penilaian` : 'Belum ada penilaian'}
            subShort={`${penilaianStats.total} penilaian`}
            icon={<IconStar filled />}
          />
          <KpiCard
            href="/kelola-saran"
            label="Permohonan"
            value={statsLoading ? '—' : saranStats.permohonan}
            sub="kelas & kegiatan"
            icon={<IconClipboard />}
          />
        </div>
      </div>

      <TodayTimeline agenda={active} now={now} />

      {/* ── AGENDA + KOLOM KANAN ───────────────────────────────────────── */}
      <div className="db2-main">
        <div className="card db2-agenda">
          <div className="db2-agenda-head">
            <h2 className="db2-h3">Agenda mendatang</h2>
            <Link href="/kelola-agenda" className="db2-only-mobile" style={{ fontSize: 14, fontWeight: 600 }}>Semua</Link>
            <div className="seg db2-tabs" role="tablist" aria-label="Filter status agenda">
              {TABS.map(([k, label]) => (
                <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>
                  {label}<span className="mono" style={{ fontSize: 11.5, opacity: .6 }}>{counts[k]}</span>
                </button>
              ))}
            </div>
            <div className="db2-chips db2-only-mobile-flex">
              {TABS.map(([k, label]) => (
                <button key={k} className={`chip ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)} style={{ minHeight: 36, flexShrink: 0, padding: '0 14px', fontSize: 13 }}>
                  {label}<span className="chip-count">{counts[k]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="db2-rows">
            {filtered.slice(0, 6).map(a => <AgendaRow key={a.id} a={a} />)}
            {filtered.length === 0 && (
              <div style={{ padding: '40px 24px', borderTop: '1px solid var(--border-2)', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
                {active.length === 0 ? 'Belum ada agenda mendatang.' : 'Tidak ada agenda untuk filter ini.'}
              </div>
            )}
          </div>
          <Link href="/kelola-agenda" className="db2-only-desktop-flex" style={{ justifyContent: 'center', padding: 14, borderTop: '1px solid var(--border-2)', fontSize: 14, fontWeight: 600 }}>
            Lihat semua agenda →
          </Link>
        </div>

        <div className="db2-side">
          <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 className="db2-h3">Ringkasan masukan</h2>
              <Link href="/kelola-saran" style={{ fontSize: 13.5, fontWeight: 600 }}>Kelola →</Link>
            </div>
            <SaranBreakdown stats={saranStats} loading={statsLoading} />
          </div>

          {quickLinks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="eyebrow" style={{ fontSize: 11.5, letterSpacing: '.1em' }}>Akses cepat</span>
              <div className="db2-quick">
                {quickLinks.map(l => (
                  <Link key={l.href} href={l.href} className="db2-quick-link">
                    <span className="db2-quick-icon">{l.icon}</span>{l.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Saran Breakdown ─────────────────────────────────────────────────────────
function SaranBreakdown({ stats, loading }) {
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1,2,3,4].map(i => <div key={i} style={{ height: 20, borderRadius: 6, background: 'var(--surface-2)', animation: 'pulse 1.5s infinite' }} />)}
    </div>
  );

  const rows = [
    { label: 'Saran',      value: stats.saran },
    { label: 'Kritik',     value: stats.kritik },
    { label: 'Permohonan', value: stats.permohonan },
    { label: 'Belum ditinjau', value: stats.baru, danger: true },
  ];
  const max = Math.max(...rows.map(r => r.value), 1);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(row => (
          <div key={row.label} className="db2-bar-row">
            <span style={{ color: row.danger ? 'var(--danger)' : 'var(--text-2)', fontWeight: row.danger ? 600 : 400 }}>{row.label}</span>
            <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4 }}>
              <div style={{ width: `${(row.value / max) * 100}%`, height: '100%', background: row.danger ? 'var(--danger-solid)' : 'var(--primary-light)', borderRadius: 4, transition: 'width .6s var(--ease-out)' }} />
            </div>
            <span className="mono" style={{ fontWeight: 600, textAlign: 'right', color: row.danger ? 'var(--danger)' : 'var(--text)' }}>{row.value}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border-2)', fontSize: 14 }}>
        <span style={{ color: 'var(--text-3)' }}>Total masuk</span>
        <span className="mono" style={{ fontWeight: 600 }}>{stats.total}</span>
      </div>
    </>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, label2, value, unit, sub, subShort, subDanger, tag, icon, href }) {
  return (
    <Link href={href} className="db2-kpi db-kpi">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span className="db2-kpi-label">
          <span className="db2-only-desktop">{label}</span>
          <span className="db2-only-mobile">{label2 || label}</span>
        </span>
        {tag
          ? <span className="mono db2-only-desktop" style={{ fontSize: 11.5, fontWeight: 600, background: 'var(--danger-50)', color: 'var(--danger)', borderRadius: 99, padding: '2px 8px' }}>{tag}</span>
          : <span className="db2-only-desktop" style={{ width: 17, height: 17, color: 'var(--primary)', display: 'flex' }}>{icon}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="db2-kpi-value">{value}</span>
        {unit && <span style={{ fontSize: 15, color: 'var(--text-3)' }}>{unit}</span>}
      </div>
      <span className="db2-kpi-sub" style={subDanger ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>
        <span className="db2-only-desktop">{sub}</span>
        <span className="db2-only-mobile">{subShort || sub}</span>
      </span>
    </Link>
  );
}

// ─── Agenda Row ───────────────────────────────────────────────────────────────
function AgendaRow({ a }) {
  const cfg = STATUS[a._st] || STATUS.upcoming;
  const d = new Date(a.tanggal_mulai);
  const isOngoing = a._st === 'ongoing';
  const meta = [a.lokasi, person(a)].filter(Boolean).join(' · ');

  return (
    <Link href="/kelola-agenda" className={`db2-row db-agenda-row ${isOngoing ? 'is-ongoing' : ''}`}>
      <div className={`date-block ${isOngoing ? 'is-ongoing' : ''}`}>
        <span className="date-block-mon">{MONTHS[d.getMonth()]}</span>
        <span className="date-block-day">{d.getDate()}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <span className="db2-row-title">{a.judul}</span>
        <span className="db2-row-meta db2-only-desktop">
          <span className="mono" style={{ color: 'var(--text-2)' }}>{timeRange(a)}</span>{meta ? ` · ${meta}` : ''}
        </span>
        <span className="db2-only-mobile-flex" style={{ alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span className={`status-pill ${cfg.cls}`} style={{ fontSize: 11.5, padding: '2px 8px' }}>{cfg.label}</span>
          <span className="db2-row-meta">{fmtTime(a.waktu_mulai) || 'Sepanjang hari'}{a.lokasi ? ` · ${a.lokasi}` : ''}</span>
        </span>
      </div>
      <span className={`status-pill ${cfg.cls} db2-only-desktop`}>{cfg.label}</span>
    </Link>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const svgP = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, style: { width: '100%', height: '100%' }, 'aria-hidden': true };
const IconCalendar  = () => <svg {...svgP}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconChart     = () => <svg {...svgP}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IconMessage   = () => <svg {...svgP}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IconStar      = ({ filled }) => <svg {...svgP} fill={filled ? 'var(--usc-yellow)' : 'none'} stroke={filled ? 'var(--usc-yellow)' : 'currentColor'}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IconClipboard = () => <svg {...svgP}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>;
const IconInvoice   = () => <svg {...svgP}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IconReceipt   = () => <svg {...svgP}><path d="M4 2h16v20l-3-2-2 2-2-2-2 2-2-2-2 2-3-2z"/></svg>;
const IconGuests    = () => <svg {...svgP}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>;
const IconTv        = () => <svg {...svgP} style={{ width: 16, height: 16 }}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
const IconPlus      = () => <svg {...svgP} strokeWidth={2.2} style={{ width: 16, height: 16 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconArrow     = () => <svg {...svgP} style={{ width: 16, height: 16, flexShrink: 0 }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

// ── Timeline "Hari ini di USC" (v3): blok per agenda hari ini, 07.00–17.00 ──
const TL_START = 7 * 60, TL_END = 17 * 60, TL_ROWS = 3;
function TodayTimeline({ agenda, now }) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = agenda.filter(a => a._st === 'ongoing' && a.waktu_mulai);
  // Susun blok ke baris pertama yang belum terpakai pada rentang waktunya
  const rowsEnd = [];
  const blocks = today.map(a => {
    const [h1, m1] = a.waktu_mulai.split(':').map(Number);
    const [h2, m2] = (a.waktu_selesai || '').split(':').map(Number);
    const s = Math.max(TL_START, h1 * 60 + m1);
    const e = Math.min(TL_END, Number.isFinite(h2) ? h2 * 60 + (m2 || 0) : s + 60);
    if (e <= s) return null;
    let row = rowsEnd.findIndex(end => end <= s);
    if (row === -1) row = rowsEnd.length;
    if (row >= TL_ROWS) return null;
    rowsEnd[row] = e;
    const uc = getUnitColor(a.jenis, a.penyelenggara, a.dihadiri_pimpinan);
    return { a, s, e, row, c: uc.border, live: nowMin >= s && nowMin < e, past: nowMin >= e };
  }).filter(Boolean);
  const pct = (m) => `${((m - TL_START) / (TL_END - TL_START)) * 100}%`;
  const hours = Array.from({ length: (TL_END - TL_START) / 60 + 1 }, (_, i) => String(7 + i).padStart(2, '0'));

  return (
    <div className="card db2-only-desktop" style={{ padding: '22px 26px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <h2 className="db2-h3">Hari ini di USC</h2>
          <span className="mono" style={{ fontSize: 13, color: 'var(--text-3)' }}>{today.length} kegiatan</span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-2)', flexWrap: 'wrap' }}>
          {Object.entries(UNIT_COLORS).slice(0, 6).map(([k, u]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: u.border }} />{u.name}</span>
          ))}
        </div>
      </div>
      <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)' }}>
        {hours.map(h => <span key={h} style={{ width: 0, display: 'flex', justifyContent: 'center' }}>{h}</span>)}
      </div>
      <div style={{ position: 'relative', height: TL_ROWS * 66 + 14, backgroundImage: 'linear-gradient(to right, var(--border) 1px, transparent 1px)', backgroundSize: '10% 100%', borderRight: '1px solid var(--border)' }}>
        {blocks.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 14, color: 'var(--text-3)' }}>Tidak ada agenda berjam hari ini.</div>
        )}
        {blocks.map(b => (
          <div key={b.a.id} style={{ position: 'absolute', left: pct(b.s), width: `calc(${pct(b.e)} - ${pct(b.s)})`, top: 4 + b.row * 70, height: 62, padding: 3 }}>
            <Link href="/kelola-agenda" title={b.a.judul} style={{ height: '100%', borderRadius: 12, background: `color-mix(in srgb, ${b.c} 16%, var(--surface))`, color: 'var(--text)', padding: '9px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, opacity: b.past ? 0.5 : 1, boxShadow: b.live ? `0 0 0 2px ${b.c}` : 'none', overflow: 'hidden', textDecoration: 'none' }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.a.judul}</span>
              <span className="mono" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: b.c, flexShrink: 0 }} />{fmtTime(b.a.waktu_mulai)}{b.a.waktu_selesai ? `–${fmtTime(b.a.waktu_selesai)}` : ''}
              </span>
            </Link>
          </div>
        ))}
        {nowMin >= TL_START && nowMin <= TL_END && (
          <div style={{ position: 'absolute', top: -6, bottom: -6, left: pct(nowMin), width: 2, background: '#e5484d' }}>
            <span className="mono" style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)', fontSize: 11.5, fontWeight: 600, background: '#e5484d', color: '#fff', padding: '1px 6px', borderRadius: 5 }}>
              {String(now.getHours()).padStart(2, '0')}.{String(now.getMinutes()).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
