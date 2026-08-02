# Audit UI/UX — Ronde 4 (Fitur Baru: Buku Tamu, Branding, TV Kiosk)
**Tanggal:** 2026-07-21
**Reviewer:** Claude (AI — 5-agent parallel review, Web Interface Guidelines + product/UX checklist)
**Scope:** Semua yang dibangun sejak Ronde 3 — fitur Buku Tamu (publik + admin), sistem Nama Instansi & Logo yang bisa diubah admin, toggle mode gelap/terang, dan seluruh perubahan tampilan TV kiosk (logo, tabel, footer, QR code) — plus konsistensi rollout branding di 8 titik render, dan perilaku mobile/tablet di semua halaman baru.
**Status:** Read-only. Tidak ada file yang diubah. Menunggu keputusan sebelum perbaikan dimulai.

---

## TL;DR

Dua temuan **Critical** yang benar-benar merusak fungsi (bukan sekadar polish), keduanya di fitur Buku Tamu yang baru dibangun minggu ini:
1. **Signature pad salah menempatkan titik gambar** — canvas internal 560px vs lebar render sesungguhnya (309-526px tergantung layar) tidak disinkronkan, jadi coretan tanda tangan bergeser dari posisi jari/pointer sebenarnya. Ini terjadi di SEMUA ukuran layar, termasuk tablet (target utama fitur ini).
2. **Halaman admin Daftar Tamu tidak ada pagination** — API membatasi hasil ke 100 baris tanpa UI halaman berikutnya. Setelah 100 tamu tercatat, data lama jadi tidak bisa diakses sama sekali, dan angka statistik "Total Tamu" diam-diam jadi salah (under-report).

Di luar itu, pola berulang yang paling sering muncul di 5 laporan: **rollout branding yang tidak lengkap** (2 halaman publik terlewat sama sekali), **logo yang ternyata bukan lockup lebar** (file PNG-nya persegi 4000×4000, jadi perbaikan aspect-ratio sebelumnya tidak benar-benar berefek), dan **touch target di bawah 44px** pada kontrol-kontrol kiosk yang justru paling sering disentuh (tanda tangan, foto, aksi baris admin).

---

## Bagian 1 — Critical (functional, bukan sekadar polish)

### C1 — Signature pad: koordinat gambar tidak sinkron dengan posisi jari/pointer
**File:** `app/(public)/daftar-tamu/page.jsx:55-114`
Canvas dibuat dengan `width={560} height={150}` (ukuran buffer internal), tapi di-render dengan `style={{ width: '100%', height: 150 }}`. Fungsi `getPos()` menghitung posisi pointer dalam ruang piksel CSS (0…lebar-render-sebenarnya), lalu langsung dipakai untuk `ctx.moveTo/lineTo` yang mengharapkan ruang piksel buffer (0…560).
- Di 375px: lebar render ≈309px vs buffer 560px → rasio 0.55. Semakin ke kanan, coretan makin melenceng ke kiri dari posisi jari.
- Di lebar tablet (768-1024px, kontainer dibatasi `maxWidth:560`): lebar render ≈518-526px — **masih meleset 6-8%, jadi tidak aman bahkan di perangkat target utamanya.**
- Tinggi (150=150) cocok, jadi hanya sumbu X yang bermasalah.

**Kenapa penting:** ini bukan cuma bug kosmetik — pengunjung yang mencoba tanda tangan akan melihat garisnya tidak mengikuti jari mereka, membuat fitur opsional ini terasa rusak/tidak bisa dipakai.

### C2 — Halaman admin Daftar Tamu tidak ada pagination; data lama jadi tidak terlihat
**File:** `app/(dashboard)/kelola-tamu/page.jsx:36-48`, `app/api/tamu/route.js:26`
`fetchData()` memanggil `/api/tamu` tanpa parameter `limit`/`offset`, dan tidak ada kontrol halaman di UI sama sekali (beda dengan `kelola-agenda` yang punya pagination). API membatasi hasil ke `limit=100` secara default.
**Akibat:** begitu jumlah tamu tercatat lewat 100, entri lama tidak bisa dicari, dilihat, atau dihapus lagi dari UI admin. Lebih parah lagi, statistik "Total Tamu" (dihitung dari `items.length`) akan diam-diam melaporkan angka yang salah begitu batas ini tercapai — admin tidak akan tahu datanya sudah "terpotong."

---

## Bagian 2 — High (dampak nyata ke pengguna, prioritas setelah Critical)

### H1 — Dua halaman publik terlewat sama sekali dari rollout branding
**File:** `app/(public)/kritik-saran/page.jsx:475`, `app/(public)/penilaian/page.jsx:602`
Kedua halaman ini masih pakai `<img src="/images/logo USC.png" alt="USC">` yang statis/hardcoded — tidak pernah memanggil `/api/app-settings` seperti 6 tempat lain yang sudah di-wire. Kalau admin mengganti nama instansi/logo lewat halaman Pengaturan, dua halaman publik ini akan tetap menampilkan logo & teks lama selamanya — sebuah inkonsistensi yang langsung terlihat oleh siapa pun yang membuka kedua halaman itu berdampingan dengan halaman lain yang sudah ter-update.

### H2 — Logo sebenarnya persegi (4000×4000px), bukan lockup lebar — perbaikan aspect-ratio sebelumnya tidak berefek seperti yang dimaksud
**File:** `public/images/logo USC.png`, dipakai di `app/(public)/agenda/tv/page.jsx:619`, `app/(public)/agenda/tv-internal/page.jsx:148`, dan tempat lain
Dicek langsung dimensi filenya: kanvas PNG-nya **4000×4000 (persegi)**, dengan artwork pil-lebar yang divisualisasikan di dalamnya dikelilingi padding transparan besar di atas/bawah. Jadi `height: 3vw; width: auto` menghasilkan kotak ~3vw × 3vw (praktis sama dengan kotak persegi 3.5vw yang lama) — bukan bentuk lebar seperti yang diasumsikan sebelumnya. `maxWidth` yang ditambahkan jadi kode mati untuk file ini, baru akan berfungsi kalau admin upload logo custom yang benar-benar tidak persegi.

### H3 — Logo kehilangan latar kontrasnya di tema terang (TV kiosk)
**File:** `app/(public)/agenda/tv/page.jsx:619`, `app/(public)/agenda/tv-internal/page.jsx:148`
Kode lama sengaja memberi kotak `background: isDark ? '#ffffff' : '#1e3a8a'` di belakang logo — karena logo-nya sendiri adalah pil putih, kotak biru gelap ini dibutuhkan supaya tetap terlihat jelas di tema TERANG. Kotak (dan logikanya) sudah dihapus. Sekarang logo tampil langsung di atas `t.bg` (`#f5f7fb`, hampir putih) — pil putih di atas latar hampir-putih nyaris tidak punya batas tepi yang jelas. Di tema gelap tidak masalah (putih di atas navy tetap kontras).

### H4 — Kolom "Judul Kegiatan" di tabel TV jadi terlalu dominan, terlihat kosong di halaman internal
**File:** `app/(public)/agenda/tv/AgendaTvTable.jsx:31,163`
Kolom lama: `1fr 3fr 13fr 5fr` (Judul ≈59% lebar baris). Setelah kolom Lokasi dihapus: `1fr 3fr 13fr` (Judul ≈76%) — ruang yang dibebaskan dari kolom Lokasi tidak dibagi ulang, semuanya diberikan ke kolom judul. Di halaman publik dampaknya kecil (tabel cuma ~40% lebar layar), tapi di **tv-internal** (tabel selebar layar), judul satu baris dengan ellipsis sekarang duduk di kolom yang sering 3-4x lebih lebar dari teksnya — terlihat kosong/belum selesai persis seperti yang dikhawatirkan.

### H5 — Teks marquee "PENGUMUMAN" menyusut ~22%, perlu diverifikasi keterbacaannya
**File:** `app/(public)/agenda/tv/page.jsx:747-751` (marquee), footer secara umum
Ukuran font teks berjalan turun dari `1.15vw` → `0.9vw` (≈22px → 17px di layar 1080p). Ini elemen yang memang harus **dibaca** pengunjung sambil lewat/dari kejauhan lobi, bukan cuma dilihat sekilas — jadi ini pemotongan dengan risiko tertinggi dari semua perubahan footer. Rekomendasi: cek langsung di TV fisik dari jarak baca normal sebelum dianggap selesai.

### H6 — Warna tanda tangan hardcode, kemungkinan tidak terlihat di mode gelap
**File:** `app/(public)/daftar-tamu/page.jsx:79`
`ctx.strokeStyle = '#0f172a'` (hampir hitam) di-hardcode, sementara latar canvas (`var(--surface-2)`) berubah jadi hampir-hitam juga di mode gelap (`#1c2740`-ish). Hasilnya: coretan tanda tangan nyaris tidak terlihat kalau pengunjung mengisi form dalam mode gelap.

### H7 — Tombol tanda tangan & foto di form kiosk di bawah 44px
**File:** `app/(public)/daftar-tamu/page.jsx` — "Hapus Tanda Tangan", "Ambil Foto"/"Upload dari Galeri"/"Jepret"/"Batal"/"Ambil Ulang" (semua pakai `.btn-sm`, 32px tinggi per `globals.css:1579`)
Ini justru kontrol yang paling sering disentuh di form yang dirancang untuk tablet resepsionis — di bawah standar 44×44px.

### H8 — Baris tombol header agenda publik tidak punya `flexWrap`, marginnya tipis
**File:** `app/(public)/agenda/page.jsx:716` (`.header-buttons`)
Baris ini sekarang berisi 3 elemen (ThemeToggle + Mode TV + Masuk) ≈283px total, sementara ruang tersedia di 375px ≈327px — muat, tapi cuma sisa ~14%, dan **tidak ada fallback wrap** kalau lebih sempit sedikit (device 320-360px, teks lebih panjang, atau font OS diperbesar). Semua baris lain di header yang sama (`stats-bar`, baris utama) sudah pakai `flexWrap:'wrap'` — baris ini yang terlewat.

---

## Bagian 3 — Medium

| # | Temuan | File |
|---|---|---|
| M1 | Toggle tema: ikon salah kedip sesaat setiap kali halaman dimuat (state `isDark` di-render dulu dengan nilai default `false` sebelum effect memperbaikinya) | `app/components/ThemeToggle.jsx:13-19` |
| M2 | Toggle tema tidak punya efek hover sama sekali (tombol pakai inline style, tidak ikut sistem `.btn*` yang semuanya punya `:hover`) | `app/components/ThemeToggle.jsx:26-45` |
| M3 | Upload logo: tidak ada validasi tipe/ukuran file di sisi client — file salah/kebesaran baru ditolak setelah proses compress+upload selesai di server | `app/(dashboard)/pengaturan/branding/page.jsx:32-37` |
| M4 | Tidak ada konfirmasi sebelum logo lama ditimpa, padahal logo ini dipakai di banyak halaman publik sekaligus (TV, login, agenda) | `app/(dashboard)/pengaturan/branding/page.jsx` |
| M5 | File logo lama tidak pernah dihapus dari storage saat diganti — pertumbuhan storage tak terbatas seiring waktu | `app/api/app-settings/route.js:63-64` |
| M6 | 6 dari 8 titik render nama instansi tidak truncate teks panjang (wrap ke banyak baris), hanya 2 titik (mobile-header, daftar-tamu) yang truncate dengan ellipsis — tidak konsisten | Lintas file, lihat laporan lengkap |
| M7 | Kotak logo di sidebar (40×40, putih) dan mobile-header (36×36, **biru**) pakai warna latar berbeda untuk logo yang sama — kemungkinan tidak disengaja | `app/globals.css:341-352`, `:1664-1669` |
| M8 | `InstansiLogo` di halaman login pakai `alt="Logo"` generik, bukan nama instansi — beda dari 6 titik render lain yang sudah pakai `alt={brandName}` | `app/login/page.jsx` |
| M9 | Modal "Detail Tamu" di halaman admin tidak pakai `useFocusTrap`/`role="dialog"` (padahal `ConfirmModal` tepat di bawahnya di file yang sama sudah benar) — pengguna keyboard bisa Tab keluar dari modal yang sedang terbuka | `app/(dashboard)/kelola-tamu/page.jsx:176-214` |
| M10 | Form kiosk pakai `window.confirm()` native untuk konfirmasi hapus tanda tangan/foto, padahal `ConfirmModal` sudah ada di codebase khusus untuk mengganti pola ini | `app/(public)/daftar-tamu/page.jsx:92,178` |
| M11 | Filter tipe file di picker foto (`accept="image/*"`) lebih longgar dari yang diterima server (`jpeg/jpg/png/webp`) — HEIC dari iPhone bisa lolos picker tapi ditolak server setelah form lengkap diisi | `app/(public)/daftar-tamu/page.jsx:215`, `app/api/tamu/route.js:86-88` |
| M12 | Dua QR code diperkecil dari 9vw ke 7.5vw supaya muat berdampingan — perlu dites scan jarak normal sebelum dianggap aman | `app/(public)/agenda/tv/page.jsx:716-733` |
| M13 | Nama instansi default kemungkinan wrap 2 baris di header TV bahkan tanpa kustomisasi apa pun (teks default sudah cukup panjang untuk `maxWidth:16vw` di `fontSize:1.3vw`) | `app/(public)/agenda/tv/page.jsx:620` |
| M14 | Tidak ada batas panjang (`maxLength`) pada input nama instansi — nama yang sangat panjang berisiko mendesak elemen cuaca/jam di header TV karena kontainer `overflow:hidden` | `app/(dashboard)/pengaturan/branding/page.jsx`, `app/api/app-settings/route.js:37` |

---

## Bagian 4 — Low

- Tanda titik tiga (`...`) dipakai di beberapa tempat alih-alih karakter elipsis (`…`) — mis. "Memuat...", placeholder pencarian, placeholder dropdown "-- Pilih --" (harusnya "Pilih…")
- Tombol aksi baris tabel admin (`kelola-tamu`) 32×32px, dengan jarak antar tombol cuma 4px antara aksi biasa dan aksi hapus (destructive) — risiko salah tap kecil tapi ada
- Toggle show/hide password di halaman login ≈32×32px efektif, di bawah 44px
- `URL.createObjectURL` untuk preview logo tidak pernah di-revoke (kebocoran memori kecil kalau admin pilih beberapa file berturut-turut)
- Field input `unit_dituju` tidak punya kotak detail teks saat memilih "Lainnya", padahal field `keperluan` yang serupa strukturnya punya — inkonsistensi kecil
- Statistik grid di `kelola-tamu` (3 kartu) di 375px jadi 2 kartu sebaris + 1 sendiri di baris kedua — tidak rusak, cuma kurang rapi

---

## Bagian 5 — Sudah benar (dikonfirmasi, tidak perlu diapa-apakan)

- Middleware: `/api/app-settings` GET publik, PUT dibatasi `super_admin` — sudah benar dan sesuai maksud
- Validasi client vs server di form Daftar Tamu (nama, instansi, telepon/email, keperluan, unit) — sudah sinkron persis
- `kelola-tamu` sudah pakai `.table-wrap` + `.table-scroll` dengan benar (tidak kena bug "lupa table-scroll" yang pernah ditemukan di halaman lain sebelumnya)
- Alur hapus di `kelola-tamu` sudah pakai `ConfirmModal` yang benar, dengan status "busy" yang tepat
- `KEPERLUAN_META` di `kelola-tamu` sudah pakai token warna CSS penuh — lebih rapi dibanding `kelola-saran` yang justru masih hardcode hex
- Kontrak CSS/JS toggle tema (`prefers-color-scheme` + `[data-theme]` override) sudah benar di semua 4 kombinasi state, tidak ada celah
- Atomicity penyimpanan branding: kalau upload logo gagal, nama instansi juga tidak ikut tersimpan (all-or-nothing) — sudah benar
- Viewport meta tidak mematikan zoom di mana pun
- Tidak ditemukan lebar piksel tetap yang menyebabkan overflow horizontal di 375px pada file-file yang diperiksa (kecuali risiko `header-buttons` di H8, yang soal `flexWrap`, bukan lebar tetap)
- `navConfig.jsx` bersih — tidak ada sisa referensi brand/logo hardcoded

---

## Rekomendasi urutan perbaikan (kalau nanti diminta)

1. **C1 + C2** dulu — keduanya bug fungsional nyata di fitur yang baru dipakai (signature pad salah gambar, admin kehilangan akses ke data tamu lama)
2. **H1** — 2 halaman publik yang terlewat rollout branding (perbaikan kecil, dampak besar untuk konsistensi)
3. **H6 + H7** — kegunaan form kiosk (warna tanda tangan, ukuran tombol) karena ini form yang akan langsung dipakai publik
4. **H2, H3, H4** — TV kiosk perlu keputusan desain dulu (apakah logo perlu di-crop ulang jadi file terpisah yang benar-benar lebar, atau kembalikan kotak kontras untuk tema terang) sebelum dikerjakan
5. Sisanya (Medium/Low) — bisa dicicil, tidak mendesak
