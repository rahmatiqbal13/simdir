// Satu sumber kebenaran untuk navigasi: sidebar desktop, command palette (Ctrl+K),
// dan bottom nav mobile semuanya membaca dari sini agar tidak ada 3 salinan
// (href/label/icon) yang bisa saling tidak sinkron.

export const NAV_ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1"/>
      <rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/>
      <rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  tv: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  building: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="9" width="7" height="13" rx="1"/>
      <rect x="14" y="5" width="7" height="17" rx="1"/>
      <line x1="6" y1="12" x2="6" y2="12.01"/>
      <line x1="6" y1="16" x2="6" y2="16.01"/>
      <line x1="6" y1="20" x2="6" y2="20.01"/>
      <line x1="17" y1="8" x2="17" y2="8.01"/>
      <line x1="17" y1="12" x2="17" y2="12.01"/>
      <line x1="17" y1="16" x2="17" y2="16.01"/>
      <line x1="17" y1="20" x2="17" y2="20.01"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82V9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  invoice: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  help: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  ),
  guests: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  receipt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 2h16v20l-3-2-2 2-2-2-2 2-2-2-2 2-3-2z"/>
      <line x1="8" y1="7" x2="16" y2="7"/>
      <line x1="8" y1="11" x2="16" y2="11"/>
      <path d="M8 15h5"/>
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z"/>
      <rect x="4" y="4" width="16" height="18" rx="2"/>
      <line x1="8" y1="11" x2="16" y2="11"/>
      <line x1="8" y1="15" x2="16" y2="15"/>
      <line x1="8" y1="19" x2="13" y2="19"/>
    </svg>
  ),
  memo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
  ),
  person: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 21v-1a8 8 0 0 1 16 0v1"/>
    </svg>
  ),
  qr: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <line x1="14" y1="14" x2="14" y2="14.01"/>
      <line x1="18" y1="14" x2="18" y2="14.01"/>
      <line x1="14" y1="18" x2="14" y2="18.01"/>
      <line x1="18" y1="18" x2="18" y2="18.01"/>
      <line x1="21" y1="14" x2="21" y2="21"/>
      <line x1="14" y1="21" x2="21" y2="21"/>
    </svg>
  ),
}

// Kelompok fungsional untuk sidebar desktop — urutan array ini menentukan
// urutan tampil grup. Section kosong (tidak ada item yang cocok untuk role
// yang sedang login) otomatis disembunyikan, lihat getGroupedSidebarItems().
export const NAV_GROUPS = [
  { key: 'utama', label: 'Utama' },
  { key: 'agenda-publikasi', label: 'Agenda & Publikasi' },
  { key: 'layanan-publik', label: 'Layanan Publik' },
  { key: 'keuangan-dokumen', label: 'Keuangan & Dokumen' },
  { key: 'laporan', label: 'Laporan & Pengaturan' },
]

// Setiap entri navigasi yang mungkin ada di aplikasi, sekali saja.
export const ALL_NAV_ITEMS = [
  { key: 'dashboard', href: '/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: 'dashboard', roles: ['super_admin', 'admin_keuangan', 'admin', 'pimpinan'], group: 'utama' },
  { key: 'kelola-agenda', href: '/kelola-agenda', label: 'Kelola Agenda', shortLabel: 'Agenda', icon: 'calendar', roles: ['super_admin', 'admin', 'pimpinan'], group: 'agenda-publikasi' },
  { key: 'tv-pamflet', href: '/tv-pamflet', label: 'TV Pamflet', shortLabel: 'TV', icon: 'tv', roles: ['super_admin'], group: 'agenda-publikasi' },
  { key: 'kelola-penilaian', href: '/kelola-penilaian', label: 'Penilaian Fasilitas', shortLabel: 'Penilaian', icon: 'star', roles: ['super_admin', 'pimpinan'], group: 'layanan-publik' },
  { key: 'pertanyaan-penilaian', href: '/kelola-penilaian/pertanyaan', label: 'Pertanyaan Penilaian', shortLabel: 'Pertanyaan', icon: 'help', roles: ['super_admin'], group: 'layanan-publik' },
  { key: 'kelola-saran', href: '/kelola-saran', label: 'Kritik & Saran', shortLabel: 'Saran', icon: 'message', roles: ['super_admin', 'pimpinan'], group: 'layanan-publik' },
  { key: 'kelola-tamu', href: '/kelola-tamu', label: 'Daftar Tamu', shortLabel: 'Tamu', icon: 'guests', roles: ['super_admin', 'admin', 'pimpinan'], group: 'layanan-publik' },
  { key: 'program-kerja-pui', href: '/kelola-program-kerja', label: 'Program Kerja PUI', shortLabel: 'Prog. Kerja', icon: 'building', roles: ['super_admin', 'pimpinan'], group: 'keuangan-dokumen' },
  { key: 'e-invoice', href: '/e-invoice', label: 'E-Invoice', shortLabel: 'Invoice', icon: 'invoice', roles: ['super_admin'], group: 'keuangan-dokumen' },
  { key: 'e-kwitansi', href: '/e-kwitansi', label: 'E-Kwitansi', shortLabel: 'Kwitansi', icon: 'receipt', roles: ['super_admin'], group: 'keuangan-dokumen' },
  { key: 'rab', href: '/rab', label: 'RAB', shortLabel: 'RAB', icon: 'clipboard', roles: ['super_admin'], group: 'keuangan-dokumen' },
  { key: 'memo', href: '/memo', label: 'Memo Pimpinan', shortLabel: 'Memo', icon: 'memo', roles: ['super_admin', 'pimpinan'], group: 'keuangan-dokumen' },
  { key: 'pemasukan-unit-usaha', href: '/pemasukan-unit-usaha', label: 'Pemasukan Unit Usaha', shortLabel: 'Unit Usaha', icon: 'wallet', roles: ['super_admin', 'admin_keuangan'], group: 'keuangan-dokumen' },
  { key: 'laporan', href: '/laporan', label: 'Laporan', shortLabel: 'Laporan', icon: 'chart', roles: ['super_admin', 'admin_keuangan', 'pimpinan'], group: 'laporan' },
  { key: 'pengaturan-users', href: '/pengaturan/users', label: 'Pengaturan Pengguna', shortLabel: 'Pengaturan', icon: 'settings', roles: ['super_admin'], group: 'laporan' },
  { key: 'pengaturan-unit-kerja', href: '/pengaturan/unit-kerja', label: 'Unit Kerja', shortLabel: 'Unit Kerja', icon: 'building', roles: ['super_admin'], group: 'laporan' },
  { key: 'pengaturan-pimpinan', href: '/pengaturan/pimpinan', label: 'Data Pimpinan', shortLabel: 'Pimpinan', icon: 'person', roles: ['super_admin'], group: 'laporan' },
  { key: 'pengaturan-branding', href: '/pengaturan/branding', label: 'Nama Instansi & Logo', shortLabel: 'Branding', icon: 'image', roles: ['super_admin'], group: 'laporan' },
  { key: 'pengaturan-metode-pembayaran', href: '/pengaturan/metode-pembayaran', label: 'Metode Pembayaran', shortLabel: 'Pembayaran', icon: 'qr', roles: ['super_admin'], group: 'laporan' },
]

// Urutan tampil di sidebar desktop, per role.
export const SIDEBAR_ORDER = {
  super_admin: ['dashboard', 'kelola-agenda', 'tv-pamflet', 'kelola-penilaian', 'pertanyaan-penilaian', 'kelola-saran', 'kelola-tamu', 'program-kerja-pui', 'e-invoice', 'e-kwitansi', 'rab', 'memo', 'pemasukan-unit-usaha', 'laporan', 'pengaturan-users', 'pengaturan-unit-kerja', 'pengaturan-pimpinan', 'pengaturan-branding', 'pengaturan-metode-pembayaran'],
  admin_keuangan: ['dashboard', 'pemasukan-unit-usaha', 'laporan'],
  admin: ['dashboard', 'kelola-agenda', 'kelola-tamu'],
  pimpinan: ['dashboard', 'kelola-agenda', 'kelola-penilaian', 'kelola-saran', 'kelola-tamu', 'program-kerja-pui', 'memo', 'laporan'],
}

// Item terpilih untuk bottom nav mobile (maks. 3 + tombol "Menu" statis), per role.
export const BOTTOM_NAV_ORDER = {
  super_admin: ['dashboard', 'kelola-agenda', 'laporan'],
  admin_keuangan: ['dashboard', 'pemasukan-unit-usaha', 'laporan'],
  admin: ['dashboard', 'kelola-agenda', 'kelola-tamu'],
  pimpinan: ['dashboard', 'kelola-agenda', 'laporan'],
}

export function getSidebarItems(role) {
  const order = SIDEBAR_ORDER[role] || SIDEBAR_ORDER.admin
  return order.map((key) => ALL_NAV_ITEMS.find((i) => i.key === key)).filter(Boolean)
}

// Item sidebar untuk role, dikelompokkan sesuai fungsinya (lihat NAV_GROUPS)
// untuk ditampilkan dengan section label terpisah — bukan daftar rata semua
// menu. Urutan dalam tiap grup tetap ikut SIDEBAR_ORDER per role; grup yang
// tidak punya item untuk role itu tidak dikembalikan sama sekali.
export function getGroupedSidebarItems(role) {
  const items = getSidebarItems(role)
  return NAV_GROUPS
    .map((g) => ({ ...g, items: items.filter((i) => i.group === g.key) }))
    .filter((g) => g.items.length > 0)
}

export function getPaletteItems(role) {
  return ALL_NAV_ITEMS.filter((i) => i.roles.includes(role))
}

export function getBottomNavItems(role) {
  const order = BOTTOM_NAV_ORDER[role] || BOTTOM_NAV_ORDER.admin
  return order.map((key) => ALL_NAV_ITEMS.find((i) => i.key === key)).filter(Boolean)
}
