// Mock Supabase client untuk testing UI tanpa backend
// Gunakan ini saat environment Supabase tidak tersedia

const mockAgendaData = [
  {
    id: 1,
    judul: 'Rapat Koordinasi Tim USC',
    lokasi: 'Ruang Rapat Utama',
    tanggal_mulai: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Besok
    tanggal_selesai: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    waktu_mulai: '09:00',
    waktu_selesai: '11:00',
    jenis: 'internal',
    penyelenggara: 'Direktorat USC',
    pic: 'John Doe',
    deskripsi: 'Rapat koordinasi rutin bulanan untuk evaluasi program kerja'
  },
  {
    id: 2,
    judul: 'Workshop Penelitian Kolaborasi',
    lokasi: 'Aula FST',
    tanggal_mulai: new Date(Date.now() + 172800000).toISOString().split('T')[0], // Lusa
    tanggal_selesai: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    waktu_mulai: '08:00',
    waktu_selesai: '16:00',
    jenis: 'eksternal',
    penyelenggara: 'Fakultas Sains dan Teknik',
    pic: 'Jane Smith',
    deskripsi: 'Workshop kolaborasi penelitian antar fakultas'
  },
  {
    id: 3,
    judul: 'Evaluasi Anggaran Q2 2025',
    lokasi: 'Ruang Direktur',
    tanggal_mulai: new Date().toISOString().split('T')[0], // Hari ini
    tanggal_selesai: new Date().toISOString().split('T')[0],
    waktu_mulai: '13:00',
    waktu_selesai: '15:00',
    jenis: 'pimpinan',
    penyelenggara: 'Bagian Keuangan',
    pic: 'Keuangan',
    disposisi: 'Kepala Bagian Keuangan',
    deskripsi: 'Evaluasi serapan anggaran triwulan kedua'
  },
  {
    id: 4,
    judul: 'Pelatihan Digital Marketing',
    lokasi: 'Lab Komputer 3',
    tanggal_mulai: new Date(Date.now() + 259200000).toISOString().split('T')[0], // 3 hari lagi
    tanggal_selesai: new Date(Date.now() + 259200000).toISOString().split('T')[0],
    waktu_mulai: '09:00',
    waktu_selesai: '12:00',
    jenis: 'internal',
    penyelenggara: 'Tim Pemasaran',
    pic: 'Marketing Team',
    deskripsi: 'Pelatihan strategi digital marketing untuk tim'
  }
]

const mockProgramKerjaData = [
  {
    id: 1,
    id_rka: 'RKA001',
    nama: 'Pengembangan Fasilitas USC',
    unit: 'USC',
    pagu_anggaran: 500000000,
    tahun: 2025
  },
  {
    id: 2,
    id_rka: 'RKA002',
    nama: 'Renovasi Kolam Renang',
    unit: 'Kolam Renang',
    pagu_anggaran: 250000000,
    tahun: 2025
  }
]

// Mock Supabase client
export const mockSupabase = {
  from: (table) => ({
    select: (columns = '*') => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
        order: () => Promise.resolve({ data: [], error: null })
      }),
      order: (column, { ascending = true } = {}) => {
        let data = []
        
        if (table === 'agenda') {
          data = [...mockAgendaData]
          if (column === 'tanggal_mulai') {
            data.sort((a, b) => {
              const dateA = new Date(a.tanggal_mulai)
              const dateB = new Date(b.tanggal_mulai)
              return ascending ? dateA - dateB : dateB - dateA
            })
          }
        } else if (table === 'program_kerja') {
          data = [...mockProgramKerjaData]
        }
        
        return Promise.resolve({ data, error: null })
      },
      single: () => Promise.resolve({ data: null, error: null })
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
    eq: () => ({
      single: () => Promise.resolve({ data: null, error: null }),
      order: () => Promise.resolve({ data: [], error: null })
    })
  }),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: null, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  }
}

// Helper untuk cek apakah perlu pakai mock
export const shouldUseMock = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !url || url.includes('placeholder') || url.includes('example')
}
