# ============================================
# SUPABASE SETUP GUIDE - SIMDIR
# ============================================

## Langkah 1: Dapatkan Service Role Key

1. Buka https://supabase.com/dashboard
2. Pilih project Anda (fqlxjnlxilnsyicamtqj)
3. Klik "Project Settings" (ikon gear di sidebar kiri)
4. Pilih tab "Configuration" → "API"
5. Copy "service_role secret" (bukan anon key!)

## Langkah 2: Setup Auth Users

### Opsi A: Menggunakan Node.js Script (Recommended)

1. Install dependencies:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Edit file `setup-supabase-auth.js`:
   - Ganti `YOUR_SERVICE_ROLE_KEY_HERE` dengan service_role key yang didapat

3. Jalankan script:
   ```bash
   node setup-supabase-auth.js
   ```

### Opsi B: Manual via Supabase Dashboard

1. Buka Supabase Dashboard → Authentication → Users
2. Klik "Add User" → "Create New User"
3. Buat 4 user berikut:

   **User 1 - Super Admin:**
   - Email: adminiqbal@usc.ac.id
   - Password: usc@_140451
   - User Metadata: `{"username": "adminiqbal", "role": "super_admin"}`

   **User 2 - Admin Keuangan:**
   - Email: keuangan@usc.ac.id
   - Password: keuangan123
   - User Metadata: `{"username": "keuangan", "role": "admin_keuangan"}`

   **User 3 - Admin:**
   - Email: operator@usc.ac.id
   - Password: operator123
   - User Metadata: `{"username": "operator", "role": "admin"}`

   **User 4 - Pimpinan:**
   - Email: pimpinan@usc.ac.id
   - Password: pimpinan123
   - User Metadata: `{"username": "pimpinan", "role": "pimpinan"}`

## Langkah 3: Setup Database

1. Buka Supabase Dashboard → SQL Editor
2. Copy isi file `supabase-setup-complete.sql`
3. Paste ke SQL Editor
4. Klik "Run"

## Langkah 4: Konfigurasi Environment Variables

1. Copy `.env.local.example` menjadi `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` dan isi dengan:
   - NEXT_PUBLIC_SUPABASE_URL (dari Dashboard → API)
   - NEXT_PUBLIC_SUPABASE_ANON_KEY (dari Dashboard → API)
   - SUPABASE_SERVICE_ROLE_KEY (sama dengan yang digunakan di script)
   - LEGACY_JWT_SECRET (dari Dashboard → Configuration → API)

## Langkah 5: Test Login

1. Restart dev server:
   ```bash
   npm run dev
   ```

2. Buka http://localhost:3000/login
3. Coba login dengan:
   - Username: adminiqbal
   - Password: usc@_140451

## Troubleshooting

### Error 400: Invalid login credentials
- User belum dibuat di Supabase Auth
- Password salah

### Error 500: Server error
- RLS policy blocking
- Function belum dibuat

### Login gagal tapi tidak ada error
- Cek console browser untuk detail error
- Cek Network tab untuk melihat response dari Supabase

## Mode Lokal (Fallback)

Jika Supabase setup masih bermasalah, aplikasi akan otomatis fallback ke mode lokal:
- Login menggunakan data dari `lib/local-users.js`
- Session disimpan di localStorage
- Tidak perlu koneksi ke Supabase

Untuk menggunakan mode lokal:
1. Buka halaman login
2. Login dengan user default (adminiqbal / usc@_140451)
3. Sistem akan otomatis menggunakan local storage
