'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAgenda, useProgramKerja } from '@/lib/hooks/useSupabase';
import { OnboardingFlow, useOnboarding, RestartOnboardingButton } from '@/app/components/Onboarding';
import { SkeletonDashboard } from '@/app/components/Skeleton';
import { formatRupiahShort } from '@/lib/utils/format';

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

const getStatus = (mulai, selesai) => {
  const now = new Date(), s = new Date(mulai), e = new Date(selesai);
  if (now > e) return 'completed';
  if (now >= s) return 'ongoing';
  const days = Math.ceil((s - now) / 864e5);
  return days <= 3 ? 'upcoming_soon' : 'upcoming';
};

const fmtTime = (t) => t ? t.slice(0, 5) : '--:--';

function StatCard({ label, value, sub, trend, trendUp, color, icon }) {
  const colorMap = {
    primary: { bg: 'var(--primary-50)', fg: 'var(--primary)' },
    success: { bg: 'var(--success-50)', fg: 'var(--success)' },
    warning: { bg: 'var(--warning-50)', fg: 'var(--warning)' },
    accent:  { bg: 'var(--accent-soft)', fg: '#8a6500' }
  };
  const c = colorMap[color] || colorMap.primary;
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className="stat-icon-wrap" style={{ background: c.bg, color: c.fg }}>
          {icon}
        </div>
        {trend && (
          <span className={'stat-trend ' + (trendUp ? 'up' : 'down')}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function AgendaRow({ a }) {
  const status = getStatus(a.tanggal_mulai, a.tanggal_selesai);
  const statusInfo = {
    upcoming: { label: 'Akan Datang', tone: 'primary' },
    upcoming_soon: { label: 'Segera', tone: 'accent' },
    ongoing: { label: 'Berlangsung', tone: 'success' },
    completed: { label: 'Selesai', tone: 'neutral' }
  }[status] || { label: 'Akan Datang', tone: 'primary' };
  const d = new Date(a.tanggal_mulai);
  return (
    <div className="agenda-row">
      <div className="agenda-date">
        <div className="agenda-date-month">{MONTHS[d.getMonth()]}</div>
        <div className="agenda-date-day">{d.getDate()}</div>
        <div className="agenda-date-time">{fmtTime(a.waktu_mulai)}</div>
      </div>
      <div className="agenda-body">
        <div className="agenda-title truncate">{a.judul}</div>
        <div className="agenda-meta">
          <span className="agenda-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {a.lokasi || '-'}
          </span>
        </div>
      </div>
      <span className={'badge badge-' + statusInfo.tone}>{statusInfo.label}</span>
    </div>
  );
}

function PencairanRow({ p }) {
  const pct = p.pagu_anggaran > 0 ? Math.round((p.dana_terpakai / p.pagu_anggaran) * 100) : 0;
  const tone = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'accent';
  return (
    <div className="agenda-row">
      <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: 'var(--primary-50)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="agenda-title truncate" style={{ fontSize: '0.875rem' }}>{p.nama}</div>
        <div className="agenda-meta">
          <span className="muted">{p.id_rka || '-'}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="num" style={{ fontWeight: 700, fontSize: '0.875rem' }}>{formatRupiahShort(p.dana_terpakai)}</div>
        <span className={'badge badge-' + tone} style={{ marginTop: 4 }}>{pct}%</span>
      </div>
    </div>
  );
}

function BarChart({ programs }) {
  const data = programs.slice(0, 8).map(p => ({
    unit: (p.unit_kerja_id || p.unit || 'Unit').slice(0, 6),
    pagu: Math.round((p.pagu_anggaran || 0) / 1e6),
    real: Math.round((p.dana_terpakai || 0) / 1e6)
  }));
  if (!data.length) return <div className="muted" style={{ textAlign: 'center', padding: 32 }}>Belum ada data</div>;
  const W = 720, H = 220, P = 32;
  const max = Math.max(...data.map(d => d.pagu), 1);
  const bandW = (W - P * 2) / data.length;
  const barW = bandW * 0.32;
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H + 40}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ minWidth: 480 }}>
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const y = P + (H - P) * (1 - t);
          return (
            <g key={t}>
              <line x1={P} x2={W - P} y1={y} y2={y} stroke="#e4e7ee" strokeDasharray="3 4" />
              <text x={P - 8} y={y + 4} fontSize="10" fill="#94a3b8" textAnchor="end">{Math.round(max * t)}M</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = P + i * bandW + bandW / 2;
          const paguH = ((H - P) * d.pagu) / max;
          const realH = ((H - P) * d.real) / max;
          return (
            <g key={d.unit + i}>
              <rect x={x - barW - 2} y={H - paguH} width={barW} height={paguH} rx="3" fill="var(--primary-100)" opacity="0.7" />
              <rect x={x + 2} y={H - realH} width={barW} height={realH} rx="3" fill="var(--primary)" />
              <text x={x} y={H + 18} fontSize="11" fill="#64748b" textAnchor="middle" fontWeight="500">{d.unit}</text>
            </g>
          );
        })}
        <g transform={`translate(${P}, ${H + 32})`}>
          <rect x={0} y={0} width={10} height={10} rx="2" fill="var(--primary-100)" />
          <text x={16} y={9} fontSize="11" fill="#64748b">Pagu (jutaan)</text>
          <rect x={120} y={0} width={10} height={10} rx="2" fill="var(--primary)" />
          <text x={136} y={9} fontSize="11" fill="#64748b">Realisasi SPJ</text>
        </g>
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const [userName, setUserName] = useState('Admin');
  const { showOnboarding, completeOnboarding, skipOnboarding, resetOnboarding } = useOnboarding('dashboard');
  const { data: agendaData, loading: agendaLoading } = useAgenda();
  const { data: programData, loading: programLoading } = useProgramKerja();

  useEffect(() => {
    try {
      const s = localStorage.getItem('simdir_session');
      if (s) {
        const d = JSON.parse(atob(s));
        if (d.username) setUserName(d.username);
      }
    } catch {}
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 18) return 'Selamat Malam';
    if (h >= 15) return 'Selamat Sore';
    if (h >= 11) return 'Selamat Siang';
    return 'Selamat Pagi';
  })();

  const todayStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const stats = useMemo(() => {
    const active = agendaData.filter(a => {
      const s = getStatus(a.tanggal_mulai, a.tanggal_selesai);
      return s !== 'completed';
    });
    const totalPagu = programData.reduce((s, p) => s + (p.pagu_anggaran || 0), 0);
    const totalSPJ = programData.reduce((s, p) => s + (p.dana_terpakai || 0), 0);
    const pct = totalPagu > 0 ? Math.round((totalSPJ / totalPagu) * 100) : 0;
    return { active: active.length, total: agendaData.length, totalPagu, totalSPJ, pct, sisa: totalPagu - totalSPJ };
  }, [agendaData, programData]);

  const upcomingAgenda = useMemo(() =>
    agendaData
      .filter(a => getStatus(a.tanggal_mulai, a.tanggal_selesai) !== 'completed')
      .sort((a, b) => new Date(a.tanggal_mulai) - new Date(b.tanggal_mulai))
      .slice(0, 5),
    [agendaData]
  );

  const topPrograms = useMemo(() =>
    [...programData].sort((a, b) => (b.dana_terpakai || 0) - (a.dana_terpakai || 0)).slice(0, 4),
    [programData]
  );

  if (agendaLoading || programLoading) return <SkeletonDashboard />;

  return (
    <div>
      <OnboardingFlow pageKey="dashboard" isOpen={showOnboarding} onComplete={completeOnboarding} onSkip={skipOnboarding} />
      {!showOnboarding && (
        <div style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 20 }}>
          <RestartOnboardingButton onClick={resetOnboarding} />
        </div>
      )}

      {/* Page header */}
      <div className="page-header">
        <div className="page-title-wrap">
          <div className="eyebrow" style={{ marginBottom: 6 }}>{todayStr}</div>
          <h1 className="page-title">{greeting}, {userName} 👋</h1>
          <p className="page-subtitle">Ringkasan kegiatan &amp; anggaran Direktorat USC hari ini.</p>
        </div>
        <div className="page-actions">
          <a href="/kelola-agenda" className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Agenda
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Agenda Aktif"
          value={stats.active}
          sub={`${stats.total} agenda terdaftar`}
          color="primary"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        />
        <StatCard
          label="Total Pagu 2026"
          value={formatRupiahShort(stats.totalPagu)}
          sub={`${programData.length} program aktif`}
          color="accent"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>}
        />
        <StatCard
          label="Realisasi SPJ"
          value={formatRupiahShort(stats.totalSPJ)}
          sub={`Serapan ${stats.pct}% dari pagu`}
          trend={stats.pct + '%'}
          trendUp
          color="success"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
        />
        <StatCard
          label="Sisa Anggaran"
          value={formatRupiahShort(stats.sisa)}
          sub="Belum dicairkan"
          trend={(100 - stats.pct) + '%'}
          trendUp={false}
          color="warning"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
        />
      </div>

      {/* Main grid */}
      <div className="dashboard-grid">
        {/* Left column */}
        <div className="col-flex" style={{ gap: 20, minWidth: 0 }}>
          {/* Bar chart */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Realisasi Anggaran per Program</div>
                <div className="muted" style={{ fontSize: '0.8125rem', marginTop: 2 }}>Tahun anggaran 2026</div>
              </div>
            </div>
            <div className="card-body">
              <BarChart programs={programData} />
            </div>
          </div>

          {/* Top programs */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Program Kerja Prioritas</div>
              <a href="/program-kerja" className="btn btn-ghost btn-sm">
                Lihat Semua
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
              </a>
            </div>
            <div className="card-body" style={{ padding: 16 }}>
              <div className="col-flex" style={{ gap: 10 }}>
                {topPrograms.length === 0 ? (
                  <div className="muted" style={{ textAlign: 'center', padding: 24 }}>Belum ada data program</div>
                ) : topPrograms.map((p, idx) => {
                  const pct = p.pagu_anggaran > 0 ? Math.round((p.dana_terpakai / p.pagu_anggaran) * 100) : 0;
                  const tone = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger';
                  return (
                    <div key={p.id} className="program-card">
                      <div className="program-card-head">
                        <div className="row-flex" style={{ gap: 10, minWidth: 0, flex: 1 }}>
                          <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: idx === 0 ? 'var(--accent)' : 'var(--primary-50)', color: idx === 0 ? '#1a1a1a' : 'var(--primary)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '0.8125rem' }}>
                            {idx + 1}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div className="program-card-title truncate">{p.nama}</div>
                            <div className="program-card-unit">{p.id_rka || '-'} • {p.unit_kerja_id || p.unit || 'Unit'}</div>
                          </div>
                        </div>
                        <span className={'badge badge-' + tone}>{pct}%</span>
                      </div>
                      <div className={'progress ' + tone}>
                        <div className="progress-bar" style={{ width: pct + '%' }}></div>
                      </div>
                      <div className="program-card-amounts">
                        <span className="muted">Terealisasi</span>
                        <div className="row-flex" style={{ gap: 6 }}>
                          <strong className="num">{formatRupiahShort(p.dana_terpakai)}</strong>
                          <span className="muted">/ {formatRupiahShort(p.pagu_anggaran)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-flex" style={{ gap: 20, minWidth: 0 }}>
          {/* Upcoming agenda */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Agenda Mendatang</div>
              <a href="/kelola-agenda" className="btn btn-ghost btn-sm">
                Semua
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
              </a>
            </div>
            <div>
              {upcomingAgenda.length === 0 ? (
                <div className="muted" style={{ textAlign: 'center', padding: 32 }}>Belum ada agenda mendatang</div>
              ) : upcomingAgenda.map(a => <AgendaRow key={a.id} a={a} />)}
            </div>
          </div>

          {/* Recent pencairan = top spending programs */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Pencairan Terbaru</div>
              <a href="/pencairan" className="btn btn-ghost btn-sm">
                Semua
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
              </a>
            </div>
            <div>
              {topPrograms.length === 0 ? (
                <div className="muted" style={{ textAlign: 'center', padding: 32 }}>Belum ada data</div>
              ) : topPrograms.map(p => <PencairanRow key={p.id} p={p} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile quick actions */}
      <div className="hide-desktop" style={{ marginTop: 8 }}>
        <div className="eyebrow mb-3">Akses Cepat</div>
        <div className="qa-grid">
          {[
            { href: '/kelola-agenda', label: 'Agenda', color: 'primary', bg: 'var(--primary-50)', fg: 'var(--primary)', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
            { href: '/program-kerja', label: 'Program', color: 'success', bg: 'var(--success-50)', fg: 'var(--success)', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
            { href: '/pencairan', label: 'Pencairan', color: 'warning', bg: 'var(--warning-50)', fg: 'var(--warning)', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/></svg> },
            { href: '/laporan', label: 'Laporan', color: 'accent', bg: 'var(--accent-soft)', fg: '#8a6500', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
            { href: '/surat', label: 'Surat', color: 'primary', bg: 'var(--primary-50)', fg: 'var(--primary)', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg> },
            { href: '/pengaturan/users', label: 'Pengguna', color: 'success', bg: 'var(--success-50)', fg: 'var(--success)', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
          ].map(qa => (
            <a key={qa.href} href={qa.href} className="qa-card" style={{ textDecoration: 'none' }}>
              <div className="qa-icon" style={{ background: qa.bg, color: qa.fg }}>
                <svg style={{ width: 20, height: 20 }}>{qa.icon.props.children}</svg>
              </div>
              <span>{qa.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
