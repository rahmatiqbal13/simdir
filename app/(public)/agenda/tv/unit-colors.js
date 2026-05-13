// ============================================
// PALET WARNA UNIT KERJA - TV DISPLAY USC
// ============================================

// Format: { nama, border, bg, text }
// - border: warna border kiri (solid, mencolok)
// - bg: background tint (transparan, subtle)
// - text: warna teks untuk label/unit

export const UNIT_COLORS = {
  // ===== INTERNAL USC (12 Unit) =====
  'usc': {
    name: 'USC',
    border: '#3b82f6',      // Blue-500
    bg: 'rgba(59,130,246,0.08)',
    text: '#3b82f6',
    hue: 'Biru (Primary)',
  },
  'ssfc': {
    name: 'SSFC',
    border: '#8b5cf6',      // Violet-500
    bg: 'rgba(139,92,246,0.08)',
    text: '#8b5cf6',
    hue: 'Ungu',
  },
  'puipt-dic': {
    name: 'PUIPT DIC',
    border: '#06b6d4',      // Cyan-500
    bg: 'rgba(6,182,212,0.08)',
    text: '#06b6d4',
    hue: 'Cyan',
  },
  'puipt-serc': {
    name: 'PUIPT SERC',
    border: '#10b981',      // Emerald-500
    bg: 'rgba(16,185,129,0.08)',
    text: '#10b981',
    hue: 'Hijau',
  },
  'pui-dis': {
    name: 'PUI Disabilitas',
    border: '#f97316',      // Orange-500
    bg: 'rgba(249,115,22,0.08)',
    text: '#f97316',
    hue: 'Oranye',
  },
  'kolam': {
    name: 'Kolam Renang',
    border: '#0ea5e9',      // Sky-500
    bg: 'rgba(14,165,233,0.08)',
    text: '#0ea5e9',
    hue: 'Biru Langit',
  },
  'ulabk': {
    name: 'ULABK',
    border: '#ec4899',      // Pink-500
    bg: 'rgba(236,72,153,0.08)',
    text: '#ec4899',
    hue: 'Pink',
  },
  'pui-seni': {
    name: 'PUI Seni',
    border: '#d946ef',      // Fuchsia-500
    bg: 'rgba(217,70,239,0.08)',
    text: '#d946ef',
    hue: 'Fuchsia',
  },
  'pui-olah': {
    name: 'PUI Olahraga',
    border: '#84cc16',      // Lime-500
    bg: 'rgba(132,204,22,0.08)',
    text: '#84cc16',
    hue: 'Lime',
  },
  'golf': {
    name: 'Driving Golf',
    border: '#14b8a6',      // Teal-500
    bg: 'rgba(20,184,166,0.08)',
    text: '#14b8a6',
    hue: 'Teal',
  },
  'puipt-seni': {
    name: 'PUIPT Seni',
    border: '#a855f7',      // Purple-500
    bg: 'rgba(168,85,247,0.08)',
    text: '#a855f7',
    hue: 'Ungu Tua',
  },
  'pui-ai': {
    name: 'PUI AI',
    border: '#6366f1',      // Indigo-500
    bg: 'rgba(99,102,241,0.08)',
    text: '#6366f1',
    hue: 'Indigo',
  },

  // ===== KATEGORI NON-INTERNAL =====
  'unesa': {
    name: 'Unesa',
    border: '#64748b',      // Slate-500
    bg: 'rgba(100,116,139,0.06)',
    text: '#64748b',
    hue: 'Abu-abu Biru',
  },
  'eksternal': {
    name: 'Eksternal',
    border: '#f59e0b',      // Amber-500
    bg: 'rgba(245,158,11,0.08)',
    text: '#f59e0b',
    hue: 'Kuning/Amber',
  },
  'pimpinan': {
    name: 'Pimpinan',
    border: '#ef4444',      // Red-500
    bg: 'rgba(239,68,68,0.1)',
    text: '#ef4444',
    hue: 'Merah (Prioritas)',
  },
}

// ============================================
// FUNGSI HELPER
// ============================================

// Mapping dari nama penyelenggara ke kode unit
export function getUnitCodeFromPenyelenggara(penyelenggara) {
  if (!penyelenggara) return 'unesa'
  
  const p = penyelenggara.toLowerCase()
  
  // Cek unit USC - exact match atau partial match
  if (p === 'ssfc' || p.includes('ssfc')) return 'ssfc'
  if (p === 'puipt dic' || p === 'puipt-dic' || p.includes('puipt dic') || p.includes('puipt-dic') || p.includes('dic')) return 'puipt-dic'
  if (p === 'puipt serc' || p === 'puipt-serc' || p.includes('puipt serc') || p.includes('puipt-serc') || p.includes('serc')) return 'puipt-serc'
  if (p === 'pui disabilitas' || p === 'pui-dis' || p.includes('disabilitas')) return 'pui-dis'
  if (p === 'kolam renang' || p === 'kolam' || p.includes('kolam')) return 'kolam'
  if (p === 'ulabk' || p.includes('ulabk')) return 'ulabk'
  if (p === 'usc' || (p.includes('usc') && !p.includes('puipt') && !p.includes('pui'))) return 'usc'
  if (p === 'pui seni' || p === 'pui-seni' || p.includes('pui seni')) return 'pui-seni'
  if (p === 'pui olahraga' || p === 'pui-olah' || p.includes('pui olahraga') || p.includes('keolahragaan')) return 'pui-olah'
  if (p === 'driving golf' || p === 'golf' || p.includes('golf')) return 'golf'
  if (p === 'puipt seni' || p === 'puipt-seni' || p.includes('puipt seni') || p.includes('maja') || p.includes('majapahit')) return 'puipt-seni'
  if (p === 'pui ai' || p === 'pui-ai' || (p.includes('ai') && p.includes('pui'))) return 'pui-ai'
  
  // Default: kegiatan Unesa (fakultas/unit lain)
  return 'unesa'
}

// Ambil warna berdasarkan jenis dan penyelenggara
export function getUnitColor(jenis, penyelenggara) {
  // Kegiatan pimpinan prioritas
  if (jenis === 'pimpinan') return UNIT_COLORS['pimpinan']
  
  // Kegiatan eksternal
  if (jenis === 'eksternal') return UNIT_COLORS['eksternal']
  
  // Kegiatan internal - cek unit kerja
  if (jenis === 'internal') {
    const code = getUnitCodeFromPenyelenggara(penyelenggara)
    return UNIT_COLORS[code] || UNIT_COLORS['usc']
  }
  
  return UNIT_COLORS['unesa']
}

// ============================================
// PREVIEW PALET (untuk dokumentasi)
// ============================================

export const COLOR_PALETTE_PREVIEW = [
  { category: 'Unit Internal USC', colors: [
    { name: 'USC', color: '#3b82f6' },
    { name: 'SSFC', color: '#8b5cf6' },
    { name: 'PUIPT DIC', color: '#06b6d4' },
    { name: 'PUIPT SERC', color: '#10b981' },
    { name: 'PUI Disabilitas', color: '#f97316' },
    { name: 'Kolam Renang', color: '#0ea5e9' },
    { name: 'ULABK', color: '#ec4899' },
    { name: 'PUI Seni', color: '#d946ef' },
    { name: 'PUI Olahraga', color: '#84cc16' },
    { name: 'Driving Golf', color: '#14b8a6' },
    { name: 'PUIPT Seni', color: '#a855f7' },
    { name: 'PUI AI', color: '#6366f1' },
  ]},
  { category: 'Kategori Lain', colors: [
    { name: 'Unesa', color: '#64748b' },
    { name: 'Eksternal', color: '#f59e0b' },
    { name: 'Pimpinan', color: '#ef4444' },
  ]},
]
