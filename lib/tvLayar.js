// Daftar layar TV per lokasi. Dipakai halaman TV (/agenda/tv, /agenda/tv/<slug>),
// admin TV Pamflet, dan API (validasi target_layar / slug tv_screens).
// Info operasional yang sering berubah (jam buka, status, running text) ada di
// tabel tv_screens — yang di sini hanya identitas & teks tetap tiap layar.

export const TV_LAYAR = {
  usc: {
    nama: 'Gedung USC',
  },
  kolam: {
    nama: 'Kolam Renang',
    judul: 'Kolam Renang Unesa',
    sapaan: 'Selamat datang — jadwal & informasi kolam hari ini',
    unit: 'kolam',                 // kode dari getUnitCodeFromPenyelenggara()
    jadwalLabel: 'Jadwal kolam hari ini',
    kosongLabel: 'Tidak ada jadwal khusus — kolam dibuka untuk umum.',
    peringatanCuaca: true,         // kolam outdoor: tampilkan peringatan saat hujan/petir
    accent: '#0ea5e9',
  },
  ssfc: {
    nama: 'SSFC',
    judul: 'SSFC Unesa',
    sapaan: 'Selamat berlatih — jadwal kelas & informasi hari ini',
    unit: 'ssfc',
    jadwalLabel: 'Kelas hari ini',
    kosongLabel: 'Tidak ada kelas terjadwal — area latihan dibuka untuk member.',
    peringatanCuaca: false,
    accent: '#8b5cf6',
  },
}

export const TV_LAYAR_SLUGS = Object.keys(TV_LAYAR)

// Layar unit yang punya halaman & pengaturan sendiri (selain TV utama USC)
export const TV_LAYAR_UNIT = TV_LAYAR_SLUGS.filter((s) => s !== 'usc')

export const toMin = (t) => {
  if (!t) return null
  const [h, m] = String(t).split(':').map(Number)
  return h * 60 + (m || 0)
}
const jam = (t) => String(t).slice(0, 5).replace(':', '.')

// Status buka/tutup layar unit dari baris tv_screens pada waktu `now`.
// null = tidak ditampilkan (jam belum diatur).
export function getOpenStatus(screen, now) {
  if (!screen || !now) return null
  if (screen.tutup_sementara) return { open: false, title: 'TUTUP SEMENTARA', sub: screen.catatan || 'Mohon maaf atas ketidaknyamanannya' }
  const buka = toMin(screen.jam_buka)
  const tutup = toMin(screen.jam_tutup)
  if (buka == null || tutup == null) return null
  const range = `${jam(screen.jam_buka)} – ${jam(screen.jam_tutup)}`
  const cur = now.getHours() * 60 + now.getMinutes()
  if (cur >= buka && cur < tutup) return { open: true, title: 'BUKA', sub: screen.catatan || `Tutup pukul ${jam(screen.jam_tutup)}`, range }
  return { open: false, title: 'TUTUP', sub: screen.catatan || (cur < buka ? `Buka pukul ${jam(screen.jam_buka)}` : 'Buka kembali besok'), range }
}

// Apakah agenda tampil di layar `slug`? target_layar kosong = otomatis: TV USC
// selalu, TV unit bila penyelenggaranya unit itu (unitCode dari
// getUnitCodeFromPenyelenggara). Hanya agenda tampil_publik yang masuk TV.
export function agendaDiLayar(a, slug, unitCode) {
  if (!a.tampil_publik) return false
  const t = a.target_layar || []
  if (t.length) return t.includes(slug)
  return slug === 'usc' || TV_LAYAR[slug]?.unit === unitCode
}

// Bersihkan input target_layar dari klien: hanya slug yang dikenal, tanpa duplikat.
export const sanitizeTargetLayar = (v) =>
  Array.isArray(v) ? [...new Set(v.filter((s) => TV_LAYAR_SLUGS.includes(s)))] : []
