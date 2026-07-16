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

// ============================================================================
// ⚠️  MOCK USER DATA — DEVELOPMENT ONLY
//    Passwords below are bcrypt hashes (not plaintext). Still: NEVER use
//    mock accounts in production. This file only activates when
//    NEXT_PUBLIC_SUPABASE_URL is missing or contains "your-project".
// ============================================================================
const mockUsersData = [
  {
    id: '1646e3e6-58bd-487a-aafb-82e5eda8b393',
    username: 'administrator',
    email: 'admin@direktorat.ac.id',
    password: '$2b$10$yN15peX8itHiCA2qlAWuT.qi/ROmVlTa.n6AfC3scuI.jU36lfF/S',
    full_name: 'Administrator',
    role: 'super_admin',
    is_active: true,
    last_login: null,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'adminiqbal',
    email: 'adminiqbal@usc.ac.id',
    password: '$2b$10$gq7fYQLKZ/rrkXO4yJdMveNUXhX1RqM6e.EfcIJ02kgWetOrtE5zO',
    full_name: 'Admin Iqbal',
    role: 'super_admin',
    is_active: true,
    last_login: null,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    username: 'keuangan',
    email: 'keuangan@usc.ac.id',
    password: '$2b$10$KqdOqnWPkEjIOckOL4yDAuct4HSlWpCq6n.E8f50UG/umPn6S54Mi',
    full_name: 'Admin Keuangan',
    role: 'admin_keuangan',
    is_active: true,
    last_login: null,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    username: 'operator',
    email: 'operator@usc.ac.id',
    password: '$2b$10$MwkDcEIO4TOiZC6Znq848.2i6gTKz7cF358TiLLpkHW./w.ur/3C6',
    full_name: 'Operator',
    role: 'admin',
    is_active: true,
    last_login: null,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    username: 'pimpinan',
    email: 'pimpinan@usc.ac.id',
    password: '$2b$10$DOuG7ZkeN6OpzPVNAbrEAuP5eSRSd55VvK0KEujNSn9TleZ05tQVK',
    full_name: 'Pimpinan',
    role: 'pimpinan',
    is_active: true,
    last_login: null,
  },
  // Legacy dev accounts (also hashed)
  {
    id: '1',
    username: 'admin',
    email: 'admin@usc.ac.id',
    password: '$2b$10$Wv1j16gZETfrIhziJBPFkOTKoVsZaGPg3XnKrKNeRPac6bwPqyhvO',
    full_name: 'Administrator USC',
    role: 'super_admin',
    is_active: true,
    last_login: null,
  },
  {
    id: '2',
    username: 'keuangan',
    email: 'keuangan@usc.ac.id',
    password: '$2b$10$xwfSadz3ppJmVFQslc9UHuQfca570ucx3cWnHI0uLZo3qvkxO9jnK',
    full_name: 'Admin Keuangan',
    role: 'admin_keuangan',
    is_active: true,
    last_login: null,
  },
  {
    id: '3',
    username: 'staff',
    email: 'staff@usc.ac.id',
    password: '$2b$10$K9wwhzZAmxMaBs99YrMnIuLe5GumihKkLx2rcoLoUJw6qhGH.vIj.',
    full_name: 'Staff USC',
    role: 'staff',
    is_active: true,
    last_login: null,
  },
]

const mockSuratData = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    tipe: 'masuk',
    nomor_surat: 'USC/001/2026',
    perihal: 'Undangan Rapat Koordinasi',
    jenis: 'undangan',
    asal: 'Rektorat Unesa',
    tertuju: 'Direktur USC',
    tanggal_surat: '2026-01-15',
    tanggal_diterima: '2026-01-16',
    lampiran: true,
    keterangan: 'Undangan rapat koordinasi semester ganjil',
    status: 'aktif',
    created_at: '2026-01-16T08:00:00Z',
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    tipe: 'masuk',
    nomor_surat: 'USC/002/2026',
    perihal: 'Permohonan Izin Penggunaan Fasilitas',
    jenis: 'permohonan',
    asal: 'Fakultas Sains dan Teknik',
    tertuju: 'Bagian Umum USC',
    tanggal_surat: '2026-02-10',
    tanggal_diterima: '2026-02-11',
    lampiran: false,
    keterangan: 'Permohonan izin penggunaan gedung serba guna',
    status: 'aktif',
    created_at: '2026-02-11T09:30:00Z',
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    tipe: 'keluar',
    nomor_surat: 'USC/OUT/001/2026',
    perihal: 'Surat Pemberitahuan Maintenance',
    jenis: 'pemberitahuan',
    tujuan: 'Seluruh Unit Kerja USC',
    tanggal_keluar: '2026-03-05',
    unit_kerja_peminta: 'Bagian Umum',
    pemohon: 'Heri Purnomo',
    penanda_tangan: 'Direktur USC',
    lampiran: true,
    keterangan: 'Pemberitahuan maintenance fasilitas mingguan',
    status: 'aktif',
    created_at: '2026-03-05T10:00:00Z',
  },
  {
    id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
    tipe: 'keluar',
    nomor_surat: 'USC/OUT/002/2026',
    perihal: 'Surat Tugas Kegiatan Lomba',
    jenis: 'lainnya',
    tujuan: 'Fakultas Keolahragaan',
    tanggal_keluar: '2026-04-12',
    unit_kerja_peminta: 'PUI Keolahragaan',
    pemohon: 'Muhammad Dzul Fikri',
    penanda_tangan: 'Direktur USC',
    lampiran: false,
    keterangan: 'Surat tugas untuk kegiatan lomba olahraga antar PT',
    status: 'aktif',
    created_at: '2026-04-12T08:00:00Z',
  },
]

const mockDataMap = {
  agenda: mockAgendaData,
  users: mockUsersData,
  surat: mockSuratData,
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
      insert: (data) => Promise.resolve({ data: Array.isArray(data) ? data[0] : data, error: null }),
      update: (data) => ({ 
        eq: (col, val) => {
          // Update local mock data
          const tableData = mockDataMap[table]
          if (tableData) {
            const idx = tableData.findIndex(row => row[col] === val)
            if (idx !== -1) {
              tableData[idx] = { ...tableData[idx], ...data }
              return Promise.resolve({ data: tableData[idx], error: null })
            }
          }
          return Promise.resolve({ data: null, error: null })
        }
      }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }
  },
  rpc(fnName, params = {}) {
    // Mock RPC functions
    if (fnName === 'get_user_by_email') {
      const user = mockUsersData.find(u => u.email === params.p_email)
      return Promise.resolve({ data: user ? [user] : [], error: null })
    }
    if (fnName === 'get_user_by_username') {
      const user = mockUsersData.find(u => u.username === params.p_username)
      return Promise.resolve({ data: user ? [user] : [], error: null })
    }
    return Promise.resolve({ data: null, error: null })
  },
  auth: {
    getUser:             () => Promise.resolve({ data: { user: { id: '1', email: 'admin@usc.ac.id' } }, error: null }),
    signInWithPassword:  ({ email }) => {
      const user = mockUsersData.find(u => u.email === email)
      if (user) {
        return Promise.resolve({ 
          data: { 
            user: { id: user.id, email: user.email },
            session: { access_token: 'mock-token' }
          }, 
          error: null 
        })
      }
      return Promise.resolve({ data: null, error: { message: 'Invalid credentials' } })
    },
    signUp:              ({ email, password, options }) => {
      const newUser = {
        id: Date.now().toString(),
        email,
        ...options?.data
      }
      return Promise.resolve({ data: { user: newUser }, error: null })
    },
    signOut:             () => Promise.resolve({ error: null }),
    onAuthStateChange:   () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
}

export const shouldUseMock = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !url || url === '' || url.includes('your-project') || url.includes('placeholder')
}
