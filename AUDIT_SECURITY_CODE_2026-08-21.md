# Audit Keamanan & Kualitas Kode — Sistem SIMDIR
**Tanggal:** 2026-08-21
**Reviewer:** Claude (AI — 4-agent parallel review: keamanan auth/middleware, keamanan API routes, kualitas kode dashboard, kualitas kode halaman publik/lib)
**Scope:** Seluruh sistem — `middleware.js`, lapisan auth/session (`lib/auth*.js`, `lib/session.js`, `lib/local-users.js`), seluruh `app/api/**` (29 route), seluruh halaman `(dashboard)` dan `(public)`, `lib/`, `context/`, `components/`.
**Status:** Read-only. Tidak ada file yang diubah. Menunggu keputusan sebelum perbaikan dimulai.

---

## TL;DR

Ditemukan **1 celah keamanan Critical** dan **1 celah keamanan High** yang sama-sama menembus lapisan otorisasi, plus **2 bug Critical** di data finansial/tampilan produksi:

1. **[SEC-C1] Fallback secret sesi bisa diturunkan dari nilai publik** — kalau env var `SESSION_SECRET` tidak ter-set di Vercel (production), kunci penandatanganan cookie sesi jatuh ke `SHA256(NEXT_PUBLIC_SUPABASE_ANON_KEY + '|simdir-session')` — dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` ada di bundle JS yang dikirim ke browser. Kalau ini terjadi di production, siapa pun bisa memalsukan cookie sesi `super_admin` dan bypass total autentikasi. **`SESSION_SECRET` sudah ter-set di `.env.local`** — tapi itu file lokal; status di Vercel (production) perlu diverifikasi manual karena saya tidak punya akses ke dashboard Vercel.
2. **[SEC-H1] Tiga endpoint API tanpa pengecekan role sama sekali** — `/api/kritik-saran`, `/api/saran`, `/api/tamu` tidak terdaftar di aturan role `middleware.js`, jadi siapa pun yang login (role apa pun, bukan cuma `super_admin`/`pimpinan`/`admin` seperti yang dimaksud halaman kelolanya) bisa `GET`/`PATCH`/`DELETE` data ini — termasuk data pribadi tamu dan kritik/saran. Pengecekan `Authorization` header di dalam route-nya sendiri **tidak benar-benar memvalidasi apa pun** (hanya cek header tidak kosong), jadi tidak menutup celah ini.
3. **[QA-C1] Kwitansi tercetak bisa bertentangan dengan dirinya sendiri** — input "Jumlah Uang" menerima desimal, tapi angka dan terbilang (kata-kata) dibulatkan secara berbeda, sehingga kwitansi resmi bisa mencetak "Rp 50.000,75" di angka tapi "Lima Puluh Ribu Rupiah" di terbilang — dokumen pembayaran yang kontradiktif.
4. **[QA-C2] Layar TV internal (24/7, tanpa penjaga) bisa blank total gara-gara satu kegagalan fetch sesaat** — beda dengan halaman TV publik yang sudah dilindungi dari kasus ini.

Pola yang berulang di banyak temuan: **niat otorisasi/role hanya ditulis di komentar dan UI, tidak benar-benar ditegakkan di titik akses data** — dan **drift copy-paste** antar halaman yang mirip (e-invoice/e-kwitansi/rab, TV publik/internal, 3 implementasi logika status agenda berbeda).

---

## Bagian 1 — Keamanan (Security)

### SEC-C1 — Fallback secret sesi bisa diturunkan dari nilai publik
**File:** `lib/session.js:19-24` (dipakai oleh `middleware.js` dan `app/api/auth/login/route.js`)
**Severity: Critical** (bersyarat — hanya aktif jika `SESSION_SECRET` tidak ter-set di lingkungan production)

`getSecret()` memakai `process.env.SESSION_SECRET` kalau ada, tapi kalau tidak, jatuh ke `deriveFallbackSecret()` = `SHA-256(SUPABASE_SERVICE_ROLE_KEY_atau_NEXT_PUBLIC_SUPABASE_ANON_KEY + '|simdir-session')`. Kalau service-role key tidak tersedia di jalur derivasi itu, ia jatuh lagi ke `NEXT_PUBLIC_SUPABASE_ANON_KEY` — nilai yang menurut konvensi Next.js **dikompilasi langsung ke bundle JS sisi client** dan bisa dibaca siapa saja yang membuka DevTools. Salt derivasinya (`'|simdir-session'`) juga publik (ada di repo open source ini). Kunci inilah yang dipakai untuk menandatangani cookie `simdir_session_local` — satu-satunya dasar autentikasi & role di mode lokal/legacy.

**Skenario eksploitasi:** Kalau `SESSION_SECRET` tidak ter-set di Vercel production: ambil `NEXT_PUBLIC_SUPABASE_ANON_KEY` dari bundle JS publik, hitung `base64(SHA256(anonKey + '|simdir-session'))`, pakai untuk menandatangani token `{ id, username, role: 'super_admin', exp: <masa depan> }`, set sebagai cookie `simdir_session_local` → akses penuh `super_admin` ke seluruh halaman dan API terproteksi.

**Verifikasi yang sudah dilakukan:** `.env.local` (development lokal) sudah punya `SESSION_SECRET` ter-set. **Belum diverifikasi:** apakah `SESSION_SECRET` ter-set di Vercel Project Settings → Environment Variables untuk production — ini perlu dicek manual di dashboard Vercel karena saya tidak punya akses ke sana.

**Rekomendasi:** Hapus fallback ini sepenuhnya — kalau `SESSION_SECRET` tidak ada, gagal secara eksplisit (throw / tolak start) alih-alih diam-diam menurunkan secret dari data yang bisa jadi publik. Kalau memang perlu fallback untuk bootstrap, turunkan hanya dari secret server-only yang tidak pernah berupa `NEXT_PUBLIC_*`. Segera cek Vercel env vars production sebagai langkah pertama.

---

### SEC-H1 — Tiga endpoint API tanpa penegakan role (`kritik-saran`, `saran`, `tamu`)
**File:** `middleware.js:244-290`, `app/api/kritik-saran/route.js`, `app/api/saran/route.js`, `app/api/tamu/route.js`
**Severity: High**

`middleware.js` menegakkan role per-prefix untuk `/api/tv-pamflets`, `/api/app-settings`, `/api/program-kerja`, `/api/users`, `/api/unit-kerja`, `/api/kwitansi`, `/api/pertanyaan-kritik-saran`, `/api/unit-usaha`/`target-unit-usaha`/`pemasukan-unit-usaha`, dan `/api/rab`. **Tidak ada aturan setara untuk `/api/kritik-saran`, `/api/saran`, atau `/api/tamu`** — rule halaman `/kelola-saran` dan `/kelola-tamu` tidak otomatis berlaku untuk path API-nya (string path beda, dicek terpisah). Karena `ROLE_RULES.find()` mengembalikan `undefined` untuk path-path ini, gerbang role di baris 240 dilewati sepenuhnya — **siapa pun yang login dengan role apa pun** lolos, bukan hanya `super_admin`/`pimpinan` (kritik-saran/saran) atau `super_admin`/`admin`/`pimpinan` (tamu) seperti yang dimaksud komentar di kode dan halaman kelolanya.

Di dalam route handler-nya sendiri ada pengecekan `if (!authHeader) return 401` yang terlihat seperti lapis kedua, tapi bukan — ia cuma cek header `Authorization` tidak kosong, **tidak pernah memverifikasi isinya**. Frontend sendiri membangun header ini dari `localStorage` yang bisa dipalsukan bebas (lihat pola `authHeaders()` di `kelola-saran/page.jsx:44-51`, `kelola-tamu/page.jsx:32-38`, `laporan/page.jsx:36-43`): `Bearer ${d.token || d.role || 'session'}` — string apa pun lolos, termasuk cuma `Authorization: x`.

**Skenario eksploitasi:** Login dengan akun apa pun yang sah tapi berhak lebih rendah (mis. role yang harusnya cuma boleh akses `kelola-agenda`). Dengan cookie sesi valid itu:
```
GET    /api/tamu            → seluruh buku tamu termasuk PII (nama, telepon, email, foto)
DELETE /api/tamu?id=X       → hapus entri tamu
GET    /api/saran           → seluruh kritik/saran/permohonan termasuk PII pengirim
DELETE /api/saran?id=X      → hapus entri (padahal komentar kode bilang "super_admin only")
PATCH  /api/kritik-saran    → ubah status/tanggapan penilaian fasilitas siapa saja
DELETE /api/kritik-saran?id=X → hapus entri
```
Semua ini tanpa header/token palsu apa pun — cuma sesi login normal dengan role apa pun.

**Rekomendasi:** Tambahkan aturan role eksplisit di `middleware.js` mengikuti pola yang sudah ada untuk `/api/kwitansi`, `/api/rab`, dll: `/api/kritik-saran` (selain POST) dan `/api/saran` (selain POST) → `['super_admin','pimpinan']`; `/api/tamu` (selain POST) → `['super_admin','admin','pimpinan']`. Sebagai pertahanan berlapis, ganti pengecekan `authHeader`-tidak-kosong di dalam route dengan verifikasi sesi yang sesungguhnya (server-side), karena ini pola yang sama yang pernah bocor sekali sebelumnya di riwayat commit repo ini (`/kelola-saran`, akses `/laporan`).

Catatan tambahan yang berkaitan: pola yang sama juga membuat tombol Edit/Delete berbasis role di UI (mis. `e-invoice`) hanya kosmetik kalau mutasi sesungguhnya lewat langsung ke Supabase client-side (`app/(dashboard)/e-invoice/page.jsx:171-197`, `[id]/page.jsx:91-155`, `customers/page.jsx:258-283`) — kalau RLS Supabase tidak menegakkan role secara independen, memalsukan `role: "super_admin"` di `localStorage.simdir_session` bisa membuka tombol sekaligus akses tulis di baliknya. **Perlu dicek terpisah: apakah RLS aktif dan benar di tabel-tabel ini.**

---

### SEC-M1 — Hash kredensial admin production di-hardcode di source control
**File:** `lib/local-users.js:6-57`
**Severity: Medium**

5 akun (termasuk 2 akun `super_admin` dengan email domain nyata, `admin@direktorat.ac.id` dan `adminiqbal@usc.ac.id`) beserta hash bcrypt-nya ada langsung di kode. Menurut `app/api/auth/login/route.js:70-75`, daftar ini dipakai sebagai fallback **setiap kali** query Supabase (`get_user_by_username`/`get_user_by_email`) tidak menemukan baris — bukan cuma saat Supabase down total. Kalau akun-akun ini tidak dikelola juga di tabel `users` Supabase, daftar hardcode ini jadi penyimpan kredensial utama mereka, permanen, tanpa jalur revoke via panel admin (`is_active: true` di-hardcode, tidak bisa dimatikan tanpa deploy ulang).

**Rekomendasi:** Perlakukan daftar ini murni sebagai fallback dev/lokal (seperti blok `devMockUsers` yang sudah benar memakai guard `NODE_ENV === 'production'`), atau pindahkan ke luar source control (env var/secret store) supaya bisa dirotasi tanpa deploy.

---

## Bagian 2 — Bug Kualitas Kode: Critical

### QA-C1 — Kwitansi: angka dan terbilang bisa saling bertentangan
**File:** `lib/utils/format.js:5,52`; dipakai di `app/(dashboard)/e-kwitansi/create/page.jsx:64`, `[id]/edit/page.jsx:53`, `[id]/page.jsx:108-110`, `[id]/print/page.jsx:128-131`

Input "Jumlah Uang" punya `step="0.01"` (`create/page.jsx:137`, `[id]/edit/page.jsx:128`), jadi user bisa isi mis. `50000.75`. `formatRupiah()` mencetak nilai mentah (`Rp 50.000,75`), tapi setiap pemanggilan `terbilang()` membungkusnya dengan `Math.floor()` dulu → "Lima Puluh Ribu Rupiah". Kwitansi cetak (`[id]/print/page.jsx:128-131`) menampilkan keduanya berdampingan — angka bilang 50.000,75, terbilang bilang lima puluh ribu. Ini dokumen pembayaran resmi yang kontradiktif dengan dirinya sendiri.

**Rekomendasi:** Hilangkan desimal dari input `jumlah` (`step="1"`, karena Rupiah praktis tidak punya sub-unit), atau bulatkan secara konsisten sebelum kedua tampilan dihitung.

### QA-C2 — TV internal blank total saat satu kegagalan fetch sesaat, kehilangan data yang sudah ter-load
**File:** `app/(public)/agenda/tv-internal/page.jsx:115` (bandingkan `app/(public)/agenda/tv/page.jsx:561,573`)

Halaman TV publik sengaja dilindungi: `if (loading && agenda.length === 0)` dan `if (error && agenda.length === 0)` — splash/error hanya muncul kalau belum ada data sama sekali. Halaman **TV internal** memakai `if (loading || error) { return <splash/error fullscreen/> }` tanpa syarat "belum ada data". Karena `loading` permanen `false` setelah load pertama tapi `error` di-set ulang tiap polling 5 menit yang gagal, satu hiccup Supabase sesaat saat auto-refresh unattended langsung mengganti tampilan agenda + program kerja yang sudah lengkap dengan layar hitam "Gagal memuat agenda" — padahal data lama di state masih valid dan bisa dipakai.

**Rekomendasi:** Samakan pola dengan halaman publik: `if ((loading && agenda.length === 0) || (error && agenda.length === 0))`.

---

## Bagian 3 — Bug Kualitas Kode: High

### QA-H1 — Query "fallback" di edit e-invoice sebenarnya query yang sama persis
**File:** `app/(dashboard)/e-invoice/[id]/edit/page.jsx:205-223`
Komentar bilang "fallback ke view `invoice_summary`", tapi query fallback-nya identik byte-per-byte dengan query utama (tabel `invoices`, filter sama). Kalau query pertama gagal, fallback dijamin gagal juga dengan cara yang sama — kode mati yang menggandakan request jaringan tiap kali terjadi error, dan menyesatkan siapa pun yang mengira ada jalur pemulihan. `e-kwitansi` (alur serupa) tidak punya duplikasi ini, memperkuat dugaan ini drift copy-paste.
**Rekomendasi:** Hapus fallback yang tidak fungsional ini, atau perbaiki agar benar-benar query `invoice_summary`.

### QA-H2 — `useAgenda().refetch()` akan crash `ReferenceError` kalau dipanggil
**File:** `lib/hooks/useSupabase.js:11-40`
`fetchData` dideklarasikan di dalam callback `useEffect`, jadi di luar scope saat `return`. Saat ini `app/(dashboard)/dashboard/page.jsx:40` cuma memakai `{ data, loading }` jadi bug ini tidur — tapi API hook ini rusak untuk siapa pun yang nanti menambah tombol "refresh".
**Rekomendasi:** Angkat `fetchData` ke luar effect (pakai `useCallback` di body hook), pakai ulang untuk `refetch`.

### QA-H3 — Halaman agenda publik menampilkan `HH:MM:SS` mentah, bukan `HH:MM`
**File:** `app/(public)/agenda/page.jsx:335`
Semua render lain field ini melewati `formatTime()` (`tv/shared.js:11-15`) yang memotong detik. Halaman `/agenda` (bukan TV) tidak memanggilnya sama sekali, jadi pengunjung melihat "09:00:00 - 11:00:00 WIB" alih-alih "09:00 - 11:00 WIB".
**Rekomendasi:** Import dan pakai `formatTime` di sini juga.

---

## Bagian 4 — Medium

| # | Temuan | File |
|---|---|---|
| M1 | Race condition tampilan data finansial: ganti tahun/filter cepat-cepat bisa membuat response lambat (tahun lama) menimpa response baru (tahun baru) tanpa guard staleness/abort — angka yang tampil salah tahun padahal selector sudah pindah | `app/(dashboard)/pemasukan-unit-usaha/saran/page.jsx:26-31`, `page.jsx:49-62`, `komparasi/page.jsx:38-54` |
| M2 | Dua implementasi `generateCustomerCode()` berbeda (panjang & entropi beda) untuk kolom yang sama, drift saat salah satu diperbaiki | `app/(dashboard)/e-invoice/create/page.jsx:13-19` vs `customers/page.jsx:10-15` |
| M3 | `formatRupiah` tidak membatasi `maximumFractionDigits` — total RAB/invoice dari input desimal (`step="0.01"`) bisa kena artefak floating-point dan tampil sen Rupiah pecahan (mis. `Rp 3,63`) | `lib/utils/format.js:5-8` |
| M4 | `useFocusTrap` me-restart seluruh effect (reset scroll lock, "elemen sebelumnya", timer autofocus) tiap kali identity `onClose` berubah — hampir semua caller pakai inline arrow function; jebakan laten untuk modal berisi input di masa depan | `app/components/useFocusTrap.js:20,111` |
| M5 | Pemulihan koneksi `MediaRotator` (TV publik) tidak benar-benar re-init player, hanya berhasil lewat reload halaman tak sengaja via watchdog 2 menit | `app/(public)/agenda/tv/page.jsx:290-302,267-287` |
| M6 | Tiga implementasi independen logika status agenda ("upcoming/ongoing/completed") sudah mulai berbeda ambang batasnya (ms mentah vs batas hari kalender) — bisa disagree di sekitar tengah malam | `lib/agenda-status.ts:16-61`, `app/(public)/agenda/tv/shared.js:17-24`, `app/(public)/agenda/page.jsx:16-39` |

---

## Bagian 5 — Low

| # | Temuan | File |
|---|---|---|
| L1 | Double-fetch redundan: mutasi agenda (add/edit/delete) sudah update state lokal di context, lalu `refreshAgenda()` full-refetch dipanggil lagi sesudahnya | `context/AgendaContext.jsx`, dipakai di `kelola-agenda/page.jsx:1035-1068` |
| L2 | `step` desimal tidak konsisten antar form serupa (RAB punya `step="0.01"` di harga satuan, e-invoice tidak) — tanda form-form ini copy-paste lalu diverge | `RabForm.jsx:150,156` vs `e-invoice/create/page.jsx:61-67`, `[id]/edit/page.jsx:30-50` |
| L3 | `media-config.js` kode mati total — tidak ada yang mengimpornya lagi (playlist YouTube & path gambar promo basi) | `app/(public)/agenda/tv/media-config.js` |
| L4 | Halaman TV memakai akses `localStorage` mentah sendiri alih-alih wrapper `safeLocalStorage` yang sudah ada dan dipakai di tempat lain | `app/(public)/agenda/tv/shared.js:93-107` vs `lib/localStorage.js` |
| L5 | Import `createServerClient`/`cookies` tidak terpakai di layout publik, sisa refactor yang tidak selesai | `app/(public)/layout.jsx:1-13` |

---

## Rekomendasi Prioritas

1. **Segera:** Cek di Vercel Project Settings apakah `SESSION_SECRET` ter-set untuk environment production (SEC-C1). Ini satu-satunya langkah yang tidak bisa saya verifikasi dari sini.
2. **Sebelum rilis berikutnya:** Tambahkan 3 aturan role yang hilang di `middleware.js` untuk `/api/kritik-saran`, `/api/saran`, `/api/tamu` (SEC-H1).
3. **Sebelum rilis berikutnya:** Perbaiki QA-C1 (kwitansi) dan QA-C2 (TV internal blank) — keduanya berdampak langsung ke dokumen resmi dan tampilan produksi yang berjalan tanpa pengawasan.
4. Sisanya (High/Medium/Low) bisa dikerjakan bertahap; beri tahu saya kalau ingin saya langsung terapkan perbaikannya.
