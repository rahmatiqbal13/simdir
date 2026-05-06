# Troubleshooting Deploy Vercel - SIMDIR

Panduan ini untuk memperbaiki masalah saat deploy SIMDIR ke Vercel.

---

## Masalah Umum & Solusi

### ❌ Error: "Error Loading Data" / "Gagal memuat data"

**Penyebab:**
1. Environment variables tidak diatur di Vercel
2. RLS (Row Level Security) blocking access
3. Supabase URL/Key salah

**Solusi:**

#### 1. Setup Environment Variables di Vercel

Masuk ke Vercel Dashboard → Project Settings → Environment Variables

Tambahkan variabel berikut:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
LEGACY_JWT_SECRET=your-legacy-jwt-secret
```

⚠️ **Penting:** Pastikan semua environment variables diatur di:
- Production
- Preview  
- Development

#### 2. Fix RLS (Row Level Security)

Jalankan SQL berikut di Supabase SQL Editor:

```sql
-- ============================================
-- FIX RLS FOR VERCEL DEPLOYMENT
-- ============================================

-- 1. Fix RLS untuk tabel agenda
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON agenda;
CREATE POLICY "Allow all" ON agenda FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON agenda TO anon;
GRANT ALL ON agenda TO authenticated;

-- 2. Fix RLS untuk tabel program_kerja
ALTER TABLE program_kerja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON program_kerja;
CREATE POLICY "Allow all" ON program_kerja FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON program_kerja TO anon;
GRANT ALL ON program_kerja TO authenticated;

-- 3. Fix RLS untuk tabel unit_kerja
ALTER TABLE unit_kerja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON unit_kerja;
CREATE POLICY "Allow all" ON unit_kerja FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON unit_kerja TO anon;
GRANT ALL ON unit_kerja TO authenticated;

-- 4. Fix RLS untuk tabel pencairan_dana
ALTER TABLE pencairan_dana ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON pencairan_dana;
CREATE POLICY "Allow all" ON pencairan_dana FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON pencairan_dana TO anon;
GRANT ALL ON pencairan_dana TO authenticated;

-- 5. Fix RLS untuk tabel pencairan_program
ALTER TABLE pencairan_program ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON pencairan_program;
CREATE POLICY "Allow all" ON pencairan_program FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON pencairan_program TO anon;
GRANT ALL ON pencairan_program TO authenticated;

-- 6. Fix RLS untuk tabel users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON users;
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON users TO anon;
GRANT ALL ON users TO authenticated;

-- 7. Fix RLS untuk tabel profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON profiles;
CREATE POLICY "Allow all" ON profiles FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON profiles TO anon;
GRANT ALL ON profiles TO authenticated;

-- 8. Fix RLS untuk tabel surat
ALTER TABLE surat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON surat;
CREATE POLICY "Allow all" ON surat FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON surat TO anon;
GRANT ALL ON surat TO authenticated;

-- 9. Fix permissions untuk views
GRANT SELECT ON laporan_serapan_program TO anon;
GRANT SELECT ON laporan_serapan_program TO authenticated;
GRANT SELECT ON laporan_serapan_unit TO anon;
GRANT SELECT ON laporan_serapan_unit TO authenticated;
GRANT SELECT ON laporan_statistik_agenda TO anon;
GRANT SELECT ON laporan_statistik_agenda TO authenticated;
GRANT SELECT ON laporan_statistik_surat TO anon;
GRANT SELECT ON laporan_statistik_surat TO authenticated;
GRANT SELECT ON laporan_detail_pencairan TO anon;
GRANT SELECT ON laporan_detail_pencairan TO authenticated;

-- Verify
SELECT 'RLS Fixed for Vercel Deployment' as status;
```

#### 3. Fix CORS di Supabase

Masuk ke Supabase Dashboard → Authentication → URL Configuration

Tambahkan URL Vercel Anda:
```
https://your-app.vercel.app
https://your-app-git-main-yourusername.vercel.app
```

#### 4. Redeploy ke Vercel

Setelah environment variables dan RLS diatur:

```bash
# Push ke GitHub
git add .
git commit -m "Fix: Vercel deployment configuration"
git push origin main
```

Atau trigger redeploy manual di Vercel Dashboard.

---

### ❌ Error: "Invalid API key" atau "JWT expired"

**Penyebab:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` salah atau expired

**Solusi:**
1. Masuk ke Supabase Dashboard → Project Settings → API
2. Copy `anon public` key (bukan service_role!)
3. Update di Vercel Environment Variables
4. Redeploy

---

### ❌ Error: "relation 'table_name' does not exist"

**Penyebab:** Tabel belum dibuat di Supabase

**Solusi:**
1. Jalankan semua file SQL di Supabase SQL Editor:
   - `supabase-schema.sql`
   - `create-surat-table.sql`
   - `create-laporan-views.sql`
   - `migrate-pencairan-many-to-many.sql`

2. Pastikan semua tabel terbuat dengan benar

---

### ❌ Error: "column 'xxx' does not exist"

**Penyebab:** Struktur tabel tidak sesuai

**Solusi:**
Cek struktur tabel dengan query:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'nama_tabel';
```

Kemudian sesuaikan aplikasi atau SQL schema.

---

## Checklist Deploy ke Vercel

### Sebelum Deploy

- [ ] Push code ke GitHub
- [ ] Connect repository ke Vercel
- [ ] Set build command: `next build`
- [ ] Set output directory: `.next`

### Environment Variables (Wajib)

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - URL Supabase project
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon key dari Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key (untuk API routes)
- [ ] `LEGACY_JWT_SECRET` - JWT secret untuk auth

### Supabase Configuration

- [ ] Semua tabel sudah dibuat
- [ ] RLS diaktifkan dengan policy "Allow all"
- [ ] Permissions granted ke anon dan authenticated
- [ ] Views laporan sudah dibuat
- [ ] CORS URL sudah diatur (URL Vercel)

### Setelah Deploy

- [ ] Test login
- [ ] Test buka agenda
- [ ] Test buka program kerja
- [ ] Test buka laporan (super_admin)
- [ ] Test buka surat

---

## Perintah Penting

### Lokal Development
```bash
# Install dependencies
npm install

# Setup environment
copy .env.local.example .env.local
# Edit .env.local dengan credentials Supabase

# Run dev server
npm run dev
```

### Build untuk Production
```bash
# Build locally (test before deploy)
npm run build

# Start production server locally
npm start
```

### Deploy ke Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## Debug Tips

### 1. Cek Console Browser
Buka Developer Tools (F12) → Console, lihat error message.

### 2. Cek Network Tab
Buka Developer Tools → Network → XHR/Fetch, lihat response dari API calls.

### 3. Cek Vercel Logs
Vercel Dashboard → Deployments → Click deployment → Functions tab

### 4. Cek Supabase Logs
Supabase Dashboard → Database → Logs

### 5. Test API Endpoint
Buat file test sederhana untuk cek koneksi:
```javascript
// Test koneksi Supabase
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('agenda').select('*').limit(1);
  console.log(data, error);
}
test();
```

---

## Kontak Support

Jika masih ada masalah:
1. Cek Vercel documentation: https://vercel.com/docs
2. Cek Supabase documentation: https://supabase.com/docs
3. Cek Next.js documentation: https://nextjs.org/docs

---

**Terakhir diupdate:** 5 Mei 2026
