# PRODUCT REQUIREMENTS DOCUMENT
## Sistem Informasi Manajemen Direktorat (SIMDIR)

**Versi:** 1.3
**Status:** Draft
**Klasifikasi:** Internal
**Tahun:** 2025
**Tech Stack:** Next.js · Supabase · Vercel · GitHub

---

## Daftar Isi

1. [Executive Summary](#1-executive-summary)
2. [User Experience & Functionality](#2-user-experience--functionality)
3. [Role-Based Access Control (RBAC)](#3-role-based-access-control-rbac)
4. [Technical Specifications](#4-technical-specifications)
5. [Risks & Roadmap](#5-risks--roadmap)

---

## 1. Executive Summary

### 1.1 Problem Statement

Direktorat Unesa Science Center (USC), Universitas Negeri Surabaya, beserta sub-direktorat dan unit usaha (Kolam Renang, Golf, USC) saat ini mengelola agenda kegiatan, surat menyurat, program kerja, anggaran, pencairan dana, dan SPJ secara manual melalui Google Sheets dan buku fisik. Kondisi ini menyebabkan data tidak terpusat, sulit dipantau pimpinan, rawan kehilangan data, kalkulasi rentan human error, dan tidak transparan bagi publik untuk agenda kegiatan.

### 1.2 Proposed Solution

Membangun **Sistem Informasi Manajemen Direktorat (SIMDIR)** berbasis web responsive (mobile-friendly) menggunakan **Next.js + Supabase + Vercel**, yang mengintegrasikan 5 modul utama dalam satu platform terpusat dengan sistem Role-Based Access Control (RBAC). Modul agenda bersifat publik tanpa login; modul keuangan & administrasi hanya untuk pengguna terautentikasi.

### 1.3 Success Criteria (KPI)

| KPI | Target Terukur |
|-----|----------------|
| Akurasi kalkulasi SPJ & sisa anggaran | Otomatis 100%, error rate 0% |
| Waktu load halaman publik (agenda) | < 2 detik pada koneksi 4G |
| Waktu load dashboard internal | < 3 detik untuk dataset ≤ 1.000 record |
| Tingkat adopsi pengguna internal | ≥ 80% user aktif dalam 30 hari pertama |
| Uptime sistem | ≥ 99% per bulan |
| Waktu respons API (CRUD) | < 500ms untuk 95% request |

---

## 2. User Experience & Functionality

### 2.1 User Personas

#### 👤 Super Admin
- **Deskripsi:** Pengelola sistem penuh (IT / pimpinan teknis).
- **Kebutuhan:** CRUD semua modul, kelola akun user & role, kelola master data Unit Kerja.
- **Frekuensi:** Harian.

#### 💼 Admin Teknisi Keuangan
- **Deskripsi:** Staf keuangan pengelola program kerja, pencairan, dan SPJ.
- **Kebutuhan:** CRUD penuh pada modul keuangan (program kerja, pencairan, SPJ). Tidak bisa kelola user atau surat.
- **Frekuensi:** Harian.

#### 📋 Admin
- **Deskripsi:** Staf administrasi umum.
- **Kebutuhan:** CRUD pada modul agenda kegiatan saja.
- **Frekuensi:** Beberapa kali per minggu.

#### 👔 Pimpinan
- **Deskripsi:** Kepala direktorat / sub-direktorat.
- **Kebutuhan:** Read-only semua modul internal. Dashboard ringkasan keuangan & agenda.
- **Frekuensi:** Beberapa kali per minggu.

#### 🌐 Publik (Tanpa Login)
- **Deskripsi:** Masyarakat umum / stakeholder eksternal.
- **Kebutuhan:** Melihat agenda kegiatan tanpa akun.
- **Frekuensi:** Insidental.

---

### 2.2 User Stories & Acceptance Criteria

#### Modul 1: Agenda Kegiatan

**Story:** Sebagai Admin, saya ingin menambah, mengubah, dan menghapus agenda kegiatan agar jadwal direktorat selalu up-to-date.

Acceptance Criteria:
- Form agenda memiliki field: judul, tanggal mulai, tanggal selesai, lokasi, penyelenggara (direktorat/sub-direktorat), deskripsi, status (`Akan Datang` / `Berlangsung` / `Selesai`).
- Agenda tampil di halaman publik tanpa login dalam tampilan kalender dan list view.
- Filter agenda publik berdasarkan bulan, status, dan penyelenggara.
- Perubahan tersimpan dalam audit log (siapa & kapan).

**Story:** Sebagai Publik, saya ingin melihat agenda kegiatan tanpa login.

Acceptance Criteria:
- Halaman agenda publik diakses langsung via URL tanpa autentikasi.
- Tampil responsif pada layar ≥ 360px.

---

#### Modul 2: Surat Masuk & Surat Keluar

**Story:** Sebagai Super Admin, saya ingin mencatat dan mengarsipkan surat masuk & keluar secara digital.

Acceptance Criteria:
- Form **surat masuk**: nomor surat, tanggal terima, asal surat, perihal, lampiran (opsional, PDF/gambar maks. 5 MB).
- Form **surat keluar**: nomor surat, tanggal kirim, tujuan surat, perihal, lampiran (opsional).
- Filter berdasarkan jenis (masuk/keluar), tanggal, dan kata kunci perihal.
- Hanya Super Admin yang CRUD; Pimpinan hanya lihat.

---

#### Modul 3: Program Kerja & Anggaran

**Story:** Sebagai Admin Teknisi Keuangan, saya ingin mencatat program kerja dan pagu anggarannya.

Acceptance Criteria:
- Form program kerja: nama program, unit/direktorat penanggung jawab, tahun anggaran, total pagu anggaran (Rp).
- Satu program kerja dapat memiliki banyak **Pencairan Dana** (terpisah per jenis/periode).
- Dashboard per program menampilkan: total pagu, total SPJ, dan sisa anggaran.

---

#### Modul 4: Pencairan Dana

**Story:** Sebagai Admin Teknisi Keuangan, saya ingin mencatat setiap pencairan dana per periode/jenis agar aliran kas tercatat rapi.

Acceptance Criteria:
- Setiap pencairan wajib diinput terlebih dahulu sebelum dapat diproses ke SPJ.
- Form pencairan: **nama/jenis pencairan** (contoh: TUPK Maret, TUP 1, TUPK April), program kerja (pilih dari daftar), tanggal, jumlah (Rp), keterangan, dokumen pendukung (opsional, maks. 5 MB).
- Satu program kerja dapat memiliki lebih dari satu pencairan dengan nama berbeda.
- Daftar pencairan tampil sebagai tab atau list yang dapat dipilih untuk diproses ke SPJ.
- Total pencairan terakumulasi otomatis per program kerja.

---

#### Modul 5: SPJ (Surat Pertanggungjawaban)

**Story:** Sebagai Admin Teknisi Keuangan, saya ingin mencatat SPJ per pencairan dana dengan struktur yang detail.

##### 5.1 Struktur Data SPJ

Setiap entri SPJ terdiri dari **2 level baris**:

**Baris Induk (Header Kegiatan):**

| Field | Tipe | Keterangan |
|-------|------|------------|
| No | Auto-increment | Nomor urut otomatis |
| No RBA | Input manual | Nomor RBA kegiatan |
| Uraian Kegiatan | Input manual (teks) | Nama/deskripsi kegiatan |
| Jumlah Dana | Input manual (Rp) | Total dana untuk kegiatan ini |
| Unit Kerja | Dropdown | Pilih dari master Unit Kerja |
| Penerima | Dropdown + manual | Pilih dari daftar atau ketik manual |

**Baris Detail (Rincian SPJ):**

| Field | Tipe | Keterangan |
|-------|------|------------|
| Nilai Anggaran | Input manual (Rp) | Rincian nilai anggaran per item |
| Nomor RKA | Input manual | Nomor RKA item |
| ID SPJ | Input manual (opsional) | Dapat dikosongkan |
| Nominal | Input manual (Rp) | Nominal SPJ yang telah dipertanggungjawabkan |
| Belum SPJ | **Otomatis** | = Nilai Anggaran − Nominal. Tampil jika > 0 |
| PPh 21 | Input manual (Rp) | Nominal pajak PPh 21 |
| PPh 23 | Input manual (Rp) | Nominal pajak PPh 23 |
| PPN | Input manual (Rp) | Nominal pajak PPN |
| Unit Kerja | Dropdown | Diwariskan dari baris induk, bisa diubah |
| Penerima | Dropdown + manual | Pilih atau ketik manual |

##### 5.2 Kalkulasi Otomatis

```
Belum SPJ        = Nilai Anggaran − Nominal
                   (tampil jika Nilai Anggaran > Nominal, warna kuning/oranye)
                   (tampil 0 / kosong jika sudah lunas)

Sisa Anggaran    = Jumlah Dana (baris induk) − SUM(Nominal semua detail)

Total per kolom  = SUM otomatis di baris TOTAL bawah tabel
```

##### 5.3 Rekap per Unit Kerja

Di bawah tabel SPJ ditampilkan **tabel rekap otomatis** per Unit Kerja:

| Unit | Panjar | Pengembalian | SPJ |
|------|--------|--------------|-----|
| Golf | Rp3.000.000 | Rp0 | Rp3.000.000 |
| KR | Rp425.000 | Rp0 | Rp425.000 |
| USC | Rp29.840.000 | Rp29.840.000 | Rp0 |
| **Total** | **Rp33.265.000** | **Rp29.840.000** | **Rp3.425.000** |

- **Panjar** = Total Jumlah Dana per Unit Kerja
- **Pengembalian** = SUM(`Belum SPJ`) pada baris yang sudah ditandai `status_kembali = true` per Unit Kerja
- **SPJ** = Total Nominal yang sudah di-SPJ-kan per Unit Kerja

##### 5.3b Fitur Pengembalian Dana

Ketika nilai `Belum SPJ > 0` (ada dana yang belum dipertanggungjawabkan), sistem menampilkan mekanisme pengembalian dana sebagai berikut:

**Tombol & Status:**

| Kondisi | Tampilan |
|---------|----------|
| `Belum SPJ > 0`, belum dikembalikan | Tombol **"Tandai Dikembalikan"** (warna oranye/kuning) |
| Sudah ditandai dikembalikan | Badge **"✓ Sudah Dikembalikan"** (warna hijau) + tombol undo |
| `Belum SPJ = 0` (lunas SPJ) | Tidak ada tombol, kolom tampil kosong / badge "✓ Lunas" |

**Level Pengembalian:**

Pengembalian dapat dilakukan di dua level secara independen:

- **Per Baris Detail** — menandai satu item rincian SPJ sebagai sudah dikembalikan
- **Per Baris Induk** — menandai seluruh kegiatan (semua detail di bawahnya) sebagai sudah dikembalikan sekaligus (bulk action)

Jika semua detail di bawah satu induk sudah dikembalikan, baris induk otomatis tampil berstatus hijau.

**Aturan Bisnis:**

- Tombol **"Tandai Dikembalikan"** hanya tampil jika `Belum SPJ > 0`.
- Setelah ditandai, status dapat di-undo oleh **Super Admin** atau **Admin Teknisi Keuangan** (tombol undo muncul di samping badge hijau).
- Setelah di-undo, status kembali ke kondisi sebelumnya (Belum SPJ > 0, tombol oranye muncul kembali).
- **Super Admin** dapat mereset status pengembalian kapan saja tanpa batasan.
- Setiap perubahan status pengembalian tercatat di **Audit Log** (siapa, kapan, level apa — induk/detail).

**Perubahan pada Tabel Rekap Unit Kerja:**

Kolom `Pengembalian` di rekap bawah tabel terupdate otomatis:
```
Pengembalian per Unit = SUM(Belum SPJ) WHERE status_kembali = true AND unit_kerja_id = X
```

**Skema tambahan di database:**

```sql
-- Tambahan kolom di spj_detail:
ALTER TABLE spj_detail ADD COLUMN status_kembali    BOOLEAN DEFAULT false;
ALTER TABLE spj_detail ADD COLUMN tanggal_kembali   TIMESTAMPTZ;
ALTER TABLE spj_detail ADD COLUMN dikembalikan_oleh UUID REFERENCES profiles(id);

-- View otomatis status induk (semua detail kembali = induk hijau):
-- Dihitung di query, tidak disimpan sebagai kolom tersendiri
-- spj_header.status_kembali = TRUE jika semua detail-nya status_kembali = TRUE
```

##### 5.4 Acceptance Criteria

- SPJ hanya dapat dibuat jika pencairan dana terkait sudah diinput terlebih dahulu.
- Satu pencairan dapat memiliki banyak baris SPJ (induk & detail).
- Baris induk dan detail dapat ditambah/diedit/dihapus secara inline di tabel.
- Kolom `Belum SPJ` otomatis tampil dengan highlight **oranye** jika nilainya > 0.
- Baris `TOTAL` di bawah tabel terupdate otomatis saat data berubah.
- Tabel rekap Unit Kerja tampil di bawah tabel SPJ dan terupdate otomatis.
- Dokumen pendukung SPJ dapat diupload (opsional, PDF/gambar maks. 5 MB).
- Tampilan tabel SPJ dapat di-scroll horizontal pada layar mobile.
- Tombol **"Tandai Dikembalikan"** tampil pada baris detail maupun baris induk jika `Belum SPJ > 0`.
- Setelah diklik, baris berubah menjadi badge hijau **"✓ Sudah Dikembalikan"** + tombol undo.
- Klik undo oleh Super Admin atau Admin Teknisi Keuangan mengembalikan status ke semula.
- Jika semua detail di bawah satu induk berstatus kembali, baris induk otomatis tampil hijau.
- Setiap aksi tandai/undo pengembalian tercatat di Audit Log.

---

#### Modul 6: Laporan Serapan Dana & Cetak PDF

**Story:** Sebagai Admin Teknisi Keuangan atau Super Admin, saya ingin mencetak laporan serapan dana dalam format PDF per bulan atau akhir tahun agar dapat dilaporkan secara resmi.

##### 6.1 Filter & Cakupan Laporan

Pengguna dapat memilih kombinasi filter sebelum mencetak:

| Filter | Opsi |
|--------|------|
| **Periode** | Bulanan (pilih bulan & tahun) atau Tahunan (pilih tahun) |
| **Acuan bulan** | Bulan pencairan dana (nama TUPK/TUP) **atau** bulan input/tanggal SPJ — keduanya dapat dipilih |
| **Program Kerja** | Semua program atau pilih program tertentu |
| **Unit Kerja** | Semua unit atau pilih unit tertentu |

##### 6.2 Isi Laporan PDF

Laporan terdiri dari beberapa bagian yang dicetak secara berurutan:

**Bagian 1 — Kop Resmi**

Kop laporan mengikuti format resmi instansi sesuai dokumen yang diupload, terdiri dari:

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo Unesa]   UNIVERSITAS NEGERI SURABAYA                 │
│                 DIREKTORAT UNESA SCIENCE CENTER             │
│                 Kampus Unesa 2                              │
│                 Jl. Kampus Unesa Lidah Wetan Surabaya 60213 │
│                 E. sportscenter@unesa.ac.id                 │
│                 www.usc.unesa.ac.id                         │
├─────────────────────────────────────────────────────────────┤
│         LAPORAN SERAPAN DANA [PERIODE]                      │
│         [Nama Program Kerja / Semua Program]                │
└─────────────────────────────────────────────────────────────┘
```

- Kop diambil dari gambar yang diupload Super Admin di Pengaturan → Tab Laporan (format PNG/JPG, disimpan di Supabase Storage)
- Jika kop belum diupload, sistem menampilkan teks identitas instansi sebagai fallback:
  - **UNIVERSITAS NEGERI SURABAYA**
  - **DIREKTORAT UNESA SCIENCE CENTER**
  - Kampus Unesa 2, Jl. Kampus Unesa Lidah Wetan Surabaya 60213
  - E. sportscenter@unesa.ac.id | www.usc.unesa.ac.id
- Garis pemisah tebal di bawah kop sebelum judul laporan

**Bagian 2 — Ringkasan Program Kerja**

| No | Program Kerja | Tahun | Pagu Anggaran | Total SPJ | Sisa Dana | % Serapan |
|----|---------------|-------|---------------|-----------|-----------|-----------|
| 1 | Nama Program | 2026 | Rp... | Rp... | Rp... | 85% |
| **Total** | | | **Rp...** | **Rp...** | **Rp...** | **-%** |

- `% Serapan = (Total SPJ / Pagu Anggaran) × 100`
- Baris total di bagian bawah tabel

**Bagian 3 — Rekap per Unit Kerja**

| No | Unit Kerja | Panjar | Pengembalian | SPJ | Belum SPJ |
|----|-----------|--------|--------------|-----|-----------|
| 1 | Golf | Rp... | Rp... | Rp... | Rp... |
| 2 | KR | Rp... | Rp... | Rp... | Rp... |
| 3 | USC | Rp... | Rp... | Rp... | Rp... |
| **Total** | | **Rp...** | **Rp...** | **Rp...** | **Rp...** |

**Bagian 4 — Kolom Tanda Tangan**

Format tanda tangan mengikuti format resmi instansi:

```
                              Surabaya, [Tanggal Cetak Otomatis]
                              Direktur
                              Direktorat Unesa Science Center



                              Dr. Mochamad Purnomo, S.Pd., M.Kes.
                              NIP. 198101222005011004
```

- Posisi tanda tangan: rata kanan bawah halaman
- Nama pejabat, jabatan, dan NIP dikonfigurasi Super Admin di Pengaturan → Tab Laporan
- **Nilai default yang sudah diisi** (sesuai dokumen resmi yang diupload):
  - Jabatan: `Direktur`
  - Unit: `Direktorat Unesa Science Center`
  - Nama: `Dr. Mochamad Purnomo, S.Pd., M.Kes.`
  - NIP: `198101222005011004`
  - Kota: `Surabaya`
- Tanggal otomatis diisi dari tanggal sistem saat tombol cetak diklik
- Semua nilai default dapat diubah kapan saja oleh Super Admin

##### 6.3 Teknis Cetak PDF

| Aspek | Ketentuan |
|-------|-----------|
| Library | `@react-pdf/renderer` (render di client) atau `puppeteer` (render di server) |
| Ukuran kertas | A4 Portrait |
| Orientasi | Portrait untuk ringkasan; Landscape jika kolom tabel > 6 |
| Kop | Gambar kop diambil dari Supabase Storage (diupload Super Admin) |
| Nama file output | `Laporan_Serapan_[PERIODE]_[TIMESTAMP].pdf` |
| Trigger | Tombol **"🖨 Cetak PDF"** di halaman Laporan, muncul setelah filter dipilih |
| Preview | Tampilkan preview laporan di modal/drawer sebelum dicetak |

##### 6.4 Konfigurasi Laporan (Pengaturan)

Super Admin dapat mengatur di halaman Pengaturan → Tab Laporan:

| Field | Default (dari dokumen resmi) | Tipe |
|-------|------------------------------|------|
| Upload kop surat | — (wajib diupload) | PNG/JPG, maks. 2 MB |
| Nama instansi (fallback) | Universitas Negeri Surabaya | Teks |
| Nama unit (fallback) | Direktorat Unesa Science Center | Teks |
| Alamat (fallback) | Jl. Kampus Unesa Lidah Wetan Surabaya 60213 | Teks |
| Email (fallback) | sportscenter@unesa.ac.id | Teks |
| Website (fallback) | www.usc.unesa.ac.id | Teks |
| Jabatan penanda tangan | Direktur | Teks |
| Unit penanda tangan | Direktorat Unesa Science Center | Teks |
| Nama pejabat | Dr. Mochamad Purnomo, S.Pd., M.Kes. | Teks |
| NIP | 198101222005011004 | Teks |
| Kota | Surabaya | Teks |

##### 6.5 Acceptance Criteria

- Tombol **"🖨 Cetak PDF"** hanya tampil untuk role Super Admin dan Admin Teknisi Keuangan.
- Filter periode (bulanan/tahunan) dan acuan bulan (pencairan/input SPJ) dapat dipilih sebelum cetak.
- Preview laporan tampil dalam modal sebelum PDF di-download.
- PDF memuat: kop resmi, ringkasan program kerja (dengan % serapan), rekap unit kerja, dan kolom tanda tangan.
- Kop diambil dari file yang diupload Super Admin; jika belum diupload, tampil placeholder teks instansi.
- Kolom tanda tangan memuat nama, jabatan, NIP sesuai konfigurasi Pengaturan, dan tanggal otomatis.
- Nama file PDF mengandung periode laporan dan timestamp.
- Laporan tahunan menggabungkan data semua bulan dalam tahun tersebut secara akumulatif.
- `% Serapan` dihitung otomatis dan tampil dengan warna: hijau ≥ 80%, kuning 50–79%, merah < 50%.

---

#### Master Data: Unit Kerja

**Story:** Sebagai Super Admin, saya ingin mengelola daftar Unit Kerja yang muncul di dropdown SPJ.

Acceptance Criteria:
- Super Admin dapat tambah, edit, nonaktifkan Unit Kerja dari halaman pengaturan.
- Unit Kerja yang dinonaktifkan tidak muncul di dropdown baru, tapi data lama tetap tersimpan.
- Contoh awal: Kolam Renang (KR), USC, Golf, dll.

---

### 2.3 Non-Goals (Tidak Dibangun di v1.0)

- Integrasi dengan sistem keuangan pemerintah eksternal (SIMDA, SIPD, dll.)
- Hitung otomatis persentase PPh / PPN dari nominal
- Fitur approval/workflow multi-level
- Notifikasi otomatis via email atau WhatsApp
- Aplikasi mobile native (Android/iOS)
- Ekspor laporan ke format XLSX (dijadwalkan v2.0)

---

## 3. Role-Based Access Control (RBAC)

### 3.1 Matriks Hak Akses

| Fitur / Modul | Super Admin | Admin Tek. Keuangan | Admin | Pimpinan | Publik |
|---|:---:|:---:|:---:|:---:|:---:|
| Agenda Kegiatan | ✅ CRUD | ✅ CRUD | ✅ CRUD | 👁 Lihat | 👁 Lihat |
| Surat Masuk & Keluar | ✅ CRUD | ❌ | ❌ | 👁 Lihat | ❌ |
| Program Kerja & Anggaran | ✅ CRUD | ✅ CRUD | ❌ | 👁 Lihat | ❌ |
| Pencairan Dana | ✅ CRUD | ✅ CRUD | ❌ | 👁 Lihat | ❌ |
| SPJ & Rekap Keuangan | ✅ CRUD | ✅ CRUD | ❌ | 👁 Lihat | ❌ |
| Cetak Laporan PDF Serapan Dana | ✅ | ✅ | ❌ | ❌ | ❌ |
| Konfigurasi Kop & Tanda Tangan | ✅ | ❌ | ❌ | ❌ | ❌ |
| Tandai / Undo Pengembalian Dana | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reset Status Pengembalian | ✅ | ❌ | ❌ | ❌ | ❌ |
| Master Unit Kerja | ✅ CRUD | ❌ | ❌ | ❌ | ❌ |
| Manajemen User & Role | ✅ CRUD | ❌ | ❌ | ❌ | ❌ |

> ✅ CRUD = Create, Read, Update, Delete &nbsp;|&nbsp; 👁 Lihat = Read-Only &nbsp;|&nbsp; ❌ = Tidak ada akses

### 3.2 Manajemen User

- Hanya **Super Admin** yang dapat membuat, mengedit, menonaktifkan, dan menghapus akun.
- Super Admin menetapkan role saat membuat akun — tidak ada self-registration.
- Setiap user: nama lengkap, email, password (hashed), role, status aktif/nonaktif.
- Password default ditetapkan Super Admin; user wajib ganti saat login pertama.

---

## 4. Technical Specifications

### 4.1 Technology Stack (Final)

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | Next.js 14+ (App Router, React Server Components) |
| **UI / Styling** | Tailwind CSS + shadcn/ui components |
| **Backend / API** | Next.js API Routes (Server Actions) |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (email + password) |
| **File Storage** | Supabase Storage (bucket per modul) |
| **ORM / Query** | Supabase JS Client (`@supabase/supabase-js`) |
| **Deployment** | Vercel (auto-deploy dari GitHub) |
| **Version Control** | GitHub (branch strategy: main / dev / feature/*) |
| **Tabel Interaktif** | TanStack Table v8 (sortable, filterable, scrollable) |
| **Cetak PDF** | `@react-pdf/renderer` (client-side) atau `puppeteer` (server-side, Vercel Edge) |

### 4.2 Skema Database (Supabase / PostgreSQL)

```sql
-- Master: Unit Kerja
CREATE TABLE unit_kerja (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama       TEXT NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Master: User (extend Supabase Auth)
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id),
  nama       TEXT NOT NULL,
  role       TEXT CHECK (role IN ('superadmin','admin_keuangan','admin','pimpinan')),
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Modul 1: Agenda
CREATE TABLE agenda (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul           TEXT NOT NULL,
  tanggal_mulai   DATE NOT NULL,
  tanggal_selesai DATE,
  lokasi          TEXT,
  penyelenggara   TEXT,
  deskripsi       TEXT,
  status          TEXT CHECK (status IN ('akan_datang','berlangsung','selesai')),
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Modul 2: Surat
CREATE TABLE surat (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jenis        TEXT CHECK (jenis IN ('masuk','keluar')),
  nomor_surat  TEXT NOT NULL,
  tanggal      DATE NOT NULL,
  asal_tujuan  TEXT NOT NULL,
  perihal      TEXT NOT NULL,
  file_url     TEXT,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Modul 3: Program Kerja
CREATE TABLE program_kerja (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_program   TEXT NOT NULL,
  unit           TEXT,
  tahun_anggaran INT NOT NULL,
  pagu_anggaran  NUMERIC(15,2) NOT NULL,
  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- Modul 4: Pencairan Dana
CREATE TABLE pencairan_dana (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_kerja_id UUID REFERENCES program_kerja(id) ON DELETE CASCADE,
  nama_pencairan   TEXT NOT NULL,   -- e.g. "TUPK Maret", "TUP 1"
  tanggal          DATE NOT NULL,
  jumlah           NUMERIC(15,2) NOT NULL,
  keterangan       TEXT,
  file_url         TEXT,
  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Modul 5: SPJ - Baris Induk
CREATE TABLE spj_header (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pencairan_id     UUID REFERENCES pencairan_dana(id) ON DELETE CASCADE,
  no_urut          INT,              -- nomor urut (1,2,3,...)
  no_rba           TEXT,
  uraian_kegiatan  TEXT NOT NULL,
  jumlah_dana      NUMERIC(15,2),
  unit_kerja_id    UUID REFERENCES unit_kerja(id),
  penerima         TEXT,             -- dropdown atau manual
  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Modul 5: SPJ - Baris Detail
CREATE TABLE spj_detail (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spj_header_id    UUID REFERENCES spj_header(id) ON DELETE CASCADE,
  nilai_anggaran   NUMERIC(15,2),   -- "Rincian Nilai Anggaran"
  nomor_rka        TEXT,
  id_spj           TEXT,            -- opsional, boleh kosong
  nominal          NUMERIC(15,2),   -- nominal SPJ yang sudah dipertanggungjawabkan
  -- belum_spj = nilai_anggaran - nominal (kalkulasi otomatis, tidak disimpan di DB)
  pph21            NUMERIC(15,2) DEFAULT 0,
  pph23            NUMERIC(15,2) DEFAULT 0,
  ppn              NUMERIC(15,2) DEFAULT 0,
  unit_kerja_id    UUID REFERENCES unit_kerja(id),
  penerima         TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Audit Log
CREATE TABLE audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id),
  aksi       TEXT,   -- 'CREATE' | 'UPDATE' | 'DELETE'
  modul      TEXT,   -- 'agenda' | 'surat' | 'spj' | etc.
  detail     JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.3 Kalkulasi Otomatis (Server-side)

```
-- Per baris detail SPJ:
belum_spj = nilai_anggaran - nominal
  → tampil dengan highlight jika belum_spj > 0
  → tampil kosong / 0 jika sudah lunas

-- Total kolom (baris TOTAL):
total_jumlah_dana  = SUM(spj_header.jumlah_dana)       per pencairan
total_nominal      = SUM(spj_detail.nominal)            per pencairan
total_belum_spj    = SUM(nilai_anggaran - nominal)      per pencairan
total_pph21        = SUM(spj_detail.pph21)              per pencairan
total_pph23        = SUM(spj_detail.pph23)              per pencairan
total_ppn          = SUM(spj_detail.ppn)                per pencairan

-- Rekap per Unit Kerja:
panjar       = SUM(spj_header.jumlah_dana)  WHERE unit_kerja_id = X
spj          = SUM(spj_detail.nominal)      WHERE unit_kerja_id = X
pengembalian = panjar - spj

-- Sisa anggaran program kerja:
sisa = program_kerja.pagu_anggaran - SUM(spj_detail.nominal semua pencairan)
```

### 4.4 Arsitektur Aplikasi

```
SIMDIR (Next.js 14 App Router)
│
├── /app
│   ├── (public)
│   │   └── /agenda              ← Halaman publik, tanpa auth
│   │
│   └── (dashboard)              ← Semua route butuh auth
│       ├── /dashboard           ← Ringkasan & KPI
│       ├── /agenda              ← Kelola agenda (Admin+)
│       ├── /surat               ← Surat masuk/keluar (SuperAdmin)
│       ├── /program-kerja       ← Program & anggaran (Keuangan+)
│       ├── /pencairan           ← Pencairan dana (Keuangan+)
│       │   └── /[id]/spj        ← Tabel SPJ per pencairan
│       ├── /laporan             ← Rekap, summary & cetak PDF (Keuangan+)
│       └── /pengaturan
│           ├── /users           ← Manajemen user (SuperAdmin)
│           ├── /unit-kerja      ← Master unit kerja (SuperAdmin)
│           └── /laporan         ← Konfigurasi kop & tanda tangan (SuperAdmin)
│
├── /components
│   ├── SpjTable                 ← TanStack Table, inline edit
│   ├── SpjRekapUnit             ← Tabel rekap otomatis per unit
│   └── ...
│
└── /lib
    ├── supabase/                ← Client & server Supabase instance
    └── middleware.ts            ← Auth & role guard
```

### 4.5 UI/UX Specifications

#### Tampilan Umum
- **Design system:** shadcn/ui + Tailwind CSS (clean, modern, profesional)
- **Color palette:** Biru navy sebagai warna primer, aksen hijau untuk status positif, merah untuk defisit/peringatan
- **Font:** Inter (system-font fallback)
- **Responsive:** Mobile-first. Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

#### Halaman Publik — Agenda
- Tampilan default: **Card grid** dengan badge status berwarna
- Toggle ke tampilan **kalender** (react-big-calendar atau FullCalendar)
- Filter: bulan, status, penyelenggara — tanpa reload halaman
- SEO-friendly (Server-Side Rendering via Next.js)

#### Dashboard Internal
- **Sidebar** navigasi per modul (collapsible di mobile → bottom nav)
- **Summary cards:** Total agenda bulan ini, total SPJ bulan ini, sisa anggaran per program
- **Breadcrumb** di setiap halaman

#### Tabel SPJ
- Horizontal scroll pada layar < 1024px
- Baris induk: background berbeda (abu-abu terang), font bold
- Baris detail: background putih, indented
- Kolom `Belum SPJ`: highlight **kuning/oranye** jika > 0, hijau/kosong jika lunas
- Baris `TOTAL`: sticky di bawah tabel, bold, background biru muda
- Inline edit: klik sel → langsung edit (tidak perlu buka modal)
- Tambah baris detail: tombol `+ Tambah Detail` di bawah setiap baris induk

#### Form & Validasi
- Validasi real-time (sisi klien) + konfirmasi dari server
- Dropdown Unit Kerja: searchable (combobox)
- Dropdown Penerima: combobox dengan opsi ketik manual jika tidak ada
- Upload file: drag-and-drop + klik, preview nama file setelah upload

### 4.6 Keamanan & Privasi

- Auth via **Supabase Auth** (JWT, session 8 jam)
- **Row Level Security (RLS)** Supabase aktif di semua tabel — akses data dikontrol di level database
- Middleware Next.js memvalidasi session & role sebelum render halaman dashboard
- Halaman publik tidak mengekspos data modul lain
- File upload: validasi tipe (PDF, JPG, PNG) & ukuran (maks. 5 MB) di server
- HTTPS enforced by Vercel
- Rate limiting login: maks. 5 percobaan gagal per 10 menit (Supabase Auth built-in)
- Password di-hash oleh Supabase Auth (bcrypt)

### 4.7 Deployment Pipeline

```
Developer → Push ke GitHub (branch feature/*)
         → Pull Request → Review → Merge ke dev
         → Vercel Preview Deployment (otomatis)
         → QA & Testing di preview URL
         → Merge ke main
         → Vercel Production Deployment (otomatis)
```

---

## 5. Risks & Roadmap

### 5.1 Phased Rollout

| Fase | Lingkup | Estimasi |
|------|---------|----------|
| **MVP (v1.0)** | Setup project (Next.js + Supabase + Vercel + GitHub), Auth & RBAC, Modul Agenda (publik + internal), Manajemen User, Master Unit Kerja | 4–6 minggu |
| **v1.1** | Modul Surat Masuk & Keluar, Modul Program Kerja & Anggaran, Modul Pencairan Dana | 3–4 minggu |
| **v1.2** | Modul SPJ lengkap (tabel 2-level, kalkulasi otomatis, rekap unit kerja), Modul Laporan & Cetak PDF (bulanan & tahunan), Konfigurasi kop & tanda tangan, Dashboard ringkasan Pimpinan, Audit Log | 5–6 minggu |
| **v2.0** *(Future)* | Ekspor laporan PDF/XLSX, grafik visualisasi anggaran, notifikasi email, integrasi sistem eksternal | TBD |

### 5.2 Technical Risks

| Risiko | Mitigasi |
|--------|----------|
| Tabel SPJ 2-level kompleks di inline edit | Gunakan TanStack Table v8 dengan state management lokal; simpan ke DB hanya saat user klik "Simpan" |
| Kalkulasi tidak konsisten jika ada concurrent write | Kalkulasi `belum_spj` tidak disimpan di DB — dihitung di query/client setiap render |
| Supabase RLS salah konfigurasi → data bocor | Buat test suite khusus RLS: uji setiap role termasuk akses publik sebelum deploy |
| File upload besar memperlambat sistem | Batasi 5 MB, compress gambar di client sebelum upload, gunakan Supabase Storage CDN |
| Tabel SPJ tidak terbaca di layar mobile | Horizontal scroll + column pinning untuk kolom No & Uraian Kegiatan |
| Vercel cold start lambat | Gunakan React Server Components & ISR untuk halaman yang tidak real-time |
| Status pengembalian tidak konsisten jika undo dilakukan bersamaan | Gunakan Supabase RLS + optimistic update dengan rollback jika server error |
| PDF gagal render jika data sangat besar (laporan tahunan) | Batasi query dengan pagination data; gunakan server-side render (puppeteer) untuk dataset > 500 baris |
| Kop surat tidak tampil di PDF jika file belum diupload | Tampilkan placeholder teks dan notifikasi peringatan di UI sebelum cetak |

### 5.3 Definition of Done (DoD)

- Semua Acceptance Criteria pada fase tersebut telah diverifikasi.
- Tidak ada bug Critical atau High severity yang terbuka.
- Kalkulasi SPJ diuji dengan ≥ 10 skenario data (termasuk kasus defisit & belum SPJ).
- Semua API endpoint diuji dengan role yang tidak berwenang → harus return 401/403.
- RLS Supabase diverifikasi: data user A tidak bisa diakses user B lintas role.
- Halaman publik agenda tampil baik di Chrome mobile (resolusi 360px).
- Tabel SPJ horizontal scroll berfungsi di layar ≤ 768px.
- Deployment ke Vercel Preview berhasil sebelum merge ke main.
- Fitur pengembalian diuji: tandai per detail, tandai per induk, undo, dan reset oleh Super Admin.
- Status baris induk otomatis hijau jika semua detail sudah dikembalikan (diuji dengan ≥ 3 skenario).
- Cetak PDF diuji: filter bulanan, filter tahunan, filter per unit kerja, dan kombinasi acuan bulan.
- PDF hasil cetak memuat kop, kedua tabel rekap, % serapan, dan kolom tanda tangan yang benar.
- Preview modal tampil sebelum PDF di-download.

---

## Appendix: Contoh Struktur Data SPJ

Berdasarkan contoh nyata (Rekap SPJ USC 2026):

```
Pencairan: TUPK Maret
└── Program Kerja: [nama program]

  Baris Induk #1
  ├── No RBA      : 14381
  ├── Uraian      : Pembelian barang alat dan mesin Kolam Renang
  ├── Jumlah Dana : Rp100.000
  └── Unit Kerja  : Kolam (KR)
      │
      └── Detail #1
          ├── Nilai Anggaran : Rp100.000
          ├── Nomor RKA      : 523123
          ├── ID SPJ         : 10456
          ├── Nominal        : Rp100.000
          ├── Belum SPJ      : Rp0  ← lunas
          ├── PPh 21         : -
          ├── PPh 23         : -
          ├── PPN            : -
          └── Penerima       : [nama]

  Baris Induk #3
  ├── No RBA      : 16507
  ├── Uraian      : Pembelian Alat Kebersihan (USC)
  ├── Jumlah Dana : Rp2.340.000
  └── Unit Kerja  : USC
      │
      └── Detail #1
          ├── Nilai Anggaran : Rp2.340.000
          ├── Nomor RKA      : 114111
          ├── ID SPJ         : 10456
          ├── Nominal        : Rp2.339.500
          ├── Belum SPJ      : Rp500  ← highlight oranye
          ├── PPh 23         : -
          ├── PPN            : Rp500
          └── Penerima       : [nama]

Rekap Unit Kerja:
┌──────┬──────────────┬──────────────┬──────────────┐
│ Unit │ Panjar       │ Pengembalian │ SPJ          │
├──────┼──────────────┼──────────────┼──────────────┤
│ Golf │ Rp3.000.000  │ Rp0          │ Rp3.000.000  │
│ KR   │ Rp425.000    │ Rp0          │ Rp425.000    │
│ USC  │ Rp29.840.000 │ Rp29.840.000 │ Rp0          │
│ TOTAL│ Rp33.265.000 │ Rp29.840.000 │ Rp3.425.000  │
└──────┴──────────────┴──────────────┴──────────────┘
```

---

*— Akhir Dokumen PRD SIMDIR v1.1 —*

*Dokumen ini bersifat living document dan akan diperbarui sesuai perkembangan proyek.*
*Tech Stack Final: Next.js 14 · Supabase · Vercel · GitHub*

---

# Addendum v1.3 - Revisi Berdasarkan Diskusi Implementasi

Addendum ini merangkum perubahan kebutuhan sistem yang muncul setelah pembuatan prototype SIMDIR. Bagian ini menjadi pembaruan terhadap PRD v1.2 dan harus diprioritaskan pada desain data, UI, dan alur kerja modul Program Kerja, Pencairan Dana, SPJ, dan Rekap.

## A. Perubahan Modul Program Kerja

Program Kerja tidak lagi diposisikan sebagai tabel anggaran besar yang memuat detail belanja secara langsung. Program Kerja berfungsi sebagai pencatatan singkat RKA/program, mirip format RKA resmi.

Field minimal Program Kerja:

| Field | Tipe | Keterangan |
|---|---|---|
| ID RKA | Teks / angka | Contoh: `14406` |
| Tahun Anggaran | Angka | Contoh: `2026` |
| Unit Kerja | Dropdown | Mengambil data dari master Unit Kerja |
| Nama Program / Detail Aktivitas | Teks | Contoh: `Pembelian barang operasional golf` |
| Pelaksanaan | Pilihan | Tanggal spesifik atau rentang bulan |

Field tambahan untuk menyesuaikan tampilan RKA:

| Field | Contoh |
|---|---|
| Kode Program | `P005` |
| Nama Program Utama | `Peningkatan tata kelola unit kerja di lingkungan Universitas Negeri Surabaya` |
| Kode Kegiatan | `P005.201` |
| Nama Kegiatan | `Monitoring dan Evaluasi Nilai Kinerja Anggaran` |
| Kode Rincian Output | `P005.201.012` |
| Nama Rincian Output | `Layanan Perkantoran` |
| Kode Komponen Input | `P005.201.012.001` |
| Nama Komponen Input | `Operasional Perkantoran dan Layanan` |
| Kode Detail Aktivitas | `2026.2D.P005.201.012.001.010` |

Pelaksanaan Program Kerja harus mendukung dua mode input:

| Mode | Field |
|---|---|
| Tanggal spesifik | Satu tanggal pelaksanaan |
| Rentang bulan | Bulan mulai dan bulan selesai, contoh `Januari - Desember` |

Tampilan Program Kerja:

- Setiap Program Kerja tampil sebagai panel/card.
- Setiap panel memiliki collapse/expand untuk membuka detail RKA.
- Header panel menampilkan ringkasan: ID RKA, nama program, unit kerja, tahun anggaran, dan pelaksanaan.
- Detail RKA tampil di dalam area collapse.
- Tombol aksi menggunakan ikon, bukan teks panjang.
- Setiap ikon wajib memiliki tooltip/label aksesibilitas.

## B. Master Data Unit Kerja

Master Unit Kerja harus tersedia sebagai dropdown, bukan input teks bebas.

Pilihan awal Unit Kerja:

1. USC
2. PUI Keolahragaan
3. PUI Disabilitas
4. PUI Seni Budaya
5. Kolam Renang
6. Driving Golf
7. ULABK
8. SSFC

Aturan:

- Unit Kerja dipakai pada form Program Kerja dan modul terkait.
- Super Admin tetap dapat mengelola master Unit Kerja.
- Unit Kerja nonaktif tidak muncul pada input baru, namun data lama tetap tersimpan.

## C. Rincian Anggaran / Detail Item

Rincian akun dan item anggaran tidak ditampilkan sebagai isi utama Program Kerja. Rincian ini menjadi sumber kegiatan yang dapat dipilih ketika membuat Pencairan Dana.

Struktur rincian anggaran:

| Level | Contoh | Keterangan |
|---|---|---|
| Kelompok akun | `114111 - Barang Konsumsi` | Kelompok belanja |
| Item anggaran | `golf`, `Lampu`, `Tiket Dosen/Karyawan` | Detail kegiatan/barang |

Field item anggaran:

| Field | Tipe | Keterangan |
|---|---|---|
| Uraian item | Teks | Nama barang/kegiatan |
| Volume | Angka | Jumlah |
| Satuan | Teks | Contoh: `buah`, `rim`, `paket` |
| Harga satuan | Rupiah | Harga per satuan |
| Total | Otomatis | `volume x harga satuan` |

## D. Perubahan Modul Pencairan Dana

Pencairan Dana harus berbentuk batch. Satu pencairan dapat memuat beberapa kegiatan/item dari detail Program Kerja.

Alur data:

```text
Program Kerja -> Rincian Akun / Item Anggaran -> Batch Pencairan -> Kegiatan Pencairan -> SPJ
```

Header Pencairan:

| Field | Tipe | Keterangan |
|---|---|---|
| Nama pencairan | Teks | Contoh: `TUPK Maret`, `TUP 1` |
| Program Kerja | Dropdown | Mengambil dari Program Kerja |
| Tanggal | Tanggal | Tanggal pencairan |
| Keterangan | Teks | Opsional |

Kegiatan Pencairan:

| Field | Tipe | Keterangan |
|---|---|---|
| Item Program Kerja | Dropdown | Mengambil dari rincian/item anggaran |
| Jumlah dicairkan | Rupiah | Nilai yang dicairkan untuk item tersebut |
| Keterangan | Teks | Opsional |

Kalkulasi:

```text
Total Pencairan = SUM(jumlah dicairkan semua kegiatan dalam satu batch)
```

Tampilan Pencairan Dana:

- Pencairan Dana tampil sebagai panel/card collapse per batch.
- Header panel menampilkan nama pencairan, program, tanggal, total dana, dan jumlah kegiatan.
- Detail kegiatan tampil di dalam area collapse.
- Tombol aksi menggunakan ikon.
- Tampilan harus responsif di mobile.

## E. Perubahan Modul SPJ & Rekap

Modul SPJ tetap memakai struktur dua level: baris induk dan baris detail. Namun tampilan perlu ditingkatkan:

- Tambahkan summary cards di bagian atas: Jumlah Dana, Nilai Anggaran Detail, Total SPJ, dan Belum SPJ.
- Tabel SPJ tetap scroll horizontal di layar kecil.
- Header tabel dibuat sticky bila memungkinkan.
- Tombol aksi menggunakan ikon.
- Status `Belum SPJ`, `Lunas`, dan `Sudah Dikembalikan` tetap memakai badge warna.

Rekap Unit Kerja harus tampil dalam dua bentuk:

1. Kartu rekap responsif untuk pemindaian cepat.
2. Tabel rekap untuk pembacaan rinci dan kebutuhan laporan.

Kolom rekap tetap:

| Kolom | Keterangan |
|---|---|
| Unit Kerja | Nama unit |
| Panjar | Total jumlah dana per unit |
| Pengembalian | SUM(Belum SPJ) yang sudah ditandai dikembalikan |
| SPJ | Total nominal yang sudah di-SPJ-kan |
| Belum SPJ | Total nilai belum dipertanggungjawabkan |

## F. Perubahan UI/UX Umum

UI diarahkan mengikuti gaya Tailwind CSS + shadcn/ui:

- Layout berbasis card dan panel.
- Radius 8px.
- Border halus.
- Shadow ringan.
- Warna netral profesional.
- Badge untuk status.
- Tombol ikon untuk aksi berulang.
- Focus ring untuk aksesibilitas.

Ketentuan responsif:

- Sidebar tetap nyaman di desktop dan berubah menjadi layout vertikal di mobile.
- Filter dan dropdown menjadi full-width di layar kecil.
- Panel collapse digunakan untuk mengurangi kepadatan informasi.
- Tabel besar tetap memakai horizontal scroll.
- Kartu ringkasan turun menjadi satu kolom pada layar mobile.

Tombol aksi:

| Aksi | Ikon |
|---|---|
| Tambah | Plus |
| Edit | Edit/pencil |
| Hapus | Trash/delete |
| Expand/collapse | Chevron |
| Tandai pengembalian | Return/check |
| Undo | Undo |

## G. Dampak ke Skema Database

Tambahan struktur yang disarankan:

```sql
-- Program Kerja sebagai catatan RKA singkat
ALTER TABLE program_kerja ADD COLUMN id_rka TEXT;
ALTER TABLE program_kerja ADD COLUMN pelaksanaan_tipe TEXT CHECK (pelaksanaan_tipe IN ('tanggal','bulan')) DEFAULT 'bulan';
ALTER TABLE program_kerja ADD COLUMN tanggal_pelaksanaan DATE;
ALTER TABLE program_kerja ADD COLUMN bulan_mulai TEXT;
ALTER TABLE program_kerja ADD COLUMN bulan_selesai TEXT;
ALTER TABLE program_kerja ADD COLUMN kode_program TEXT;
ALTER TABLE program_kerja ADD COLUMN nama_program_utama TEXT;
ALTER TABLE program_kerja ADD COLUMN kode_kegiatan TEXT;
ALTER TABLE program_kerja ADD COLUMN nama_kegiatan TEXT;
ALTER TABLE program_kerja ADD COLUMN kode_rincian_output TEXT;
ALTER TABLE program_kerja ADD COLUMN nama_rincian_output TEXT;
ALTER TABLE program_kerja ADD COLUMN kode_komponen_input TEXT;
ALTER TABLE program_kerja ADD COLUMN nama_komponen_input TEXT;
ALTER TABLE program_kerja ADD COLUMN kode_detail_aktivitas TEXT;

-- Kelompok akun/rincian anggaran
CREATE TABLE rincian_anggaran_group (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_kerja_id UUID REFERENCES program_kerja(id) ON DELETE CASCADE,
  kode_akun TEXT NOT NULL,
  nama_group TEXT NOT NULL,
  unit_kerja_id UUID REFERENCES unit_kerja(id),
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Item anggaran
CREATE TABLE rincian_anggaran_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES rincian_anggaran_group(id) ON DELETE CASCADE,
  uraian TEXT NOT NULL,
  volume NUMERIC(15,2) DEFAULT 0,
  satuan TEXT,
  harga_satuan NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Header pencairan tetap ada, tapi jumlah total dihitung dari item
ALTER TABLE pencairan_dana DROP COLUMN IF EXISTS jumlah;

-- Detail kegiatan pencairan
CREATE TABLE pencairan_dana_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pencairan_id UUID REFERENCES pencairan_dana(id) ON DELETE CASCADE,
  rincian_anggaran_item_id UUID REFERENCES rincian_anggaran_item(id),
  jumlah NUMERIC(15,2) NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## H. Acceptance Criteria Tambahan

- Program Kerja dapat dibuat dengan field ID RKA, tahun anggaran, unit kerja, nama program, dan pelaksanaan.
- Unit Kerja pada Program Kerja wajib dropdown dari master Unit Kerja.
- Pelaksanaan dapat berupa tanggal spesifik atau rentang bulan.
- Pencairan Dana dapat memuat lebih dari satu kegiatan dalam satu batch.
- Total Pencairan dihitung otomatis dari seluruh kegiatan dalam batch.
- Tampilan Program Kerja dan Pencairan Dana menggunakan collapse panel.
- Tombol aksi pada Program Kerja, Pencairan Dana, dan SPJ menggunakan ikon.
- SPJ menampilkan summary cards dan tabel tetap dapat discroll pada mobile.
- Rekap Unit Kerja tampil sebagai kartu responsif dan tabel.
- UI responsive minimal baik pada lebar layar 360px.

### E.3 Auto-Load SPJ dari Pencairan Dana

Pada halaman SPJ & Rekap, ketika pengguna memilih data Pencairan Dana, sistem harus langsung menampilkan daftar kegiatan dari pencairan tersebut sebagai draft baris SPJ.

Aturan:

- Jika pencairan yang dipilih belum memiliki baris SPJ, sistem otomatis membuat draft baris induk dan detail dari setiap kegiatan pencairan.
- `Jumlah Dana` dan `Nilai Anggaran` mengikuti nilai `jumlah dicairkan` pada kegiatan pencairan.
- `Nominal` SPJ awal bernilai 0 dan dapat diisi/edit oleh Admin Teknisi Keuangan sesuai nilai yang sudah dipertanggungjawabkan.
- Nomor RKA awal dapat diambil dari kode akun/rincian anggaran terkait.
- Draft otomatis tidak boleh menggandakan baris jika SPJ untuk pencairan tersebut sudah ada.
- Setelah draft muncul, teknisi keuangan tinggal mengisi ID SPJ, nominal, pajak, penerima, dan status pengembalian bila diperlukan.
