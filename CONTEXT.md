# SIMDIR — Context Dokumen untuk AI

> Dokumen ini dibuat untuk memberikan konteks kepada AI yang akan melanjutkan pengerjaan project ini.
> Update terakhir: 2026-05-20

---

## Gambaran Umum Project

**SIMDIR** (Sistem Informasi Direktorat) adalah aplikasi manajemen internal untuk **Unesa Science Center (USC)**.

- **Framework:** Next.js (App Router, `app/` directory)
- **Database:** Supabase (PostgreSQL + Auth)
- **Deployment:** Vercel
- **Auth:** Custom JWT + Supabase Auth
- **Styling:** Inline styles (tidak pakai Tailwind/CSS modules)

---

## Struktur Halaman

```
app/
├── page.jsx                          → Redirect ke login atau dashboard
├── login/page.jsx                    → Halaman login
├── (public)/                         → Halaman tanpa auth
│   ├── layout.jsx                    → Layout publik (pass-through)
│   ├── agenda/page.jsx               → Tampilan agenda publik (web biasa)
│   └── agenda/tv/page.jsx            → ⭐ Tampilan agenda untuk TV (lihat bawah)
└── (dashboard)/                      → Halaman butuh login
    ├── layout.jsx                    → Layout dashboard + sidebar
    ├── dashboard/page.jsx            → Ringkasan statistik
    ├── kelola-agenda/page.jsx        → CRUD agenda
    ├── program-kerja/page.jsx        → CRUD program kerja
    ├── pencairan/page.jsx            → Pencairan anggaran
    ├── pencairan/[id]/spj/page.jsx   → Detail SPJ
    ├── laporan/page.jsx              → Laporan
    ├── surat/page.jsx                → Manajemen surat
    ├── e-invoice/                    → ⭐ Sistem invoice digital
    │   ├── page.jsx                  → List invoice
    │   ├── create/page.jsx           → Buat invoice baru
    │   ├── customers/page.jsx        → Data pelanggan
    │   └── [id]/
    │       ├── page.jsx              → Detail invoice
    │       ├── edit/page.jsx         → Edit invoice
    │       └── print/page.jsx        → Cetak invoice
    └── pengaturan/
        ├── unit-kerja/page.jsx       → Pengaturan unit kerja
        └── users/page.jsx            → Manajemen users

lib/
├── supabase/client.js                → Supabase client (browser) + mock fallback
├── supabase/server.js                → Supabase client (server/SSR) + mock fallback
└── supabase/mock-client.js           → Mock client untuk dev lokal (12 agenda dummy)

supabase/
└── migrations/
    ├── 20260520000000_create_e_invoice_tables.sql  → Migration tabel e-invoice
    └── 20260520000001_fix_invoice_triggers.sql     → Fix trigger auto-calculate
```

---

## ⭐ Fitur TV Display (`/agenda/tv`)

### Tujuan
Menampilkan agenda kegiatan USC di layar TV yang dipasang di lobby/ruang tunggu. Berjalan otomatis tanpa interaksi pengguna.

### Desain
- **Dark theme** (background `#0f172a`, card `#1e293b`)
- **Layout: split screen** — Agenda tabel (kiri ~63%) + YouTube Video (kanan ~37%)
- **Layout tabel:** div-based grid (bukan `<table>`) agar baris bisa `flex: 1`
- **Kolom tabel (6 kolom):** No | Tanggal | Judul Kegiatan | Lokasi | PIC/Disposisi | Status
- **Font:** proporsional ke lebar layar via `scale = window.innerWidth / 1920`
- **YouTube Video:** Auto-play, mute, loop (konfigurasi via `YOUTUBE_VIDEO_URL`)

### Carousel Otomatis
- Auto-rotate setiap **15 detik**
- Progress bar berjalan + countdown "Ganti dalam Xs"
- Dot navigation untuk pindah halaman manual
- Running text (marquee) di bagian bawah: agenda berlangsung + akan datang
- Carousel berjalan terus tanpa pause saat hover

### Responsive Scaling (kritis untuk 4K TV)
```js
// Hook useScreenScale — di app/agenda/tv/page.jsx
const scale = Math.max(0.8, Math.min(2.0, window.innerWidth / 1920))
// Semua fontSize, padding, border-radius dikalikan scale
// Contoh: fontSize: `${1.1 * s}rem`
```

### Jumlah Baris per Halaman (rowsPerPage)
Dihitung **otomatis** dari tinggi container nyata via `ResizeObserver` — bukan dari kalkulasi manual window size (yang tidak akurat lintas resolusi TV).
```js
// tbody div diobservasi, baris dihitung dari tinggi tersedia / min row height
const minRowH = Math.max(70, 85 * scale)
const rows = Math.max(4, Math.min(14, Math.floor(height / minRowH)))
```

### Layout Teknis
Menggunakan **div-based grid** (bukan `<table>`) agar baris bisa `flex: 1` dan mengisi penuh tinggi tersedia:
```
div.wrapper (flex col, flex:1)
  div.thead  (grid, shrink:0)       ← header kolom
  div.tbody  (ref, flex col, flex:1) ← auto-fill height
    div.row  (grid, flex:1)         ← setiap baris mengisi sama rata
    div.row  (grid, flex:1)
    div.empty-row (grid, flex:1)    ← baris kosong jika data < rowsPerPage
```

### Status Agenda
| Status | Warna | Kondisi |
|--------|-------|---------|
| `ongoing` | Hijau (#10b981) | Tanggal hari ini dalam rentang mulai–selesai |
| `upcoming_soon` | Kuning (#f59e0b) | Mulai ≤ 3 hari lagi |
| `upcoming` | Indigo (#6366f1) | Mulai > 3 hari lagi |
| `completed` | Abu (#64748b) | Sudah lewat (disaring, tidak ditampilkan di TV) |

### Format Data Penting
- Waktu dari DB bisa format `"HH:MM:SS"` → di-strip ke `"HH:MM"` via `formatTime(t) = t.slice(0, 5)`
- PIC: jika `jenis === 'pimpinan'` dan ada `disposisi`, tampilkan `"→ {disposisi}"` (bukan PIC)
- `pic` dari DB bisa berprefix `"Manual: "` → di-strip sebelum ditampilkan

---

## Struktur Database (Supabase)

### Tabel `agenda`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid/int | Primary key |
| `judul` | text | Judul kegiatan |
| `tanggal_mulai` | date | `YYYY-MM-DD` |
| `tanggal_selesai` | date | `YYYY-MM-DD` |
| `waktu_mulai` | time | `HH:MM:SS` (strip detik saat display) |
| `waktu_selesai` | time | `HH:MM:SS` |
| `lokasi` | text | Lokasi kegiatan |
| `jenis` | text | `internal` / `eksternal` / `pimpinan` |
| `penyelenggara` | text | Nama penyelenggara |
| `pic` | text | Bisa berprefix `"Manual: "` |
| `disposisi` | text | Diisi jika jenis=pimpinan |
| `deskripsi` | text | Deskripsi singkat |

### Tabel lain yang ada
- `program_kerja` — program kerja dengan pagu anggaran
- `pencairan` — pencairan anggaran (many-to-many dengan program_kerja)
- `surat` — manajemen surat masuk/keluar
- `pengaturan` — konfigurasi sistem (nama instansi, dll.)
- `users` — user management (selain Supabase Auth)

---

## Local Development

### Masalah
Project tidak bisa run lokal karena Supabase credentials hanya ada di Vercel environment.

### Solusi yang sudah diimplementasikan
File `.env.local` dengan placeholder → mock client aktif otomatis:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Logic di `lib/supabase/mock-client.js`:
```js
export const shouldUseMock = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !url || url === '' || url.includes('your-project') || url.includes('placeholder')
}
```

Mock data berisi **12 agenda dummy** (cukup untuk test carousel 2 halaman di TV).

### Untuk data asli
```bash
# Opsi A — Vercel CLI
npm i -g vercel && vercel link && vercel env pull .env.local

# Opsi B — Manual dari Supabase Dashboard → Project Settings → API
# Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local
```

### Menjalankan lokal
```bash
npm run dev
# Buka: http://localhost:3000/agenda/tv  ← TV display
# Buka: http://localhost:3000            ← Redirect ke login
```

Jika ada error `404 _next/static/...`:
```bash
# Hapus cache build dan restart
Remove-Item -Recurse -Force .next
npm run dev
```

---

## Hal yang Perlu Diperhatikan

1. **Semua styling menggunakan inline styles** — tidak ada Tailwind/CSS module. Jangan tambahkan className tanpa ada CSS yang mendefinisikannya.

2. **Supabase client ada dua:**
   - `lib/supabase/client.js` → untuk komponen client (`'use client'`)
   - `lib/supabase/server.js` → untuk server components / API routes

3. **Mock client otomatis aktif** jika `NEXT_PUBLIC_SUPABASE_URL` berisi `"your-project"` atau tidak ada. Tidak perlu ubah kode untuk switch antara mock dan production.

4. **TV page berjalan di `/agenda/tv`** tanpa auth — halaman publik. Jangan tambahkan auth guard di halaman ini.

5. **Scale pada TV page** — semua nilai visual (fontSize, padding, dll.) harus dikalikan variabel `s` (scale). Jangan hardcode ukuran pixel/rem tanpa `s`.

6. **`rowsPerPage` dihitung otomatis** via ResizeObserver — jangan hardcode angka baris. Jika perlu tuning, ubah nilai `minRowH` di hook.

---

## ⭐ Fitur E-Invoice (`/e-invoice`)

### Tujuan
Sistem pembuatan invoice digital dengan nomor otomatis, stempel status, dan kemampuan cetak.

### Struktur Halaman E-Invoice
```
app/(dashboard)/e-invoice/
├── page.jsx                  → List invoice dengan filter & stats
├── create/page.jsx           → Form buat invoice baru
├── [id]/page.jsx             → Detail invoice
├── [id]/edit/page.jsx        → Form edit invoice
├── [id]/print/page.jsx       → Preview & print invoice
└── customers/page.jsx        → Manajemen data pelanggan
```

### Fitur Utama
1. **Nomor Invoice Otomatis**: Format `INV/YYYY/MM/SEQUENCE` (contoh: `INV/2026/05/0001`)
2. **Stempel Digital Otomatis**: Sesuai status invoice
3. **Multi Item**: Support banyak item per invoice dengan qty, satuan, diskon
4. **PPN Otomatis**: Perhitungan PPN 11% (dapat diubah)
5. **Print Optimized**: Template khusus untuk cetak ke PDF/kertas A4

### Stempel/Status Invoice
| Status | Label Stempel | Warna | Kondisi |
|--------|--------------|-------|---------|
| `lunas` | LUNAS | Hijau (#059669) | Invoice sudah dibayar |
| `segera` | SEGERA | Kuning (#f59e0b) | Jatuh tempo ≤ 3 hari |
| `jatuh_tempo` | JATUH TEMPO | Merah (#dc2626) | Lewat tanggal jatuh tempo |
| `dikirim` | DIKIRIM | Biru (#3b82f6) | Invoice sudah dikirim |
| `disetujui` | DISETUJUI | Ungu (#8b5cf6) | Invoice disetujui |
| `dibuat` | - | Abu (#64748b) | Status default |

### Struktur Database E-Invoice

#### Tabel `customers`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid | Primary key |
| `kode_pelanggan` | varchar(20) | Unique, auto-generate |
| `nama_pelanggan` | varchar(255) | Nama pelanggan |
| `email` | varchar(255) | Email pelanggan |
| `telepon` | varchar(50) | Nomor telepon |
| `alamat` | text | Alamat lengkap |
| `npwp` | varchar(50) | NPWP (opsional) |
| `jenis_pelanggan` | varchar(50) | perorangan/perusahaan/instansi |

#### Tabel `invoices`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid | Primary key |
| `nomor_invoice` | varchar(50) | Auto-generate: INV/YYYY/MM/XXXX |
| `customer_id` | uuid | FK ke customers |
| `tanggal_invoice` | date | Tanggal pembuatan |
| `tanggal_jatuh_tempo` | date | Tanggal jatuh tempo |
| `status` | varchar(50) | Status invoice |
| `subtotal` | decimal(15,2) | Total sebelum PPN |
| `ppn_persen` | decimal(5,2) | Persentase PPN (default 11) |
| `ppn_nilai` | decimal(15,2) | Nilai PPN |
| `total` | decimal(15,2) | Total akhir |
| `catatan` | text | Catatan tambahan |
| `terms_conditions` | text | Syarat & ketentuan |

#### Tabel `invoice_items`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid | Primary key |
| `invoice_id` | uuid | FK ke invoices |
| `deskripsi` | text | Nama item/jasa |
| `quantity` | decimal(10,2) | Jumlah |
| `satuan` | varchar(50) | Unit (pcs, jam, dll) |
| `harga_satuan` | decimal(15,2) | Harga per unit |
| `diskon_persen` | decimal(5,2) | Diskon % |
| `total` | decimal(15,2) | Total per item |
| `urutan` | integer | Urutan tampilan |

### View `invoice_summary`
View untuk memudahkan query invoice dengan data pelanggan dan total pembayaran.

### Fungsi Database
- `generate_invoice_number()`: Trigger auto-generate nomor invoice
- `calculate_invoice_totals()`: Trigger auto-hitung subtotal, PPN, total
- `update_invoice_overdue_status()`: Fungsi update status jatuh tempo

### Hak Akses
- **Super Admin**: Full access (CRUD invoice & customers, update status)
- **Role lain**: Hanya dapat melihat invoice (readonly)

### Cara Menggunakan
1. **Buat Invoice** di `/e-invoice/create`
2. **Pilih Mode Pelanggan**:
   - **Pilih Pelanggan**: Ambil dari data pelanggan yang sudah ada
   - **+ Pelanggan Baru**: Input data pelanggan baru langsung di form invoice
3. **Isi Item Invoice**: Tambahkan item dengan deskripsi, qty, harga, dan diskon
4. **Atur Tanggal**: Tanggal invoice dan tanggal jatuh tempo
5. **Simpan Invoice** → nomor invoice otomatis ter-generate (format: INV/YYYY/MM/XXXX)
6. **Cetak Invoice** di `/e-invoice/[id]/print` → Save as PDF
7. **Update Status** sesuai kondisi pembayaran (Lunas, Dikirim, dll)

### Fitur Input Pelanggan Langsung
Saat membuat invoice baru, pengguna dapat memilih:
- **Pilih Pelanggan**: Menggunakan dropdown untuk memilih pelanggan yang sudah terdaftar
- **Pelanggan Baru**: Mengisi form data pelanggan baru langsung di halaman create invoice tanpa harus ke halaman customers dulu

Data yang bisa diinput untuk pelanggan baru:
- Kode Pelanggan (auto-generate oleh sistem, tidak dapat diubah)
- Nama Pelanggan (wajib)
- Email
- Telepon
- Jenis Pelanggan (perorangan/perusahaan/instansi)
- NPWP
- Alamat

### Fitur Pajak (Tax)
Sistem mendukung 2 mode perhitungan pajak:
- **Persen (%)**: Input persentase pajak, nominal dihitung otomatis dari subtotal
- **Nominal**: Input nominal pajak langsung (fixed amount)

Fitur tambahan:
- Checkbox untuk aktif/nonaktifkan pajak
- Diskon nominal dengan checkbox
- Biaya pengiriman nominal dengan checkbox
- Section stempel dengan checkbox multiple (Lunas, Segera, Jatuh Tempo, Final, Dikirim, Disetujui)

---

## Status Saat Ini (2026-05-20)

- [x] TV display page selesai dan berjalan di TV 4K
- [x] Carousel otomatis 15 detik
- [x] Responsive scaling untuk berbagai resolusi TV
- [x] Mock client untuk local development
- [x] `.env.local` template tersedia
- [x] Split screen dengan YouTube video (kanan)
- [x] Auto-refresh data agenda setiap 5 menit
- [x] Layout 6 kolom (tanpa Waktu dan Jenis)
- [x] **E-Invoice system dengan nomor otomatis & stempel**
- [x] **Manajemen pelanggan untuk e-invoice**
- [x] **Input pelanggan langsung saat membuat invoice**
- [x] **Print template optimized untuk A4**
- [ ] Belum ada notifikasi real-time subscription (Supabase realtime)
