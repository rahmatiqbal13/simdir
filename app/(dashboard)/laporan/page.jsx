'use client';

import { useState, useMemo } from 'react';

// Data bulan
const BULAN_LIST = [
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

const TAHUN_LIST = [2024, 2025, 2026, 2027];

const UNIT_KERJA_LIST = [
  'USC', 'PUI Keolahragaan', 'PUI Disabilitas', 'PUI Seni Budaya',
  'Kolam Renang', 'Driving Golf', 'ULABK', 'SSFC',
  'PUIPT Seni Budaya Majapahitan', 'PUIPT DIC', 'PUIPT SERC'
];

const formatRupiah = (num) => {
  if (!num || isNaN(num)) return 'Rp 0';
  return 'Rp ' + num.toLocaleString('id-ID');
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
};

// ============ KOMPONEN STAT CARD ============
function StatCard({ title, value, subtitle, variant, icon }) {
  const variants = {
    default: '',
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    info: 'info'
  };

  const iconColors = {
    default: 'var(--primary-bg)',
    success: 'var(--success-bg)',
    warning: 'var(--warning-bg)',
    danger: 'var(--danger-bg)',
    info: 'var(--primary-bg)'
  };

  const iconTextColors = {
    default: 'var(--primary)',
    success: 'var(--success)',
    warning: 'var(--warning)',
    danger: 'var(--danger)',
    info: 'var(--primary)'
  };

  return (
    <div className={`stat-card ${variants[variant] || ''}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="stat-label">{title}</div>
          <div className="stat-value">{value}</div>
          {subtitle && <div className="muted text-sm mt-1">{subtitle}</div>}
        </div>
        {icon && (
          <div style={{ 
            padding: '0.75rem', 
            borderRadius: 'var(--radius)',
            background: iconColors[variant] || iconColors.default,
            color: iconTextColors[variant] || iconTextColors.default
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ KOMPONEN PROGRESS BAR ============
function ProgressBar({ value, max, showLabel = true }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  
  let colorVar = 'var(--success)';
  if (percentage < 50) colorVar = 'var(--danger)';
  else if (percentage < 80) colorVar = 'var(--warning)';

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
          <span style={{ color: 'var(--text-2)' }}>Progress</span>
          <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>{Math.round(percentage)}%</span>
        </div>
      )}
      <div style={{ width: '100%', background: 'var(--surface-3)', borderRadius: '9999px', height: '0.5rem' }}>
        <div 
          style={{ 
            height: '0.5rem', 
            borderRadius: '9999px', 
            transition: 'width 0.3s ease',
            background: colorVar,
            width: `${percentage}%`
          }}
        />
      </div>
    </div>
  );
}

// ============ KOMPONEN STATUS BADGE ============
function StatusBadge({ percentage }) {
  let config = { text: 'Rendah', class: 'badge-slate' };
  if (percentage >= 90) config = { text: 'Optimal', class: 'badge-green' };
  else if (percentage >= 70) config = { text: 'Baik', class: 'badge-blue' };
  else if (percentage >= 50) config = { text: 'Sedang', class: 'badge-amber' };
  else if (percentage > 0) config = { text: 'Perlu Perhatian', class: 'badge-amber' };

  return (
    <span className={`badge ${config.class}`}>
      {config.text}
    </span>
  );
}

// ============ KOMPONEN FILTER SECTION ============
function FilterSection({ 
  filterPeriode, setFilterPeriode,
  filterBulan, setFilterBulan,
  filterTahun, setFilterTahun,
  filterUnit, setFilterUnit,
  onGenerateReport
}) {
  return (
    <div className="card mb-6">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Filter Laporan</h3>
        <span className="muted" style={{ fontSize: '0.75rem' }}>Sesuaikan parameter laporan</span>
      </div>
      <div className="card-body">
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          {/* Periode */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>
              Periode Laporan
            </label>
            <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '0.25rem' }}>
              <button
                onClick={() => setFilterPeriode('bulanan')}
                style={{
                  flex: 1,
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius)',
                  border: 'none',
                  background: filterPeriode === 'bulanan' ? 'var(--surface)' : 'transparent',
                  boxShadow: filterPeriode === 'bulanan' ? 'var(--shadow-sm)' : 'none',
                  color: filterPeriode === 'bulanan' ? 'var(--primary)' : 'var(--text-2)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Bulanan
              </button>
              <button
                onClick={() => setFilterPeriode('tahunan')}
                style={{
                  flex: 1,
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius)',
                  border: 'none',
                  background: filterPeriode === 'tahunan' ? 'var(--surface)' : 'transparent',
                  boxShadow: filterPeriode === 'tahunan' ? 'var(--shadow-sm)' : 'none',
                  color: filterPeriode === 'tahunan' ? 'var(--primary)' : 'var(--text-2)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Tahunan
              </button>
            </div>
          </div>

          {/* Bulan */}
          {filterPeriode === 'bulanan' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                Bulan
              </label>
              <select 
                value={filterBulan} 
                onChange={e => setFilterBulan(e.target.value)}
                style={{ width: '100%' }}
              >
                {BULAN_LIST.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tahun */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>
              Tahun Anggaran
            </label>
            <select 
              value={filterTahun} 
              onChange={e => setFilterTahun(e.target.value)}
              style={{ width: '100%' }}
            >
              {TAHUN_LIST.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Unit Kerja */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>
              Unit Kerja
            </label>
            <select 
              value={filterUnit} 
              onChange={e => setFilterUnit(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">Semua Unit</option>
              {UNIT_KERJA_LIST.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-ghost"
            onClick={() => {
              setFilterPeriode('bulanan');
              setFilterBulan('5');
              setFilterTahun('2026');
              setFilterUnit('');
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
            Reset Filter
          </button>
          <button className="btn btn-primary" onClick={onGenerateReport}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Generate Laporan
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ KOMPONEN CHART BAR SEDERHANA ============
function SimpleBarChart({ data }) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div style={{ marginTop: '1rem' }}>
      {data.map((item, idx) => (
        <div key={idx} style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--text-2)' }}>{item.label}</span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{item.value}%</span>
          </div>
          <div style={{ width: '100%', background: 'var(--surface-3)', borderRadius: 'var(--radius)', height: '1.5rem', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                borderRadius: 'var(--radius)',
                transition: 'width 0.5s ease',
                background: item.color || 'var(--primary)',
                width: `${(item.value / maxValue) * 100}%`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '0.5rem'
              }}
            >
              <span style={{ color: 'white', fontSize: '0.6875rem', fontWeight: 600 }}>
                {item.value > 15 ? `${item.value}%` : ''}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ KOMPONEN PREVIEW MODAL ============
function PreviewModal({ show, onClose, filterPeriode, filterBulan, filterTahun, data, totals }) {
  if (!show) return null;

  const bulanLabel = BULAN_LIST.find(b => b.value === filterBulan)?.label || '';
  const periodeText = filterPeriode === 'bulanan' ? `${bulanLabel} ${filterTahun}` : `Tahun ${filterTahun}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Preview Laporan</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {/* Header Laporan */}
          <div style={{ textAlign: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '2px solid var(--text)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              LAPORAN SERAPAN DANA
            </h3>
            <p className="muted">Periode {periodeText}</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Tanggal Cetak: {formatDate(new Date())}
            </p>
          </div>

          {/* Ringkasan */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Ringkasan Anggaran</h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '1rem',
              background: 'var(--surface-2)',
              padding: '1rem',
              borderRadius: 'var(--radius)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <p className="muted" style={{ fontSize: '0.6875rem' }}>Total Pagu</p>
                <p style={{ fontSize: '1rem', fontWeight: 700 }}>{formatRupiah(totals.pagu)}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p className="muted" style={{ fontSize: '0.6875rem' }}>Total SPJ</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>{formatRupiah(totals.spj)}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p className="muted" style={{ fontSize: '0.6875rem' }}>Sisa Dana</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: totals.sisa < 0 ? 'var(--danger)' : 'var(--text)' }}>
                  {formatRupiah(totals.sisa)}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p className="muted" style={{ fontSize: '0.6875rem' }}>% Serapan</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: totals.serapan >= 80 ? 'var(--success)' : totals.serapan >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                  {totals.serapan}%
                </p>
              </div>
            </div>
          </div>

          {/* Tabel Detail */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Detail Program Kerja</h4>
            <div className="table-wrap">
              <table style={{ fontSize: '0.8125rem' }}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Program Kerja</th>
                    <th className="text-right">Pagu</th>
                    <th className="text-right">SPJ</th>
                    <th className="text-right">Sisa</th>
                    <th className="text-center">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, idx) => {
                    const sisa = item.pagu - item.total_spj;
                    const pct = item.pagu > 0 ? Math.round((item.total_spj / item.pagu) * 100) : 0;
                    return (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{item.nama}</td>
                        <td className="text-right">{formatRupiah(item.pagu)}</td>
                        <td className="text-right">{formatRupiah(item.total_spj)}</td>
                        <td className={`text-right ${sisa < 0 ? 'text-danger' : ''}`}>{formatRupiah(sisa)}</td>
                        <td className="text-center">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tanda Tangan */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.8125rem', marginBottom: '3rem' }}>Mengetahui,</p>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Kepala Unit</p>
              <p style={{ fontSize: '0.75rem' }}>NIP. ....................</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
            <button className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ HALAMAN UTAMA ============
export default function LaporanPage() {
  // Filter states
  const [filterPeriode, setFilterPeriode] = useState('bulanan');
  const [filterBulan, setFilterBulan] = useState('5');
  const [filterTahun, setFilterTahun] = useState('2026');
  const [filterUnit, setFilterUnit] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  const userRole = 'super_admin';
  const canAccess = ['super_admin', 'admin_keuangan'].includes(userRole);

  // Data program (simulasi)
  const programData = [
    { id: 1, nama: 'Peningkatan tata kelola unit kerja', unit_kerja: 'USC', tahun: 2026, pagu: 150000000, total_spj: 125000000 },
    { id: 2, nama: 'Pemeliharaan fasilitas olahraga', unit_kerja: 'Kolam Renang', tahun: 2026, pagu: 75000000, total_spj: 65000000 },
    { id: 3, nama: 'Pengelolaan olahraga pendidikan', unit_kerja: 'PUI Keolahragaan', tahun: 2026, pagu: 100000000, total_spj: 80000000 },
    { id: 4, nama: 'Pengembangan atlet muda', unit_kerja: 'SSFC', tahun: 2026, pagu: 200000000, total_spj: 175000000 },
    { id: 5, nama: 'Turnamen golf nasional', unit_kerja: 'Driving Golf', tahun: 2026, pagu: 500000000, total_spj: 425000000 },
    { id: 6, nama: 'Pengadaan peralatan seni', unit_kerja: 'PUI Seni Budaya', tahun: 2026, pagu: 80000000, total_spj: 45000000 },
  ];

  // Filter data berdasarkan unit kerja
  const filteredData = useMemo(() => {
    if (!filterUnit) return programData;
    return programData.filter(p => p.unit_kerja === filterUnit);
  }, [filterUnit]);

  // Hitung totals
  const totals = useMemo(() => {
    const pagu = filteredData.reduce((s, p) => s + p.pagu, 0);
    const spj = filteredData.reduce((s, p) => s + p.total_spj, 0);
    const sisa = pagu - spj;
    const serapan = pagu > 0 ? Math.round((spj / pagu) * 100) : 0;
    return { pagu, spj, sisa, serapan };
  }, [filteredData]);

  // Data rekap per unit
  const rekapUnit = useMemo(() => {
    const units = {};
    programData.forEach(p => {
      if (!units[p.unit_kerja]) {
        units[p.unit_kerja] = { pagu: 0, spj: 0 };
      }
      units[p.unit_kerja].pagu += p.pagu;
      units[p.unit_kerja].spj += p.total_spj;
    });
    return Object.entries(units).map(([unit, data]) => ({
      unit,
      pagu: data.pagu,
      spj: data.spj,
      sisa: data.pagu - data.spj,
      serapan: data.pagu > 0 ? Math.round((data.spj / data.pagu) * 100) : 0
    }));
  }, []);

  // Data untuk chart
  const chartData = useMemo(() => {
    return rekapUnit.slice(0, 5).map(u => ({
      label: u.unit,
      value: u.serapan,
      color: u.serapan >= 80 ? 'var(--success)' : u.serapan >= 50 ? 'var(--warning)' : 'var(--danger)'
    }));
  }, [rekapUnit]);

  if (!canAccess) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '3rem', height: '3rem', marginBottom: '1rem', opacity: 0.4 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <h3>Akses Ditolak</h3>
        <p>Anda tidak memiliki akses ke modul ini.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="toolbar">
        <div>
          <h2>Laporan Serapan Dana</h2>
          <p className="muted" style={{ fontSize: '0.9375rem', marginTop: '0.25rem' }}>
            Pantau dan analisis penggunaan anggaran program kerja
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowPreview(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
            <polyline points="6 9 6 2 18 2 18 9" /><path d="M10 13a2 2 0 0 0 4 0v-2" />
            <path d="M18 9H6a4 4 0 0 0-4 4v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-7a4 4 0 0 0-4-4z" />
          </svg>
          Cetak / Download
        </button>
      </div>

      {/* Filter Section */}
      <FilterSection 
        filterPeriode={filterPeriode}
        setFilterPeriode={setFilterPeriode}
        filterBulan={filterBulan}
        setFilterBulan={setFilterBulan}
        filterTahun={filterTahun}
        setFilterTahun={setFilterTahun}
        filterUnit={filterUnit}
        setFilterUnit={setFilterUnit}
        onGenerateReport={() => alert('Laporan berhasil di-generate!')}
      />

      {/* Stats Overview */}
      <div className="stats-grid mb-6">
        <StatCard
          title="Total Pagu Anggaran"
          value={formatRupiah(totals.pagu)}
          subtitle={`${filteredData.length} program kerja`}
          variant="default"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          title="Total SPJ"
          value={formatRupiah(totals.spj)}
          subtitle={`${totals.serapan}% dari pagu`}
          variant="success"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
        <StatCard
          title="Sisa Anggaran"
          value={formatRupiah(totals.sisa)}
          subtitle={totals.sisa > 0 ? 'Belum terpakai' : 'Over budget'}
          variant={totals.sisa > 0 ? 'warning' : 'danger'}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          }
        />
        <StatCard
          title="Status Serapan"
          value={`${totals.serapan}%`}
          subtitle={<StatusBadge percentage={totals.serapan} />}
          variant={totals.serapan >= 80 ? 'success' : totals.serapan >= 50 ? 'warning' : 'danger'}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          }
        />
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Tabel Program */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Ringkasan Program Kerja</h3>
            <span className="muted" style={{ fontSize: '0.75rem' }}>{filteredData.length} program</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Program Kerja</th>
                    <th className="text-right">Pagu</th>
                    <th className="text-right">SPJ</th>
                    <th className="text-center">%</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, idx) => {
                    const pct = item.pagu > 0 ? Math.round((item.total_spj / item.pagu) * 100) : 0;
                    return (
                      <tr key={item.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong style={{ fontSize: '0.8125rem' }}>{item.nama}</strong>
                          <p className="muted" style={{ fontSize: '0.6875rem', marginTop: '0.125rem' }}>{item.unit_kerja}</p>
                        </td>
                        <td className="text-right">{formatRupiah(item.pagu)}</td>
                        <td className="text-right">{formatRupiah(item.total_spj)}</td>
                        <td style={{ width: '100px' }}>
                          <ProgressBar value={pct} max={100} />
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="total-row">
                    <td colSpan={2}><strong>TOTAL</strong></td>
                    <td className="text-right"><strong>{formatRupiah(totals.pagu)}</strong></td>
                    <td className="text-right"><strong>{formatRupiah(totals.spj)}</strong></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar: Chart & Rekap */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Chart */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Top 5 Serapan Unit</h3>
            </div>
            <div className="card-body">
              <SimpleBarChart data={chartData} />
            </div>
          </div>

          {/* Rekap Unit Cards */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Rekap per Unit</h3>
              <span className="muted" style={{ fontSize: '0.75rem' }}>{rekapUnit.length} unit</span>
            </div>
            <div className="card-body" style={{ padding: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rekapUnit.slice(0, 5).map((item, idx) => (
                  <div 
                    key={item.unit} 
                    style={{ 
                      padding: '0.75rem', 
                      background: 'var(--surface-2)', 
                      borderRadius: 'var(--radius)',
                      borderLeft: `3px solid ${item.serapan >= 80 ? 'var(--success)' : item.serapan >= 50 ? 'var(--warning)' : 'var(--danger)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <strong style={{ fontSize: '0.8125rem' }}>{item.unit}</strong>
                      <span 
                        className="badge" 
                        style={{ 
                          fontSize: '0.625rem',
                          background: item.serapan >= 80 ? 'var(--success-bg)' : item.serapan >= 50 ? 'var(--warning-bg)' : 'var(--danger-bg)',
                          color: item.serapan >= 80 ? 'var(--success)' : item.serapan >= 50 ? 'var(--warning)' : 'var(--danger)'
                        }}
                      >
                        {item.serapan}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem' }}>
                      <span className="muted">{formatRupiah(item.spj)}</span>
                      <span className="muted">dari {formatRupiah(item.pagu)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal 
        show={showPreview}
        onClose={() => setShowPreview(false)}
        filterPeriode={filterPeriode}
        filterBulan={filterBulan}
        filterTahun={filterTahun}
        data={filteredData}
        totals={totals}
      />
    </div>
  );
}
