# 📱 PWA (Progressive Web App) Setup

SIMDIR kini sudah mendukung PWA! Aplikasi bisa di-install di mobile/desktop dan bekerja offline.

## ✨ Fitur PWA

- 📲 **Installable** - Bisa di-install sebagai aplikasi native
- 🌐 **Offline Support** - Bekerja tanpa koneksi internet
- 🔔 **Push Notifications** - Notifikasi real-time (coming soon)
- 📱 **Responsive** - Optimized untuk mobile & desktop
- ⚡ **Fast Loading** - Cache strategy untuk performa optimal

## 🚀 Cara Install

### Android (Chrome)
1. Buka aplikasi SIMDIR di Chrome
2. Tap menu (3 titik) → "Tambahkan ke layar utama"
3. Atau tunggu popup install muncul otomatis

### iOS (Safari)
1. Buka aplikasi SIMDIR di Safari
2. Tap tombol share (kotak dengan panah ke atas)
3. Pilih "Tambahkan ke Layar Utama"

### Desktop (Chrome/Edge)
1. Buka aplikasi SIMDIR
2. Klik icon install di address bar (sebelah kanan)
3. Atau tunggu popup install muncul

## 📦 Struktur File PWA

```
public/
├── manifest.json          # Konfigurasi PWA
├── browserconfig.xml      # Windows tile config
├── offline.html           # Fallback halaman offline
├── icons/
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   ├── icon-512x512.png
│   └── icon-base.svg      # SVG untuk generate icon
└── sw.js                  # Service Worker (auto-generated)

app/
├── components/
│   ├── PWAInstallPrompt.jsx       # Tombol install PWA
│   └── ServiceWorkerRegistration.jsx  # Registrasi SW
└── layout.jsx             # Meta tags PWA

next.config.js             # Konfigurasi next-pwa
```

## 🎨 Generate Icon

1. Buka `public/icons/icon-generator.html` di browser
2. Screenshot atau save setiap ukuran icon
3. Simpan dengan nama: `icon-72x72.png`, `icon-96x96.png`, dst
4. Letakkan semua file di folder `public/icons/`

Atau gunakan tool online seperti:
- [PWA Asset Generator](https://pwa-asset-generator.nicepkg.cn/)
- [App Icon Generator](https://appicon.co/)

## ⚙️ Konfigurasi

### manifest.json
Edit `public/manifest.json` untuk mengubah:
- Nama aplikasi
- Warna tema
- Icon
- Shortcuts
- Screenshots

### next.config.js
Konfigurasi caching strategy untuk:
- Supabase API
- Static assets (JS, CSS)
- Images

### Runtime Caching
Default caching strategy:
- **Supabase API**: NetworkFirst (24 jam)
- **Images**: CacheFirst (7 hari)
- **JS/CSS**: StaleWhileRevalidate (24 jam)

## 🔧 Development

### Development Mode
PWA otomatis **disabled** saat development (`NODE_ENV=development`)

### Production Build
```bash
npm run build
```
Service worker akan otomatis digenerate di `public/sw.js`

### Testing PWA
1. Build aplikasi: `npm run build`
2. Start production server: `npm start`
3. Buka Chrome DevTools → Lighthouse
4. Run "PWA" audit

## 📱 Shortcut Menu

PWA sudah dikonfigurasi dengan 3 shortcut:
1. **Dashboard** - Buka halaman dashboard
2. **Agenda** - Buka kelola agenda
3. **TV Display** - Buka tampilan TV

## 🌐 Offline Support

Halaman yang tersedia offline:
- Dashboard
- Login
- Kelola Agenda (cached)
- Halaman statis

Halaman yang membutuhkan online:
- Supabase data fetch
- File upload
- Real-time features

## 🔔 Push Notifications (Coming Soon)

Untuk mengaktifkan push notifications:
1. Generate VAPID keys
2. Setup di Supabase
3. Implementasi subscription

## 🐛 Troubleshooting

### PWA tidak muncul install prompt
- Pastikan menggunakan HTTPS
- Cek manifest.json valid
- Cek service worker ter-register

### Icon tidak muncul
- Pastikan semua ukuran icon tersedia
- Cek path di manifest.json
- Clear browser cache

### Offline tidak bekerja
- Cek service worker aktif
- Cek runtimeCaching config
- Hard refresh (Ctrl+F5)

## 📚 Resources

- [Next PWA Documentation](https://github.com/shadowwalker/next-pwa)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Workbox](https://developer.chrome.com/docs/workbox/)

---

💡 **Tip**: Setelah update icon atau manifest, lakukan hard refresh (Ctrl+F5) atau clear browser cache untuk melihat perubahan.
