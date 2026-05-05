# Setup Database SIMDIR - Project Supabase Baru

## ✅ Langkah 1: Jalankan SQL Schema

1. Buka project Supabase baru di dashboard
2. Klik menu **SQL Editor** (di sidebar kiri)
3. Klik **New query**
4. Copy seluruh isi file `supabase-schema.sql`
5. Paste ke SQL Editor
6. Klik **Run** (tombol hijau)

**Tunggu sampai selesai** (biasanya 10-30 detik)

---

## ✅ Langkah 2: Fix Login RLS

Masih di SQL Editor:

1. Klik **New query** lagi
2. Copy seluruh isi file `fix-login-rls.sql`
3. Paste ke SQL Editor
4. Klik **Run**

Ini akan membuat fungsi RPC untuk bypass RLS saat login.

---

## ✅ Langkah 3: Verifikasi Setup

Jalankan query ini di SQL Editor untuk cek:

```sql
-- Cek tabel sudah dibuat
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Cek data default
SELECT * FROM users;
SELECT * FROM unit_kerja;
```

**Hasil yang diharapkan:**
- Tabel: agenda, users, unit_kerja, program_kerja, dll
- Users: 1 row (adminiqbal)
- Unit_kerja: 11 rows (USC, PUI Keolahragaan, dll)

---

## ✅ Langkah 4: Test JWT Configuration

Di terminal lokal:

```bash
node test-legacy-jwt.js
```

**Output yang benar:**
```
Token created successfully!
Token: eyJhbGciOiJIUzI1NiIs...
Token verified successfully!
Payload: { userId: 'test-user-123', email: 'test@example.com', iat: ..., exp: ... }
✅ Legacy JWT is configured correctly!
```

Jika error, cek `LEGACY_JWT_SECRET` di `.env.local` sudah benar.

---

## ✅ Langkah 5: Jalankan Aplikasi

```bash
npm run dev
```

Buka browser: `http://127.0.0.1:3000`

---

## 🔑 Login Testing

Gunakan akun default:

| Field | Value |
|-------|-------|
| Username | `adminiqbal` |
| Password | `usc@_140451` |

---

## 🛠️ Troubleshooting

### Error: "Failed to fetch"
- Cek URL Supabase di `.env.local` sudah benar
- Pastikan tidak ada spasi di akhir URL

### Error: "Invalid API key"
- Cek `NEXT_PUBLIC_SUPABASE_ANON_KEY` sudah benar
- Key harus dari project baru, bukan project lama

### Error: "JWT verification failed"
- Cek `LEGACY_JWT_SECRET` sudah diisi
- Pastikan mengambil dari: Project Settings → API → Legacy JWT secret

### Error 500 saat login
- Pastikan sudah jalankan `fix-login-rls.sql`
- Cek logs di Supabase Dashboard → Logs

---

## 📋 Checklist

- [ ] `supabase-schema.sql` berhasil dijalankan
- [ ] `fix-login-rls.sql` berhasil dijalankan
- [ ] Tabel dan data terlihat di Table Editor
- [ ] `test-legacy-jwt.js` output success
- [ ] Aplikasi berjalan di `http://127.0.0.1:3000`
- [ ] Login dengan `adminiqbal` berhasil

---

Selamat mencoba! 🚀
