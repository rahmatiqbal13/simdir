'use client'

import { useState, useMemo, useCallback, useEffect, useRef, Fragment } from 'react'
import { useProgramKerja } from '@/context/ProgramKerjaContext'

const UNIT_KERJA_LIST = [
  'USC', 'PUI Keolahragaan', 'PUI Disabilitas', 'PUI Seni Budaya',
  'Kolam Renang', 'Driving Golf', 'ULABK', 'SSFC',
  'PUIPT Seni Budaya Majapahitan', 'PUIPT DIC', 'PUIPT SERC', 'PUI AI',
  'Belum Ditentukan' // Untuk program yang unit kerjanya tidak terdeteksi saat import
]

const TAHUN_LIST = [2024, 2025, 2026, 2027]

// Sumber dana dari CSV POK (akan dinormalize saat import)
const SUMBER_DANA_LIST = [
  { value: 'UKT', label: 'UKT', color: '#3b82f6' },
  { value: 'UU', label: 'UU', color: '#10b981' },
  { value: 'DJRP', label: 'DJRP (Djarum)', color: '#f59e0b' },
  { value: 'SA', label: 'SA (Swadana)', color: '#8b5cf6' },
  { value: 'BPPTN', label: 'BPPTN', color: '#ec4899' },
  { value: 'SPP', label: 'SPP', color: '#06b6d4' },
  { value: 'Sponsor', label: 'Sponsor', color: '#f97316' },
  { value: 'Lainnya', label: 'Lainnya', color: '#64748b' }
]

const ITEMS_PER_PAGE = 5

// ============ IMPORT HELPERS ============

function parseCSVText(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const parseLine = (line) => {
    const cells = []; let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') inQ = !inQ
      else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cells.push(cur.trim())
    return cells
  }
  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const vals = parseLine(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g, '') })
    return obj
  })
}

function processImportRows(rows) {
  if (!rows.length) return { programs: [], warnings: ['File kosong atau tidak ada data'] }

  const findCol = (row, aliases) => {
    for (const key of Object.keys(row)) {
      const norm = key.toLowerCase().trim().replace(/[\s-]/g, '_')
      if (aliases.some(a => norm === a || norm.startsWith(a))) return row[key]?.toString().trim() || ''
    }
    return ''
  }
  const parseNum = (val) => {
    if (!val) return 0
    return parseFloat(val.toString().replace(/[^0-9.,]/g, '').replace(',', '.')) || 0
  }

  const programMap = new Map()
  const warnings = []
  const skippedRows = []

  rows.forEach((row, idx) => {
    const nama = findCol(row, ['nama_program', 'namaprogram', 'nama', 'program'])
    const id_rka = findCol(row, ['id_rka', 'idrka', 'rka', 'kode'])
    const tahun = parseInt(findCol(row, ['tahun', 'tahun_anggaran'])) || new Date().getFullYear()
    const pagu = parseNum(findCol(row, ['pagu_anggaran', 'pagu', 'anggaran']))
    
    // Log untuk debugging
    console.log(`Baris ${idx + 2}: nama="${nama}", id_rka="${id_rka}", pagu=${pagu}`)
    
    // Skip baris tanpa nama
    if (!nama) {
      skippedRows.push(`Baris ${idx + 2}: Nama program kosong`)
      return
    }
    
    // Skip baris dengan pagu 0 (kemungkinan header atau data invalid)
    if (pagu <= 0) {
      skippedRows.push(`Baris ${idx + 2}: "${nama}" - Pagu anggaran nol/invalid (${findCol(row, ['pagu_anggaran', 'pagu', 'anggaran'])})`)
      return
    }
    
    // Gunakan kombinasi id_rka + tahun sebagai key utama
    const key = id_rka ? `${id_rka}|${tahun}` : `${nama}|${tahun}`

    if (!programMap.has(key)) {
      let unit_kerja = findCol(row, ['unit_kerja', 'unitkerja', 'unit'])
      const matched = UNIT_KERJA_LIST.find(u => u.toLowerCase() === unit_kerja.toLowerCase())
      if (unit_kerja && !UNIT_KERJA_LIST.includes(unit_kerja)) {
        if (matched) unit_kerja = matched
        else warnings.push(`Baris ${idx + 2}: Unit Kerja "${unit_kerja}" tidak dikenal untuk "${nama}"`)
      }
      programMap.set(key, {
        id_rka: id_rka || `AUTO-${idx}`,
        nama,
        unit_kerja_id: unit_kerja || '',
        tahun,
        pagu_anggaran: pagu,
        sumber_dana: findCol(row, ['sumber_dana', 'sumberdana', 'sumber']) || 'UKT',
        variabel: [],
      })
    } else {
      // Jika sudah ada, tambahkan pagu (merge duplicate)
      const existing = programMap.get(key)
      existing.pagu_anggaran += pagu
      warnings.push(`Baris ${idx + 2}: "${nama}" - Duplicate dengan baris lain, pagu ditambahkan`)
    }

    const nama_variabel = findCol(row, ['nama_variabel', 'namavariabel', 'variabel', 'item', 'kegiatan'])
    if (nama_variabel && programMap.has(key)) {
      programMap.get(key).variabel.push({
        nama_variabel,
        jumlah: parseInt(findCol(row, ['jumlah', 'qty', 'volume'])) || 1,
        satuan: findCol(row, ['satuan', 'unit_satuan']) || '',
        harga_satuan: parseNum(findCol(row, ['harga_satuan', 'harga', 'hargasatuan'])),
      })
    }
  })

  const programs = Array.from(programMap.values())
  
  // Hitung total
  const totalPagu = programs.reduce((sum, p) => sum + (p.pagu_anggaran || 0), 0)
  
  console.log('Import Summary:', {
    totalRows: rows.length,
    skippedRows: skippedRows.length,
    importedPrograms: programs.length,
    totalPagu,
    warnings: warnings.length
  })
  
  // Tambahkan summary ke warnings
  if (skippedRows.length > 0) {
    warnings.unshift(`⚠️ ${skippedRows.length} baris di-skip (lihat detail di console)`)
    console.log('Skipped rows:', skippedRows)
  }
  
  warnings.unshift(`📊 Total: ${programs.length} program, Rp ${totalPagu.toLocaleString('id-ID')}`)
  
  return { programs, warnings }
}

function parsePOKCSV(text) {
  const parseNum = (val) => {
    if (!val) return 0
    // Indonesian format: dots = thousand sep, comma = decimal
    const s = val.toString().replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')
    return parseFloat(s) || 0
  }

  // Valid sumber_dana values based on database constraint
  const VALID_SUMBER_DANA = ['UKT', 'UU', 'BPPTN', 'SPP', 'Sponsor', 'Lainnya']
  
  const normalizeSumberDana = (val) => {
    if (!val) return 'UKT'
    const v = val.toString().trim().toUpperCase()
    // Check if it's already valid
    if (VALID_SUMBER_DANA.includes(v)) return v
    // Mapping for common variations
    if (v === 'SA' || v.includes('SWADANA')) return 'Lainnya'
    if (v === 'DJRP' || v.includes('DJARUM')) return 'Sponsor'
    // Default fallback
    return 'UKT'
  }

  const UNIT_MAP = [
    [/\bAI\b|PUI.?AI/i,                      'PUI AI'],
    [/keolahrag/i,                             'PUI Keolahragaan'],
    [/disabilit/i,                             'PUI Disabilitas'],
    [/majapahit/i,                             'PUIPT Seni Budaya Majapahitan'],
    [/seni.?budaya/i,                          'PUI Seni Budaya'],
    [/\bDIC\b/,                                'PUIPT DIC'],
    [/\bSERC\b/,                               'PUIPT SERC'],
    [/\bULABK\b/i,                             'ULABK'],
    [/\bSSFC\b/i,                              'SSFC'],
    [/kolam.?renang/i,                         'Kolam Renang'],
    [/driving.?golf|lapangan.?golf|\bgolf\b/i, 'Driving Golf'],
    [/\bUSC\b|science.?center/i,               'USC'],
  ]

  const extractUnit = (str) => {
    if (!str) return ''
    const parenMatch = str.match(/\(([^)]+)\)/)
    if (parenMatch) {
      const inner = parenMatch[1]
      for (const [re, unit] of UNIT_MAP) {
        if (re.test(inner)) return unit
      }
    }
    for (const [re, unit] of UNIT_MAP) {
      if (re.test(str)) return unit
    }
    return ''
  }

  const cleanName = (name) => name
    .replace(/\(\*\)/g, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()

  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const warnings = []
  const programMap = new Map()

  let currentPCode = ''
  let currentROCode = ''
  let currentUnit = ''
  let currentProgram = null

  // Skip metadata header rows — find first row starting with P\d{3} or "Kode"
  let startIdx = 0
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const first = lines[i].split(';')[0]?.trim() || ''
    if (/^Kode$/i.test(first)) { startIdx = i + 1; break }
    if (/^P\d{3}$/.test(first)) { startIdx = i; break }
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const cols = line.split(';').map(c => c.trim())
    if (cols.length < 2) continue
    const kode = cols[0] || ''
    const uraian = cols[1] || ''

    // Top-level program: P001
    if (/^P\d{3}$/.test(kode)) {
      currentPCode = kode
      const u = extractUnit(uraian); if (u) currentUnit = u
      currentROCode = ''
      currentProgram = null
      continue
    }

    // Hierarchical dot codes: P001.101 / P001.101.001 / P001.101.001.001
    if (/^P\d{3}(\.\d{3})+$/.test(kode)) {
      if (/^P\d{3}(\.\d{3}){3}$/.test(kode)) currentROCode = kode
      const u = extractUnit(uraian); if (u) currentUnit = u
      currentProgram = null
      continue
    }

    // Budget account code (6-digit) — skip
    if (/^\d{6}$/.test(kode)) continue

    // Sub-activity (1-3 digit) → Program Kerja entry
    if (/^\d{1,3}$/.test(kode)) {
      const mapKey = `${currentROCode || currentPCode}-${kode}`
      if (!programMap.has(mapKey)) {
        const unit = extractUnit(uraian) || currentUnit
        const rawSumberDana = (cols[10] || '').trim()
        programMap.set(mapKey, {
          id_rka: `${currentPCode}-${kode}`,
          nama: cleanName(uraian),
          unit_kerja_id: unit,
          tahun: 2026,
          pagu_anggaran: parseNum(cols[9]),
          sumber_dana: normalizeSumberDana(rawSumberDana),
          _rawSumberDana: rawSumberDana, // Save original for tracking
          variabel: [],
        })
      } else {
        programMap.get(mapKey).pagu_anggaran += parseNum(cols[9])
      }
      currentProgram = programMap.get(mapKey)
      continue
    }

    // Empty kode = line item → biaya_variabel
    if (!kode && currentProgram && uraian) {
      const vol1 = parseNum(cols[2]) || 1
      const vol2 = parseNum(cols[4]) || 1
      const vol3 = parseNum(cols[6]) || 1
      currentProgram.variabel.push({
        nama_variabel: cleanName(uraian),
        jumlah: vol1 * vol2 * vol3 || 1,
        satuan: cols[3] || cols[5] || cols[7] || '',
        harga_satuan: parseNum(cols[8]),
      })
    }
  }

  const programs = []
  let unitNotDetectedCount = 0
  let sumberDanaNormalizedCount = 0
  
  for (const prog of programMap.values()) {
    if (!prog.unit_kerja_id) {
      warnings.push(`"${prog.nama}": Unit Kerja tidak terdeteksi → di-set ke "Belum Ditentukan"`)
      prog.unit_kerja_id = 'Belum Ditentukan' // Tetap import, tandai sebagai belum ditentukan
      unitNotDetectedCount++
    }
    if (!prog.pagu_anggaran) {
      warnings.push(`"${prog.nama}": Pagu Anggaran nol`)
    }
    // Track sumber_dana normalization
    const rawSumberDana = prog._rawSumberDana || prog.sumber_dana
    if (rawSumberDana && !VALID_SUMBER_DANA.includes(rawSumberDana)) {
      sumberDanaNormalizedCount++
    }
    programs.push(prog)
  }
  
  // Hitung total
  const totalPagu = programs.reduce((sum, p) => sum + (p.pagu_anggaran || 0), 0)
  
  console.log('POK Import Summary:', {
    totalLines: lines.length,
    startIndex: startIdx,
    importedPrograms: programs.length,
    totalPagu,
    unitNotDetected: unitNotDetectedCount,
    warnings: warnings.length
  })
  
  // Tambahkan summary ke warnings
  if (sumberDanaNormalizedCount > 0) {
    warnings.unshift(`⚠️ ${sumberDanaNormalizedCount} program dengan sumber dana tidak standar → di-set ke "UKT/Lainnya"`)
  }
  if (unitNotDetectedCount > 0) {
    warnings.unshift(`⚠️ ${unitNotDetectedCount} program dengan unit kerja "Belum Ditentukan"`)
  }
  warnings.unshift(`📊 Total: ${programs.length} program, Rp ${totalPagu.toLocaleString('id-ID')}`)
  
  return { programs, warnings }
}

// ============ END IMPORT HELPERS ============

const formatRupiah = (num) => {
  if (!num || isNaN(num)) return 'Rp 0'
  return `Rp ${num.toLocaleString('id-ID')}`
}

function calculateTotal(items) {
  if (!items || !Array.isArray(items)) return 0
  return items.reduce((sum, item) => sum + ((item.jumlah || 0) * (item.harga_satuan || 0)), 0)
}

// ============ KOMPONEN STAT CARD ============
function StatCard({ title, value, subtitle, variant }) {
  const variants = {
    default: '',
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    info: 'info'
  }

  return (
    <div className={`stat-card ${variants[variant] || ''}`}>
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
      {subtitle && <div className="muted text-sm mt-1">{subtitle}</div>}
    </div>
  )
}

// ============ KOMPONEN FILTER BAR ============
function FilterBar({ 
  searchQuery, 
  setSearchQuery, 
  selectedUnit, 
  setSelectedUnit,
  selectedTahun,
  setSelectedTahun,
  selectedSumberDana,
  setSelectedSumberDana,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  onExport,
  totalItems
}) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="card mb-4" style={{ overflow: 'visible' }}>
      <div className="card-body" style={{ overflow: 'visible' }}>
        {/* Baris Pertama: Search dan Toggle View */}
        <div className="toolbar" style={{ marginBottom: showFilters ? '1rem' : 0, position: 'relative', zIndex: 100 }}>
          <div className="filter-group filter-search" style={{ maxWidth: '24rem' }}>
            <svg className="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Cari program kerja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="filter-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="filter-clear-btn"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Item Count */}
            <span style={{ 
              fontSize: '0.8125rem', 
              color: 'var(--text-2)',
              marginRight: '0.5rem'
            }}>
              {totalItems} program
            </span>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters ? 'btn-primary' : 'ghost'}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filter
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                style={{ width: '1rem', height: '1rem', transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div className="flex" style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '0.25rem' }}>
              <button
                onClick={() => setViewMode('card')}
                className="btn icon-only"
                style={{ 
                  background: viewMode === 'card' ? 'var(--surface)' : 'transparent',
                  boxShadow: viewMode === 'card' ? 'var(--shadow-sm)' : 'none',
                  color: viewMode === 'card' ? 'var(--primary)' : 'var(--text-2)'
                }}
                title="Tampilan Card"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className="btn icon-only"
                style={{ 
                  background: viewMode === 'table' ? 'var(--surface)' : 'transparent',
                  boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none',
                  color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-2)'
                }}
                title="Tampilan Tabel"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>

            {/* Export Dropdown */}
            <ExportDropdown onExport={onExport} />
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', 
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)'
          }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Unit Kerja</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Semua Unit Kerja</option>
                {UNIT_KERJA_LIST.map((uk) => (
                  <option key={uk} value={uk}>{uk}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Tahun Anggaran</label>
              <select
                value={selectedTahun}
                onChange={(e) => setSelectedTahun(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Semua Tahun</option>
                {TAHUN_LIST.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Sumber Dana</label>
              <select
                value={selectedSumberDana}
                onChange={(e) => setSelectedSumberDana(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Semua Sumber Dana</option>
                {SUMBER_DANA_LIST.map((sd) => (
                  <option key={sd.value} value={sd.value}>{sd.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Urutkan</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="name_asc">Nama A-Z</option>
                <option value="name_desc">Nama Z-A</option>
                <option value="pagu_desc">Pagu Terbesar</option>
                <option value="pagu_asc">Pagu Terkecil</option>
                <option value="usage_desc">Penggunaan Tertinggi</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============ KOMPONEN EXPORT DROPDOWN ============
function ExportDropdown({ onExport }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const exportOptions = [
    {
      id: 'xlsx',
      label: '📊 Export Excel (.xlsx)',
      desc: 'Download file Excel — bisa dipakai untuk import ulang',
      color: 'var(--success)'
    },
    {
      id: 'csv',
      label: '📄 Export CSV',
      desc: 'Download file teks terpisah koma (.csv)',
      color: 'var(--primary)'
    },
    {
      id: 'print',
      label: '🖨️ Print / PDF',
      desc: 'Cetak atau simpan sebagai PDF',
      color: 'var(--text-2)'
    },
  ]

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-primary"
        style={{ 
          background: 'var(--success)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          whiteSpace: 'nowrap'
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export Data
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          style={{ 
            width: '1rem', 
            height: '1rem',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            minWidth: '280px',
            zIndex: 10000,
            overflow: 'hidden'
          }}
        >
          {exportOptions.map((option, idx) => (
            <button
              key={option.id}
              onClick={() => {
                onExport(option.id)
                setIsOpen(false)
              }}
              style={{
                width: '100%',
                padding: '1rem 1.25rem',
                textAlign: 'left',
                background: 'white',
                border: 'none',
                borderBottom: idx < exportOptions.length - 1 ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white'
              }}
            >
              <span style={{ 
                fontWeight: 600, 
                fontSize: '0.9375rem',
                color: option.color,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {option.label}
              </span>
              <span style={{ 
                fontSize: '0.8125rem', 
                color: '#64748b',
                marginLeft: '1.5rem'
              }}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ KOMPONEN PROGRESS BAR ============
function ProgressBar({ value, max, showLabel = true }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  
  let colorVar = 'var(--success)'
  if (percentage > 90) colorVar = 'var(--danger)'
  else if (percentage > 75) colorVar = 'var(--warning)'

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
          <span style={{ color: 'var(--text-2)' }}>{Math.round(percentage)}% terpakai</span>
          <span style={{ color: 'var(--text-3)' }}>{formatRupiah(value)} / {formatRupiah(max)}</span>
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
  )
}

// ============ KOMPONEN PROGRAM CARD ============
function ProgramCard({ program, onEdit, onDelete, canEdit }) {
  const [expanded, setExpanded] = useState(false)
  const [showVariabel, setShowVariabel] = useState(false)

  const variabelItems = program.variabel || []
  const totalVariabel = useMemo(() => calculateTotal(variabelItems), [variabelItems])
  const paguAnggaran = program.pagu_anggaran || 0
  
  // Dana terpakai dari SPJ (real-time dari database)
  const danaTerpakai = program.dana_terpakai || 0
  const sisaPagu = paguAnggaran - danaTerpakai
  const serapan = paguAnggaran > 0 ? Math.round((danaTerpakai / paguAnggaran) * 100) : 0
  const isOverBudget = sisaPagu < 0

  const getStatusBadge = () => {
    if (isOverBudget) return { text: 'Over Budget', class: 'badge-amber' }
    if (serapan >= 90) return { text: 'Hampir Habis', class: 'badge-amber' }
    if (serapan === 0) return { text: 'Belum Dipakai', class: 'badge-slate' }
    return { text: 'Aktif', class: 'badge-green' }
  }

  const status = getStatusBadge()

  return (
    <div className="card program-panel" style={{ marginBottom: '0.75rem' }}>
      {/* Header Card */}
      <div 
        className="program-summary"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <div className="collapse-mark" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className={`badge ${status.class}`}>{status.text}</span>
            <span className="muted" style={{ fontSize: '0.75rem' }}>{program.id_rka}</span>
          </div>
          <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '0.25rem' }}>{program.nama}</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.25rem',
              color: (!program.unit_kerja_id || program.unit_kerja_id === 'Belum Ditentukan') ? 'var(--warning)' : 'inherit'
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {program.unit_kerja_id || 'Belum Ditentukan'}
              {(!program.unit_kerja_id || program.unit_kerja_id === 'Belum Ditentukan') && (
                <span style={{ fontSize: '0.6875rem', marginLeft: '0.25rem' }}>⚠️ Perlu diedit</span>
              )}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {program.tahun}
            </span>
            {program.sumber_dana && (
              <span 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '999px',
                  backgroundColor: `${SUMBER_DANA_LIST.find(sd => sd.value === program.sumber_dana)?.color || '#64748b'}20`,
                  color: SUMBER_DANA_LIST.find(sd => sd.value === program.sumber_dana)?.color || '#64748b',
                  fontWeight: 500,
                  fontSize: '0.75rem'
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.75rem', height: '0.75rem' }}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
                {SUMBER_DANA_LIST.find(sd => sd.value === program.sumber_dana)?.label || program.sumber_dana}
              </span>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>Pagu Anggaran</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: isOverBudget ? 'var(--danger)' : 'var(--text)' }}>
            {formatRupiah(paguAnggaran)}
          </p>
        </div>
      </div>

      {/* Progress Bar Dana SPJ */}
      <div style={{ padding: '0 1.25rem', marginBottom: '0.75rem' }}>
        <ProgressBar value={danaTerpakai} max={paguAnggaran} />
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="program-detail" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Stats Grid */}
          <div className="rka-meta" style={{ marginBottom: '1rem' }}>
            <div>
              <span>Total Pagu</span>
              <strong>{formatRupiah(paguAnggaran)}</strong>
            </div>
            <div>
              <span>Dana Terpakai (SPJ)</span>
              <strong style={{ color: isOverBudget ? 'var(--danger)' : 'var(--primary)' }}>
                {formatRupiah(danaTerpakai)}
              </strong>
            </div>
            <div>
              <span>Sisa Pagu</span>
              <strong style={{ color: isOverBudget ? 'var(--danger)' : 'var(--success)' }}>
                {isOverBudget ? '-' : ''}{formatRupiah(Math.abs(sisaPagu))}
                {isOverBudget && <span style={{ fontSize: '0.75rem', display: 'block' }}>(Over Budget)</span>}
              </strong>
            </div>
            <div>
              <span>% Penggunaan</span>
              <strong style={{ color: isOverBudget ? 'var(--danger)' : serapan >= 90 ? 'var(--warning)' : 'var(--text)' }}>
                {serapan}%
              </strong>
            </div>
          </div>
          
          {/* Info Biaya Variabel */}
          <div style={{ 
            padding: '0.75rem 1rem', 
            background: 'var(--surface-2)', 
            borderRadius: 'var(--radius)',
            marginBottom: '1rem',
            fontSize: '0.8125rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span className="muted">Rencana Biaya (Variabel):</span>
              <strong>{formatRupiah(totalVariabel)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Selisih Rencana vs Realisasi:</span>
              <strong style={{ color: totalVariabel > danaTerpakai ? 'var(--success)' : 'var(--warning)' }}>
                {formatRupiah(Math.abs(totalVariabel - danaTerpakai))}
                {totalVariabel > danaTerpakai ? ' (lebih rencana)' : totalVariabel < danaTerpakai ? ' (lebih realisasi)' : ''}
              </strong>
            </div>
          </div>

          {/* Rincian Biaya Toggle */}
          <div className="variabel-toggle">
            <button
              className="ghost"
              onClick={(e) => { e.stopPropagation(); setShowVariabel(!showVariabel) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5z" />
              </svg>
              {showVariabel ? 'Sembunyikan' : 'Tampilkan'} Rincian Biaya
              {showVariabel ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </button>
          </div>

          {/* Biaya Variabel Section */}
          {showVariabel && (
            <BiayaVariabelSection
              programId={program.id}
              items={variabelItems}
              onUpdate={(items) => onUpdateVariabel(program.id, items)}
              canEdit={canEdit}
              pagu={paguAnggaran}
            />
          )}

          {/* Actions */}
          {canEdit && (
            <div className="flex gap-2 mt-4" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button
                className="btn btn-primary"
                onClick={(e) => { e.stopPropagation(); onEdit(program) }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
              <button
                className="btn btn-danger"
                onClick={(e) => { e.stopPropagation(); onDelete(program.id) }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Hapus
              </button>
              <a
                href={`/pencairan?program=${program.id}`}
                onClick={(e) => e.stopPropagation()}
                className="btn btn-primary"
                style={{ marginLeft: 'auto', background: 'var(--success)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Pencairan
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============ KOMPONEN BIAYA VARIABEL ============
function BiayaVariabelSection({ programId, canEdit, pagu }) {
  const { loadBiayaVariabel, addBiayaVariabel, updateBiayaVariabel, deleteBiayaVariabel } = useProgramKerja()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newItem, setNewItem] = useState({ nama_variabel: '', jumlah: 1, harga_satuan: 0, satuan: '' })
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    loadItems()
  }, [programId])

  const loadItems = async () => {
    try {
      setLoading(true)
      const data = await loadBiayaVariabel(programId)
      setItems(data)
    } catch (err) {
      console.error('Error loading biaya variabel:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalVariabel = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0)
  }, [items])
  
  const sisaPagu = pagu - totalVariabel
  const isOverBudget = sisaPagu < 0
  const isFull = sisaPagu <= 0
  const persentaseUsed = pagu > 0 ? (totalVariabel / pagu) * 100 : 0
  
  // Validasi sebelum tambah
  const newItemTotal = (newItem.jumlah || 0) * (newItem.harga_satuan || 0)
  const willExceed = (totalVariabel + newItemTotal) > pagu

  const handleAdd = async () => {
    if (!newItem.nama_variabel.trim()) {
      setErrorMsg('Nama variabel wajib diisi')
      return
    }
    
    if (willExceed) {
      setErrorMsg(`Gagal! Total akan melebihi pagu. Sisa pagu: ${formatRupiah(sisaPagu)}`)
      return
    }
    
    try {
      await addBiayaVariabel(programId, newItem)
      await loadItems()
      setNewItem({ nama_variabel: '', jumlah: 1, harga_satuan: 0, satuan: '' })
      setShowForm(false)
      setErrorMsg('')
    } catch (err) {
      setErrorMsg('Gagal menambahkan: ' + err.message)
    }
  }

  const handleRemove = async (id) => {
    if (!confirm('Hapus item ini?')) return
    try {
      await deleteBiayaVariabel(id)
      await loadItems()
      setErrorMsg('')
    } catch (err) {
      alert('Gagal menghapus: ' + err.message)
    }
  }

  const handleUpdate = async (updated) => {
    // Cek apakah update akan melebihi pagu
    const oldItem = items.find(i => i.id === updated.id)
    const oldTotal = oldItem ? oldItem.total : 0
    const newTotal = (updated.jumlah || 0) * (updated.harga_satuan || 0)
    const totalAfterUpdate = totalVariabel - oldTotal + newTotal
    
    if (totalAfterUpdate > pagu) {
      alert(`Gagal! Total akan melebihi pagu. Sisa yang bisa digunakan: ${formatRupiah(pagu - (totalVariabel - oldTotal))}`)
      return
    }
    
    try {
      await updateBiayaVariabel(updated.id, updated)
      await loadItems()
      setErrorMsg('')
    } catch (err) {
      alert('Gagal mengupdate: ' + err.message)
    }
  }

  // Warna progress bar berdasarkan persentase
  const getProgressColor = () => {
    if (persentaseUsed >= 100) return 'var(--danger)'
    if (persentaseUsed >= 80) return 'var(--warning)'
    return 'var(--success)'
  }

  return (
    <div className="variabel-section" style={{ 
      background: 'white', 
      borderRadius: '12px', 
      border: '1px solid var(--border)',
      overflow: 'hidden'
    }}>
      {/* Header dengan Progress */}
      <div style={{ 
        padding: '1.25rem', 
        background: isOverBudget ? 'var(--danger-bg)' : isFull ? 'var(--warning-bg)' : 'var(--surface-2)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem', color: 'var(--primary)' }}>
              <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5z" />
              <path d="M6 9.01V9" /><path d="M15 5l6.3 6.3M14 7.58l-5.92 5.92" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Rincian Biaya Variabel</span>
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '0.125rem 0.5rem', 
              background: isFull ? 'var(--danger)' : persentaseUsed >= 80 ? 'var(--warning)' : 'var(--success)',
              color: 'white',
              borderRadius: '999px'
            }}>
              {items.length} Item
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: '0.25rem' }}>
              Total Variabel
            </div>
            <div style={{ 
              fontWeight: 700, 
              fontSize: '1.125rem',
              color: isOverBudget ? 'var(--danger)' : 'var(--text)'
            }}>
              {formatRupiah(totalVariabel)}
            </div>
          </div>
        </div>

        {/* Progress Bar Pagu */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.375rem' }}>
            <span style={{ color: 'var(--text-2)' }}>Penggunaan Pagu</span>
            <span style={{ 
              fontWeight: 600,
              color: persentaseUsed >= 100 ? 'var(--danger)' : persentaseUsed >= 80 ? 'var(--warning)' : 'var(--success)'
            }}>
              {persentaseUsed.toFixed(1)}% ({formatRupiah(sisaPagu)} tersisa)
            </span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            background: 'var(--surface-3)', 
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${Math.min(persentaseUsed, 100)}%`, 
              height: '100%', 
              background: getProgressColor(),
              borderRadius: '999px',
              transition: 'all 0.3s ease'
            }} />
          </div>
        </div>

        {/* Warning Message */}
        {isFull && (
          <div style={{ 
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius)',
            fontSize: '0.8125rem',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Pagu sudah penuh! Tidak bisa menambah variabel lagi.
          </div>
        )}
        {!isFull && persentaseUsed >= 80 && (
          <div style={{ 
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning)',
            borderRadius: 'var(--radius)',
            fontSize: '0.8125rem',
            color: 'var(--warning)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Pagu hampir habis! Sisa {formatRupiah(sisaPagu)}.
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</div>
      )}

      {/* Table */}
      {!loading && items.length > 0 ? (
        <div className="table-wrap" style={{ padding: '0 1rem' }}>
          <table style={{ fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={{ width: '40px', padding: '0.75rem' }}>No</th>
                <th style={{ padding: '0.75rem' }}>Nama Variabel</th>
                <th style={{ width: '100px', padding: '0.75rem', textAlign: 'center' }}>Jumlah</th>
                <th style={{ width: '140px', padding: '0.75rem', textAlign: 'right' }}>Harga Satuan</th>
                <th style={{ width: '140px', padding: '0.75rem', textAlign: 'right' }}>Total</th>
                {canEdit && <th style={{ width: '50px', padding: '0.75rem' }}></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <BiayaVariabelRow 
                  key={item.id} 
                  item={item} 
                  index={idx} 
                  onUpdate={handleUpdate} 
                  onRemove={handleRemove} 
                  canEdit={canEdit} 
                />
              ))}
              <tr style={{ background: 'var(--surface-3)', borderTop: '2px solid var(--border)' }}>
                <td colSpan={4} className="text-right" style={{ padding: '0.875rem', fontWeight: 700, fontSize: '0.9375rem' }}>
                  TOTAL BIAYA VARIABEL
                </td>
                <td className="text-right" style={{ 
                  padding: '0.875rem', 
                  fontWeight: 700, 
                  fontSize: '1rem',
                  color: isOverBudget ? 'var(--danger)' : 'var(--primary)'
                }}>
                  {formatRupiah(totalVariabel)}
                </td>
                {canEdit && <td style={{ padding: '0.875rem' }}></td>}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        !loading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '2.5rem 1rem',
            color: 'var(--text-2)',
            background: 'var(--surface-2)',
            margin: '1rem',
            borderRadius: 'var(--radius)',
            border: '2px dashed var(--border)'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px', marginBottom: '0.75rem', opacity: 0.5 }}>
              <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5z" />
            </svg>
            <p style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Belum ada rincian biaya variabel</p>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Klik "Tambah Variabel" untuk menambahkan</p>
          </div>
        )
      )}

      {/* Add Button / Form */}
      {canEdit && (
        <div style={{ padding: '1rem', background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
          {errorMsg && (
            <div style={{ 
              marginBottom: '0.75rem',
              padding: '0.5rem 0.75rem',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius)',
              fontSize: '0.8125rem',
              color: 'var(--danger)'
            }}>
              {errorMsg}
            </div>
          )}
          
          {showForm ? (
            <div className="variabel-form-inline">
              <input
                className="table-input"
                value={newItem.nama_variabel}
                onChange={(e) => {
                  setNewItem({ ...newItem, nama_variabel: e.target.value })
                  setErrorMsg('')
                }}
                placeholder="Nama variabel (cth: Beli bola voli)"
                autoFocus
                style={{ flex: 1 }}
              />
              <input
                type="number"
                className="table-input table-input-num"
                value={newItem.jumlah}
                onChange={(e) => {
                  setNewItem({ ...newItem, jumlah: parseInt(e.target.value) || 0 })
                  setErrorMsg('')
                }}
                placeholder="Qty"
                min="1"
                style={{ width: '70px' }}
              />
              <input
                className="table-input table-input-num"
                value={newItem.satuan}
                onChange={(e) => setNewItem({ ...newItem, satuan: e.target.value })}
                placeholder="Satuan"
                style={{ width: '80px' }}
              />
              <input
                type="number"
                className="table-input table-input-num"
                value={newItem.harga_satuan}
                onChange={(e) => setNewItem({ ...newItem, harga_satuan: parseInt(e.target.value) || 0 })}
                placeholder="Harga"
                min="0"
                style={{ width: '120px' }}
              />
              <button 
                className="btn btn-primary" 
                onClick={handleAdd}
                disabled={willExceed}
                style={{ opacity: willExceed ? 0.5 : 1 }}
              >
                Tambah
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => {
                  setShowForm(false)
                  setErrorMsg('')
                  setNewItem({ nama_variabel: '', jumlah: 1, harga_satuan: 0, satuan: '' })
                }}
              >
                Batal
              </button>
            </div>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={() => {
                if (isFull) {
                  alert('Pagu sudah penuh! Tidak bisa menambah variabel lagi.')
                  return
                }
                setShowForm(true)
                setErrorMsg('')
              }}
              disabled={isFull}
              style={{ 
                width: '100%',
                opacity: isFull ? 0.5 : 1,
                cursor: isFull ? 'not-allowed' : 'pointer'
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {isFull ? 'Pagu Penuh - Tidak Bisa Menambah' : 'Tambah Variabel Baru'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function BiayaVariabelRow({ item, onUpdate, onRemove, canEdit, index }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td className="text-center text-muted" style={{ padding: '0.75rem' }}>{index + 1}</td>
      <td style={{ padding: '0.75rem' }}>
        {canEdit ? (
          <input
            className="table-input"
            value={item.nama_variabel}
            onChange={(e) => onUpdate({ ...item, nama_variabel: e.target.value })}
            placeholder="Nama item"
            style={{ width: '100%', minWidth: '150px' }}
          />
        ) : (
          <span style={{ fontWeight: 500 }}>{item.nama_variabel}</span>
        )}
      </td>
      <td className="text-center" style={{ padding: '0.75rem' }}>
        {canEdit ? (
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}>
            <input
              type="number"
              className="table-input table-input-num"
              value={item.jumlah}
              onChange={(e) => onUpdate({ ...item, jumlah: parseInt(e.target.value) || 0 })}
              min="0"
              style={{ width: '60px', textAlign: 'center' }}
            />
            <input
              className="table-input table-input-num"
              value={item.satuan}
              onChange={(e) => onUpdate({ ...item, satuan: e.target.value })}
              placeholder="Satuan"
              style={{ width: '70px', textAlign: 'center' }}
            />
          </div>
        ) : (
          <span>{item.jumlah} {item.satuan}</span>
        )}
      </td>
      <td className="text-right" style={{ padding: '0.75rem' }}>
        {canEdit ? (
          <input
            type="number"
            className="table-input table-input-num"
            value={item.harga_satuan}
            onChange={(e) => onUpdate({ ...item, harga_satuan: parseInt(e.target.value) || 0 })}
            min="0"
            style={{ width: '120px', textAlign: 'right' }}
          />
        ) : (
          <span>{formatRupiah(item.harga_satuan)}</span>
        )}
      </td>
      <td className="text-right" style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
        {formatRupiah(item.total || 0)}
      </td>
      {canEdit && (
        <td className="text-center" style={{ padding: '0.75rem' }}>
          <button 
            className="ghost icon-only" 
            onClick={() => onRemove(item.id)} 
            title="Hapus"
            style={{ color: 'var(--danger)', padding: '0.25rem' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </td>
      )}
    </tr>
  )
}

// ============ KOMPONEN PROGRAM TABLE ============
function ProgramTable({ programs, onEdit, onDelete, onManageVariabel, canEdit }) {
  const [expandedId, setExpandedId] = useState(null)

  return (
    <div className="table-wrap">
      <table style={{ minWidth: '48rem' }}>
        <thead>
          <tr>
            <th>Program</th>
            <th>Unit Kerja</th>
            <th>Sumber Dana</th>
            <th className="text-right">Pagu</th>
            <th className="text-right">Terpakai</th>
            <th className="text-right">Sisa</th>
            <th className="text-center">%</th>
            <th className="text-center">Status</th>
            {canEdit && <th className="text-center">Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {programs.map((program) => {
            const totalVariabel = calculateTotal(program.variabel || [])
            const paguAnggaran = program.pagu_anggaran || 0
            const sisaPagu = paguAnggaran - totalVariabel
            const serapan = paguAnggaran > 0 ? Math.round((totalVariabel / paguAnggaran) * 100) : 0
            const isOverBudget = sisaPagu < 0
            const isExpanded = expandedId === program.id

            const getStatusBadge = () => {
              if (isOverBudget) return { text: 'Over', class: 'badge-amber' }
              if (serapan >= 90) return { text: 'Warning', class: 'badge-amber' }
              if (serapan === 0) return { text: 'Idle', class: 'badge-slate' }
              return { text: 'Active', class: 'badge-green' }
            }

            const status = getStatusBadge()

            return (
              <Fragment key={program.id}>
                <tr
                  className={isExpanded ? 'header-row' : ''}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : program.id)}
                >
                  <td>
                    <div>
                      <strong style={{ fontSize: '0.875rem' }}>{program.nama}</strong>
                      <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>
                        {program.id_rka} • {program.tahun}
                      </p>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{program.unit_kerja_id || 'Belum Ditentukan'}</td>
                  <td style={{ fontSize: '0.75rem' }}>
                    {program.sumber_dana && (
                      <span 
                        style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '999px',
                          backgroundColor: `${SUMBER_DANA_LIST.find(sd => sd.value === program.sumber_dana)?.color || '#64748b'}20`,
                          color: SUMBER_DANA_LIST.find(sd => sd.value === program.sumber_dana)?.color || '#64748b',
                          fontWeight: 500
                        }}
                      >
                        {SUMBER_DANA_LIST.find(sd => sd.value === program.sumber_dana)?.label || program.sumber_dana}
                      </span>
                    )}
                  </td>
                  <td className="text-right" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatRupiah(paguAnggaran)}</td>
                  <td className="text-right" style={{ fontSize: '0.875rem' }}>{formatRupiah(totalVariabel)}</td>
                  <td className="text-right" style={{ fontSize: '0.875rem' }}>
                    <span className={isOverBudget ? 'text-danger' : ''}>
                      {formatRupiah(Math.abs(sisaPagu))}
                    </span>
                  </td>
                  <td className="text-center" style={{ fontSize: '0.875rem' }}>
                    <span className={isOverBudget ? 'text-danger' : ''}>{serapan}%</span>
                  </td>
                  <td className="text-center">
                    <span className={`badge ${status.class}`}>{status.text}</span>
                  </td>
                  {canEdit && (
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className="ghost icon-only"
                          onClick={(e) => { e.stopPropagation(); onEdit(program) }}
                          title="Edit"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        {onManageVariabel && (
                          <button
                            className="ghost icon-only"
                            style={{ color: 'var(--primary)' }}
                            onClick={(e) => { e.stopPropagation(); onManageVariabel(program) }}
                            title="Kelola Variabel"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                          </button>
                        )}
                        <button
                          className="ghost icon-only"
                          style={{ color: 'var(--danger)' }}
                          onClick={(e) => { e.stopPropagation(); onDelete(program.id) }}
                          title="Hapus"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} style={{ padding: 0, background: 'var(--surface-2)' }}>
                      <div style={{ padding: '1rem' }}>
                        <BiayaVariabelSection
                          programId={program.id}
                          items={program.variabel || []}
                          onUpdate={(items) => onUpdateVariabel(program.id, items)}
                          canEdit={canEdit}
                          pagu={paguAnggaran}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============ KOMPONEN PAGINATION ============
function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'space-between', 
      gap: '1rem',
      marginTop: '1.5rem' 
    }} className="sm:flex-row">
      <p className="muted" style={{ fontSize: '0.8125rem' }}>
        Menampilkan <strong>{startItem}</strong> - <strong>{endItem}</strong> dari <strong>{totalItems}</strong> program
      </p>

      <div className="flex items-center gap-2">
        <button
          className="btn ghost icon-only"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className="btn icon-only"
              style={{ 
                minWidth: '2.25rem',
                background: currentPage === page ? 'var(--primary)' : 'var(--surface)',
                color: currentPage === page ? 'white' : 'var(--text)',
                border: currentPage === page ? 'none' : '1px solid var(--border)'
              }}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          className="btn ghost icon-only"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ============ KOMPONEN MODAL ============
function ProgramModal({ program, onSave, onClose }) {
  const [form, setForm] = useState({
    id_rka: program?.id_rka || '',
    nama_program: program?.nama || '',
    unit_kerja: program?.unit_kerja_id || 'USC',
    tahun: program?.tahun || new Date().getFullYear(),
    pagu: program?.pagu_anggaran || 0,
    sumber_dana: program?.sumber_dana || 'UKT',
  })
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.pagu < 0) {
      setError('Pagu tidak boleh negatif')
      return
    }
    if (!form.id_rka.trim() || !form.nama_program.trim()) {
      setError('ID RKA dan Nama Program wajib diisi')
      return
    }
    // Mapping form fields ke field database yang benar
    const dataToSave = {
      ...program,
      id_rka: form.id_rka,
      nama: form.nama_program,
      unit_kerja_id: form.unit_kerja,
      tahun: form.tahun,
      pagu_anggaran: form.pagu,
      sumber_dana: form.sumber_dana,
      variabel: program?.variabel || []
    }
    onSave(dataToSave)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{program?.id ? 'Edit' : 'Tambah'} Program Kerja</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card-form-body">
            {error && (
              <div className="error-msg" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <div className="form-grid">
              <div>
                <label>ID RKA</label>
                <input
                  name="id_rka"
                  value={form.id_rka}
                  onChange={(e) => setForm({ ...form, id_rka: e.target.value })}
                  required
                  placeholder="14406"
                />
              </div>
              <div>
                <label>Tahun Anggaran</label>
                <select
                  value={form.tahun}
                  onChange={(e) => setForm({ ...form, tahun: parseInt(e.target.value) })}
                >
                  {TAHUN_LIST.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="full">
                <label>Nama Program</label>
                <input
                  name="nama_program"
                  value={form.nama_program}
                  onChange={(e) => setForm({ ...form, nama_program: e.target.value })}
                  required
                  placeholder="Nama program kerja"
                />
              </div>
              <div>
                <label>Unit Kerja</label>
                <select
                  value={form.unit_kerja}
                  onChange={(e) => setForm({ ...form, unit_kerja: e.target.value })}
                >
                  {UNIT_KERJA_LIST.map((uk) => (
                    <option key={uk} value={uk}>{uk}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Sumber Dana</label>
                <select
                  value={form.sumber_dana}
                  onChange={(e) => setForm({ ...form, sumber_dana: e.target.value })}
                >
                  {SUMBER_DANA_LIST.map((sd) => (
                    <option key={sd.value} value={sd.value}>{sd.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Pagu Anggaran (Rp)</label>
                <input
                  type="number"
                  name="pagu"
                  value={form.pagu}
                  onChange={(e) => setForm({ ...form, pagu: parseInt(e.target.value) || 0 })}
                  required
                  min="0"
                  placeholder="150000000"
                />
              </div>
            </div>
          </div>

          <div className="card-form-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============ KOMPONEN IMPORT MODAL ============
function ImportModal({ onImport, onClose }) {
  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)
  const dropRef = useRef(null)

  const parseFile = async (f) => {
    setParsing(true); setParsed(null)
    try {
      let rows = []
      const ext = f.name.split('.').pop().toLowerCase()
      if (ext === 'csv') {
        const text = await f.text()
        const isPOK = text.includes('RINCIAN KERTAS KERJA') ||
          (text.split('\n')[0] || '').split(';').length >= 8
        if (isPOK) {
          setParsed(parsePOKCSV(text))
          return
        }
        rows = parseCSVText(text)
      } else if (ext === 'xlsx' || ext === 'xls') {
        const XLSX = (await import('xlsx')).default || await import('xlsx')
        const buf = await f.arrayBuffer()
        const wb = XLSX.read(buf)
        const ws = wb.Sheets[wb.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      } else {
        throw new Error('Format tidak didukung. Gunakan .csv atau .xlsx')
      }
      setParsed(processImportRows(rows))
    } catch (err) {
      setParsed({ programs: [], warnings: [`Error: ${err.message}`] })
    } finally {
      setParsing(false)
    }
  }

  const handleFileSelect = (f) => {
    if (!f) return
    setFile(f); setResult(null)
    parseFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  const downloadTemplate = async (format) => {
    const headers = ['ID RKA', 'Nama Program', 'Unit Kerja', 'Tahun', 'Pagu Anggaran', 'Sumber Dana', 'Nama Variabel', 'Jumlah', 'Satuan', 'Harga Satuan']
    const example = [
      ['14406', 'Program Pengembangan Kolam Renang', 'Kolam Renang', '2025', '150000000', 'UKT', 'Beli alat renang', '5', 'Unit', '2000000'],
      ['14406', 'Program Pengembangan Kolam Renang', 'Kolam Renang', '2025', '150000000', 'UKT', 'Pelatihan instruktur', '2', 'Kali', '5000000'],
      ['14407', 'Program IT Support USC', 'USC', '2025', '80000000', 'UKT', 'Pengadaan laptop', '2', 'Unit', '20000000'],
    ]
    if (format === 'csv') {
      const csv = [headers, ...example].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
      a.download = 'template_program_kerja.csv'; a.click()
    } else {
      const XLSX = (await import('xlsx')).default || await import('xlsx')
      const ws = XLSX.utils.aoa_to_sheet([headers, ...example])
      ws['!cols'] = headers.map(() => ({ wch: 22 }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Program Kerja')
      XLSX.writeFile(wb, 'template_program_kerja.xlsx')
    }
  }

  const handleImport = async () => {
    if (!parsed?.programs?.length) return
    setImporting(true)
    setProgress({ done: 0, total: parsed.programs.length })
    try {
      const res = await onImport(parsed.programs, (done) => setProgress(p => ({ ...p, done })))
      setResult(res)
    } finally {
      setImporting(false)
    }
  }

  const hasData = parsed?.programs?.length > 0
  const hasErrors = parsed?.warnings?.some(w => w.startsWith('Error:'))

  return (
    <div className="modal-backdrop" onClick={!importing ? onClose : undefined}>
      <div className="modal-content" style={{ maxWidth: '760px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Import Data Program Kerja</h2>
          <button onClick={onClose} disabled={importing}>✕</button>
        </div>

        <div className="card-form-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Template Download */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.625rem', color: 'var(--text)' }}>
              1. Download template terlebih dahulu
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => downloadTemplate('xlsx')} className="btn ghost" style={{ fontSize: '0.8125rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Template Excel (.xlsx)
              </button>
              <button onClick={() => downloadTemplate('csv')} className="btn ghost" style={{ fontSize: '0.8125rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Template CSV
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.5rem' }}>
              Kolom wajib: <strong>Nama Program, Unit Kerja, Tahun, Pagu Anggaran</strong>.
              Satu program bisa banyak baris jika ada rincian variabel.
            </p>
          </div>

          {/* File Drop Zone */}
          {!result && (
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.625rem', color: 'var(--text)' }}>
                2. Upload file data
              </p>
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${file ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: file ? 'rgba(59,130,246,0.04)' : 'var(--surface-2)',
                  transition: 'all 0.15s',
                }}
              >
                {parsing ? (
                  <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Membaca file...</p>
                ) : file ? (
                  <>
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--primary)' }}>{file.name}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
                      Klik untuk ganti file
                    </p>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '2.5rem', height: '2.5rem', color: 'var(--text-3)', margin: '0 auto 0.75rem' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--text-2)' }}>Drop file di sini atau klik untuk pilih</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>Mendukung: .csv, .xlsx, .xls</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={e => handleFileSelect(e.target.files[0])} style={{ display: 'none' }} />
              </div>
            </div>
          )}

          {/* Result setelah import */}
          {result && (
            <div style={{
              padding: '1rem',
              borderRadius: 'var(--radius)',
              border: `1px solid ${result.errors?.length ? 'var(--warning)' : 'var(--success)'}`,
              background: result.errors?.length ? 'var(--warning-bg)' : 'var(--success-bg)',
              marginBottom: '1rem',
            }}>
              <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
                {result.imported > 0 && `${result.imported} program ditambahkan`}
                {result.imported > 0 && result.updated > 0 && ', '}
                {result.updated > 0 && `${result.updated} program diperbarui`}
                {result.imported === 0 && result.updated === 0 && 'Tidak ada program yang diimport'}
                {result.errors?.length ? ` — ${result.errors.length} gagal` : ''}
              </p>
              {result.errors?.map((e, i) => (
                <p key={i} style={{ fontSize: '0.8125rem', color: 'var(--danger)' }}>✕ {e}</p>
              ))}
            </div>
          )}

          {/* Preview */}
          {parsed && !result && (
            <div>
              {/* Warnings */}
              {parsed.warnings?.length > 0 && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--warning-bg)', border: '1px solid var(--warning)', borderRadius: 'var(--radius)' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.375rem', color: 'var(--warning)' }}>Peringatan:</p>
                  {parsed.warnings.map((w, i) => (
                    <p key={i} style={{ fontSize: '0.8125rem', color: 'var(--warning)' }}>• {w}</p>
                  ))}
                </div>
              )}

              {parsed.programs.length > 0 ? (
                <>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.625rem', color: 'var(--text)' }}>
                    3. Preview — {parsed.programs.length} program akan diimport
                  </p>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-2)' }}>
                          {['Nama Program', 'Unit Kerja', 'Tahun', 'Pagu Anggaran', 'Variabel'].map(h => (
                            <th key={h} style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.programs.slice(0, 10).map((p, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.625rem 0.75rem' }}>
                              <div style={{ fontWeight: 500 }}>{p.nama}</div>
                              {p.id_rka && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{p.id_rka}</div>}
                            </td>
                            <td style={{ padding: '0.625rem 0.75rem', color: UNIT_KERJA_LIST.includes(p.unit_kerja_id) ? 'var(--text)' : 'var(--danger)' }}>
                              {p.unit_kerja_id || '—'}
                            </td>
                            <td style={{ padding: '0.625rem 0.75rem' }}>{p.tahun}</td>
                            <td style={{ padding: '0.625rem 0.75rem', fontWeight: 500, color: p.pagu_anggaran > 0 ? 'var(--text)' : 'var(--danger)' }}>
                              {p.pagu_anggaran > 0 ? formatRupiah(p.pagu_anggaran) : '—'}
                            </td>
                            <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-3)' }}>
                              {p.variabel.length > 0 ? `${p.variabel.length} item` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsed.programs.length > 10 && (
                      <p style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-3)', background: 'var(--surface-2)' }}>
                        ...dan {parsed.programs.length - 10} program lainnya
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>
                  <p>Tidak ada data valid yang ditemukan</p>
                  <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Periksa format file dan coba lagi</p>
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                <span>Mengimport...</span>
                <span>{progress.done} / {progress.total}</span>
              </div>
              <div style={{ height: '6px', background: 'var(--surface-3)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--primary)', borderRadius: '999px', width: `${(progress.done / progress.total) * 100}%`, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}
        </div>

        <div className="card-form-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={importing}>
            {result ? 'Tutup' : 'Batal'}
          </button>
          {!result && (
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={!hasData || hasErrors || importing}
            >
              {importing ? 'Mengimport...' : `Import ${parsed?.programs?.length || 0} Program`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ HALAMAN UTAMA ============
export default function ProgramKerjaPage() {
  const { programs, loading, error, addProgram, updateProgram, deleteProgram, deleteAllPrograms, refreshPrograms, loadBiayaVariabel, addBiayaVariabel, deleteBiayaVariabel } = useProgramKerja()

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [selectedTahun, setSelectedTahun] = useState('')
  const [selectedSumberDana, setSelectedSumberDana] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState('card')
  const [currentPage, setCurrentPage] = useState(1)

  // Modal States
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  // Variabel Modal States
  const [showVariabelModal, setShowVariabelModal] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState(null)

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false)

  // Delete-all confirm state
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)

  // Handler untuk membuka modal variabel
  const handleOpenVariabel = (program) => {
    setSelectedProgram(program)
    setShowVariabelModal(true)
  }

  // Handler untuk menutup modal variabel
  const handleCloseVariabel = () => {
    setShowVariabelModal(false)
    setSelectedProgram(null)
  }

  // User Role (nantinya dari context/auth)
  const userRole = 'super_admin'
  const canEdit = ['super_admin', 'admin_keuangan'].includes(userRole)
  
  // Debug logging
  useEffect(() => {
    console.log('Debug - canEdit:', canEdit)
    console.log('Debug - programs.length:', programs?.length)
    console.log('Debug - showDeleteAllModal:', showDeleteAllModal)
    console.log('Debug - programs:', programs)
  }, [canEdit, programs, showDeleteAllModal])

  // Filter & Sort Programs
  const filteredPrograms = useMemo(() => {
    // Guard clause for null/undefined programs
    if (!programs || !Array.isArray(programs)) {
      return []
    }
    
    let result = [...programs]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p => 
        (p?.nama || '').toLowerCase().includes(query) ||
        (p?.unit_kerja_id || '').toLowerCase().includes(query)
      )
    }

    // Unit filter
    if (selectedUnit) {
      result = result.filter(p => p?.unit_kerja_id === selectedUnit)
    }

    // Tahun filter
    if (selectedTahun) {
      result = result.filter(p => p?.tahun === parseInt(selectedTahun))
    }

    // Sumber Dana filter
    if (selectedSumberDana) {
      result = result.filter(p => p?.sumber_dana === selectedSumberDana)
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (a?.nama || '').localeCompare(b?.nama || '')
        case 'name_desc':
          return (b?.nama || '').localeCompare(a?.nama || '')
        case 'pagu_asc':
          return (a?.pagu_anggaran || 0) - (b?.pagu_anggaran || 0)
        case 'pagu_desc':
          return (b?.pagu_anggaran || 0) - (a?.pagu_anggaran || 0)
        case 'oldest':
          return new Date(a?.created_at || 0) - new Date(b?.created_at || 0)
        case 'newest':
        default:
          return new Date(b?.created_at || 0) - new Date(a?.created_at || 0)
      }
    })

    return result
  }, [programs, searchQuery, selectedUnit, selectedTahun, selectedSumberDana, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredPrograms.length / ITEMS_PER_PAGE)
  const paginatedPrograms = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredPrograms.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredPrograms, currentPage])

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedUnit, selectedTahun, sortBy])

  // Calculate totals - menggunakan dana_terpakai dari database
  const totals = useMemo(() => {
    if (!filteredPrograms || !Array.isArray(filteredPrograms)) {
      return { pagu: 0, terpakai: 0 }
    }
    
    return filteredPrograms.reduce((acc, p) => {
      return {
        pagu: acc.pagu + (p?.pagu_anggaran || 0),
        terpakai: acc.terpakai + (p?.dana_terpakai || 0), // Dana terpakai dari SPJ
      }
    }, { pagu: 0, terpakai: 0 })
  }, [filteredPrograms])

  // Handlers
  const handleSave = async (program) => {
    try {
      if (program.id) {
        await updateProgram(program.id, program)
      } else {
        await addProgram(program)
      }
      setShowModal(false)
      setEditing(null)
      await refreshPrograms()
    } catch (err) {
      alert('Gagal menyimpan program: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Hapus program ini?')) {
      try {
        await deleteProgram(id)
        await refreshPrograms()
      } catch (err) {
        alert('Gagal menghapus program: ' + err.message)
      }
    }
  }

  const handleImportData = async (importList, onProgress) => {
    if (!importList || !Array.isArray(importList) || importList.length === 0) {
      alert('Tidak ada data untuk diimport')
      return { imported: 0, updated: 0, errors: ['Data kosong'] }
    }
    
    let imported = 0
    let updated = 0
    const errors = []

    // Build lookup from current state: "id_rka|tahun" → existing program
    const existingMap = new Map()
    for (const p of programs || []) {
      if (p?.id_rka) existingMap.set(`${p.id_rka}|${p.tahun}`, p)
    }

    // Check for duplicates within import list
    const importIdSet = new Set()
    for (let i = 0; i < importList.length; i++) {
      const p = importList[i]
      if (p?.id_rka && p?.tahun) {
        const key = `${p.id_rka}|${p.tahun}`
        if (importIdSet.has(key)) {
          console.warn(`Duplicate in import list: "${p.nama}" (id_rka: ${p.id_rka})`)
        }
        importIdSet.add(key)
      }
    }

    console.log('Starting import:', {
      total: importList.length,
      uniqueIds: importIdSet.size,
      existingInDb: existingMap.size
    })

    for (let i = 0; i < importList.length; i++) {
      const p = importList[i]
      if (!p || typeof p !== 'object') {
        errors.push(`Baris ${i + 1}: Data tidak valid`)
        continue
      }
      
      try {
        const dupeKey = p.id_rka ? `${p.id_rka}|${p.tahun}` : null
        const existing = dupeKey ? existingMap.get(dupeKey) : null

        let programId
        if (existing) {
          // Update existing program fields
          await updateProgram(existing.id, {
            id_rka: p.id_rka, nama: p.nama,
            unit_kerja_id: p.unit_kerja_id, tahun: p.tahun,
            pagu_anggaran: p.pagu_anggaran, sumber_dana: p.sumber_dana,
          })
          programId = existing.id
          // Replace biaya_variabel: delete old then insert new
          const oldVars = await loadBiayaVariabel(programId)
          if (oldVars && Array.isArray(oldVars)) {
            for (const v of oldVars) {
              if (v?.id) await deleteBiayaVariabel(v.id)
            }
          }
          updated++
        } else {
          // Validasi field required sebelum insert
          if (!p.id_rka) {
            throw new Error('id_rka tidak boleh kosong')
          }
          if (!p.nama || p.nama.trim() === '') {
            throw new Error('nama program tidak boleh kosong')
          }
          if (!p.tahun) {
            throw new Error('tahun tidak boleh kosong')
          }
          
          console.log(`Inserting program ${i + 1}/${importList.length}:`, {
            id_rka: p.id_rka,
            nama: p.nama,
            unit_kerja_id: p.unit_kerja_id || 'Belum Ditentukan'
          })
          
          const newProg = await addProgram({
            id_rka: p.id_rka, nama: p.nama,
            unit_kerja_id: p.unit_kerja_id, tahun: p.tahun,
            pagu_anggaran: p.pagu_anggaran, sumber_dana: p.sumber_dana,
          })
          programId = newProg?.id
          imported++
        }

        if (programId && p.variabel && Array.isArray(p.variabel)) {
          for (const v of p.variabel) {
            if (v) await addBiayaVariabel(programId, v)
          }
        }
      } catch (err) {
        const errorMsg = err?.message || err?.toString() || 'Unknown error'
        errors.push(`"${p.nama || 'Unknown'}": ${errorMsg}`)
        console.error(`Error importing program ${i + 1}:`, {
          nama: p.nama,
          id_rka: p.id_rka,
          tahun: p.tahun,
          unit_kerja_id: p.unit_kerja_id,
          pagu_anggaran: p.pagu_anggaran,
          error: err
        })
      }
      onProgress(i + 1)
    }
    
    await refreshPrograms()
    
    // Log summary
    console.log('Import Complete:', {
      total: importList.length,
      imported,
      updated,
      errors: errors.length
    })
    
    // Alert summary
    const totalProcessed = imported + updated
    const skipped = importList.length - totalProcessed
    let message = `✅ Import selesai!\n\n`
    message += `📊 Total: ${importList.length} program\n`
    message += `✨ Baru: ${imported} program\n`
    message += `🔄 Update: ${updated} program\n`
    if (skipped > 0) message += `⏭️ Skip: ${skipped} program\n`
    if (errors.length > 0) message += `❌ Error: ${errors.length} program`
    
    alert(message)
    
    return { imported, updated, errors }
  }

  const handleDeleteAll = async () => {
    if (!programs || programs.length === 0) {
      alert('Tidak ada data untuk dihapus')
      setShowDeleteAllModal(false)
      return
    }
    
    setDeletingAll(true)
    try {
      console.log('Menghapus semua program, jumlah:', programs.length)
      await deleteAllPrograms()
      console.log('Berhasil menghapus semua program')
      
      // Refresh data
      await refreshPrograms()
      
      // Tutup modal
      setShowDeleteAllModal(false)
      
      // Tampilkan pesan sukses
      alert(`Berhasil menghapus ${programs.length} program kerja`)
    } catch (err) {
      console.error('Error saat menghapus semua data:', err)
      alert('Gagal menghapus data: ' + (err.message || 'Terjadi kesalahan'))
    } finally {
      setDeletingAll(false)
    }
  }

  const handleExport = async (type = 'xlsx') => {
    if (!filteredPrograms || !Array.isArray(filteredPrograms) || filteredPrograms.length === 0) {
      alert('Tidak ada data untuk diexport')
      return
    }

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `Program_Kerja_${timestamp}`

    if (type === 'xlsx') {
      const XLSX = (await import('xlsx')).default || await import('xlsx')
      const rows = [
        ['ID RKA', 'Nama Program', 'Unit Kerja', 'Tahun', 'Pagu Anggaran', 'Sumber Dana', 'Status'],
        ...filteredPrograms.map(p => [
          p.id_rka || '',
          p.nama || '',
          p.unit_kerja_id || '',
          p.tahun || '',
          p.pagu_anggaran || 0,
          p.sumber_dana || 'UKT',
          p.status || 'aktif',
        ])
      ]
      const ws = XLSX.utils.aoa_to_sheet(rows)
      ws['!cols'] = [8, 36, 22, 8, 18, 12, 10].map(w => ({ wch: w }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Program Kerja')
      XLSX.writeFile(wb, `${filename}.xlsx`)
      return
    }

    if (type === 'print') {
      // Buka window print dengan data
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const html = generatePrintHTML(filteredPrograms, totals, selectedUnit, selectedTahun)
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => printWindow.print(), 500)
      }
    } else if (type === 'csv') {
      // Export ke CSV
      const csv = generateCSV(filteredPrograms)
      downloadFile(csv, `${filename}.csv`, 'text/csv')
    } else if (type === 'json') {
      // Export ke JSON
      const json = JSON.stringify(filteredPrograms, null, 2)
      downloadFile(json, `${filename}.json`, 'application/json')
    }
  }

  // Helper untuk generate HTML print
  const generatePrintHTML = (programs, totals, unitFilter, tahunFilter) => {
    const totalPagu = programs.reduce((sum, p) => sum + (p.pagu_anggaran || 0), 0)
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Data Program Kerja - SIMDIR</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .summary { margin-top: 30px; padding: 15px; background: #f9f9f9; border-radius: 5px; }
          .summary-item { display: flex; justify-content: space-between; margin: 5px 0; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; }
          @media print {
            .no-print { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>DATA PROGRAM KERJA</h1>
          <p>Direktorat Unesa Science Center</p>
          <p>Tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          ${unitFilter ? `<p>Unit Kerja: ${unitFilter}</p>` : ''}
          ${tahunFilter ? `<p>Tahun: ${tahunFilter}</p>` : ''}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Program</th>
              <th>Unit Kerja</th>
              <th>Tahun</th>
              <th class="text-right">Pagu Anggaran</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${programs.map((p, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${p.nama || '-'}</td>
                <td>${p.unit_kerja_id || '-'}</td>
                <td>${p.tahun || '-'}</td>
                <td class="text-right">Rp ${(p.pagu_anggaran || 0).toLocaleString('id-ID')}</td>
                <td>${p.status || 'aktif'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <div class="summary-item">
            <strong>Total Program:</strong>
            <span>${programs.length} program</span>
          </div>
          <div class="summary-item">
            <strong>Total Pagu Anggaran:</strong>
            <span>Rp ${totalPagu.toLocaleString('id-ID')}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Dicetak dari Sistem Informasi Manajemen Direktorat (SIMDIR)</p>
          <p>© ${new Date().getFullYear()} Unesa Science Center</p>
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
            🖨️ Cetak / Save as PDF
          </button>
        </div>
      </body>
      </html>
    `
  }

  // Helper untuk generate CSV
  const generateCSV = (programs) => {
    if (!programs || !Array.isArray(programs)) {
      return ''
    }
    
    const headers = ['No', 'Nama Program', 'Unit Kerja', 'Tahun', 'Pagu Anggaran', 'Status', 'Sumber Dana']
    const rows = programs.map((p, idx) => [
      idx + 1,
      `"${(p?.nama || '').replace(/"/g, '""')}"`,
      p?.unit_kerja_id || '-',
      p?.tahun || '-',
      p?.pagu_anggaran || 0,
      p?.status || 'aktif',
      p?.sumber_dana || 'UKT'
    ])
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  }

  // Helper untuk download file
  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

    // Loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div>Memuat data program kerja...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
        <h3>Error Loading Data</h3>
        <p>{error}</p>
        <button onClick={refreshPrograms} className="btn btn-primary mt-4">
          Coba Lagi
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="toolbar" style={{ position: 'relative', zIndex: 1 }}>
        <div>
          <h2>Program Kerja & Anggaran</h2>
          <p className="muted" style={{ fontSize: '0.9375rem', marginTop: '0.25rem' }}>
            Kelola program kerja dan anggaran unit-unit kerja
          </p>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {programs && programs.length > 0 && (
              <>
                {/* Tombol dengan Modal */}
                <button
                  className="btn ghost"
                  onClick={() => {
                    console.log('Tombol Hapus Semua diklik')
                    setShowDeleteAllModal(true)
                  }}
                  title={`Hapus ${programs.length} program kerja`}
                  style={{ 
                    color: 'var(--danger)', 
                    borderColor: 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Hapus Semua ({programs.length})
                </button>
                
                {/* Tombol Hapus Langsung (Tanpa Modal) - Alternatif */}
                <button
                  className="btn ghost"
                  onClick={async () => {
                    if (confirm(`Yakin ingin menghapus ${programs.length} program kerja?\n\nSemua data akan dihapus permanen!`)) {
                      await handleDeleteAll()
                    }
                  }}
                  title="Hapus semua (konfirmasi)"
                  style={{ 
                    color: 'var(--danger)', 
                    borderColor: 'var(--danger)',
                    fontSize: '0.75rem',
                    padding: '0.375rem 0.75rem'
                  }}
                >
                  Hapus Langsung
                </button>
              </>
            )}
            <button
              className="btn ghost"
              onClick={() => setShowImportModal(true)}
              title="Import dari Excel/CSV"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import
            </button>
            <button
              className="btn btn-primary"
              onClick={() => { setEditing(null); setShowModal(true) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.125rem', height: '1.125rem' }}>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tambah Program
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards - Total Keseluruhan (tanpa filter) */}
      {programs && programs.length > 0 && (
        <div className="stats-grid mb-6">
          <StatCard
            title="Total Pagu"
            value={formatRupiah(programs.reduce((sum, p) => sum + (p?.pagu_anggaran || 0), 0))}
            subtitle="Anggaran tersedia"
            variant="default"
          />
          <StatCard
            title="Total Terpakai"
            value={formatRupiah(totals.terpakai)}
            subtitle="Dana SPJ"
            variant="info"
          />
          <StatCard
            title="Sisa Pagu"
            value={formatRupiah(programs.reduce((sum, p) => sum + (p?.pagu_anggaran || 0), 0) - totals.terpakai)}
            subtitle={`${programs.reduce((sum, p) => sum + (p?.pagu_anggaran || 0), 0) > 0 ? Math.round((totals.terpakai / programs.reduce((sum, p) => sum + (p?.pagu_anggaran || 0), 0)) * 100) : 0}% terpakai`}
            variant={programs.reduce((sum, p) => sum + (p?.pagu_anggaran || 0), 0) - totals.terpakai < 0 ? 'danger' : 'success'}
          />
          <StatCard
            title="Jumlah Program"
            value={`${programs.length}`}
            subtitle={`${filteredPrograms.length !== programs.length ? `Menampilkan ${filteredPrograms.length} dari ` : ''}${programs.length} total program`}
            variant="warning"
          />
        </div>
      )}

      {/* Stats Cards - Breakdown per Sumber Dana */}
      {programs && programs.length > 0 && (
        <div className="card mb-6">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Pembagian per Sumber Dana</h3>
            <span className="text-sm" style={{ color: 'var(--text-2)' }}>
              Klik untuk filter
            </span>
          </div>
          <div className="card-body">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', 
              gap: '0.75rem' 
            }}>
              {SUMBER_DANA_LIST.map((sd) => {
                const programsBySD = programs.filter(p => p?.sumber_dana === sd.value)
                const totalPaguBySD = programsBySD.reduce((sum, p) => sum + (p?.pagu_anggaran || 0), 0)
                const isActive = selectedSumberDana === sd.value
                
                if (programsBySD.length === 0) return null
                
                return (
                  <button
                    key={sd.value}
                    onClick={() => setSelectedSumberDana(isActive ? '' : sd.value)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      border: `2px solid ${isActive ? sd.color : 'transparent'}`,
                      backgroundColor: isActive ? `${sd.color}15` : 'var(--bg-2)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                      width: '100%'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      marginBottom: '0.25rem'
                    }}>
                      <span style={{
                        width: '0.75rem',
                        height: '0.75rem',
                        borderRadius: '50%',
                        backgroundColor: sd.color
                      }} />
                      <span style={{ 
                        fontSize: '0.8125rem', 
                        fontWeight: 600,
                        color: 'var(--text)'
                      }}>
                        {sd.label}
                      </span>
                    </div>
                    <div style={{ 
                      fontSize: '1rem', 
                      fontWeight: 700,
                      color: sd.color
                    }}>
                      {formatRupiah(totalPaguBySD)}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--text-2)'
                    }}>
                      {programsBySD.length} program
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedUnit={selectedUnit}
        setSelectedUnit={setSelectedUnit}
        selectedTahun={selectedTahun}
        setSelectedTahun={setSelectedTahun}
        selectedSumberDana={selectedSumberDana}
        setSelectedSumberDana={setSelectedSumberDana}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onExport={handleExport}
        totalItems={filteredPrograms.length}
      />

      {/* Warning untuk program dengan unit kerja belum ditentukan */}
      {programs.some(p => p.unit_kerja_id === 'Belum Ditentukan') && (
        <div style={{
          padding: '1rem',
          background: 'var(--warning-bg)',
          border: '1px solid var(--warning)',
          borderRadius: 'var(--radius)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" style={{ width: '1.5rem', height: '1.5rem', flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <strong style={{ color: 'var(--warning)', display: 'block', marginBottom: '0.25rem' }}>
              Perhatian: Ada {programs.filter(p => p.unit_kerja_id === 'Belum Ditentukan').length} program dengan Unit Kerja belum ditentukan
            </strong>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
              Silakan edit program tersebut untuk menentukan unit kerja yang benar
            </span>
          </div>
          <button
            onClick={() => setSelectedUnit('Belum Ditentukan')}
            style={{
              marginLeft: 'auto',
              padding: '0.5rem 1rem',
              background: 'var(--warning)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Lihat Program
          </button>
        </div>
      )}

      {/* Content */}
      {filteredPrograms.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '3rem', height: '3rem', marginBottom: '1rem', opacity: 0.4 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <h3>Tidak ada program ditemukan</h3>
          <p>Coba ubah filter atau kata kunci pencarian</p>
        </div>
      ) : (
        <>
          {viewMode === 'card' ? (
            <div className="program-list">
              {paginatedPrograms.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  onEdit={(p) => { setEditing(p); setShowModal(true) }}
                  onDelete={handleDelete}
                  canEdit={canEdit}
                />
              ))}
            </div>
          ) : (
            <ProgramTable
              programs={paginatedPrograms}
              onEdit={(p) => { setEditing(p); setShowModal(true) }}
              onDelete={handleDelete}
              onManageVariabel={handleOpenVariabel}
              canEdit={canEdit}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredPrograms.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <ProgramModal
          program={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onImport={handleImportData}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {/* Hapus Semua Confirm Modal */}
      {showDeleteAllModal && (
        <div className="modal-overlay" onClick={() => !deletingAll && setShowDeleteAllModal(false)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--danger)' }}>Hapus Semua Data</h3>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '0.75rem' }}>
                Semua <strong>{programs.length} program kerja</strong> dan seluruh biaya variabelnya akan dihapus permanen.
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>
                Tindakan ini tidak dapat dibatalkan. Lakukan ini jika ingin import data baru dari awal.
              </p>
            </div>
            <div className="card-form-footer">
              <button className="btn btn-ghost" onClick={() => setShowDeleteAllModal(false)} disabled={deletingAll}>
                Batal
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                style={{
                  padding: '0.5rem 1.25rem', background: deletingAll ? '#fca5a5' : 'var(--danger)',
                  color: '#fff', border: 'none', borderRadius: 'var(--radius)',
                  fontWeight: 600, cursor: deletingAll ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
                }}
              >
                {deletingAll ? 'Menghapus...' : `Hapus ${programs.length} Program`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variabel Modal */}
      {showVariabelModal && selectedProgram && (
        <div className="modal-overlay" onClick={handleCloseVariabel}>
          <div className="modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Kelola Variabel Biaya</h3>
              <p className="muted">{selectedProgram.nama}</p>
            </div>
            <div className="modal-body">
              <BiayaVariabelSection
                programId={selectedProgram.id}
                items={selectedProgram.variabel || []}
                onUpdate={(items) => {
                  // Update local state
                  selectedProgram.variabel = items
                  refreshPrograms()
                }}
                canEdit={canEdit}
                pagu={selectedProgram.pagu_anggaran || 0}
              />
            </div>
            <div className="card-form-footer">
              <button type="button" className="btn btn-ghost" onClick={handleCloseVariabel}>Tutup</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
