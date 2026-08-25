'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAgenda } from '@/lib/hooks/useSupabase';
import { OnboardingFlow, useOnboarding, RestartOnboardingButton } from '@/app/components/Onboarding';
import { SkeletonDashboard } from '@/app/components/Skeleton';

gsap.registerPlugin(useGSAP);

const MONTHS     = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const MONTH_FULL = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

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

const fmtTime = (t) => t ? t.slice(0, 5) : '--:--';

export default function DashboardPage() {
  const [userName, setUserName] = useState('Admin');
  const [userRole, setUserRole] = useState('');
  const [saranStats, setSaranStats]         = useState({ total: 0, baru: 0, kritik: 0, saran: 0, permohonan: 0 });
  const [penilaianStats, setPenilaianStats] = useState({ total: 0, avgRating: 0 });
  const [statsLoading, setStatsLoading]     = useState(true);

  const { showOnboarding, completeOnboarding, skipOnboarding, resetOnboarding } = useOnboarding('dashboard');
  const { data: agendaData, loading: agendaLoading } = useAgenda();

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
    const h = new Date().getHours();
    if (h >= 18) return 'Selamat Malam';
    if (h >= 15) return 'Selamat Sore';
    if (h >= 11) return 'Selamat Siang';
    return 'Selamat Pagi';
  })();

  const now = new Date();
  const todayStr = `${now.getDate()} ${MONTH_FULL[now.getMonth()]} ${now.getFullYear()}`;
  const dayStr   = now.toLocaleDateString('id-ID', { weekday: 'long' });

  const agendaStats = useMemo(() => {
    const ongoing      = agendaData.filter(a => getStatus(a.tanggal_mulai, a.tanggal_selesai, a.waktu_mulai, a.waktu_selesai) === 'ongoing');
    const upcoming     = agendaData.filter(a => ['upcoming','upcoming_soon'].includes(getStatus(a.tanggal_mulai, a.tanggal_selesai, a.waktu_mulai, a.waktu_selesai)));
    const upcomingSoon = agendaData.filter(a => getStatus(a.tanggal_mulai, a.tanggal_selesai, a.waktu_mulai, a.waktu_selesai) === 'upcoming_soon');
    return { ongoing: ongoing.length, upcoming: upcoming.length, upcomingSoon: upcomingSoon.length, total: agendaData.length };
  }, [agendaData]);

  const upcomingList = useMemo(() =>
    agendaData
      .filter(a => getStatus(a.tanggal_mulai, a.tanggal_selesai, a.waktu_mulai, a.waktu_selesai) !== 'completed')
      .sort((a, b) => new Date(a.tanggal_mulai) - new Date(b.tanggal_mulai))
      .slice(0, 6),
    [agendaData]
  );

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

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <OnboardingFlow pageKey="dashboard" isOpen={showOnboarding} onComplete={completeOnboarding} onSkip={skipOnboarding} />
      {!showOnboarding && (
        <div style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 20 }}>
          <RestartOnboardingButton onClick={resetOnboarding} />
        </div>
      )}

      {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
      <div className="db-hero" style={{
        borderRadius: 'var(--r-xl)',
        background: 'linear-gradient(135deg, var(--usc-blue) 0%, #1d4ed8 55%, #2563eb 100%)',
        padding: '28px 32px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: -40, right: 180, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 20, right: 60, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, opacity: 0.7, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {dayStr}, {todayStr}
          </div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {greeting}, {userName} 👋
          </h1>
          <p style={{ opacity: 0.75, fontSize: '0.9375rem', margin: 0 }}>
            {agendaStats.ongoing > 0
              ? `${agendaStats.ongoing} agenda sedang berlangsung · ${agendaStats.upcoming} mendatang`
              : agendaStats.upcoming > 0
              ? `${agendaStats.upcoming} agenda mendatang · ${agendaStats.total} total terdaftar`
              : 'Tidak ada agenda aktif — semua tenang hari ini'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          {[
            { label: 'Agenda Aktif',    value: agendaStats.ongoing + agendaStats.upcoming, icon: '📅' },
            { label: 'Kritik & Saran',  value: saranStats.baru > 0 ? `${saranStats.baru} baru` : saranStats.total, icon: '💬' },
            { label: 'Rata-rata Rating', value: penilaianStats.avgRating > 0 ? `${penilaianStats.avgRating}⭐` : '—', icon: '⭐' },
          ].map(item => (
            <div key={item.label} style={{
              background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
              borderRadius: 14, padding: '12px 18px', minWidth: 110, textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.18)',
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{item.icon}</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, lineHeight: 1 }}>{item.value}</div>
              <div style={{ fontSize: '0.6875rem', opacity: 0.75, marginTop: 4, fontWeight: 500 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI CARDS ───────────────────────────────────────────────────── */}
      {/* Grid/gap sengaja TIDAK di-inline — .kpi-grid di globals.css punya
          breakpoint responsive (4→2 kolom) yang tidak akan pernah menang
          kalau nilai yang sama ditulis ulang lewat inline style (inline
          selalu mengalahkan class, termasuk media query di dalamnya) —
          itu penyebab kartu ke-4 kepotong di layar HP sebelumnya. */}
      <div className="kpi-grid">
        <KpiCard
          label="Total Agenda"
          value={agendaStats.total}
          sub={agendaStats.ongoing > 0 ? `${agendaStats.ongoing} sedang berlangsung` : `${agendaStats.upcoming} mendatang`}
          icon={<IconCalendar />}
          accent="var(--info)" accentBg="var(--info-50)"
          href="/kelola-agenda"
          badge={agendaStats.upcomingSoon > 0 ? agendaStats.upcomingSoon : null}
          badgeTitle="Segera"
        />
        <KpiCard
          label="Kritik & Saran"
          value={saranStats.total}
          sub={saranStats.baru > 0 ? `${saranStats.baru} belum ditinjau` : 'Semua sudah ditinjau'}
          icon={<IconMessage />}
          accent={saranStats.baru > 0 ? 'var(--danger)' : 'var(--success)'}
          accentBg={saranStats.baru > 0 ? 'var(--danger-50)' : 'var(--success-50)'}
          href="/kelola-saran"
          badge={saranStats.baru > 0 ? saranStats.baru : null}
        />
        <KpiCard
          label="Penilaian Fasilitas"
          value={penilaianStats.total}
          sub={penilaianStats.avgRating > 0 ? `Rata-rata ⭐ ${penilaianStats.avgRating}/5` : 'Belum ada penilaian'}
          icon={<IconStar />}
          accent="var(--warning)" accentBg="var(--warning-50)"
          href="/kelola-penilaian"
        />
        <KpiCard
          label="Permohonan"
          value={saranStats.permohonan}
          sub={`${saranStats.kritik} kritik · ${saranStats.saran} saran`}
          icon={<IconClipboard />}
          accent="#7c3aed" accentBg="#f5f3ff"
          href="/kelola-saran"
        />
      </div>

      {/* ── MAIN GRID ───────────────────────────────────────────────────── */}
      <div className="db-main-grid">

        {/* LEFT — Agenda */}
        <SectionCard
          title="Agenda Mendatang"
          subtitle={`${upcomingList.length} kegiatan aktif & mendatang`}
          action={{ label: 'Lihat Semua', href: '/kelola-agenda' }}
          icon={<IconCalendar />}
          accentColor="var(--info)"
        >
          {upcomingList.length === 0
            ? <EmptyState icon="📅" text="Tidak ada agenda mendatang" />
            : upcomingList.map(a => <AgendaRow key={a.id} a={a} />)
          }
        </SectionCard>

        {/* RIGHT — Saran breakdown + quick links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

          {/* Saran breakdown */}
          <SectionCard
            title="Ringkasan Masukan"
            subtitle="Kritik, saran & permohonan dari pengguna"
            action={{ label: 'Kelola', href: '/kelola-saran' }}
            icon={<IconMessage />}
            accentColor="var(--info)"
          >
            <SaranBreakdown stats={saranStats} loading={statsLoading} />
          </SectionCard>

          {/* Quick links */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { href: '/kelola-agenda',   label: 'Kelola Agenda',    desc: `${agendaStats.total} agenda`,           icon: <IconCalendar />,   accent: 'var(--info)', bg: 'var(--info-50)' },
              { href: '/kelola-penilaian',label: 'Penilaian',        desc: `${penilaianStats.total} penilaian`,     icon: <IconStar />,       accent: 'var(--warning)', bg: 'var(--warning-50)' },
              { href: '/kelola-saran',    label: 'Kritik & Saran',   desc: saranStats.baru > 0 ? `${saranStats.baru} perlu ditinjau` : `${saranStats.total} masuk`, icon: <IconMessage />, accent: saranStats.baru > 0 ? 'var(--danger)' : 'var(--success)', bg: saranStats.baru > 0 ? 'var(--danger-50)' : 'var(--success-50)', badge: saranStats.baru || null },
              { href: '/laporan',         label: 'Laporan',          desc: 'Analisis & narasi',                     icon: <IconChart />,      accent: 'var(--success)', bg: 'var(--success-50)' },
            ].map(item => (
              <a key={item.href} href={item.href} style={{
                display: 'flex', flexDirection: 'column', gap: 10, padding: '16px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)', textDecoration: 'none',
                transition: 'box-shadow .15s, transform .15s, border-color .15s',
                position: 'relative',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = item.accent + '60'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                {item.badge && (
                  <span style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderRadius: '50%', background: item.accent, color: 'white', fontSize: '0.6875rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.badge}
                  </span>
                )}
                <div style={{ width: 36, height: 36, borderRadius: 10, background: item.bg, color: item.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: 18, height: 18 }}>{item.icon}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.875rem' }}>{item.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>{item.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Saran Breakdown ─────────────────────────────────────────────────────────
function SaranBreakdown({ stats, loading }) {
  if (loading) return (
    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1,2,3,4].map(i => <div key={i} style={{ height: 36, borderRadius: 8, background: 'var(--surface-3)', animation: 'pulse 1.5s infinite' }} />)}
    </div>
  );

  const rows = [
    { label: 'Kritik',               value: stats.kritik,     color: 'var(--danger)', bg: 'var(--danger-50)', icon: '⚠️' },
    { label: 'Saran',                value: stats.saran,      color: 'var(--warning)', bg: 'var(--warning-50)', icon: '💡' },
    { label: 'Permohonan Kelas',     value: stats.permohonan, color: 'var(--info)', bg: 'var(--info-50)', icon: '📚' },
    { label: 'Belum Ditinjau',       value: stats.baru,       color: stats.baru > 0 ? 'var(--danger)' : 'var(--text-3)', bg: stats.baru > 0 ? 'var(--danger-50)' : 'var(--surface-2)', icon: '🔴' },
  ];

  const max = Math.max(...rows.map(r => r.value), 1);

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map(row => (
        <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, width: 22, textAlign: 'center', flexShrink: 0 }}>{row.icon}</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)', width: 140, flexShrink: 0 }}>{row.label}</span>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(row.value / max) * 100}%`, background: row.color, borderRadius: 3, transition: 'width 0.6s var(--ease-out)', minWidth: row.value > 0 ? 4 : 0 }} />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 800, color: row.color, width: 28, textAlign: 'right', flexShrink: 0 }}>{row.value}</span>
        </div>
      ))}
      <div style={{ marginTop: 4, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
        <span style={{ color: 'var(--text-3)' }}>Total masuk</span>
        <span style={{ fontWeight: 800, color: 'var(--text)' }}>{stats.total}</span>
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, action, icon, accentColor, children }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: accentColor + '18', color: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 16, height: 16 }}>{icon}</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 1 }}>{subtitle}</div>}
          </div>
        </div>
        {action && (
          <a href={action.href} style={{ fontSize: '0.8125rem', fontWeight: 600, color: accentColor, padding: '5px 10px', borderRadius: 'var(--r-sm)', background: accentColor + '12', textDecoration: 'none', whiteSpace: 'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.background = accentColor + '22'}
            onMouseLeave={e => e.currentTarget.style.background = accentColor + '12'}
          >{action.label} →</a>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, accent, accentBg, href, badge }) {
  return (
    <a href={href} className="db-kpi" style={{ textDecoration: 'none' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, transition: 'box-shadow .15s, transform .15s, border-color .15s', cursor: 'pointer', position: 'relative' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = accent + '50'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        {badge && (
          <span style={{ position: 'absolute', top: 14, right: 14, background: accent, color: 'white', borderRadius: 99, padding: '1px 7px', fontSize: '0.6875rem', fontWeight: 800 }}>
            {badge}
          </span>
        )}
        <div style={{ width: 38, height: 38, borderRadius: 10, background: accentBg, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ width: 19, height: 19 }}>{icon}</span>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: 5 }}>{sub}</div>
        </div>
      </div>
    </a>
  );
}

// ─── Agenda Row ───────────────────────────────────────────────────────────────
function AgendaRow({ a }) {
  const status = getStatus(a.tanggal_mulai, a.tanggal_selesai, a.waktu_mulai, a.waktu_selesai);
  const cfg = {
    upcoming:      { label: 'Mendatang',   color: 'var(--info)', bg: 'var(--info-50)' },
    upcoming_soon: { label: 'Segera',      color: 'var(--warning)', bg: 'var(--warning-50)' },
    ongoing:       { label: 'Berlangsung', color: 'var(--success)', bg: 'var(--success-50)' },
    completed:     { label: 'Selesai',     color: 'var(--text-3)', bg: 'var(--surface-2)' },
  }[status] || { label: 'Mendatang', color: 'var(--info)', bg: 'var(--info-50)' };

  const d = new Date(a.tanggal_mulai);
  const isOngoing = status === 'ongoing';

  return (
    <div className="db-agenda-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid var(--border)', transition: 'background .12s', background: isOngoing ? 'var(--success-50)' : 'transparent' }}
      onMouseEnter={e => e.currentTarget.style.background = isOngoing ? 'var(--success-50)' : 'var(--surface-2)'}
      onMouseLeave={e => e.currentTarget.style.background = isOngoing ? 'var(--success-50)' : 'transparent'}
    >
      <div style={{ width: 44, flexShrink: 0, textAlign: 'center', background: isOngoing ? 'var(--success)' : 'var(--surface-3)', borderRadius: 10, padding: '6px 4px' }}>
        <div style={{ fontSize: '0.625rem', fontWeight: 700, color: isOngoing ? 'rgba(255,255,255,0.8)' : 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{MONTHS[d.getMonth()]}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isOngoing ? 'white' : 'var(--text)', lineHeight: 1.1 }}>{d.getDate()}</div>
        <div style={{ fontSize: '0.625rem', fontWeight: 600, color: isOngoing ? 'rgba(255,255,255,0.7)' : 'var(--text-3)' }}>{fmtTime(a.waktu_mulai)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.judul}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11, flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.lokasi || 'Lokasi tidak dicantumkan'}</span>
        </div>
      </div>
      <span style={{ padding: '3px 9px', borderRadius: 99, fontSize: '0.6875rem', fontWeight: 700, background: cfg.bg, color: cfg.color, flexShrink: 0, border: `1px solid ${cfg.color}22` }}>
        {cfg.label}
      </span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 20px', gap: 10 }}>
      <span style={{ fontSize: 36 }}>{icon}</span>
      <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', margin: 0 }}>{text}</p>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconCalendar  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '100%', height: '100%' }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconChart     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '100%', height: '100%' }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IconMessage   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '100%', height: '100%' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IconStar      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '100%', height: '100%' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IconClipboard = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '100%', height: '100%' }}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>;
