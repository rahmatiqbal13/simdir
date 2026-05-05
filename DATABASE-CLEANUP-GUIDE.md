# Panduan Mengatasi Database Supabase yang Tercampur

## 📋 Ringkasan Masalah

Anda menyadari bahwa database Supabase untuk aplikasi SIMDIR tercampur dengan database/project lain. Ini bisa terjadi karena:

1. **URL Supabase belum diubah** - Masih menggunakan `https://your-project.supabase.co`
2. **Menjalankan SQL ke project yang salah** - Mungkin project Supabase yang sudah ada data lain
3. **Menggunakan project Supabase yang sama** untuk multiple aplikasi

## 🎯 Solusi yang Tersedia

### **Opsi 1: Membersihkan Database yang Tercampur (Cepat)**

Gunakan ini jika ingin tetap menggunakan project Supabase yang sama tapi membersihkan data SIMDIR.

#### Langkah 1: Backup Data (Jika Diperlukan)
```bash
# Jalankan di SQL Editor Supabase:
# Buka file: backup-simdir-data.sql
```

#### Langkah 2: Hapus Semua Tabel SIMDIR
```bash
# Jalankan di SQL Editor Supabase:
# Buka file: cleanup-simdir.sql
```

#### Langkah 3: Setup Ulang Database
```bash
# Jalankan setup fresh:
# Buka file: supabase-schema.sql
```

---

### **Opsi 2: Buat Project Supabase Baru (Recommended)**

Ini adalah solusi paling bersih dan aman.

#### Langkah 1: Buat Project Baru
1. Buka [https://app.supabase.com](https://app.supabase.com)
2. Klik "New Project"
3. Isi detail project:
   - **Organization**: Pilih organization Anda
   - **Project Name**: `simdir-usc` (atau nama lain yang deskriptif)
   - **Database Password**: Buat password yang kuat
   - **Region**: Pilih region terdekat (Singapore untuk Indonesia)
4. Klik "Create new project"
5. Tunggu project selesai dibuat (1-2 menit)

#### Langkah 2: Ambil Credentials
1. Di project baru, klik **Project Settings** (icon gear)
2. Pilih menu **API**
3. Copy nilai berikut:
   - **Project URL** (contoh: `https://xyz123abc.supabase.co`)
   - **anon public** key
   - **service_role secret** key
   - **JWT Settings** → **Legacy JWT secret** (scroll ke bawah)

#### Langkah 3: Update Konfigurasi Lokal

Edit file `.env.local`:

```bash
# Ganti dengan URL project baru
NEXT_PUBLIC_SUPABASE_URL=https://xyz123abc.supabase.co

# Ganti dengan anon key baru
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Ganti dengan service role key baru
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Ganti dengan Legacy JWT secret dari project baru
LEGACY_JWT_SECRET=your-new-legacy-jwt-secret-here
```

#### Langkah 4: Setup Database
1. Buka SQL Editor di Supabase Dashboard
2. Jalankan file: `supabase-schema.sql`
3. Kemudian jalankan: `fix-login-rls.sql`

#### Langkah 5: Test Koneksi
```bash
# Test JWT
node test-legacy-jwt.js

# Jalankan aplikasi
npm run dev
```

---

### **Opsi 3: Cek Data yang Tercampur (Investigasi)**

Jika tidak yakin apa yang tercampur, cek dulu:

```sql
-- Lihat semua tabel di public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Lihat jumlah data per tabel
SELECT 
    'agenda' as table_name, COUNT(*) as count FROM agenda
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'program_kerja', COUNT(*) FROM program_kerja
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles;
```

---

## 🔧 Troubleshooting

### Error: "relation 'users' already exists"
```sql
-- Solusi: Hapus dulu tabel yang conflict
DROP TABLE IF EXISTS users CASCADE;
```

### Error: "cannot drop table because other objects depend on it"
```sql
-- Solusi: Gunakan CASCADE
DROP TABLE IF EXISTS nama_tabel CASCADE;
```

### Error: "permission denied"
```sql
-- Solusi: Pastikan menggunakan service_role key
-- atau jalankan sebagai postgres user
```

---

## ✅ Checklist Setelah Setup

- [ ] Project Supabase baru dibuat (atau database dibersihkan)
- [ ] File `.env.local` diupdate dengan credentials baru
- [ ] SQL schema berhasil dijalankan tanpa error
- [ ] Login page bisa diakses tanpa error 500
- [ ] User `adminiqbal` bisa login
- [ ] Semua fitur berjalan normal

---

## 🆘 Butuh Bantuan?

Jika mengalami kesulitan:

1. **Cek Logs**: Di Supabase Dashboard → Logs → API/Postgres
2. **Test JWT**: Jalankan `node test-legacy-jwt.js`
3. **Cek Network**: Buka browser DevTools → Network saat login
4. **RLS Issues**: Pastikan sudah jalankan `fix-login-rls.sql`

---

## 📁 File Penting

| File | Fungsi |
|------|--------|
| `cleanup-simdir.sql` | Hapus semua tabel SIMDIR |
| `backup-simdir-data.sql` | Backup data sebelum cleanup |
| `supabase-schema.sql` | Setup database baru |
| `fix-login-rls.sql` | Fix login error 500 |
| `test-legacy-jwt.js` | Test JWT configuration |
