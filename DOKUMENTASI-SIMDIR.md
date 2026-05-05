# Dokumentasi SIMDIR - Perubahan & Modifikasi

Dokumen ini berisi catatan lengkap tentang semua perubahan, konfigurasi, dan modifikasi yang telah dilakukan pada sistem SIMDIR.

## Daftar Isi
1. [Struktur Database](#struktur-database)
2. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
3. [Modul Laporan](#modul-laporan)
4. [Modul Surat](#modul-surat)
5. [File yang Diubah](#file-yang-diubah)
6. [SQL Queries](#sql-queries)
7. [Panduan Troubleshooting](#panduan-troubleshooting)

---

## Struktur Database

### Tabel Utama

#### 1. `users`
Tabel untuk menyimpan data pengguna.
- `id` (UUID, PK)
- `email` (VARCHAR)
- `username` (VARCHAR)
- `role` (VARCHAR: super_admin, admin_keuangan, admin, pimpinan)
- `is_active` (BOOLEAN)

#### 2. `profiles`
Profil tambahan untuk setiap user.
- `id` (UUID, PK)
- `user_id` (UUID, FK ke users)
- `nama` (VARCHAR)
- `role` (VARCHAR)
- `unit_kerja_id` (UUID)

#### 3. `unit_kerja`
Daftar unit kerja dalam organisasi.
- `id` (UUID, PK)
- `nama` (VARCHAR) - contoh: USC, Kolam Renang, Driving Golf
- `kode` (VARCHAR) - kode singkat unit
- `deskripsi` (TEXT)
- `is_active` (BOOLEAN)

#### 4. `program_kerja`
Program kerja dengan anggaran.
- `id` (UUID, PK)
- `nama` (VARCHAR)
- `unit_kerja_id` (TEXT) - tipe data TEXT (bukan UUID)
- `sumber_dana` (VARCHAR: UKT, UU, lainnya)
- `pagu_anggaran` (DECIMAL 15,2)
- `tahun` (INTEGER)
- `status` (VARCHAR: aktif, selesai, dibatalkan)

#### 5. `pencairan_dana`
Data pencairan dana/SPJ.
- `id` (UUID, PK)
- `nomor_pencairan` (VARCHAR)
- `tanggal_pencairan` (DATE)
- `jumlah` (DECIMAL 15,2)
- `keterangan` (TEXT)
- `status` (VARCHAR: pending, proses, selesai, ditolak)

#### 6. `pencairan_program` (Junction Table)
Relasi many-to-many antara pencairan dan program kerja.
- `id` (UUID, PK)
- `pencairan_id` (UUID, FK ke pencairan_dana)
- `program_kerja_id` (UUID, FK ke program_kerja)
- `jumlah_alokasi` (DECIMAL 15,2)

#### 7. `agenda`
Data agenda kegiatan.
- `id` (UUID, PK)
- `judul` (VARCHAR)
- `jenis` (VARCHAR: internal, eksternal, pimpinan)
- `tanggal_mulai` (DATE)
- `tanggal_selesai` (DATE)
- `status` (VARCHAR: upcoming, upcoming_soon, ongoing, completed)

#### 8. `surat`
Data surat masuk dan keluar.
- `id` (UUID, PK)
- `tipe` (VARCHAR: masuk, keluar)
- `nomor_surat` (VARCHAR)
- `perihal` (TEXT)
- `jenis` (VARCHAR: undangan, permohonan, pemberitahuan, lainnya)
- `asal` (VARCHAR) - untuk surat masuk
- `tujuan` (VARCHAR) - untuk surat keluar
- `status` (VARCHAR: aktif, arsip, batal)

---

### Views untuk Laporan

#### `laporan_serapan_program`
Menghitung serapan dana per program kerja.
```sql
SELECT 
    pk.id,
    pk.nama,
    pk.tahun,
    pk.unit_kerja_id,
    uk.nama AS unit_kerja,
    pk.pagu_anggaran AS pagu,
    COALESCE(SUM(pd.jumlah_alokasi), 0) AS total_spj,
    ...
FROM program_kerja pk
LEFT JOIN pencairan_program pd ON pd.program_kerja_id = pk.id
LEFT JOIN unit_kerja uk ON uk.id::text = pk.unit_kerja_id
```

#### `laporan_serapan_unit`
Rekap serapan dana per unit kerja.

#### `laporan_statistik_agenda`
Statistik agenda per bulan.

#### `laporan_statistik_surat`
Statistik surat per bulan.

#### `laporan_detail_pencairan`
Detail pencairan dengan informasi program.

---

## Role-Based Access Control (RBAC)

### Struktur Akses

| Role | Menu yang Bisa Diakses |
|------|------------------------|
| **super_admin** | Dashboard, Kelola Agenda, Surat, Program Kerja, Pencairan, **Laporan**, Pengaturan |
| **admin_keuangan** | Dashboard, Program Kerja, Pencairan |
| **admin** | Dashboard, Kelola Agenda |
| **pimpinan** | Dashboard, Kelola Agenda, Surat, Program Kerja, Pencairan (Read-only) |

### Konfigurasi Middleware

File: `middleware.js`

```javascript
// Laporan - super_admin only
if (pathname.startsWith('/(dashboard)/laporan') || pathname.startsWith('/dashboard/laporan')) {
  if (role !== 'super_admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
}

// Kelola Agenda - super_admin, admin, pimpinan (NOT admin_keuangan)
if (pathname.startsWith('/(dashboard)/kelola-agenda') || pathname.startsWith('/dashboard/kelola-agenda')) {
  if (!['super_admin', 'admin', 'pimpinan'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
}

// Surat - only super_admin and pimpinan
if (pathname.startsWith('/(dashboard)/surat') || pathname.startsWith('/dashboard/surat')) {
  if (!['super_admin', 'pimpinan'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
}

// Program Kerja - super_admin, admin_keuangan, pimpinan
if (pathname.startsWith('/(dashboard)/program-kerja') || pathname.startsWith('/dashboard/program-kerja')) {
  if (!['super_admin', 'admin_keuangan', 'pimpinan'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
}

// Pencairan - super_admin, admin_keuangan, pimpinan
if (pathname.startsWith('/(dashboard)/pencairan') || pathname.startsWith('/dashboard/pencairan')) {
  if (!['super_admin', 'admin_keuangan', 'pimpinan'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
}

// Pengaturan - super_admin only
if (pathname.startsWith('/(dashboard)/pengaturan') || pathname.startsWith('/dashboard/pengaturan')) {
  if (role !== 'super_admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
}
```

### Konfigurasi Layout Navigation

File: `app/(dashboard)/layout.jsx`

```javascript
const navItems = {
  super_admin: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/kelola-agenda', label: 'Kelola Agenda', icon: 'calendar' },
    { href: '/surat', label: 'Surat Masuk & Keluar', icon: 'mail' },
    { href: '/program-kerja', label: 'Program Kerja', icon: 'briefcase' },
    { href: '/pencairan', label: 'Pencairan Dana', icon: 'wallet' },
    { href: '/laporan', label: 'Laporan', icon: 'chart' },
    { href: '/pengaturan/users', label: 'Pengaturan', icon: 'settings' },
  ],
  admin_keuangan: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/program-kerja', label: 'Program Kerja', icon: 'briefcase' },
    { href: '/pencairan', label: 'Pencairan Dana', icon: 'wallet' },
  ],
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/kelola-agenda', label: 'Kelola Agenda', icon: 'calendar' },
  ],
  pimpinan: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/kelola-agenda', label: 'Kelola Agenda', icon: 'calendar' },
    { href: '/surat', label: 'Surat Masuk & Keluar', icon: 'mail' },
    { href: '/program-kerja', label: 'Program Kerja', icon: 'briefcase' },
    { href: '/pencairan', label: 'Pencairan Dana', icon: 'wallet' },
  ],
}
```

---

## Modul Laporan

### Deskripsi
Modul laporan hanya bisa diakses oleh **super_admin**. Menampilkan rekap serapan dana per program kerja dan unit kerja.

### File Utama
- `app/(dashboard)/laporan/page.jsx` - Halaman laporan

### Fitur
1. **Filter**
   - Periode: Bulanan/Tahunan
   - Bulan (1-12)
   - Tahun Anggaran
   - Unit Kerja

2. **Statistik Card**
   - Total Pagu Anggaran
   - Total SPJ
   - Sisa Anggaran
   - Status Serapan (%)

3. **Tabel Program Kerja**
   - Daftar program dengan pagu, SPJ, dan progress

4. **Chart**
   - Top 5 Serapan Unit (Bar Chart)

5. **Preview & Download**
   - Modal preview laporan yang rapi untuk cetak

### Views Database
- `laporan_serapan_program`
- `laporan_serapan_unit`
- `laporan_statistik_agenda`
- `laporan_statistik_surat`
- `laporan_detail_pencairan`

---

## Modul Surat

### Deskripsi
Modul untuk mengelola surat masuk dan keluar. Bisa diakses oleh **super_admin** dan **pimpinan**.

### File SQL
- `create-surat-table.sql` - Membuat tabel surat

### Struktur Tabel `surat`
```sql
CREATE TABLE IF NOT EXISTS surat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('masuk', 'keluar')),
    nomor_surat VARCHAR(100) NOT NULL,
    perihal TEXT NOT NULL,
    jenis VARCHAR(20) CHECK (jenis IN ('undangan', 'permohonan', 'pemberitahuan', 'lainnya')),
    asal VARCHAR(255), -- pengirim surat masuk
    tertuju VARCHAR(255), -- ditujukan kepada
    tanggal_surat DATE,
    tanggal_diterima DATE,
    tujuan VARCHAR(255), -- penerima surat keluar
    tanggal_keluar DATE,
    unit_kerja_peminta VARCHAR(100),
    pemohon VARCHAR(100),
    penanda_tangan VARCHAR(100),
    lampiran BOOLEAN DEFAULT false,
    file_lampiran TEXT,
    keterangan TEXT,
    status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'arsip', 'batal')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## File yang Diubah

### 1. `middleware.js`
**Perubahan:**
- Menambahkan proteksi route untuk setiap role
- Laporan hanya untuk super_admin
- Kelola Agenda tidak untuk admin_keuangan

### 2. `app/(dashboard)/layout.jsx`
**Perubahan:**
- Update `navItems` untuk setiap role
- Menghapus menu Laporan dari admin_keuangan
- Menghapus menu Kelola Agenda dari admin_keuangan

### 3. `app/(dashboard)/laporan/page.jsx`
**Perubahan:**
- Integrasi dengan Supabase (real data)
- Menggunakan views database
- Loading states dan error handling
- Perbaikan UI Preview Modal (tabel rapi, tanda tangan)

### 4. SQL Files Created
- `create-surat-table.sql` - Tabel surat
- `create-laporan-views.sql` - Views untuk laporan

---

## SQL Queries

### 1. Create Tabel Surat
```sql
CREATE TABLE IF NOT EXISTS surat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('masuk', 'keluar')),
    nomor_surat VARCHAR(100) NOT NULL,
    perihal TEXT NOT NULL,
    jenis VARCHAR(20) CHECK (jenis IN ('undangan', 'permohonan', 'pemberitahuan', 'lainnya')),
    asal VARCHAR(255),
    tertuju VARCHAR(255),
    tanggal_surat DATE,
    tanggal_diterima DATE,
    tujuan VARCHAR(255),
    tanggal_keluar DATE,
    unit_kerja_peminta VARCHAR(100),
    pemohon VARCHAR(100),
    penanda_tangan VARCHAR(100),
    lampiran BOOLEAN DEFAULT false,
    file_lampiran TEXT,
    keterangan TEXT,
    status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'arsip', 'batal')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surat_tipe ON surat(tipe);
CREATE INDEX IF NOT EXISTS idx_surat_nomor ON surat(nomor_surat);
CREATE INDEX IF NOT EXISTS idx_surat_jenis ON surat(jenis);

ALTER TABLE surat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON surat;
CREATE POLICY "Allow all" ON surat FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON surat TO anon;
GRANT ALL ON surat TO authenticated;
GRANT ALL ON surat TO postgres;
```

### 2. Create Views Laporan
```sql
-- View: Rekap Serapan Dana per Program Kerja
CREATE OR REPLACE VIEW laporan_serapan_program AS
SELECT 
    pk.id,
    pk.nama,
    pk.tahun,
    pk.unit_kerja_id,
    uk.nama AS unit_kerja,
    pk.pagu_anggaran AS pagu,
    COALESCE(SUM(pd.jumlah_alokasi), 0) AS total_spj,
    pk.pagu_anggaran - COALESCE(SUM(pd.jumlah_alokasi), 0) AS sisa,
    CASE 
        WHEN pk.pagu_anggaran > 0 THEN ROUND((COALESCE(SUM(pd.jumlah_alokasi), 0) / pk.pagu_anggaran) * 100, 2)
        ELSE 0 
    END AS persen_serapan
FROM program_kerja pk
LEFT JOIN pencairan_program pd ON pd.program_kerja_id = pk.id
LEFT JOIN pencairan_dana pcd ON pcd.id = pd.pencairan_id
LEFT JOIN unit_kerja uk ON uk.id::text = pk.unit_kerja_id
GROUP BY pk.id, pk.nama, pk.tahun, pk.unit_kerja_id, uk.nama, pk.pagu_anggaran;

-- Grant permissions
GRANT SELECT ON laporan_serapan_program TO authenticated, anon;
```

---

## Panduan Troubleshooting

### Error: "relation 'pencairan' does not exist"
**Solusi:** Nama tabel yang benar adalah `pencairan_dana` bukan `pencairan`.

### Error: "operator does not exist: uuid = text"
**Solusi:** Kolom `unit_kerja_id` di tabel `program_kerja` bertipe TEXT. Gunakan cast:
```sql
uk.id::text = pk.unit_kerja_id
```

### Error: "column 'pagu' does not exist"
**Solusi:** Nama kolom yang benar adalah `pagu_anggaran` bukan `pagu`.

### Error: "column 'tanggal' does not exist"
**Solusi:** Tabel agenda menggunakan `tanggal_mulai` bukan `tanggal`.

### Error: "column 'tipe' does not exist"
**Solusi:** Tabel `unit_kerja` tidak punya kolom `tipe`, gunakan `kode`.

### Error 404 saat pindah halaman
**Solusi:**
```bash
rmdir /s /q .next
npm run dev
```

### Data laporan tidak muncul
**Solusi:**
1. Pastikan views sudah dibuat di Supabase
2. Pastikan ada data di tabel `program_kerja`
3. Pastikan ada data di tabel `pencairan_program` dan `pencairan_dana`
4. Cek permission: `GRANT SELECT ON view_name TO authenticated`

---

## Catatan Penting

1. **Tipe Data unit_kerja_id**
   - Di tabel `program_kerja`: TEXT
   - Di tabel `unit_kerja`: UUID
   - Selalu gunakan cast `uk.id::text` saat join

2. **Kolom Pagu**
   - Nama kolom: `pagu_anggaran`
   - Tipe: DECIMAL(15,2)

3. **Status Agenda**
   - `upcoming` - Akan datang
   - `upcoming_soon` - Segera
   - `ongoing` - Sedang berlangsung
   - `completed` - Selesai

4. **Role Akses**
   - `super_admin`: Full access
   - `admin_keuangan`: Dashboard, Program, Pencairan only
   - `admin`: Dashboard, Kelola Agenda only
   - `pimpinan`: Read-only access

---

## Kontak & Support

Jika ada masalah atau pertanyaan, silakan:
1. Cek dokumentasi ini terlebih dahulu
2. Cek file SQL yang terkait
3. Cek log error di console browser
4. Cek log error di terminal Next.js

---

**Terakhir diupdate:** 5 Mei 2026
**Versi:** 1.0
