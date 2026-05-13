# 📺 TV Display - Panduan Media (Video & Pamflet)

## 🎯 Cara Kerja
Area kanan/bawah pada tampilan TV sekarang menampilkan **Media Rotator** yang bergantian otomatis antara:
1. **Video YouTube** (playlist)
2. **Gambar Pamflet** promo dari direktorat

## ⏱️ Durasi Tampilan
- **Video**: Sesuai durasi video (biasanya 15-30 detik)
- **Pamflet**: **15 detik** per gambar
- **Transisi**: Fade 1 detik

## 📁 Cara Update Pamflet

### 1. Siapkan Gambar
- **Format**: JPG atau PNG
- **Ukuran ideal**: 1920x1080 px (16:9) atau 1080x1920 px (9:16 untuk portrait)
- **Nama file**: Bebas, yang penting konsisten dengan konfigurasi

### 2. Upload Gambar
Upload file gambar ke folder:
```
public/images/promo/
```

Contoh struktur folder:
```
public/
└── images/
    └── promo/
        ├── promo-1.jpg      ← Pamflet promo baru
        ├── promo-2.jpg      ← Pamflet promo baru
        └── promo-3.jpg      ← Pamflet promo baru
```

### 3. Edit Konfigurasi
Buka file:
```
app/(public)/agenda/tv/media-config.js
```

Edit bagian `playlist` sesuai kebutuhan:

```javascript
playlist: [
  {
    type: 'youtube',
    url: 'https://www.youtube.com/embed/VIDEO_ID?list=PLAYLIST_ID',
    title: 'Judul Video',
  },
  {
    type: 'image',
    src: '/images/promo/promo-1.jpg',  // ← Ganti dengan nama file Anda
    title: 'Judul Pamflet 1',
    duration: 15000, // 15 detik
  },
  {
    type: 'image',
    src: '/images/promo/promo-2.jpg',  // ← Ganti dengan nama file Anda
    title: 'Judul Pamflet 2',
    duration: 15000,
  },
  // Tambahkan lebih banyak pamflet jika perlu
],
```

### 4. Refresh TV Display
Refresh halaman `/agenda/tv` di browser TV untuk melihat perubahan.

## 🎨 Tips Penggunaan

### Urutan Media yang Baik
```
Video → Pamflet 1 → Video → Pamflet 2 → Video → Pamflet 3 → (ulang)
```

Atau jika ingin beberapa pamflet berturut-turut:
```
Video → Pamflet 1 → Pamflet 2 → Pamflet 3 → Video → (ulang)
```

### Mengubah Durasi
Edit `duration` pada setiap item (dalam milidetik):
```javascript
{
  type: 'image',
  src: '/images/promo/promo-1.jpg',
  title: 'Promo Spesial',
  duration: 20000, // 20 detik (lebih lama untuk pamflet penting)
}
```

### Menambahkan Pamflet Baru
1. Upload gambar ke `public/images/promo/`
2. Tambahkan konfigurasi di `media-config.js`:
```javascript
{
  type: 'image',
  src: '/images/promo/nama-file-baru.jpg',
  title: 'Judul Pamflet Baru',
  duration: 15000,
}
```

### Menghapus Pamflet
1. Hapus file gambar dari folder (opsional)
2. Hapus atau comment konfigurasi di `media-config.js`

## ⚙️ Konfigurasi Global

Ubah durasi default di `media-config.js`:

```javascript
export const MEDIA_CONFIG = {
  // Durasi tampilan setiap media (dalam milidetik)
  SLIDE_DURATION: 15000, // ← Default 15 detik
  FADE_DURATION: 1000,   // ← Transisi fade 1 detik
  
  // ... playlist lainnya
}
```

## 🔧 Troubleshooting

### Gambar Tidak Muncul
- Pastikan file ada di `public/images/promo/`
- Pastikan nama file di konfigurasi sudah benar (case-sensitive)
- Refresh halaman TV

### Video Tidak Play
- Cek koneksi internet
- Pastikan URL YouTube valid
- Cek apakah video diblokir untuk embed

### Perubahan Tidak Terlihat
- Clear browser cache
- Hard refresh (Ctrl+F5 atau Cmd+Shift+R)
- Restart browser TV

## 📝 Contoh Lengkap

```javascript
// media-config.js
export const MEDIA_CONFIG = {
  SLIDE_DURATION: 15000,
  FADE_DURATION: 1000,
  
  playlist: [
    // Video profil USC
    {
      type: 'youtube',
      url: 'https://www.youtube.com/embed/VIDEO_ID?list=PLAYLIST_ID',
      title: 'Profil USC',
    },
    // Pamflet promo event 1
    {
      type: 'image',
      src: '/images/promo/event-olahraga.jpg',
      title: 'Event Olahraga 2026',
      duration: 15000,
    },
    // Pamflet promo event 2
    {
      type: 'image',
      src: '/images/promo/workshop-ai.jpg',
      title: 'Workshop AI',
      duration: 20000, // Lebih lama karena penting
    },
    // Video lagi
    {
      type: 'youtube',
      url: 'https://www.youtube.com/embed/VIDEO_ID?list=PLAYLIST_ID',
      title: 'Fasilitas USC',
    },
    // Pamflet lagi
    {
      type: 'image',
      src: '/images/promo/libur-nasional.jpg',
      title: 'Info Libur',
      duration: 10000, // Lebih singkat
    },
  ],
}
```

---

💡 **Tips**: Untuk update cepat, siapkan beberapa template pamflet dengan ukuran sama, lalu tim marketing hanya perlu edit konten tanpa khawatir ukuran!
