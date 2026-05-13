// Konfigurasi Media untuk TV Display
// Video YouTube dan Gambar Pamflet bergantian otomatis

export const MEDIA_CONFIG = {
  // Durasi tampilan setiap media (dalam milidetik)
  SLIDE_DURATION: 15000, // 15 detik default untuk gambar
  FADE_DURATION: 1000,   // 1 detik transisi fade
  
  // Playlist media (urutan tampilan)
  // Tipe: 'youtube' | 'image'
  // Catatan: Untuk 'youtube', video akan diputar sampai playlist selesai
  playlist: [
    {
      type: 'youtube',
      // Format playlist YouTube untuk embed
      // Playlist ID: PLn75qxWu-L4XRW_AOWoEhHUNgSWkRx7t2
      url: 'https://www.youtube.com/embed?listType=playlist&list=PLn75qxWu-L4XRW_AOWoEhHUNgSWkRx7t2',
      title: 'Playlist USC',
      // Tidak ada duration - video akan berjalan sampai playlist selesai
    },
    {
      type: 'image',
      src: '/images/promo/promo-1.jpg',
      title: 'Promo 1',
      duration: 15000, // 15 detik
    },
    {
      type: 'image',
      src: '/images/promo/promo-2.jpg',
      title: 'Promo 2',
      duration: 15000,
    },
  ],
  
  // Fallback jika gambar tidak ditemukan
  fallbackImage: '/images/promo/fallback.jpg',
}

// Helper untuk mendapatkan media aktif
export function getActiveMedia(index) {
  const playlist = MEDIA_CONFIG.playlist
  const safeIndex = index % playlist.length
  return playlist[safeIndex]
}

// Helper untuk mendapatkan jumlah media
export function getPlaylistLength() {
  return MEDIA_CONFIG.playlist.length
}
