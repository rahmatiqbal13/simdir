# DEPLOYMENT-TEST-GUIDE.md

Panduan Testing Deployment SIMDIR Tanpa Environment Lengkap

## 🎯 Masalah

Build lokal gagal karena:
- Supabase URL/Key tidak dikonfigurasi
- Database tidak terkoneksi
- Environment variables kosong

## ✅ Solusi: Static Export untuk Preview

### 1. Setup Environment Minimal

Buat file `.env.local` di root:

```env
# Minimal untuk build (tidak perlu valid)
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key
```

### 2. Update next.config.js untuk Static Export

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true
  },
  // Skip error saat build
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
}

module.exports = nextConfig
```

### 3. Build Static

```bash
npm run build
```

Hasil: folder `dist/` dengan file HTML static

### 4. Preview dengan Live Server

Install extension **Live Server** di VS Code, lalu:
- Klik kanan di folder `dist/`
- Pilih "Open with Live Server"

Atau pakai Python:

```bash
cd dist
python -m http.server 8080
```

Buka: `http://localhost:8080`

---

## 🚀 Solusi 2: Deploy ke Vercel Preview

### Option A: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy ke preview (tanpa build lokal)
vercel --prod
```

### Option B: Connect GitHub Repo

1. Push code ke GitHub (meski build gagal lokal)
2. Connect repo ke Vercel
3. Setup Environment Variables di Vercel Dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LEGACY_JWT_SECRET`
4. Vercel akan build otomatis dengan env yang benar

---

## 🧪 Solusi 3: Mock Data untuk Testing

Buat file `lib/supabase/mock-client.js`:

```javascript
// Mock Supabase client untuk testing UI
export const mockSupabase = {
  from: (table) => ({
    select: () => ({
      order: () => ({
        data: [
          {
            id: 1,
            judul: 'Rapat Koordinasi',
            lokasi: 'Ruang Rapat A',
            tanggal_mulai: '2025-05-10',
            tanggal_selesai: '2025-05-10',
            waktu_mulai: '09:00',
            waktu_selesai: '11:00',
            jenis: 'internal',
            penyelenggara: 'Direktorat USC',
            deskripsi: 'Rapat rutin bulanan'
          },
          // ... tambah mock data
        ],
        error: null
      })
    })
  })
}
```

Gunakan mock saat env tidak tersedia:

```javascript
// lib/supabase/client.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.warn('Using mock Supabase client')
  module.exports = { supabase: require('./mock-client').mockSupabase }
} else {
  // Real supabase client
}
```

---

## 📋 Checklist Pre-Deploy

### 1. Pastikan Tidak Ada Syntax Error

```bash
# Check TypeScript
npx tsc --noEmit

# Check ESLint
npx eslint . --ext .js,.jsx,.ts,.tsx
```

### 2. Test Halaman Critical

Halaman yang wajib bisa di-build:
- [ ] `/` (redirect ke /agenda)
- [ ] `/agenda` (public)
- [ ] `/agenda/tv` (TV display)
- [ ] `/login` (auth)
- [ ] `/dashboard` (protected)

### 3. Periksa Import Path

Pastikan tidak ada import yang broken setelah reorganisasi folder.

---

## 🔧 Troubleshooting Build

### Error: "Cannot find module"

**Solusi**: Pastikan semua import path benar:

```bash
# Cek apakah ada error import
npx eslint . --ext .js,.jsx,.ts,.tsx
```

### Error: "Supabase URL not configured"

**Solusi**: Tambahkan placeholder di `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key
```

### Error: "Prerender failed"

**Solusi**: Tambahkan di `next.config.js`:

```javascript
module.exports = {
  // ...
  generateStaticParams: async () => {
    return []
  }
}
```

---

## 🎬 Workflow Testing yang Direkomendasikan

```
1. Code Change → 2. Mock Build → 3. Static Preview → 4. Push GitHub → 5. Vercel Preview
```

### Step-by-Step:

1. **Code**: Edit file
2. **Test Mock**: `npm run build` dengan mock data
3. **Preview**: Buka `dist/` di browser
4. **Push**: `git push` ke GitHub
5. **Vercel**: Otomatis deploy ke preview URL
6. **Cek**: Test di Vercel preview
7. **Merge**: Kalau OK, merge ke main

---

## 💡 Tips Penting

1. **Selalu gunakan try-catch** di data fetching
2. **Fallback UI** untuk state loading/error
3. **Static generation** untuk halaman public (/agenda, /agenda/tv)
4. **Dynamic rendering** untuk halaman protected (/dashboard)

Contoh safe data fetching:

```javascript
// app/(public)/agenda/page.jsx
async function getAgenda() {
  try {
    const { data } = await supabase.from('agenda').select('*')
    return data || []
  } catch (e) {
    console.error('Failed to fetch:', e)
    return [] // Return empty array as fallback
  }
}
```

---

## 📞 Butuh Bantuan?

Jika build masih gagal, cek:
1. Logs di Vercel Dashboard (lebih detail)
2. Pastikan semua env vars terisi
3. Cek versi Node.js (harus 18+)

Vercel Logs → Project → Deployments → Click failed deployment → View Logs
