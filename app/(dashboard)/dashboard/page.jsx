'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAgenda, useProgramKerja } from '@/lib/hooks/useSupabase';
import { OnboardingFlow, useOnboarding, RestartOnboardingButton } from '@/app/components/Onboarding';
import { SkeletonDashboard } from '@/app/components/Skeleton';

// Format helpers
const formatRupiah = (num) => {
  if (!num || isNaN(num)) return 'Rp 0';
  if (num >= 1000000000) return 'Rp ' + (num / 1000000000).toFixed(1) + 'M';
  if (num >= 1000000) return 'Rp ' + (num / 1000000).toFixed(1) + 'Jt';
  return 'Rp ' + num.toLocaleString('id-ID');
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper untuk status agenda
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
};

// ============ KOMPONEN WELCOME SECTION ============
function WelcomeSection({ userName, date }) {
  const hour = new Date().getHours();
  let greeting = 'Selamat Pagi';
  if (hour >= 11) greeting = 'Selamat Siang';
  if (hour >= 15) greeting = 'Selamat Sore';
  if (hour >= 18) greeting = 'Selamat Malam';

  return (
    <div className="card mb-6 welcome-card" style={{ 
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
      color: 'white'
    }}>
      <div className="card-body welcome-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'white' }}>
            {greeting}, {userName}! <span aria-hidden="true">👋</span>
          </h2>
          <p style={{ opacity: 0.9, fontSize: '0.9375rem' }}>
            Berikut ringkasan aktivitas dan anggaran hari ini.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.8125rem', opacity: 0.8 }}>{date}</p>
          <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>Dashboard SIMDIR</p>
        </div>
      </div>
    </div>
  );
}

// ============ KOMPONEN STAT CARD ============
function StatCard({ title, value, subtitle, trend, trendUp, icon, color }) {
  return (
    <div className="card" style={{ 
      borderLeft: `4px solid ${color}`,
      transition: 'transform 0.2s, box-shadow 0.2s'
    }}>
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
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
              fontWeight: 600,
              color: trendUp ? 'var(--success)' : 'var(--danger)',
              background: trendUp ? 'var(--success-bg)' : 'var(--danger-bg)',
              padding: '0.125rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              {trendUp ? '↑' : '↓'} {trend}
            </span>
          )}
        </div>
        <p className="muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{title}</p>
        <p style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{value}</p>
        {subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// ============ KOMPONEN PROGRESS BAR ============
function ProgressBar({ value, max, label, showPercentage = true }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  
  let colorVar = 'var(--success)';
  if (percentage < 30) colorVar = 'var(--danger)';
  else if (percentage < 60) colorVar = 'var(--warning)';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{label}</span>
        {showPercentage && (
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: colorVar }}>
            {Math.round(percentage)}%
          </span>
        )}
      </div>
      <div style={{ width: '100%', background: 'var(--surface-3)', borderRadius: '9999px', height: '0.5rem' }}>
        <div 
          style={{ 
            height: '0.5rem', 
            borderRadius: '9999px', 
            transition: 'width 0.5s ease',
            background: colorVar,
            width: `${percentage}%`
          }}
        />
      </div>
    </div>
  );
}

// ============ KOMPONEN QUICK ACTION ============
function QuickAction({ icon, label, href, color }) {
  return (
    <a 
      href={href}
      className="card"
      style={{ 
        textDecoration: 'none',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
    >
      <div className="card-body" style={{ textAlign: 'center', padding: '1.25rem' }}>
        <div style={{ 
          width: '3rem', 
          height: '3rem', 
          borderRadius: '50%',
          background: `${color}15`,
          color: color,
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 0.75rem'
        }}>
          {icon}
        </div>
        <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text)' }}>{label}</p>
      </div>
    </a>
  );
}

// ============ KOMPONEN PROGRAM CARD ============
function ProgramCard({ program, index }) {
  const progress = program.pagu > 0 ? (program.terpakai / program.pagu) * 100 : 0;
  
  return (
    <div className="program-card" style={{ 
      padding: '1rem',
      background: 'var(--surface-2)',
      borderRadius: 'var(--radius)',
      marginBottom: '0.75rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
          <span style={{ 
            width: '1.75rem', 
            height: '1.75rem', 
            borderRadius: '50%',
            background: 'var(--primary)',
            color: 'white',
            display: 'grid',
            placeItems: 'center',
            fontSize: '0.75rem',
            fontWeight: 600,
            flexShrink: 0
          }}>
            {index + 1}
          </span>
          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: '0.875rem', display: 'block' }} className="truncate">{program.nama}</strong>
            <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>
              {program.unit} • ID: {program.id_rka}
            </p>
          </div>
        </div>
        <span className="status-badge" style={{ 
          fontSize: '0.6875rem',
          padding: '0.125rem 0.5rem',
          borderRadius: 'var(--radius-full)',
          background: progress >= 80 ? 'var(--success-bg)' : progress >= 50 ? 'var(--warning-bg)' : 'var(--danger-bg)',
          color: progress >= 80 ? 'var(--success)' : progress >= 50 ? 'var(--warning)' : 'var(--danger)',
          flexShrink: 0
        }}>
          {Math.round(progress)}%
        </span>
      </div>
      <ProgressBar value={program.terpakai} max={program.pagu} label="" />
      <div className="program-card-meta">
        <span className="muted">{formatRupiah(program.terpakai)}</span>
        <span className="muted">dari {formatRupiah(program.pagu)}</span>
      </div>
    </div>
  );
}

// ============ KOMPONEN AGENDA ITEM ============
function AgendaItem({ agenda }) {
  const statusColors = {
    upcoming: 'var(--primary)',
    ongoing: 'var(--success)',
    completed: 'var(--text-3)'
  };
  
  const statusLabels = {
    upcoming: 'Akan Datang',
    ongoing: 'Sedang Berlangsung',
    completed: 'Selesai'
  };

  return (
    <div style={{ 
      display: 'flex',
      gap: '0.75rem',
      padding: '0.75rem',
      background: 'var(--surface-2)',
      borderRadius: 'var(--radius)',
      marginBottom: '0.5rem'
    }}>
      <div style={{ 
        width: '2.5rem', 
        height: '2.5rem', 
        borderRadius: 'var(--radius)',
        background: `${statusColors[agenda.status]}15`,
        color: statusColors[agenda.status],
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <strong style={{ fontSize: '0.8125rem' }}>{agenda.judul}</strong>
          <span style={{
            fontSize: '0.75rem',
            padding: '0.125rem 0.375rem',
            borderRadius: 'var(--radius-full)',
            background: `${statusColors[agenda.status]}15`,
            color: statusColors[agenda.status]
          }}>
            {statusLabels[agenda.status]}
          </span>
        </div>
        <p className="muted" style={{ fontSize: '0.6875rem', marginTop: '0.25rem' }}>
          {agenda.lokasi} • {formatDate(agenda.tanggal)}
        </p>
      </div>
    </div>
  );
}

// ============ KOMPONEN ACTIVITY ITEM ============
function ActivityItem({ activity }) {
  const iconMap = {
    agenda: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    pencairan: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    spj: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    program: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    info: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    )
  };

  const colorMap = {
    agenda: 'var(--primary)',
    pencairan: 'var(--success)',
    spj: 'var(--warning)',
    program: 'var(--success)',
    info: 'var(--primary)'
  };

  return (
    <div className="activity-item">
      <div style={{ 
        width: '2rem', 
        height: '2rem', 
        borderRadius: '50%',
        background: `${colorMap[activity.type]}15`,
        color: colorMap[activity.type],
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0
      }}>
        {iconMap[activity.type]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text)', marginBottom: '0.125rem' }}>
          {activity.message}
        </p>
        <p className="muted" style={{ fontSize: '0.6875rem' }}>{activity.time}</p>
      </div>
    </div>
  );
}

// ============ HALAMAN UTAMA ============
export default function DashboardPage() {
  // User info
  const [userName, setUserName] = useState('Administrator');
  const currentDate = new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Onboarding
  const { showOnboarding, completeOnboarding, skipOnboarding, resetOnboarding } = useOnboarding('dashboard');

  // Get user info from session
  useEffect(() => {
    try {
      const sessionData = localStorage.getItem('simdir_session');
      if (sessionData) {
        const decoded = JSON.parse(atob(sessionData));
        if (decoded.username) {
          setUserName(decoded.username);
        }
      }
    } catch (e) {
      console.error('Error reading user session:', e);
    }
  }, []);

  // Fetch data from Supabase
  const { data: agendaData, loading: agendaLoading } = useAgenda();
  const { data: programData, loading: programLoading } = useProgramKerja();

  // Calculate stats from real data
  const stats = useMemo(() => {
    const activeAgenda = agendaData.filter(item => {
      const status = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai);
      return status === 'upcoming' || status === 'upcoming_soon' || status === 'ongoing';
    }).length;

    const totalPagu = programData.reduce((sum, p) => sum + (p.pagu_anggaran || 0), 0);
    
    return {
      agenda: { value: activeAgenda, total: agendaData.length, trend: '+0', trendUp: true },
      pagu: { value: totalPagu, trend: '+0%', trendUp: true },
      spj: { value: 0, percentage: 0, trend: '0%', trendUp: true },
      sisa: { value: totalPagu }
    };
  }, [agendaData, programData]);

  // Program data (top 4)
  const programs = useMemo(() => {
    return programData.slice(0, 4).map(p => ({
      id_rka: p.id?.slice(0, 5) || '-',
      nama: p.nama,
      unit: 'Unit Kerja',
      pagu: p.pagu_anggaran || 0,
      terpakai: 0
    }));
  }, [programData]);

  // Agenda data (top 3 upcoming)
  const agendas = useMemo(() => {
    return agendaData
      .filter(item => {
        const status = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai);
        return status === 'upcoming' || status === 'upcoming_soon';
      })
      .slice(0, 3)
      .map(item => ({
        judul: item.judul,
        lokasi: item.lokasi || '-',
        tanggal: new Date(item.tanggal_mulai),
        status: 'upcoming'
      }));
  }, [agendaData]);

  // Activity data (placeholder - could be fetched from activity_log)
  const activities = [
    { type: 'info', message: 'Data dashboard diperbarui secara real-time', time: 'Baru saja' },
  ];

  // Alerts data
  const alerts = useMemo(() => {
    const alertList = [];
    if (agendaData.length === 0) {
      alertList.push({ type: 'info', message: 'Belum ada agenda yang ditambahkan' });
    }
    if (programData.length === 0) {
      alertList.push({ type: 'info', message: 'Belum ada program kerja yang ditambahkan' });
    }
    return alertList.length > 0 ? alertList : [{ type: 'success', message: 'Semua data tersinkron dengan baik' }];
  }, [agendaData, programData]);

  if (agendaLoading || programLoading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="dashboard-page">
      {/* Onboarding */}
      <OnboardingFlow
        pageKey="dashboard"
        isOpen={showOnboarding}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />
      
      {/* Restart Onboarding Button (hanya tampil jika sudah complete) */}
      {!showOnboarding && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <RestartOnboardingButton onClick={resetOnboarding} />
        </div>
      )}
      
      {/* Welcome Section */}
      <WelcomeSection userName={userName} date={currentDate} />

      {/* Quick Actions */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Akses Cepat</h3>
        <div className="quick-actions-grid">
          <QuickAction 
            label="Program Kerja"
            href="/program-kerja"
            color="var(--primary)"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          />
          <QuickAction 
            label="Pencairan"
            href="/pencairan"
            color="var(--success)"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
          />
          <QuickAction 
            label="Laporan"
            href="/laporan"
            color="var(--warning)"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            }
          />
          <QuickAction 
            label="Pengaturan"
            href="/pengaturan/users"
            color="var(--danger)"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6m4.22-10.22l4.24-4.24M6.34 6.34L2.1 2.1m17.8 17.8l-4.24-4.24M6.34 17.66l-4.24 4.24M23 12h-6m-6 0H1m20.07-4.93l-4.24 4.24M6.34 6.34l-4.24-4.24" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid mb-6">
        <StatCard
          title="Agenda Aktif"
          value={stats.agenda.value}
          subtitle={`dari ${stats.agenda.total} agenda bulan ini`}
          trend={stats.agenda.trend}
          trendUp={stats.agenda.trendUp}
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
          title="Total Pagu Anggaran"
          value={formatRupiah(stats.pagu.value)}
          subtitle="Anggaran Tahun 2026"
          trend={stats.pagu.trend}
          trendUp={stats.pagu.trendUp}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          color="var(--success)"
        />
        <StatCard
          title="Total SPJ"
          value={formatRupiah(stats.spj.value)}
          subtitle={`Serapan ${stats.spj.percentage}%`}
          trend={stats.spj.trend}
          trendUp={stats.spj.trendUp}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          }
          color="var(--warning)"
        />
        <StatCard
          title="Sisa Anggaran"
          value={formatRupiah(stats.sisa.value)}
          subtitle="Belum digunakan"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          }
          color="var(--danger)"
        />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          {alerts.map((alert, idx) => (
            <div 
              key={idx}
              style={{ 
                padding: '0.75rem 1rem',
                background: alert.type === 'warning' ? 'var(--warning-bg)' : 'var(--primary-bg)',
                borderLeft: `4px solid ${alert.type === 'warning' ? 'var(--warning)' : 'var(--primary)'}`,
                borderRadius: 'var(--radius)',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ 
                width: '1rem', 
                height: '1rem',
                color: alert.type === 'warning' ? 'var(--warning)' : 'var(--primary)'
              }}>
                {alert.type === 'warning' ? (
                  <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>
                ) : (
                  <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>
                )}
              </svg>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text)' }}>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Left Column */}
        <div>
          {/* Program Kerja */}
          <div className="card mb-4">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Program Kerja Terbaru</h3>
              <a href="/program-kerja" className="btn btn-ghost" style={{ fontSize: '0.75rem' }}>
                Lihat Semua →
              </a>
            </div>
            <div className="card-body">
              {programs.map((program, index) => (
                <ProgramCard key={program.id_rka} program={program} index={index} />
              ))}
            </div>
          </div>

          {/* Tabel Ringkasan */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Ringkasan Anggaran per Unit</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Unit Kerja</th>
                      <th className="text-right">Pagu</th>
                      <th className="text-right">Terpakai</th>
                      <th className="text-center">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { unit: 'USC', pagu: 500000000, terpakai: 325000000 },
                      { unit: 'Kolam Renang', pagu: 250000000, terpakai: 187500000 },
                      { unit: 'PUI Keolahragaan', pagu: 400000000, terpakai: 280000000 },
                      { unit: 'SSFC', pagu: 600000000, terpakai: 540000000 },
                      { unit: 'Driving Golf', pagu: 837500000, terpakai: 670000000 },
                    ].map((item, idx) => {
                      const pct = item.pagu > 0 ? Math.round((item.terpakai / item.pagu) * 100) : 0;
                      return (
                        <tr key={idx}>
                          <td>
                            <strong style={{ fontSize: '0.8125rem' }}>{item.unit}</strong>
                          </td>
                          <td className="text-right">{formatRupiah(item.pagu)}</td>
                          <td className="text-right">{formatRupiah(item.terpakai)}</td>
                          <td style={{ width: '80px' }}>
                            <ProgressBar value={pct} max={100} label="" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Agenda */}
          <div className="card mb-4">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Agenda Mendatang</h3>
              <a href="/kelola-agenda" className="btn btn-ghost" style={{ fontSize: '0.75rem' }}>
                Lihat Semua →
              </a>
            </div>
            <div className="card-body">
              {agendas.map((agenda, idx) => (
                <AgendaItem key={idx} agenda={agenda} />
              ))}
            </div>
          </div>

          {/* Aktivitas */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Aktivitas Terbaru</h3>
            </div>
            <div className="card-body" style={{ padding: '0 1rem' }}>
              {activities.map((activity, idx) => (
                <ActivityItem key={idx} activity={activity} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
