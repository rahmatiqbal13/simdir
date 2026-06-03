'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

// ============ KONSTANTA ============
const BULAN_LIST = [
  { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },   { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },     { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },    { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' },{ value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },{ value: '12', label: 'Desember' },
];

const TAHUN_LIST = [2024, 2025, 2026, 2027];

const TRIWULAN = [
  { value: '1', label: 'Triwulan I',   short: 'TW I',   bulan: [1,2,3],   range: 'Januari – Maret' },
  { value: '2', label: 'Triwulan II',  short: 'TW II',  bulan: [4,5,6],   range: 'April – Juni' },
  { value: '3', label: 'Triwulan III', short: 'TW III', bulan: [7,8,9],   range: 'Juli – September' },
  { value: '4', label: 'Triwulan IV',  short: 'TW IV',  bulan: [10,11,12],range: 'Oktober – Desember' },
];

// ============ HELPERS ============
const formatRupiah = (num) => {
  if (!num || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
};

const fmtShort = (n) => {
  if (!n || isNaN(n)) return 'Rp 0';
  if (n >= 1e9) return 'Rp ' + (n / 1e9).toFixed(1).replace('.', ',') + 'M';
  if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1).replace('.', ',') + 'Jt';
  return 'Rp ' + n.toLocaleString('id-ID');
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
};

const formatDateShort = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

function getDateRange(filterPeriode, filterBulan, filterTahun, filterTW, filterDateFrom, filterDateTo) {
  const y = parseInt(filterTahun);
  if (filterPeriode === 'tahunan') {
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: `Tahun Anggaran ${y}` };
  }
  if (filterPeriode === 'bulanan') {
    const m = parseInt(filterBulan);
    const lastDay = new Date(y, m, 0).getDate();
    const mStr = String(m).padStart(2, '0');
    const bLabel = BULAN_LIST.find(b => b.value === filterBulan)?.label || '';
    return { from: `${y}-${mStr}-01`, to: `${y}-${mStr}-${lastDay}`, label: `${bLabel} ${y}` };
  }
  if (filterPeriode === 'triwulan') {
    const tw = TRIWULAN.find(t => t.value === filterTW);
    const m1 = tw.bulan[0], m3 = tw.bulan[2];
    const lastDay = new Date(y, m3, 0).getDate();
    return {
      from: `${y}-${String(m1).padStart(2,'0')}-01`,
      to:   `${y}-${String(m3).padStart(2,'0')}-${lastDay}`,
      label: `${tw.label} Tahun Anggaran ${y} (${tw.range} ${y})`,
      shortLabel: `${tw.label} ${y}`,
    };
  }
  if (filterPeriode === 'custom' && filterDateFrom && filterDateTo) {
    return {
      from: filterDateFrom,
      to:   filterDateTo,
      label: `Periode ${formatDate(filterDateFrom)} s.d. ${formatDate(filterDateTo)}`,
      shortLabel: `${formatDateShort(filterDateFrom)} – ${formatDateShort(filterDateTo)}`,
    };
  }
  return null;
}

function generateNarasi({ periodeLabel, shortLabel, dateFrom, dateTo, totalPencairan, jumlahPencairan, totalPagu, jumlahProgram, jumlahUnit, topPrograms, filterTahun }) {
  const serapan = totalPagu > 0 ? Math.round((totalPencairan / totalPagu) * 100) : 0;
  const sisa = totalPagu - totalPencairan;

  let penilaian, rekomendasi;
  if (serapan >= 90) {
    penilaian = 'dikategorikan OPTIMAL';
    rekomendasi = 'Direktorat USC telah menunjukkan kinerja pengelolaan anggaran yang sangat baik pada periode ini. Capaian ini perlu dipertahankan dan menjadi referensi pada periode anggaran berikutnya.';
  } else if (serapan >= 70) {
    penilaian = 'dikategorikan BAIK';
    rekomendasi = 'Direktorat USC menunjukkan kinerja pengelolaan anggaran yang memadai, namun masih terdapat ruang untuk peningkatan akselerasi serapan. Percepatan realisasi perlu dilakukan pada periode berikutnya guna mencapai target serapan yang optimal.';
  } else if (serapan >= 50) {
    penilaian = 'dikategorikan SEDANG';
    rekomendasi = 'Diperlukan percepatan realisasi anggaran yang signifikan pada periode berikutnya. Evaluasi terhadap kendala pelaksanaan program dan penyebab keterlambatan pencairan perlu segera dilakukan agar target serapan tahunan dapat tercapai.';
  } else {
    penilaian = 'dikategorikan RENDAH dan memerlukan perhatian khusus';
    rekomendasi = 'Diperlukan evaluasi menyeluruh terhadap faktor-faktor penghambat realisasi anggaran. Pimpinan unit kerja diharapkan segera menyusun langkah-langkah percepatan yang konkrit dan terukur agar tidak berdampak pada pencapaian target anggaran tahunan.';
  }

  const topProgramText = topPrograms.length > 0
    ? `\nProgram kerja dengan nilai pencairan tertinggi pada periode ini adalah "${topPrograms[0].nama}" dari unit ${topPrograms[0].unit} dengan realisasi sebesar ${formatRupiah(topPrograms[0].jumlah)}` +
      (topPrograms[0].pagu > 0 ? ` atau ${Math.round((topPrograms[0].jumlah/topPrograms[0].pagu)*100)}% dari pagu program senilai ${formatRupiah(topPrograms[0].pagu)}.` : '.')
    : '';

  return `LAPORAN REALISASI SERAPAN ANGGARAN
${periodeLabel}
Tanggal Cetak: ${formatDate(new Date())}

I. PENDAHULUAN

Laporan ini merupakan laporan realisasi serapan anggaran Direktorat Unesa Science Center (USC) untuk ${periodeLabel}. Laporan disusun berdasarkan data pencairan dana yang tercatat dalam Sistem Informasi Direktorat (SIMDIR) USC.

II. REALISASI PENCAIRAN ANGGARAN

Pada ${shortLabel || periodeLabel}, Direktorat USC telah melaksanakan kegiatan pencairan anggaran sebanyak ${jumlahPencairan} (${angkaTerbilang(jumlahPencairan)}) kali pencairan dengan total nilai pencairan sebesar ${formatRupiah(totalPencairan)}.

Total pagu anggaran Direktorat USC untuk Tahun Anggaran ${filterTahun} adalah sebesar ${formatRupiah(totalPagu)} yang mencakup ${jumlahProgram} program kerja yang tersebar di ${jumlahUnit} unit kerja.

III. ANALISIS SERAPAN ANGGARAN

Realisasi serapan anggaran sampai dengan akhir ${shortLabel || periodeLabel} mencapai ${serapan}% dari total pagu anggaran, atau senilai ${formatRupiah(totalPencairan)}. Sisa anggaran yang belum terserap sebesar ${formatRupiah(sisa)} atau ${Math.max(0, 100 - serapan)}% dari total pagu.
${topProgramText}

IV. EVALUASI KINERJA ANGGARAN

Berdasarkan capaian serapan sebesar ${serapan}%, kinerja pengelolaan anggaran Direktorat USC pada periode ini ${penilaian}. ${rekomendasi}

V. PENUTUP

Demikian laporan realisasi serapan anggaran ${shortLabel || periodeLabel} ini dibuat untuk dapat dipergunakan sebagaimana mestinya dan menjadi bahan evaluasi dalam rangka peningkatan kinerja pengelolaan anggaran Direktorat USC.`;
}

function angkaTerbilang(n) {
  const satuan = ['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan',
    'sepuluh','sebelas','dua belas','tiga belas','empat belas','lima belas','enam belas',
    'tujuh belas','delapan belas','sembilan belas'];
  if (n < 20) return satuan[n];
  if (n < 100) return ['','','dua puluh','tiga puluh','empat puluh','lima puluh',
    'enam puluh','tujuh puluh','delapan puluh','sembilan puluh'][Math.floor(n/10)] +
    (n % 10 ? ' ' + satuan[n % 10] : '');
  return n; // fallback untuk angka besar
}

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
        {icon && <div className="stat-icon-wrap" style={{ background: c.bg, color: c.fg }}>{icon}</div>}
      </div>
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
      {subtitle && <div className="stat-sub">{subtitle}</div>}
    </div>
  );
}

// ============ PROGRESS BAR ============
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
        <div style={{ height: '0.5rem', borderRadius: '9999px', transition: 'width 0.3s ease', background: colorVar, width: `${percentage}%` }} />
      </div>
    </div>
  );
}

// ============ STATUS BADGE ============
function StatusBadge({ percentage }) {
  let config = { text: 'Rendah', class: 'badge-slate' };
  if (percentage >= 90) config = { text: 'Optimal', class: 'badge-green' };
  else if (percentage >= 70) config = { text: 'Baik', class: 'badge-blue' };
  else if (percentage >= 50) config = { text: 'Sedang', class: 'badge-amber' };
  else if (percentage > 0) config = { text: 'Perlu Perhatian', class: 'badge-amber' };
  return <span className={`badge ${config.class}`}>{config.text}</span>;
}

// ============ SIMPLE BAR CHART ============
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
            <div style={{ height: '100%', borderRadius: '999px', transition: 'width 0.5s ease', background: item.color || 'var(--primary)', width: `${(item.value / maxValue) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ FILTER SECTION ============
function FilterSection({
  filterPeriode, setFilterPeriode,
  filterBulan, setFilterBulan,
  filterTahun, setFilterTahun,
  filterTW, setFilterTW,
  filterDateFrom, setFilterDateFrom,
  filterDateTo, setFilterDateTo,
  filterUnit, setFilterUnit,
  unitKerjaList, onGenerateReport, loading,
}) {
  const periodeOptions = [
    { value: 'bulanan',   label: 'Bulanan' },
    { value: 'triwulan',  label: 'Triwulan' },
    { value: 'custom',    label: 'Kustom' },
    { value: 'tahunan',   label: 'Tahunan' },
  ];

  const tabStyle = (active) => ({
    flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', border: 'none',
    background: active ? 'var(--surface)' : 'transparent',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
    color: active ? 'var(--primary)' : 'var(--text-2)',
    fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
  });

  return (
    <div className="card mb-6">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Filter Laporan</h3>
        <span className="muted" style={{ fontSize: '0.75rem' }}>Pilih periode dan unit kerja</span>
      </div>
      <div className="card-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>

          {/* Jenis Periode */}
          <div style={{ gridColumn: filterPeriode === 'custom' ? 'span 2' : 'auto' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>Jenis Periode</label>
            <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '0.25rem', gap: '0.125rem' }}>
              {periodeOptions.map(opt => (
                <button key={opt.value} onClick={() => setFilterPeriode(opt.value)} style={tabStyle(filterPeriode === opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pilihan spesifik per jenis periode */}
          {filterPeriode === 'bulanan' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>Bulan</label>
              <select value={filterBulan} onChange={e => setFilterBulan(e.target.value)} style={{ width: '100%' }}>
                {BULAN_LIST.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
          )}

          {filterPeriode === 'triwulan' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>Triwulan</label>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {TRIWULAN.map(tw => (
                  <button key={tw.value} onClick={() => setFilterTW(tw.value)}
                    style={{
                      flex: 1, padding: '0.5rem 0.25rem', borderRadius: 'var(--radius)', border: '1.5px solid',
                      borderColor: filterTW === tw.value ? 'var(--primary)' : 'var(--border)',
                      background: filterTW === tw.value ? 'var(--primary-bg)' : 'var(--surface)',
                      color: filterTW === tw.value ? 'var(--primary)' : 'var(--text-2)',
                      fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    title={tw.range}
                  >
                    {tw.short}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-3)', marginTop: '0.375rem' }}>
                {TRIWULAN.find(t => t.value === filterTW)?.range}
              </p>
            </div>
          )}

          {filterPeriode === 'custom' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>Dari Tanggal</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>Hingga Tanggal</label>
                <input type="date" value={filterDateTo} min={filterDateFrom} onChange={e => setFilterDateTo(e.target.value)} style={{ width: '100%' }} />
              </div>
            </>
          )}

          {/* Tahun */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>Tahun Anggaran</label>
            <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} style={{ width: '100%' }}>
              {TAHUN_LIST.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Unit Kerja */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>Unit Kerja</label>
            <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)} style={{ width: '100%' }}>
              <option value="">Semua Unit</option>
              {unitKerjaList.map(u => <option key={u.id} value={u.nama}>{u.nama}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => {
            setFilterPeriode('triwulan');
            setFilterTW(String(Math.ceil((new Date().getMonth() + 1) / 3)));
            setFilterTahun(String(new Date().getFullYear()));
            setFilterUnit(''); setFilterDateFrom(''); setFilterDateTo('');
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            </svg>
            Reset
          </button>
          <button className="btn btn-primary" onClick={onGenerateReport} disabled={loading ||
            (filterPeriode === 'custom' && (!filterDateFrom || !filterDateTo))}>
            {loading ? 'Memuat...' : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
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

// ============ PREVIEW MODAL ============
function PreviewModal({ show, onClose, dateRange, data, totals, pencairanList, topPrograms, filterTahun, filterUnit, jumlahUnit }) {
  if (!show || !dateRange) return null;

  const narasi = generateNarasi({
    periodeLabel: dateRange.label,
    shortLabel: dateRange.shortLabel || dateRange.label,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    totalPencairan: totals.pencairanPeriode,
    jumlahPencairan: pencairanList.length,
    totalPagu: totals.pagu,
    jumlahProgram: data.length,
    jumlahUnit,
    topPrograms,
    filterTahun,
  });

  const serapan = totals.pagu > 0 ? Math.round((totals.pencairanPeriode / totals.pagu) * 100) : 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '1000px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Preview Laporan</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="card-form-body" style={{ padding: '2rem' }}>
          {/* Header Laporan */}
          <div style={{ textAlign: 'center', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '2px solid #333' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
              LAPORAN REALISASI SERAPAN ANGGARAN
            </h3>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
              {dateRange.shortLabel || dateRange.label}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
              Periode: {formatDate(dateRange.from)} s.d. {formatDate(dateRange.to)}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
              Tanggal Cetak: {formatDate(new Date())}
              {filterUnit ? ` · Unit: ${filterUnit}` : ''}
            </p>
          </div>

          {/* Ringkasan Angka */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem', borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>
              Ringkasan Anggaran
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>Total Pagu TA {filterTahun}</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{formatRupiah(totals.pagu)}</p>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', borderLeft: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>Pencairan Periode Ini</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>{formatRupiah(totals.pencairanPeriode)}</p>
                <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>{pencairanList.length} transaksi</p>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', borderLeft: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>Sisa Anggaran</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: totals.pagu - totals.pencairanPeriode < 0 ? '#dc2626' : '#1e293b' }}>
                  {formatRupiah(totals.pagu - totals.pencairanPeriode)}
                </p>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', borderLeft: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>Serapan</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: serapan >= 80 ? '#059669' : serapan >= 50 ? '#d97706' : '#dc2626' }}>
                  {serapan}%
                </p>
              </div>
            </div>
          </div>

          {/* Narasi Laporan */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem', borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>
              Narasi Laporan
            </h4>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.875rem', lineHeight: 1.75, color: '#1e293b', margin: 0 }}>
                {narasi}
              </pre>
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(narasi)}
              style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Salin Narasi
            </button>
          </div>

          {/* Tabel Pencairan Periode */}
          {pencairanList.length > 0 && (
            <div className="page-break" style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem', borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>
                Daftar Pencairan Periode Ini
              </h4>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ fontSize: '0.8125rem', width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #e2e8f0', width: '40px' }}>No</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Nama Pencairan</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #e2e8f0', width: '130px' }}>Tanggal</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, borderBottom: '2px solid #e2e8f0', width: '140px' }}>Jumlah</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #e2e8f0', width: '90px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pencairanList.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{item.nama}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{formatDateShort(item.tanggal)}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(item.jumlah)}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '999px',
                            background: item.status === 'selesai' ? '#d1fae5' : '#fef3c7',
                            color: item.status === 'selesai' ? '#065f46' : '#92400e' }}>
                            {item.status === 'selesai' ? 'SPJ Lengkap' : 'Proses'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                      <td colSpan={3} style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>TOTAL</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(totals.pencairanPeriode)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rekap per Program */}
          {data.length > 0 && (
            <div className="page-break" style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem', borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>
                Rekap Program Kerja (Pagu Tahunan)
              </h4>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ fontSize: '0.8125rem', width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #e2e8f0', width: '40px' }}>No</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Program Kerja</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, borderBottom: '2px solid #e2e8f0', width: '140px' }}>Pagu</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, borderBottom: '2px solid #e2e8f0', width: '140px' }}>SPJ</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #e2e8f0', width: '70px' }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, idx) => {
                      const pct = item.pagu > 0 ? Math.round((item.total_spj / item.pagu) * 100) : 0;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 500 }}>{item.nama}</div>
                            <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>{item.unit_kerja}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(item.pagu)}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(item.total_spj)}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: pct >= 80 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626' }}>{pct}%</td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                      <td colSpan={2} style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>TOTAL</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(totals.pagu)}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(totals.spj)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tanda Tangan */}
          <div className="page-break" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', padding: '0 1rem' }}>
            <div style={{ textAlign: 'center', width: '220px' }}>
              <p style={{ fontSize: '0.875rem', marginBottom: '4rem' }}>Dibuat oleh,</p>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, borderTop: '1px solid #334155', paddingTop: '0.375rem' }}>Penanggung Jawab</p>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>NIP. ....................</p>
            </div>
            <div style={{ textAlign: 'center', width: '220px' }}>
              <p style={{ fontSize: '0.875rem', marginBottom: '4rem' }}>Mengetahui,</p>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, borderTop: '1px solid #334155', paddingTop: '0.375rem' }}>Kepala Direktorat USC</p>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>NIP. ....................</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
            <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download / Cetak
            </button>
          </div>
        </div>
      </div>

      {/* Print Styles - Hanya aktif saat print */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm 12mm;
          }
          
          body * {
            visibility: hidden;
          }
          
          .modal-backdrop,
          .modal-content,
          .modal-content * {
            visibility: visible;
          }
          
          .modal-backdrop {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: white !important;
            display: block;
            overflow: visible;
          }
          
          .modal-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          
          .modal-head {
            display: none !important;
          }
          
          .card-form-body {
            padding: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          table {
            page-break-inside: auto;
            font-size: 9pt !important;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tbody {
            display: table-row-group;
          }
          
          th, td {
            padding: 6px 8px !important;
          }
          
          pre {
            white-space: pre-wrap !important;
            font-size: 10pt !important;
            line-height: 1.5 !important;
          }
          
          h3 {
            font-size: 14pt !important;
          }
          
          h4 {
            font-size: 11pt !important;
            margin-bottom: 0.5rem !important;
          }
          
          /* Page breaks untuk section */
          .page-break {
            page-break-before: always;
          }
          
          /* Hide scrollbars */
          ::-webkit-scrollbar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

// ============ HALAMAN UTAMA ============
export default function LaporanPage() {
  const [filterPeriode, setFilterPeriode] = useState('triwulan');
  const [filterBulan,   setFilterBulan]   = useState(String(new Date().getMonth() + 1));
  const [filterTahun,   setFilterTahun]   = useState(String(new Date().getFullYear()));
  const [filterTW,      setFilterTW]      = useState(String(Math.ceil((new Date().getMonth() + 1) / 3)));
  const [filterDateFrom,setFilterDateFrom]= useState('');
  const [filterDateTo,  setFilterDateTo]  = useState('');
  const [filterUnit,    setFilterUnit]    = useState('');
  const [showPreview,   setShowPreview]   = useState(false);

  const [programData,   setProgramData]   = useState([]);
  const [pencairanData, setPencairanData] = useState([]);
  const [unitKerjaList, setUnitKerjaList] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  const dateRange = useMemo(() =>
    getDateRange(filterPeriode, filterBulan, filterTahun, filterTW, filterDateFrom, filterDateTo)
  , [filterPeriode, filterBulan, filterTahun, filterTW, filterDateFrom, filterDateTo]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Unit kerja
      const { data: units, error: unitErr } = await supabase.from('unit_kerja').select('id, nama').order('nama');
      if (unitErr) throw unitErr;
      setUnitKerjaList(units || []);

      // Program data (pagu tahunan)
      const { data: programs, error: programErr } = await supabase
        .from('laporan_serapan_program').select('*').eq('tahun', parseInt(filterTahun));
      if (programErr) throw programErr;
      setProgramData((programs || []).map(p => ({
        id: p.id, nama: p.nama,
        unit_kerja: p.unit_kerja || p.unit_kerja_id || '-',
        tahun: p.tahun,
        pagu: parseFloat(p.pagu) || 0,
        total_spj: parseFloat(p.total_spj || p.total_alokasi || 0) || 0,
      })));

      // Pencairan per periode
      if (dateRange) {
        const { data: pencairan, error: pencairanErr } = await supabase
          .from('pencairan_dana')
          .select(`id, nomor_pencairan, tanggal_pencairan, jumlah, status,
            pencairan_program(jumlah_alokasi, program_kerja:program_kerja_id(id, nama, unit_kerja_id, pagu_anggaran))`)
          .gte('tanggal_pencairan', dateRange.from)
          .lte('tanggal_pencairan', dateRange.to)
          .order('tanggal_pencairan', { ascending: true });
        if (pencairanErr) throw pencairanErr;
        setPencairanData((pencairan || []).map(p => ({
          id: p.id,
          nama: p.nomor_pencairan || `Pencairan ${p.id?.slice(0,8)}`,
          tanggal: p.tanggal_pencairan,
          jumlah: parseFloat(p.jumlah) || 0,
          status: p.status,
          programs: (p.pencairan_program || []).map(pp => ({
            id: pp.program_kerja?.id,
            nama: pp.program_kerja?.nama,
            unit: pp.program_kerja?.unit_kerja_id,
            pagu: parseFloat(pp.program_kerja?.pagu_anggaran) || 0,
            alokasi: parseFloat(pp.jumlah_alokasi) || 0,
          })),
        })));
      }
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [filterTahun, dateRange?.from, dateRange?.to]);

  useEffect(() => { fetchData(); }, []);

  // Filter program per unit
  const filteredData = useMemo(() => {
    let data = programData.filter(p => p.tahun === parseInt(filterTahun));
    if (filterUnit) data = data.filter(p => p.unit_kerja === filterUnit);
    return data;
  }, [programData, filterUnit, filterTahun]);

  // Filter pencairan per unit
  const filteredPencairan = useMemo(() => {
    if (!filterUnit) return pencairanData;
    return pencairanData.filter(p => p.programs.some(pp => pp.unit === filterUnit));
  }, [pencairanData, filterUnit]);

  const totals = useMemo(() => {
    const pagu = filteredData.reduce((s, p) => s + p.pagu, 0);
    const spj  = filteredData.reduce((s, p) => s + p.total_spj, 0);
    const pencairanPeriode = filteredPencairan.reduce((s, p) => s + p.jumlah, 0);
    const serapan = pagu > 0 ? Math.round((pencairanPeriode / pagu) * 100) : 0;
    return { pagu, spj, pencairanPeriode, serapan, sisa: pagu - pencairanPeriode };
  }, [filteredData, filteredPencairan]);

  // Top program berdasarkan alokasi di pencairan periode ini
  const topPrograms = useMemo(() => {
    const map = {};
    filteredPencairan.forEach(p => {
      p.programs.forEach(pp => {
        if (!pp.id) return;
        if (!map[pp.id]) map[pp.id] = { nama: pp.nama, unit: pp.unit, pagu: pp.pagu, jumlah: 0 };
        map[pp.id].jumlah += pp.alokasi;
      });
    });
    return Object.values(map).sort((a, b) => b.jumlah - a.jumlah).slice(0, 5);
  }, [filteredPencairan]);

  const jumlahUnit = useMemo(() => new Set(filteredData.map(p => p.unit_kerja)).size, [filteredData]);

  // Chart data
  const chartData = useMemo(() =>
    topPrograms.map((p, i) => ({
      label: p.nama?.length > 25 ? p.nama.substring(0, 25) + '…' : p.nama,
      value: p.jumlah,
      color: i === 0 ? 'var(--success)' : i === 1 ? 'var(--warning)' : 'var(--primary)',
    }))
  , [topPrograms]);

  // Rekap per unit
  const rekapUnit = useMemo(() => {
    const map = {};
    filteredData.forEach(p => {
      const u = p.unit_kerja || 'Belum Ditentukan';
      if (!map[u]) map[u] = { pagu: 0, spj: 0 };
      map[u].pagu += p.pagu; map[u].spj += p.total_spj;
    });
    return Object.entries(map).map(([unit, d]) => ({
      unit, pagu: d.pagu, spj: d.spj, sisa: d.pagu - d.spj,
      serapan: d.pagu > 0 ? Math.round((d.spj / d.pagu) * 100) : 0,
    })).sort((a, b) => b.serapan - a.serapan);
  }, [filteredData]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--surface-3)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p className="muted">Memuat data laporan...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="empty-state">
      <h3>Terjadi Kesalahan</h3>
      <p>{error}</p>
      <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={fetchData}>Coba Lagi</button>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Laporan &amp; Analitik</h1>
          <p className="page-subtitle">
            {dateRange ? `${dateRange.shortLabel || dateRange.label} · ` : ''}
            Tahun Anggaran {filterTahun}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={fetchData}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            </svg>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowPreview(true)} disabled={!dateRange}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            Buat Laporan
          </button>
        </div>
      </div>

      {/* Filter */}
      <FilterSection
        filterPeriode={filterPeriode}   setFilterPeriode={setFilterPeriode}
        filterBulan={filterBulan}       setFilterBulan={setFilterBulan}
        filterTahun={filterTahun}       setFilterTahun={setFilterTahun}
        filterTW={filterTW}             setFilterTW={setFilterTW}
        filterDateFrom={filterDateFrom} setFilterDateFrom={setFilterDateFrom}
        filterDateTo={filterDateTo}     setFilterDateTo={setFilterDateTo}
        filterUnit={filterUnit}         setFilterUnit={setFilterUnit}
        unitKerjaList={unitKerjaList}
        onGenerateReport={fetchData}
        loading={loading}
      />

      {/* Periode info banner */}
      {dateRange && (
        <div style={{ marginBottom: '1.5rem', padding: '0.875rem 1.25rem', background: 'var(--primary-bg)', border: '1px solid var(--primary-border, var(--border))', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" style={{ width: 18, height: 18, flexShrink: 0 }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <div>
              <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9375rem' }}>{dateRange.shortLabel || dateRange.label}</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginLeft: '0.75rem' }}>
                {formatDate(dateRange.from)} – {formatDate(dateRange.to)}
              </span>
            </div>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>
            {filteredPencairan.length} pencairan · {filteredData.length} program kerja · {jumlahUnit} unit
          </div>
        </div>
      )}

      {filteredData.length === 0 ? (
        <div className="empty-state card">
          <h3>Tidak Ada Data</h3>
          <p className="muted">Tidak ditemukan data program kerja untuk filter yang dipilih.</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats-grid mb-6">
            <StatCard title="Total Pagu Anggaran" value={formatRupiah(totals.pagu)}
              subtitle={`${filteredData.length} program kerja`} variant="default"
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
            />
            <StatCard title="Pencairan Periode Ini" value={formatRupiah(totals.pencairanPeriode)}
              subtitle={`${filteredPencairan.length} transaksi`} variant="success"
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}><polyline points="20 6 9 17 4 12"/></svg>}
            />
            <StatCard title="Sisa Anggaran" value={formatRupiah(totals.sisa)}
              subtitle={totals.sisa >= 0 ? 'Belum terpakai' : 'Melebihi pagu'}
              variant={totals.sisa >= 0 ? 'warning' : 'danger'}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
            />
            <StatCard title="Serapan Anggaran" value={`${totals.serapan}%`}
              subtitle={<StatusBadge percentage={totals.serapan} />}
              variant={totals.serapan >= 80 ? 'success' : totals.serapan >= 50 ? 'warning' : 'danger'}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
            />
          </div>

          <div className="dashboard-grid">
            {/* Tabel Program */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Program Kerja (Pagu Tahunan)</h3>
                <span className="muted" style={{ fontSize: '0.75rem' }}>{filteredData.length} program</span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>No</th><th>Program Kerja</th>
                        <th className="text-right">Pagu</th><th className="text-right">SPJ</th>
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
                            <td style={{ width: '100px' }}><ProgressBar value={pct} max={100} /></td>
                          </tr>
                        );
                      })}
                      <tr className="total-row">
                        <td colSpan={2}><strong>TOTAL</strong></td>
                        <td className="text-right"><strong>{formatRupiah(totals.pagu)}</strong></td>
                        <td className="text-right"><strong>{formatRupiah(totals.spj)}</strong></td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Pencairan periode */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Pencairan Periode Ini</h3>
                  <span className="muted" style={{ fontSize: '0.75rem' }}>{filteredPencairan.length} transaksi</span>
                </div>
                <div className="card-body" style={{ padding: '0.75rem' }}>
                  {filteredPencairan.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-2)', fontSize: '0.875rem' }}>
                      Belum ada pencairan pada periode ini
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {filteredPencairan.slice(0, 6).map((p, i) => (
                        <div key={i} style={{ padding: '0.625rem 0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nama}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>{formatDateShort(p.tanggal)}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{fmtShort(p.jumlah)}</div>
                            <span style={{ fontSize: '0.625rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: '999px',
                              background: p.status === 'selesai' ? '#d1fae5' : '#fef3c7',
                              color: p.status === 'selesai' ? '#065f46' : '#92400e' }}>
                              {p.status === 'selesai' ? 'SPJ Lengkap' : 'Proses'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {filteredPencairan.length > 6 && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textAlign: 'center', padding: '0.25rem' }}>
                          +{filteredPencairan.length - 6} lainnya — lihat di Preview Laporan
                        </p>
                      )}
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--primary-bg)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', fontWeight: 600 }}>
                        <span>Total Pencairan</span>
                        <span style={{ color: 'var(--primary)' }}>{formatRupiah(totals.pencairanPeriode)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chart top program */}
              {chartData.length > 0 && (
                <div className="card">
                  <div className="card-header"><h3 style={{ margin: 0, fontSize: '1rem' }}>Top Program (Alokasi Periode)</h3></div>
                  <div className="card-body"><SimpleBarChart data={chartData} /></div>
                </div>
              )}

              {/* Rekap per unit */}
              {rekapUnit.length > 0 && (
                <div className="card">
                  <div className="card-header"><h3 style={{ margin: 0, fontSize: '1rem' }}>Rekap per Unit Kerja</h3></div>
                  <div className="card-body" style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {rekapUnit.map((item, i) => (
                        <div key={i} style={{ padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)', borderLeft: `3px solid ${item.serapan >= 80 ? 'var(--success)' : item.serapan >= 50 ? 'var(--warning)' : 'var(--danger)'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                            <strong style={{ fontSize: '0.8125rem' }}>{item.unit}</strong>
                            <StatusBadge percentage={item.serapan} />
                          </div>
                          <ProgressBar value={item.spj} max={item.pagu} showLabel={false} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-3)', marginTop: '0.375rem' }}>
                            <span>{fmtShort(item.spj)} dari {fmtShort(item.pagu)}</span>
                            <span>{item.serapan}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <PreviewModal
        show={showPreview}
        onClose={() => setShowPreview(false)}
        dateRange={dateRange}
        data={filteredData}
        totals={totals}
        pencairanList={filteredPencairan}
        topPrograms={topPrograms}
        filterTahun={filterTahun}
        filterUnit={filterUnit}
        jumlahUnit={jumlahUnit}
      />
    </div>
  );
}
