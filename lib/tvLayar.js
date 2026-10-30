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

export const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
export const STATUS_HARI = ['buka', 'libur', 'tutup_sementara']

// Jadwal satu hari dari tv_screens.jadwal (indeks = getDay()). Tanpa jadwal
// per hari, semua hari buka dengan jam_buka/jam_tutup.
export function jadwalHari(screen, d) {
  return screen.jadwal?.[d.getDay()] || { status: 'buka', buka: screen.jam_buka, tutup: screen.jam_tutup }
}

// "Buka besok pukul 06.00" / "Buka Senin pukul 06.00" — hari buka berikutnya
function bukaBerikutnya(screen, now) {
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const h = jadwalHari(screen, d)
    if (h.status === 'buka' && h.buka) return `Buka ${i === 1 ? 'besok' : HARI[d.getDay()]} pukul ${jam(h.buka)}`
  }
  return 'Buka kembali besok'
}

// Status buka/tutup layar unit dari baris tv_screens pada waktu `now`.
// null = tidak ditampilkan (jam belum diatur). buka/tutup = jam hari ini.
export function getOpenStatus(screen, now) {
  if (!screen || !now) return null
  if (screen.tutup_sementara) return { open: false, title: 'TUTUP SEMENTARA', sub: screen.catatan || 'Mohon maaf atas ketidaknyamanannya' }
  const h = jadwalHari(screen, now)
  if (h.status === 'libur') return { open: false, title: 'LIBUR', sub: screen.catatan || bukaBerikutnya(screen, now) }
  if (h.status === 'tutup_sementara') return { open: false, title: 'TUTUP SEMENTARA', sub: screen.catatan || bukaBerikutnya(screen, now) }
  const buka = toMin(h.buka)
  const tutup = toMin(h.tutup)
  if (buka == null || tutup == null) return null
  const base = { range: `${jam(h.buka)} – ${jam(h.tutup)}`, buka: h.buka, tutup: h.tutup }
  const cur = now.getHours() * 60 + now.getMinutes()
  if (cur >= buka && cur < tutup) return { ...base, open: true, title: 'BUKA', sub: screen.catatan || `Tutup pukul ${jam(h.tutup)}` }
  if (cur < buka) return { ...base, open: false, title: 'TUTUP', sub: screen.catatan || `Buka pukul ${jam(h.buka)}` }
  return { ...base, open: false, title: 'TUTUP', sub: screen.catatan || bukaBerikutnya(screen, now) }
}

// Validasi jadwal dari klien: 7 hari, status dikenal, jam HH:MM. null bila tidak valid.
export function sanitizeJadwal(v) {
  if (!Array.isArray(v) || v.length !== 7) return null
  const t = (x) => (/^\d{2}:\d{2}(:\d{2})?$/.test(x || '') ? x.slice(0, 5) : null)
  const out = v.map((h) => ({ status: STATUS_HARI.includes(h?.status) ? h.status : 'buka', buka: t(h?.buka), tutup: t(h?.tutup) }))
  return out.some((h) => h.status === 'buka' && (!h.buka || !h.tutup)) ? null : out
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
