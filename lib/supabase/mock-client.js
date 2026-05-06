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
    penyelenggara: 'Direktorat USC',
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
    penyelenggara: 'Bagian Keuangan',
    pic: null,
    disposisi: 'Kepala Bagian Keuangan',
    deskripsi: 'Evaluasi serapan anggaran semester ganjil 2025',
  },
  {
    id: 4,
    judul: 'Pelatihan Digital Marketing & Media Sosial',
    lokasi: 'Lab Komputer Gedung C',
    tanggal_mulai: d(3),
    tanggal_selesai: d(3),
    waktu_mulai: '09:00',
    waktu_selesai: '12:00',
    jenis: 'internal',
    penyelenggara: 'Tim Pemasaran USC',
    pic: 'Ahmad Fauzi',
    disposisi: null,
    deskripsi: 'Pelatihan strategi digital marketing untuk seluruh tim',
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
    judul: 'Monitoring Kolam Renang & Fasilitas Olahraga',
    lokasi: 'Kolam Renang USC',
    tanggal_mulai: d(10),
    tanggal_selesai: d(10),
    waktu_mulai: '08:00',
    waktu_selesai: '10:00',
    jenis: 'internal',
    penyelenggara: 'Unit Fasilitas USC',
    pic: 'Dian Permata',
    disposisi: null,
    deskripsi: 'Monitoring rutin kondisi kolam renang dan fasilitas olahraga',
  },
  {
    id: 9,
    judul: 'Kunjungan Delegasi Universitas Luar Negeri',
    lokasi: 'Lobby USC & Ruang VIP',
    tanggal_mulai: d(12),
    tanggal_selesai: d(13),
    waktu_mulai: '10:00',
    waktu_selesai: '15:00',
    jenis: 'eksternal',
    penyelenggara: 'Kantor Kerjasama Internasional',
    pic: 'Dr. Rina Kusuma',
    disposisi: null,
    deskripsi: 'Kunjungan delegasi dari 3 universitas mitra luar negeri',
  },
  {
    id: 10,
    judul: 'Rapat Evaluasi Kinerja Tenaga Kependidikan',
    lokasi: 'Ruang Rapat Utama',
    tanggal_mulai: d(14),
    tanggal_selesai: d(14),
    waktu_mulai: '13:00',
    waktu_selesai: '15:30',
    jenis: 'internal',
    penyelenggara: 'Bagian SDM USC',
    pic: 'Heri Prabowo',
    disposisi: null,
    deskripsi: 'Evaluasi kinerja semester ganjil tenaga kependidikan USC',
  },
  {
    id: 11,
    judul: 'Pameran Produk Riset dan Inovasi Unesa',
    lokasi: 'Hall Utama Gedung Rektorat',
    tanggal_mulai: d(16),
    tanggal_selesai: d(18),
    waktu_mulai: '08:00',
    waktu_selesai: '17:00',
    jenis: 'eksternal',
    penyelenggara: 'LPPM Unesa',
    pic: 'Prof. Agung Setiawan',
    disposisi: null,
    deskripsi: 'Pameran 50+ produk riset unggulan dosen dan mahasiswa Unesa',
  },
  {
    id: 12,
    judul: 'Pelatihan Keselamatan Kerja & K3',
    lokasi: 'Ruang Pelatihan Lt.3',
    tanggal_mulai: d(20),
    tanggal_selesai: d(20),
    waktu_mulai: '08:00',
    waktu_selesai: '16:00',
    jenis: 'internal',
    penyelenggara: 'Unit K3 Unesa',
    pic: 'Mulyadi Santoso',
    disposisi: null,
    deskripsi: 'Pelatihan wajib K3 untuk seluruh staf dan karyawan USC',
  },
]

const mockProgramKerjaData = [
  { id: 1, id_rka: 'RKA001', nama: 'Pengembangan Fasilitas USC', unit: 'USC', pagu_anggaran: 500000000, tahun: 2026 },
  { id: 2, id_rka: 'RKA002', nama: 'Renovasi Kolam Renang', unit: 'Kolam Renang', pagu_anggaran: 250000000, tahun: 2026 },
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
