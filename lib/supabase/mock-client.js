// Mock Supabase client untuk testing lokal tanpa environment Supabase
// Aktif otomatis jika NEXT_PUBLIC_SUPABASE_URL tidak diset di .env.local

const d = (offsetDays) => {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().split('T')[0]
}

const mockAgendaData = [
  {
    id: 1,
    judul: 'Rapat Koordinasi Bulanan USC',
    lokasi: 'Ruang Rapat Utama Lt.2',
    tanggal_mulai: d(0),
    tanggal_selesai: d(0),
    waktu_mulai: '09:00',
    waktu_selesai: '11:00',
    jenis: 'internal',
    penyelenggara: 'USC',
    pic: 'Budi Santoso',
    disposisi: null,
    deskripsi: 'Rapat koordinasi rutin bulanan evaluasi program kerja',
  },
  {
    id: 2,
    judul: 'Workshop Penelitian Kolaborasi Antar Fakultas',
    lokasi: 'Aula FST Lt.1',
    tanggal_mulai: d(1),
    tanggal_selesai: d(2),
    waktu_mulai: '08:00',
    waktu_selesai: '16:00',
    jenis: 'eksternal',
    penyelenggara: 'Fakultas Sains dan Teknik',
    pic: 'Dr. Sari Dewi',
    disposisi: null,
    deskripsi: 'Workshop kolaborasi penelitian antar fakultas',
  },
  {
    id: 3,
    judul: 'Evaluasi Anggaran Semester Ganjil',
    lokasi: 'Ruang Direktur',
    tanggal_mulai: d(2),
    tanggal_selesai: d(2),
    waktu_mulai: '13:00',
    waktu_selesai: '15:00',
    jenis: 'pimpinan',
    penyelenggara: 'Bagian Keuangan Unesa',
    pic: null,
    disposisi: 'Kepala Bagian Keuangan',
    deskripsi: 'Evaluasi serapan anggaran semester ganjil 2025',
  },
  {
    id: 4,
    judul: 'SSFC Championship 2026',
    lokasi: 'Stadion Unesa',
    tanggal_mulai: d(3),
    tanggal_selesai: d(3),
    waktu_mulai: '09:00',
    waktu_selesai: '12:00',
    jenis: 'internal',
    penyelenggara: 'SSFC',
    pic: 'Ahmad Fauzi',
    disposisi: null,
    deskripsi: 'Kompetisi futsal antar unit USC',
  },
  {
    id: 5,
    judul: 'Seminar Nasional Inovasi Sains 2026',
    lokasi: 'Auditorium Unesa',
    tanggal_mulai: d(5),
    tanggal_selesai: d(6),
    waktu_mulai: '07:30',
    waktu_selesai: '17:00',
    jenis: 'eksternal',
    penyelenggara: 'USC & FMIPA Unesa',
    pic: 'Prof. Hendra Wijaya',
    disposisi: null,
    deskripsi: 'Seminar nasional dengan 300 peserta dari berbagai perguruan tinggi',
  },
  {
    id: 6,
    judul: 'Rapat Pleno Program Kerja 2027',
    lokasi: 'Ruang Rapat Pimpinan',
    tanggal_mulai: d(7),
    tanggal_selesai: d(7),
    waktu_mulai: '10:00',
    waktu_selesai: '12:30',
    jenis: 'pimpinan',
    penyelenggara: 'Rektorat Unesa',
    pic: null,
    disposisi: 'Direktur USC',
    deskripsi: 'Pleno penyusunan program kerja tahun anggaran 2027',
  },
  {
    id: 7,
    judul: 'Pelantikan Pengurus BEM Unesa',
    lokasi: 'Gedung Serba Guna Unesa',
    tanggal_mulai: d(9),
    tanggal_selesai: d(9),
    waktu_mulai: '09:00',
    waktu_selesai: '11:00',
    jenis: 'eksternal',
    penyelenggara: 'Rektorat Unesa',
    pic: 'Wahyu Nugroho',
    disposisi: null,
    deskripsi: 'Pelantikan pengurus BEM periode 2025/2026',
  },
  {
    id: 8,
    judul: 'Maintenance Kolam Renang Bulanan',
    lokasi: 'Kolam Renang USC',
    tanggal_mulai: d(10),
    tanggal_selesai: d(10),
    waktu_mulai: '08:00',
    waktu_selesai: '10:00',
    jenis: 'internal',
    penyelenggara: 'Kolam Renang',
    pic: 'Dian Permata',
    disposisi: null,
    deskripsi: 'Maintenance rutin kondisi kolam renang',
  },
  {
    id: 9,
    judul: 'Workshop AI untuk Riset',
    lokasi: 'Lab AI USC',
    tanggal_mulai: d(12),
    tanggal_selesai: d(13),
    waktu_mulai: '10:00',
    waktu_selesai: '15:00',
    jenis: 'internal',
    penyelenggara: 'PUI AI',
    pic: 'Dr. Rina Kusuma',
    disposisi: null,
    deskripsi: 'Workshop pemanfaatan AI dalam penelitian',
  },
  {
    id: 10,
    judul: 'Senam Bersama ULABK',
    lokasi: 'Lapangan ULABK',
    tanggal_mulai: d(14),
    tanggal_selesai: d(14),
    waktu_mulai: '06:00',
    waktu_selesai: '08:00',
    jenis: 'internal',
    penyelenggara: 'ULABK',
    pic: 'Heri Prabowo',
    disposisi: null,
    deskripsi: 'Senam bersama untuk kesehatan karyawan',
  },
  {
    id: 11,
    judul: 'Workshop Seni Budaya Majapahit',
    lokasi: 'Panggung Terbuka USC',
    tanggal_mulai: d(16),
    tanggal_selesai: d(18),
    waktu_mulai: '08:00',
    waktu_selesai: '17:00',
    jenis: 'internal',
    penyelenggara: 'PUIPT Seni',
    pic: 'Prof. Agung Setiawan',
    disposisi: null,
    deskripsi: 'Pelatihan seni budaya majapahit untuk mahasiswa',
  },
  {
    id: 12,
    judul: 'Turnamen Golf Driving Range',
    lokasi: 'Driving Golf USC',
    tanggal_mulai: d(20),
    tanggal_selesai: d(20),
    waktu_mulai: '08:00',
    waktu_selesai: '16:00',
    jenis: 'internal',
    penyelenggara: 'Driving Golf',
    pic: 'Mulyadi Santoso',
    disposisi: null,
    deskripsi: 'Turnamen golf untuk civitas akademika',
  },
  {
    id: 13,
    judul: 'Pelatihan Konseling Disabilitas',
    lokasi: 'Ruang PUI Disabilitas',
    tanggal_mulai: d(22),
    tanggal_selesai: d(23),
    waktu_mulai: '09:00',
    waktu_selesai: '16:00',
    jenis: 'internal',
    penyelenggara: 'PUI Disabilitas',
    pic: 'Dr. Sari Dewi',
    disposisi: null,
    deskripsi: 'Pelatihan konseling untuk pendamping disabilitas',
  },
  {
    id: 14,
    judul: 'Kejuaraan Renang antar PT',
    lokasi: 'Kolam Renang USC',
    tanggal_mulai: d(25),
    tanggal_selesai: d(26),
    waktu_mulai: '08:00',
    waktu_selesai: '17:00',
    jenis: 'eksternal',
    penyelenggara: 'PUI Keolahragaan',
    pic: 'Bayu Santoso',
    disposisi: null,
    deskripsi: 'Kejuaraan renang antar perguruan tinggi',
  },
  {
    id: 15,
    judul: 'Workshop Digital Content',
    lokasi: 'Lab Komputer PUIPT DIC',
    tanggal_mulai: d(28),
    tanggal_selesai: d(28),
    waktu_mulai: '13:00',
    waktu_selesai: '17:00',
    jenis: 'internal',
    penyelenggara: 'PUIPT DIC',
    pic: 'Citra Lestari',
    disposisi: null,
    deskripsi: 'Pelatihan pembuatan konten digital',
  },
]

const mockProgramKerjaData = [
  { id: 1, id_rka: 'RKA001', nama: 'Pengembangan Fasilitas USC', unit: 'USC', unit_kerja_id: 'USC', pagu_anggaran: 500000000, dana_terpakai: 0, tahun: 2026, status: 'aktif', sumber_dana: 'UKT' },
  { id: 2, id_rka: 'RKA002', nama: 'Renovasi Kolam Renang', unit: 'Kolam Renang', unit_kerja_id: 'Kolam Renang', pagu_anggaran: 250000000, dana_terpakai: 50000000, tahun: 2026, status: 'aktif', sumber_dana: 'UKT' },
]

const mockDataMap = {
  agenda: mockAgendaData,
  program_kerja: mockProgramKerjaData,
}

// Builder yang bisa di-chain: from().select().eq().order() dll.
function buildQuery(table) {
  let data = [...(mockDataMap[table] || [])]
  let filters = []

  const resolver = {
    // Filter eq — simpan kondisi, terapkan saat resolve
    eq(column, value) {
      filters.push(row => String(row[column]) === String(value))
      return resolver
    },
    order(column, { ascending = true } = {}) {
      return resolver._withOrder(column, ascending)
    },
    _withOrder(column, ascending) {
      const sorted = [...data].filter(row => filters.every(f => f(row)))
      sorted.sort((a, b) => {
        if (a[column] < b[column]) return ascending ? -1 : 1
        if (a[column] > b[column]) return ascending ? 1 : -1
        return 0
      })
      return Promise.resolve({ data: sorted, error: null })
    },
    single() {
      const result = data.filter(row => filters.every(f => f(row)))
      return Promise.resolve({ data: result[0] || null, error: null })
    },
    // Resolve langsung tanpa sort
    then(resolve) {
      const result = data.filter(row => filters.every(f => f(row)))
      return Promise.resolve({ data: result, error: null }).then(resolve)
    },
    // Jika langsung di-await tanpa order/single
    [Symbol.toStringTag]: 'Promise',
  }

  return resolver
}

export const mockSupabase = {
  from(table) {
    return {
      select(_columns = '*') {
        return buildQuery(table)
      },
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }
  },
  auth: {
    getUser:             () => Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword:  () => Promise.resolve({ data: null, error: null }),
    signOut:             () => Promise.resolve({ error: null }),
    onAuthStateChange:   () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
}

export const shouldUseMock = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !url || url === '' || url.includes('your-project') || url.includes('placeholder')
}
