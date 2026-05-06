# ERROR 400/500 - Panduan Fix Vercel Deploy

## Error yang Terjadi

Dari console log, error yang muncul:

```
Failed to load resource: the server responded with a status of 400 ()
Failed to load resource: the server responded with a status of 500 ()
```

Endpoint yang error:
- `/rest/v1/surat?select=*&tipe=eq.masuk&order=created_at.desc` → 400
- `/rest/v1/pencairan_dana?select=...` → 400  
- `/rest/v1/program_kerja?select=*&order=created_at.desc` → 400 & 500

---

## Penyebab Error

### Error 400 (Bad Request)
1. **Kolom tidak ditemukan** - Query mencari kolom yang tidak ada di tabel
2. **RLS blocking** - Policy tidak mengizinkan operasi
3. **Syntax query salah** - Format select tidak valid

### Error 500 (Internal Server Error)
1. **RLS Policy error** - Policy yang dibuat salah syntax
2. **Database constraint error** - Foreign key violation, dll
3. **Missing table/column** - Tabel atau kolom belum dibuat

---

## Solusi Langsung

### Langkah 1: Jalankan SQL Fix

Buka **Supabase Dashboard** → **SQL Editor** → **New Query**

Jalankan file: **`fix-vercel-comprehensive.sql`**

SQL ini akan:
1. ✅ Cek dan tambah kolom `created_at` jika belum ada
2. ✅ Enable RLS untuk semua tabel
3. ✅ Buat policy "Allow all" untuk setiap tabel
4. ✅ Grant permissions ke anon dan authenticated
5. ✅ Grant permissions untuk views
6. ✅ Enable realtime untuk tabel penting

---

### Langkah 2: Cek Environment Variables Vercel

Masuk ke **Vercel Dashboard** → **Project** → **Settings** → **Environment Variables**

**WAJIB ADA 4 VARIABEL INI:**

| Name | Value | Contoh |
|------|-------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase | `https://fqlxjnlxilnsyicamtqj.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon Key | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role | `eyJhbGciOiJIUzI1NiIs...` |
| `LEGACY_JWT_SECRET` | JWT Secret | `your-legacy-jwt-secret` |

**⚠️ PENTING:**
- Aktifkan untuk **Production**, **Preview**, dan **Development**
- Jangan gunakan `service_role` key untuk `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Pastikan tidak ada spasi di awal/akhir value

---

### Langkah 3: Fix CORS di Supabase

**Masalah:** Browser block request karena CORS

**Solusi:**
1. Buka **Supabase Dashboard**
2. Klik **Authentication** → **URL Configuration**
3. Tambahkan URL Vercel di **Site URL**:
   ```
   https://nama-app-anda.vercel.app
   ```
4. Tambahkan juga di **Redirect URLs**:
   ```
   https://nama-app-anda.vercel.app/**
   ```

---

### Langkah 4: Redeploy Vercel

Setelah SQL dan env vars diatur:

**Opsi A: Push ke GitHub**
```bash
git add .
git commit -m "Fix: Vercel deployment - RLS and env vars"
git push origin main
```

**Opsi B: Redeploy Manual**
1. Vercel Dashboard → Deployments
2. Klik deployment terbaru
3. Klik "Redeploy" → "Use existing Build Cache: NO"

---

## Verifikasi Fix

Setelah redeploy, cek di browser console (F12):

### ✅ Jika Berhasil
```
[200 OK] /rest/v1/agenda?select=*
[200 OK] /rest/v1/program_kerja?select=*
[200 OK] /rest/v1/surat?select=*
```

### ❌ Jika Masih Error

#### Error 401 (Unauthorized)
**Solusi:**
- Cek `NEXT_PUBLIC_SUPABASE_ANON_KEY` benar
- Cek JWT token tidak expired
- Cek user sudah login

#### Error 403 (Forbidden)  
**Solusi:**
- Jalankan ulang SQL fix RLS
- Cek policy "Allow all" sudah dibuat
- Cek GRANT permissions sudah diberikan

#### Error 404 (Not Found)
**Solusi:**
- Tabel belum dibuat → jalankan `supabase-schema.sql`
- Kolom tidak ada → tambahkan kolom yang diperlukan

---

## Checklist Pre-Deploy

### Database Setup
- [ ] Semua tabel dibuat (agenda, program_kerja, surat, dll)
- [ ] Semua kolom `created_at` ada
- [ ] RLS enabled untuk semua tabel
- [ ] Policy "Allow all" dibuat
- [ ] Permissions granted
- [ ] Views laporan dibuat

### Vercel Setup
- [ ] Repository connected
- [ ] Build command: `next build`
- [ ] Output directory: `.next`
- [ ] Environment variables diatur (semua environment)

### Supabase Setup
- [ ] CORS URL ditambahkan
- [ ] API keys tersedia
- [ ] RLS policies aktif

---

## Debug dengan Postman/cURL

Test API endpoint langsung:

```bash
# Test agenda
curl -X GET 'https://lcgrvutghwbrstmumxkr.supabase.co/rest/v1/agenda?select=*' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Test program_kerja
curl -X GET 'https://lcgrvutghwbrstmumxkr.supabase.co/rest/v1/program_kerja?select=*' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Test surat
curl -X GET 'https://lcgrvutghwbrstmumxkr.supabase.co/rest/v1/surat?select=*' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Jika response JSON kosong `[]` → OK (data memang kosong)
Jika response error → ada masalah RLS/permission

---

## Quick Fix Script

Jika ingin fix cepat, jalankan query ini di Supabase SQL Editor:

```sql
-- Fix semua RLS
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON agenda;
CREATE POLICY "Allow all" ON agenda FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON agenda TO anon, authenticated;

ALTER TABLE program_kerja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON program_kerja;
CREATE POLICY "Allow all" ON program_kerja FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON program_kerja TO anon, authenticated;

ALTER TABLE surat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON surat;
CREATE POLICY "Allow all" ON surat FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON surat TO anon, authenticated;

ALTER TABLE pencairan_dana ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON pencairan_dana;
CREATE POLICY "Allow all" ON pencairan_dana FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON pencairan_dana TO anon, authenticated;

ALTER TABLE pencairan_program ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON pencairan_program;
CREATE POLICY "Allow all" ON pencairan_program FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON pencairan_program TO anon, authenticated;

SELECT 'All RLS fixed' as status;
```

---

## Masih Error?

Jika setelah mengikuti semua langkah masih error:

1. **Cek Supabase Logs:**
   - Dashboard → Database → Logs → PostgREST
   - Cari error detail

2. **Cek Vercel Logs:**
   - Dashboard → Deployments → Functions
   - Cari error functions

3. **Restart Supabase:**
   - Kadang restart project Supabase membantu

4. **Contact Support:**
   - Supabase Discord/Forum
   - Vercel Support

---

**Last Updated:** 5 Mei 2026
