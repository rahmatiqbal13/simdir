'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { usePencairan } from '@/context/PencairanContext'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/app/components/Toast'
import { useProgramKerja } from '@/context/ProgramKerjaContext'

// Data pencairan akan di-fetch dari Supabase

const formatRupiah = (num) => {
  if (!num || isNaN(num)) return 'Rp 0'
  return `Rp ${num.toLocaleString('id-ID')}`
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}

// ============ KOMPONEN STAT CARD ============
function StatCard({ title, value, subtitle, variant, icon }) {
  const colorMap = {
    default: { bg: 'var(--primary-50)', fg: 'var(--primary)' },
    info:    { bg: 'var(--primary-50)', fg: 'var(--primary)' },
    success: { bg: 'var(--success-50)', fg: 'var(--success)' },
    warning: { bg: 'var(--warning-50)', fg: 'var(--warning)' },
    danger:  { bg: 'var(--danger-50)',  fg: 'var(--danger)'  },
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

// ============ KOMPONEN PROGRESS BAR ============
function ProgressBar({ value, max, label }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  
  let colorVar = 'var(--success)'
  if (percentage < 50) colorVar = 'var(--danger)'
  else if (percentage < 80) colorVar = 'var(--warning)'

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
        <span style={{ color: 'var(--text-2)' }}>{label}</span>
        <span style={{ color: 'var(--text-3)' }}>{Math.round(percentage)}%</span>
      </div>
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
  )
}

// ============ KOMPONEN BREADCRUMB ============
function Breadcrumb({ items }) {
  return (
    <nav style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.5rem',
      fontSize: '0.8125rem',
      color: 'var(--text-3)',
      marginBottom: '1rem'
    }}>
      {items.map((item, index) => (
        <span key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {index > 0 && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
          {item.href ? (
            <a href={item.href} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
              {item.label}
            </a>
          ) : (
            <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

// ============ KOMPONEN STATUS BADGE ============
function StatusBadge({ status, percentage }) {
  const configs = {
    complete: { text: 'Lengkap', class: 'badge-green' },
    partial: { text: 'Sebagian', class: 'badge-amber' },
    empty: { text: 'Belum Ada', class: 'badge-slate' },
  }

  let config = configs.empty
  if (percentage >= 100) config = configs.complete
  else if (percentage > 0) config = configs.partial

  return (
    <span className={`badge ${config.class}`}>
      {config.text}
    </span>
  )
}

// ============ KOMPONEN HEADER SPJ ============
function SpjHeader({ pencairan, totalProgress }) {
  return (
    <div className="card mb-4" style={{ background: 'linear-gradient(135deg, var(--primary-bg) 0%, var(--surface) 100%)' }}>
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{pencairan.nama}</h2>
            <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              {pencairan.program}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {formatDate(pencairan.tanggal)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                {formatRupiah(pencairan.jumlah)}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right', minWidth: '120px', flexShrink: 1 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>Progress SPJ</p>
            <StatusBadge percentage={totalProgress} />
            <div style={{ marginTop: '0.5rem' }}>
              <ProgressBar value={totalProgress} max={100} label="Kelengkapan SPJ" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const PENERIMA_LIST = [
  'Dr. Mochamad Purnomo, S.Pd., M.Kes.',
  'Dr. Donny Ardy Kusuma, S.Pd., M.Kes.',
  'Aulia Putri Srie Wardani, S.Gz., M.Sc.',
  'Muhammad Dzul Fikri, S.Or., M.Pd.',
  'Moh. Fathur Rohman, S.Pd., M.Pd.',
  'Bhekti Lestari, S.Pd., M.Kes.',
  'Afif Rusdiawan, S.Pd., M.Kes.',
  'Prof. Dr. Budiyanto, M.Pd.',
  'Acep Ovel Novari Beny, M.Pd.',
  'Khofidotur Rofiah, S.Pd., M.Pd.',
  'Dr. Trisakti, M.Si.',
  'Muhamad Ro\'is Abidin, S.Pd., M.Pd.',
  'Raden Roro Maha Kalyana Mitta Anggoro, S.Pd., M.Pd.',
  'Rahmat Iqbal Rizaldi Pratama, S.Kom.',
  'Richard Jannuar Ade Irawan W, S.Ak.',
  'Ayub Baharuddin, S.Pd.',
  'Alfina Diva Pratiwi',
  'Muhammad Zainuddien Aziz, S.Pd.',
  'Heri Purnomo',
  'Ananta Wirajaya',
  'Said Ahmadi',
  'Purnomo',
]

// ============ KOMPONEN SPJ ITEM CARD ============
function SpjItemCard({ header, index, canEdit, onUpdateHeader, onAddDetail, onUpdateDetail }) {
  const totalDetail = header.details.reduce((sum, d) => sum + (d.nominal || 0), 0)
  const progress = header.jumlah_dana > 0 ? (totalDetail / header.jumlah_dana) * 100 : 0

  return (
    <div className="card mb-4" style={{ overflow: 'visible' }}>
      {/* Header Baris Induk */}
      <div style={{
        padding: '1rem 1.25rem',
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ 
            width: '1.75rem', 
            height: '1.75rem', 
            borderRadius: '50%', 
            background: 'var(--primary)', 
            color: 'white',
            display: 'grid',
            placeItems: 'center',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            {index + 1}
          </span>
          <div>
            {canEdit ? (
              <input 
                className="table-input" 
                value={header.uraian} 
                onChange={e => onUpdateHeader(header.id, 'uraian', e.target.value)}
                style={{ fontWeight: 600, width: '100%', maxWidth: '300px' }}
              />
            ) : (
              <strong>{header.uraian}</strong>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem', fontSize: '0.75rem' }}>
              <span className="muted">No. RBA:</span>
              {canEdit ? (
                <input 
                  className="table-input" 
                  value={header.no_rba} 
                  onChange={e => onUpdateHeader(header.id, 'no_rba', e.target.value)}
                  style={{ width: '100px' }}
                />
              ) : (
                <span>{header.no_rba || '-'}</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Jumlah Dana</p>
          {canEdit ? (
            <input 
              type="number"
              className="table-input table-input-num" 
              value={header.jumlah_dana} 
              onChange={e => onUpdateHeader(header.id, 'jumlah_dana', Number(e.target.value))}
            />
          ) : (
            <strong>{formatRupiah(header.jumlah_dana)}</strong>
          )}
        </div>
      </div>

      {/* Detail SPJ */}
      <div style={{ padding: '1rem 1.25rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Detail SPJ</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
              {formatRupiah(totalDetail)} / {formatRupiah(header.jumlah_dana)}
            </span>
          </div>
          <ProgressBar value={totalDetail} max={header.jumlah_dana} label="Progress SPJ" />
        </div>

        {/* Tabel Detail */}
        <div className="table-wrap" style={{ marginBottom: '1rem' }}>
          <table style={{ minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>No</th>
                <th style={{ width: '110px' }}>No MAK</th>
                <th>Uraian Kegiatan</th>
                <th style={{ width: '120px' }}>Nilai Anggaran</th>
                <th style={{ width: '120px' }}>Nominal SPJ</th>
                <th style={{ width: '100px' }}>PPh 21</th>
                <th style={{ width: '100px' }}>PPh 23</th>
                <th style={{ width: '100px' }}>PPN</th>
                <th style={{ width: '120px' }}>Belum SPJ</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {header.details.map((detail, idx) => {
                const belumSpj = Math.max(0, (detail.nilai_anggaran || 0) - (detail.nominal || 0))
                return (
                  <tr key={detail.id}>
                    <td className="text-center text-muted">{idx + 1}</td>
                    <td>
                      {canEdit ? (
                        <input
                          className="table-input"
                          value={detail.nomor_mak}
                          onChange={e => onUpdateDetail(header.id, detail.id, 'nomor_mak', e.target.value)}
                          placeholder="No MAK"
                        />
                      ) : (
                        detail.nomor_mak || '-'
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <input
                          className="table-input"
                          value={detail.uraian_kegiatan}
                          onChange={e => onUpdateDetail(header.id, detail.id, 'uraian_kegiatan', e.target.value)}
                          placeholder="Uraian kegiatan..."
                          style={{ minWidth: '150px' }}
                        />
                      ) : (
                        detail.uraian_kegiatan || '-'
                      )}
                    </td>
                    <td className="text-right">
                      {canEdit ? (
                        <input 
                          type="number"
                          className="table-input table-input-num" 
                          value={detail.nilai_anggaran} 
                          onChange={e => onUpdateDetail(header.id, detail.id, 'nilai_anggaran', Number(e.target.value))}
                        />
                      ) : (
                        formatRupiah(detail.nilai_anggaran)
                      )}
                    </td>
                    <td className="text-right">
                      {canEdit ? (
                        <input 
                          type="number"
                          className="table-input table-input-num" 
                          value={detail.nominal} 
                          onChange={e => onUpdateDetail(header.id, detail.id, 'nominal', Number(e.target.value))}
                        />
                      ) : (
                        formatRupiah(detail.nominal)
                      )}
                    </td>
                    {/* PPh 21 - Optional */}
                    <td className="text-right">
                      {canEdit ? (
                        <input 
                          type="number"
                          className="table-input table-input-num" 
                          value={detail.pph21 || ''} 
                          onChange={e => onUpdateDetail(header.id, detail.id, 'pph21', Number(e.target.value) || 0)}
                          placeholder="0"
                        />
                      ) : (
                        detail.pph21 > 0 ? formatRupiah(detail.pph21) : '-'
                      )}
                    </td>
                    {/* PPh 23 - Optional */}
                    <td className="text-right">
                      {canEdit ? (
                        <input 
                          type="number"
                          className="table-input table-input-num" 
                          value={detail.pph23 || ''} 
                          onChange={e => onUpdateDetail(header.id, detail.id, 'pph23', Number(e.target.value) || 0)}
                          placeholder="0"
                        />
                      ) : (
                        detail.pph23 > 0 ? formatRupiah(detail.pph23) : '-'
                      )}
                    </td>
                    {/* PPN - Optional */}
                    <td className="text-right">
                      {canEdit ? (
                        <input 
                          type="number"
                          className="table-input table-input-num" 
                          value={detail.ppn || ''} 
                          onChange={e => onUpdateDetail(header.id, detail.id, 'ppn', Number(e.target.value) || 0)}
                          placeholder="0"
                        />
                      ) : (
                        detail.ppn > 0 ? formatRupiah(detail.ppn) : '-'
                      )}
                    </td>
                    <td className={`text-right font-semibold ${belumSpj > 0 ? 'text-danger' : 'text-success'}`}>
                      {formatRupiah(belumSpj)}
                    </td>
                    <td className="text-center">
                      {progress >= 100 && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color: 'var(--success)' }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {canEdit && (
          <button className="ghost text-sm" onClick={() => onAddDetail(header.id)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Detail SPJ
          </button>
        )}
      </div>

      {/* Footer Info */}
      <div style={{
        padding: '0.75rem 1.25rem',
        background: 'var(--surface-2)',
        borderTop: '1px solid var(--border)',
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span>
            <span className="muted">Unit Kerja:</span> <strong>{header.unit_kerja}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span className="muted">Penerima:</span>
            {canEdit ? (
              <>
                <datalist id={`penerima-list-${header.id}`}>
                  {PENERIMA_LIST.map(name => <option key={name} value={name} />)}
                </datalist>
                <input
                  list={`penerima-list-${header.id}`}
                  className="table-input"
                  value={header.penerima}
                  onChange={e => onUpdateHeader(header.id, 'penerima', e.target.value)}
                  placeholder="Ketik atau pilih penerima..."
                  style={{ minWidth: '220px', fontWeight: 600 }}
                />
              </>
            ) : (
              <strong>{header.penerima || '-'}</strong>
            )}
          </span>
        </div>
        <div>
          {progress >= 100 ? (
            <span className="badge badge-green">SPJ Lengkap</span>
          ) : progress > 0 ? (
            <span className="badge badge-amber">SPJ Sebagian</span>
          ) : (
            <span className="badge badge-slate">Belum SPJ</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ KOMPONEN REKAP UNIT KERJA ============
function RekapUnitKerja({ data, totals }) {
  return (
    <div className="card mt-6" style={{ overflow: 'visible' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Rekap per Unit Kerja</h3>
        <span className="muted" style={{ fontSize: '0.75rem' }}>{Object.keys(data).length} unit</span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table style={{ minWidth: '780px' }}>
            <thead>
              <tr>
                <th>Unit Kerja</th>
                <th className="text-right" style={{ whiteSpace: 'nowrap' }}>Panjar</th>
                <th className="text-right" style={{ whiteSpace: 'nowrap' }}>SPJ</th>
                <th className="text-right" style={{ whiteSpace: 'nowrap' }}>Pengembalian</th>
                <th className="text-right" style={{ whiteSpace: 'nowrap' }}>Belum SPJ</th>
                <th className="text-center">Progress</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data).map(([unit, item]) => {
                const progress = item.panjar > 0 ? (item.spj / item.panjar) * 100 : 0
                const belumSpj = item.panjar - item.spj
                return (
                  <tr key={unit}>
                    <td>
                      <strong>{unit}</strong>
                    </td>
                    <td className="text-right" style={{ whiteSpace: 'nowrap' }}>{formatRupiah(item.panjar)}</td>
                    <td className="text-right" style={{ whiteSpace: 'nowrap' }}>{formatRupiah(item.spj)}</td>
                    <td className="text-right" style={{ whiteSpace: 'nowrap' }}>{formatRupiah(item.pengembalian)}</td>
                    <td className={`text-right font-semibold ${belumSpj > 0 ? 'text-danger' : 'text-success'}`} style={{ whiteSpace: 'nowrap' }}>
                      {formatRupiah(belumSpj)}
                    </td>
                    <td style={{ width: '150px' }}>
                      <ProgressBar value={progress} max={100} label="" />
                    </td>
                  </tr>
                )
              })}
              <tr className="total-row">
                <td><strong>TOTAL</strong></td>
                <td className="text-right" style={{ whiteSpace: 'nowrap' }}><strong>{formatRupiah(totals.totalDana)}</strong></td>
                <td className="text-right" style={{ whiteSpace: 'nowrap' }}><strong>{formatRupiah(totals.totalSpj)}</strong></td>
                <td className="text-right" style={{ whiteSpace: 'nowrap' }}><strong>{formatRupiah(totals.totalPengembalian)}</strong></td>
                <td className="text-right" style={{ whiteSpace: 'nowrap' }}><strong>{formatRupiah(totals.totalBelumSpj)}</strong></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ============ HALAMAN UTAMA ============
export default function SpjPage() {
  const params = useParams()
  const slugOrId = params?.id || ''
  const { getPencairanById, pencairan: pencairanList, loading: loadingPencairan } = usePencairan()
  const { recalculateDanaTerpakai, refreshPrograms } = useProgramKerja()

  const [pencairan, setPencairan] = useState(null)
  const [pencairanLoading, setPencairanLoading] = useState(true)
  const [headers, setHeaders] = useState([])

  // Fetch pencairan data — resolve slug to UUID if needed
  useEffect(() => {
    const loadPencairan = async () => {
      if (!slugOrId) {
        setPencairanLoading(false)
        return
      }

      setPencairanLoading(true)

      // If param is a slug (not UUID), find the real UUID from the cached list
      let pencairanId = slugOrId
      if (!UUID_RE.test(slugOrId)) {
        const match = pencairanList.find(p => p.slug === slugOrId)
        if (match) {
          pencairanId = match.id
        } else if (pencairanList.length === 0 && loadingPencairan) {
          // List not loaded yet — wait for next effect run
          setPencairanLoading(false)
          return
        }
      }

      const result = await getPencairanById(pencairanId)
      
      if (result.success) {
        setPencairan(result.data)

        // Try to load previously saved SPJ data from DB
        const { data: savedHeaders, error: spjErr } = await supabase
          .from('spj_header')
          .select('*, spj_detail(*)')
          .eq('pencairan_id', result.data.id)
          .order('no_urut', { ascending: true })

        if (!spjErr && savedHeaders && savedHeaders.length > 0) {
          // Restore from saved DB data
          setHeaders(savedHeaders.map(h => ({
            id: h.id,
            no_rba: h.no_rba || '',
            uraian: h.uraian_kegiatan || '',
            jumlah_dana: parseFloat(h.jumlah_dana) || 0,
            unit_kerja: h.unit_kerja || '-',
            penerima: h.penerima || '',
            details: (h.spj_detail || []).map(d => ({
              id: d.id,
              nilai_anggaran: parseFloat(d.nilai_anggaran) || 0,
              nomor_mak: d.nomor_rka || '',
              uraian_kegiatan: d.uraian_kegiatan || '',
              nominal: parseFloat(d.nominal) || 0,
              pph21: parseFloat(d.pph21) || 0,
              pph23: parseFloat(d.pph23) || 0,
              ppn: parseFloat(d.ppn) || 0,
            }))
          })))
        } else if (result.data.programs && result.data.programs.length > 0) {
          // First time — initialize from linked programs
          setHeaders(result.data.programs.map((program, i) => ({
            id: program.junction_id || `h${Date.now()}_${i}`,
            no_rba: '',
            uraian: program.nama || '',
            jumlah_dana: program.jumlah_alokasi || 0,
            unit_kerja: program.unit_kerja || '-',
            penerima: '',
            details: [{
              id: `d${program.id || i}_0`,
              nilai_anggaran: program.jumlah_alokasi || 0,
              nomor_mak: '',
              uraian_kegiatan: '',
              nominal: 0,
              pph21: 0,
              pph23: 0,
              ppn: 0
            }]
          })))
        }
      } else {
        console.error('Error loading pencairan:', result.error)
      }
      setPencairanLoading(false)
    }
    
    loadPencairan()
  }, [slugOrId, pencairanList, getPencairanById, loadingPencairan])

  const { success: toastSuccess, error: toastError } = useToast()
  const [saving, setSaving] = useState(false)

  const userRole = 'super_admin'
  const canEdit = ['super_admin', 'admin_keuangan'].includes(userRole)

  // Hitung totals - include pajak
  const totals = useMemo(() => {
    let totalDana = 0, totalSpj = 0, totalBelumSpj = 0, totalPph21 = 0, totalPph23 = 0, totalPpn = 0
    headers.forEach(h => {
      totalDana += h.jumlah_dana || 0
      h.details.forEach(d => {
        const nominal = d.nominal || 0
        const nilaiAnggaran = d.nilai_anggaran || 0
        totalSpj += nominal
        totalBelumSpj += Math.max(0, nilaiAnggaran - nominal)
        totalPph21 += d.pph21 || 0
        totalPph23 += d.pph23 || 0
        totalPpn += d.ppn || 0
      })
    })
    return { 
      totalDana, 
      totalSpj, 
      totalBelumSpj,
      totalPengembalian: totalDana - totalSpj,
      totalPajak: totalPph21 + totalPph23 + totalPpn,
      totalPph21,
      totalPph23,
      totalPpn
    }
  }, [headers])

  // Hitung progress keseluruhan
  const totalProgress = useMemo(() => {
    return totals.totalDana > 0 ? (totals.totalSpj / totals.totalDana) * 100 : 0
  }, [totals])

  // Rekap per unit kerja
  const rekapUnit = useMemo(() => {
    const units = {}
    headers.forEach(h => {
      if (!units[h.unit_kerja]) {
        units[h.unit_kerja] = { panjar: 0, pengembalian: 0, spj: 0 }
      }
      units[h.unit_kerja].panjar += h.jumlah_dana || 0
      h.details.forEach(d => { 
        units[h.unit_kerja].spj += d.nominal || 0 
      })
    })
    Object.keys(units).forEach(u => { 
      units[u].pengembalian = units[u].panjar - units[u].spj 
    })
    return units
  }, [headers])

  // Handlers
  const handleHeaderChange = (headerId, field, value) => {
    setHeaders(headers.map(h => h.id === headerId ? { ...h, [field]: value } : h))
  }

  const handleDetailChange = (headerId, detailId, field, value) => {
    setHeaders(headers.map(h => {
      if (h.id !== headerId) return h
      return { 
        ...h, 
        details: h.details.map(d => d.id === detailId ? { ...d, [field]: value } : d) 
      }
    }))
  }

  const addHeader = () => {
    setHeaders([...headers, {
      id: `h${Date.now()}`, 
      no_rba: '', 
      uraian: '', 
      jumlah_dana: 0, 
      unit_kerja: 'USC', 
      penerima: '',
      details: [{ 
        id: `d${Date.now()}`, 
        nilai_anggaran: 0, 
        nomor_mak: '', 
        uraian_kegiatan: '', 
        nominal: 0,
        pph21: 0,
        pph23: 0,
        ppn: 0
      }]
    }])
  }

  const addDetail = (headerId) => {
    setHeaders(headers.map(h => {
      if (h.id !== headerId) return h
      return {
        ...h,
        details: [...h.details, { 
          id: `d${Date.now()}`, 
          nilai_anggaran: 0, 
          nomor_mak: '', 
          uraian_kegiatan: '', 
          nominal: 0,
          pph21: 0,
          pph23: 0,
          ppn: 0
        }]
      }
    }))
  }

  const handleSave = async () => {
    if (!pencairan) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Hapus data spj_header lama (spj_detail ikut terhapus via CASCADE)
      const { error: delErr } = await supabase
        .from('spj_header')
        .delete()
        .eq('pencairan_id', pencairan.id)
      if (delErr) throw delErr

      // 2. Insert spj_header + spj_detail per baris
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i]

        const { data: hRow, error: hErr } = await supabase
          .from('spj_header')
          .insert({
            pencairan_id: pencairan.id,
            no_urut: i + 1,
            no_rba: h.no_rba || '',
            uraian_kegiatan: h.uraian || '',
            jumlah_dana: h.jumlah_dana || 0,
            unit_kerja: h.unit_kerja || '',
            penerima: h.penerima || '',
            created_by: user?.id,
          })
          .select('id')
          .single()
        if (hErr) throw hErr

        if (h.details.length > 0) {
          const detailRows = h.details.map(d => ({
            spj_header_id: hRow.id,
            nilai_anggaran: d.nilai_anggaran || 0,
            nomor_rka: d.nomor_mak || '',
            uraian_kegiatan: d.uraian_kegiatan || '',
            nominal: d.nominal || 0,
            pph21: d.pph21 || 0,
            pph23: d.pph23 || 0,
            ppn: d.ppn || 0,
          }))
          const { error: dErr } = await supabase.from('spj_detail').insert(detailRows)
          if (dErr) throw dErr
        }
      }

      // 3. Update status pencairan berdasarkan progress
      const progress = totals.totalDana > 0 ? (totals.totalSpj / totals.totalDana) * 100 : 0
      const newStatus = progress >= 100 ? 'selesai' : totals.totalSpj > 0 ? 'terbit' : 'draft'
      await supabase
        .from('pencairan_dana')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', pencairan.id)

      // 4. Update dana_terpakai untuk semua program yang terkait
      if (pencairan.programs && pencairan.programs.length > 0) {
        for (const program of pencairan.programs) {
          if (program.id) {
            try {
              await recalculateDanaTerpakai(program.id)
            } catch (recalcErr) {
              console.error('Error recalculating dana for program:', program.id, recalcErr)
              // Continue dengan program lain meski ada error
            }
          }
        }
        // Refresh programs list di context
        await refreshPrograms()
      }

      toastSuccess('SPJ berhasil disimpan! Dana program telah diupdate.')
    } catch (err) {
      const msg = err?.message || err?.details || err?.hint || JSON.stringify(err) || 'Unknown error'
      console.error('Error saving SPJ:', JSON.stringify(err, null, 2))
      toastError('Gagal menyimpan SPJ: ' + msg)
    } finally {
      setSaving(false)
    }
  }

  // Loading state
  if (pencairanLoading || loadingPencairan) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" style={{ marginBottom: '1rem' }}></div>
        <h3>Memuat data pencairan...</h3>
      </div>
    )
  }

  // Error state - pencairan not found
  if (!pencairan) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '3rem', height: '3rem', marginBottom: '1rem', opacity: 0.4 }}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h3>Data pencairan tidak ditemukan</h3>
        <p>ID pencairan tidak valid atau data telah dihapus</p>
        <a href="/pencairan" className="btn btn-primary mt-4">
          Kembali ke Daftar Pencairan
        </a>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Pencairan', href: '/pencairan' },
          { label: pencairan.nama }
        ]} 
      />

      {/* Header SPJ */}
      <SpjHeader pencairan={pencairan} totalProgress={totalProgress} />

      {/* Stats Cards */}
      <div className="stats-grid mb-6">
        <StatCard
          title="Jumlah Dana"
          value={formatRupiah(totals.totalDana)}
          subtitle="Total panjar"
          variant="default"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          title="Total SPJ"
          value={formatRupiah(totals.totalSpj)}
          subtitle={`${Math.round(totalProgress)}% dari panjar`}
          variant="success"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
        <StatCard
          title="Total Pajak"
          value={formatRupiah(totals.totalPajak)}
          subtitle={`PPh 21: ${formatRupiah(totals.totalPph23)} • PPh 23: ${formatRupiah(totals.totalPph23)} • PPN: ${formatRupiah(totals.totalPpn)}`}
          variant="warning"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          }
        />
        <StatCard
          title="Pengembalian"
          value={formatRupiah(totals.totalPengembalian)}
          subtitle="Belum terpakai"
          variant={totals.totalPengembalian > 0 ? 'warning' : 'success'}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          }
        />
        <StatCard
          title="Belum SPJ"
          value={formatRupiah(totals.totalBelumSpj)}
          subtitle="Perlu ditindaklanjuti"
          variant={totals.totalBelumSpj > 0 ? 'danger' : 'success'}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        />
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.125rem' }}>Daftar SPJ</h2>
          <p className="muted" style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            {headers.length} baris induk • {headers.reduce((sum, h) => sum + h.details.length, 0)} detail
          </p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={addHeader}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Baris Induk
          </button>
        )}
      </div>

      {/* List SPJ Items */}
      {headers.map((header, index) => (
        <SpjItemCard
          key={header.id}
          header={header}
          index={index}
          canEdit={canEdit}
          onUpdateHeader={handleHeaderChange}
          onAddDetail={addDetail}
          onUpdateDetail={handleDetailChange}
        />
      ))}

      {/* Rekap per Unit Kerja */}
      <RekapUnitKerja data={rekapUnit} totals={totals} />

      {/* Action Footer */}
      {canEdit && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '1rem',
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border)'
        }}>
          <button className="btn btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Excel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <div className="loading-spinner" style={{ width: '1rem', height: '1rem' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {saving ? 'Menyimpan...' : 'Simpan SPJ'}
          </button>
        </div>
      )}
    </div>
  )
}
