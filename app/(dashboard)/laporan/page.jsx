'use client';

import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';

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
  const colorMap = {
    default: { bg: 'var(--primary-50)', fg: 'var(--primary)' },
    success: { bg: 'var(--success-50)', fg: 'var(--success)' },
    warning: { bg: 'var(--warning-50)', fg: 'var(--warning)' },
    danger:  { bg: 'var(--danger-50)',  fg: 'var(--danger)'  },
    info:    { bg: 'var(--primary-50)', fg: 'var(--primary)' },
  };
  const c = colorMap[variant] || colorMap.default;
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        {icon && (
          <div className="stat-icon-wrap" style={{ background: c.bg, color: c.fg }}>
            {icon}
          </div>
        )}
      </div>
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
      {subtitle && <div className="stat-sub">{subtitle}</div>}
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
  unitKerjaList,
  onGenerateReport,
  loading
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
              {unitKerjaList.map(u => (
                <option key={u.id} value={u.nama}>{u.nama}</option>
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
              setFilterBulan(String(new Date().getMonth() + 1));
              setFilterTahun(String(new Date().getFullYear()));
              setFilterUnit('');
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
            Reset Filter
          </button>
          <button className="btn btn-primary" onClick={onGenerateReport} disabled={loading}>
            {loading ? (
              <span>Loading...</span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                Generate Laporan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const fmtShort = (n) => {
  if (!n || isNaN(n)) return 'Rp 0';
  if (n >= 1e9) return 'Rp ' + (n / 1e9).toFixed(1).replace('.', ',') + 'M';
  if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1).replace('.', ',') + 'Jt';
  return 'Rp ' + n.toLocaleString('id-ID');
};

// ============ KOMPONEN CHART BAR SEDERHANA ============
function SimpleBarChart({ data }) {
  if (!data || data.length === 0) return <div className="muted" style={{ textAlign: 'center', padding: '1rem' }}>Tidak ada data</div>;

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {data.map((item, idx) => (
        <div key={idx} style={{ marginBottom: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
            <span style={{ color: 'var(--text-2)', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{fmtShort(item.value)}</span>
          </div>
          <div style={{ width: '100%', background: 'var(--surface-3)', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: '999px',
                transition: 'width 0.5s ease',
                background: item.color || 'var(--primary)',
                width: `${(item.value / maxValue) * 100}%`,
              }}
            />
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
      <div className="modal-content" style={{ maxWidth: '1000px', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Preview Laporan</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '2rem' }}>
          {/* Header Laporan */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '2rem', 
            paddingBottom: '1.5rem', 
            borderBottom: '2px solid #333'
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 700, 
              marginBottom: '0.75rem',
              letterSpacing: '0.5px'
            }}>
              LAPORAN SERAPAN DANA
            </h3>
            <p style={{ fontSize: '1rem', color: 'var(--text-2)', marginBottom: '0.5rem' }}>
              Periode {periodeText}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>
              Tanggal Cetak: {formatDate(new Date())}
            </p>
          </div>

          {/* Ringkasan */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h4 style={{ 
              fontSize: '1rem', 
              fontWeight: 600, 
              marginBottom: '1rem',
              color: 'var(--text)'
            }}>Ringkasan Anggaran</h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '1rem',
              background: '#f8fafc',
              padding: '1.25rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>Total Pagu</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{formatRupiah(totals.pagu)}</p>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', borderLeft: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>Total SPJ</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#059669' }}>{formatRupiah(totals.spj)}</p>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', borderLeft: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>Sisa Dana</p>
                <p style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: 700, 
                  color: totals.sisa < 0 ? '#dc2626' : '#1e293b' 
                }}>
                  {formatRupiah(totals.sisa)}
                </p>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', borderLeft: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>% Serapan</p>
                <p style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: 700, 
                  color: totals.serapan >= 80 ? '#059669' : totals.serapan >= 50 ? '#d97706' : '#dc2626'
                }}>
                  {totals.serapan}%
                </p>
              </div>
            </div>
          </div>

          {/* Tabel Detail */}
          <div style={{ marginBottom: '3rem' }}>
            <h4 style={{ 
              fontSize: '1rem', 
              fontWeight: 600, 
              marginBottom: '1rem',
              color: 'var(--text)'
            }}>Detail Program Kerja</h4>
            <div style={{ 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              overflow: 'hidden'
            }}>
              <table style={{ 
                fontSize: '0.875rem', 
                width: '100%', 
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #e2e8f0', width: '50px' }}>No</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Program Kerja</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 600, borderBottom: '2px solid #e2e8f0', width: '150px' }}>Pagu</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 600, borderBottom: '2px solid #e2e8f0', width: '150px' }}>SPJ</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 600, borderBottom: '2px solid #e2e8f0', width: '150px' }}>Sisa</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #e2e8f0', width: '80px' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, idx) => {
                    const sisa = item.pagu - item.total_spj;
                    const pct = item.pagu > 0 ? Math.round((item.total_spj / item.pagu) * 100) : 0;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>{item.nama}</td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(item.pagu)}</td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(item.total_spj)}</td>
                        <td style={{ 
                          padding: '0.875rem 1rem', 
                          textAlign: 'right', 
                          fontFamily: 'monospace',
                          color: sisa < 0 ? '#dc2626' : 'inherit'
                        }}>
                          {formatRupiah(sisa)}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: 500 }}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tanda Tangan */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            marginTop: '2rem',
            paddingRight: '3rem'
          }}>
            <div style={{ textAlign: 'center', width: '250px' }}>
              <p style={{ fontSize: '0.875rem', marginBottom: '4rem' }}>Mengetahui,</p>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Kepala Unit</p>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>NIP. ....................</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '0.75rem', 
            marginTop: '2.5rem', 
            paddingTop: '1.5rem', 
            borderTop: '1px solid #e2e8f0' 
          }}>
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
  const [filterBulan, setFilterBulan] = useState(String(new Date().getMonth() + 1));
  const [filterTahun, setFilterTahun] = useState(String(new Date().getFullYear()));
  const [filterUnit, setFilterUnit] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  // Data states
  const [programData, setProgramData] = useState([]);
  const [unitKerjaList, setUnitKerjaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const userRole = 'super_admin';
  const canAccess = userRole === 'super_admin';

  // Initialize Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Fetch data from Supabase
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch unit kerja list
      const { data: units, error: unitError } = await supabase
        .from('unit_kerja')
        .select('id, nama')
        .order('nama');
      
      if (unitError) throw unitError;
      setUnitKerjaList(units || []);

      // Fetch program data from view
      const { data: programs, error: programError } = await supabase
        .from('laporan_serapan_program')
        .select('*')
        .eq('tahun', parseInt(filterTahun));
      
      if (programError) {
        console.error('Program error:', programError);
        throw programError;
      }
      
      // Transform data - handle both snake_case and potential field name variations
      const transformedData = (programs || []).map(p => ({
        id: p.id,
        nama: p.nama,
        unit_kerja: p.unit_kerja,
        tahun: p.tahun,
        pagu: parseFloat(p.pagu) || 0,
        total_spj: parseFloat(p.total_spj || p.total_alokasi || 0) || 0
      }));
      
      setProgramData(transformedData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Gagal memuat data. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData();
  }, []);

  // Filter data berdasarkan unit kerja dan tahun
  const filteredData = useMemo(() => {
    let data = programData
      .filter(p => p.tahun === parseInt(filterTahun))
      .map(p => ({
        ...p,
        // Normalisasi unit_kerja
        unit_kerja: (p.unit_kerja || p.unit_kerja_id || 'Belum Ditentukan')
      }));
    
    if (filterUnit) {
      data = data.filter(p => p.unit_kerja === filterUnit);
    }
    
    return data;
  }, [programData, filterUnit, filterTahun]);

  // Hitung totals
  const totals = useMemo(() => {
    const pagu = filteredData.reduce((s, p) => s + (p.pagu || 0), 0);
    const spj = filteredData.reduce((s, p) => s + (p.total_spj || 0), 0);
    const sisa = pagu - spj;
    const serapan = pagu > 0 ? Math.round((spj / pagu) * 100) : 0;
    return { pagu, spj, sisa, serapan };
  }, [filteredData]);

  // Top 5 Program dengan SPJ Tertinggi
  const topSerapan = useMemo(() => {
    return programData
      .filter(p => p.tahun === parseInt(filterTahun) && (p.total_spj || 0) > 0)
      .map(p => ({
        nama: p.nama || 'Program Tanpa Nama',
        unit: (p.unit_kerja || p.unit_kerja_id || '-'),
        pagu: p.pagu || 0,
        spj: p.total_spj || 0,
        persentase: (p.pagu || 0) > 0 ? Math.round(((p.total_spj || 0) / p.pagu) * 100) : 0
      }))
      .sort((a, b) => b.spj - a.spj)
      .slice(0, 5);
  }, [programData, filterTahun]);

  // Data rekap per unit
  const rekapUnit = useMemo(() => {
    const units = {};
    programData
      .filter(p => p.tahun === parseInt(filterTahun))
      .forEach(p => {
        // Handle null/undefined unit_kerja
        const unit = p.unit_kerja || p.unit_kerja_id || 'Belum Ditentukan';
        if (!unit || unit === 'null' || unit === 'undefined') {
          console.warn('Program tanpa unit kerja di laporan:', p.nama);
          return;
        }
        if (!units[unit]) {
          units[unit] = { pagu: 0, spj: 0 };
        }
        units[unit].pagu += (p.pagu || 0);
        units[unit].spj += (p.total_spj || 0);
      });
    
    return Object.entries(units).map(([unit, data]) => ({
      unit,
      pagu: data.pagu,
      spj: data.spj,
      sisa: data.pagu - data.spj,
      serapan: data.pagu > 0 ? Math.round((data.spj / data.pagu) * 100) : 0
    })).sort((a, b) => b.serapan - a.serapan);
  }, [programData, filterTahun]);

  // Data untuk chart - Top 5 Program dengan SPJ Tertinggi
  const chartData = useMemo(() => {
    return topSerapan.map((p, idx) => ({
      label: p.nama.length > 20 ? p.nama.substring(0, 20) + '...' : p.nama,
      value: p.spj,
      color: idx === 0 ? 'var(--success)' : idx === 1 ? 'var(--warning)' : 'var(--primary)'
    }));
  }, [topSerapan]);

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loading-spinner" style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid var(--surface-3)', 
            borderTop: '3px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p className="muted">Memuat data laporan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '3rem', height: '3rem', marginBottom: '1rem', opacity: 0.4 }}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h3>Terjadi Kesalahan</h3>
        <p>{error}</p>
        <button className="btn btn-primary mt-4" onClick={fetchData}>
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Laporan &amp; Analitik</h1>
          <p className="page-subtitle">Ringkasan kinerja Direktorat USC tahun anggaran {filterTahun}.</p>
        </div>
        <div className="page-actions">
          <select className="select" style={{ width: 'auto' }} value={filterTahun} onChange={e => setFilterTahun(e.target.value)}>
            {TAHUN_LIST.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            </svg>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowPreview(true)} disabled={filteredData.length === 0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export PDF
          </button>
        </div>
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
        unitKerjaList={unitKerjaList}
        onGenerateReport={fetchData}
        loading={loading}
      />

      {filteredData.length === 0 ? (
        <div className="empty-state card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '3rem', height: '3rem', marginBottom: '1rem', opacity: 0.4 }}>
            <path d="M9 17v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M9 11V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
          <h3>Tidak Ada Data</h3>
          <p className="muted">Tidak ditemukan data program kerja untuk filter yang dipilih.</p>
        </div>
      ) : (
        <>
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
          <div className="dashboard-grid">
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
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Top 5 Nilai SPJ</h3>
                </div>
                <div className="card-body">
                  <SimpleBarChart data={chartData} />
                </div>
              </div>

              {/* Top 5 Program dengan SPJ Tertinggi */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Top 5 SPJ Tertinggi</h3>
                  <span className="muted" style={{ fontSize: '0.75rem' }}>Ranking</span>
                </div>
                <div className="card-body" style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {topSerapan.length > 0 ? topSerapan.map((item, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          padding: '0.75rem', 
                          background: 'var(--surface-2)', 
                          borderRadius: 'var(--radius)',
                          borderLeft: `3px solid ${idx === 0 ? 'var(--success)' : idx === 1 ? 'var(--warning)' : 'var(--primary)'}`
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              width: '1.25rem',
                              height: '1.25rem',
                              borderRadius: '50%',
                              background: idx === 0 ? 'var(--success)' : idx === 1 ? 'var(--warning)' : 'var(--primary)',
                              color: 'white',
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: '0.625rem',
                              fontWeight: 700
                            }}>
                              {idx + 1}
                            </span>
                            <strong style={{ fontSize: '0.8125rem' }}>{item.nama}</strong>
                          </div>
                          <span 
                            className="badge" 
                            style={{ 
                              fontSize: '0.625rem',
                              background: 'var(--success-bg)',
                              color: 'var(--success)'
                            }}
                          >
                            {formatRupiah(item.spj)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem' }}>
                          <span className="muted">{item.unit}</span>
                          <span className="muted">{item.persentase}% dari {formatRupiah(item.pagu)}</span>
                        </div>
                      </div>
                    )) : (
                      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-2)' }}>
                        Belum ada data SPJ
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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
