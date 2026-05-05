# SIMDIR Demo

Prototype runnable dari PRD SIMDIR v1.2.

## Cara menjalankan

1. Jalankan server lokal dari folder ini:

   ```powershell
   node server.js
   ```

2. Buka `http://localhost:4173`.

Data demo tersimpan di `localStorage` browser. Gunakan tombol **Reset Data Demo** untuk kembali ke seed awal.

## Fitur yang sudah dibuat

- Dashboard ringkasan agenda, pagu, total SPJ, dan sisa anggaran.
- Role switcher untuk Super Admin, Admin Teknisi Keuangan, Admin, Pimpinan, dan Publik.
- UI memakai arah visual Tailwind/shadcn: token warna, panel, card, badge, tombol ikon, focus ring, dan layout responsive.
- Halaman agenda publik dengan filter bulan, status, penyelenggara, serta tampilan list/kalender.
- CRUD lokal untuk agenda, surat, program kerja, pencairan, unit kerja, user, SPJ header, dan SPJ detail.
- Program kerja berupa pencatatan singkat RKA: ID RKA, tahun anggaran, unit kerja, nama program/detail aktivitas, dan pelaksanaan berupa tanggal spesifik atau rentang bulan.
- Rincian akun/item anggaran tetap tersedia sebagai sumber kegiatan saat pencairan.
- Pencairan dana berbentuk batch; satu pencairan dapat berisi beberapa kegiatan/item dari detail Program Kerja.
- Tampilan Pencairan Dana memakai panel collapse dengan summary total, jumlah kegiatan, dan rincian item.
- Tampilan SPJ & Rekap memakai summary cards, tabel scrollable, tombol ikon, dan kartu rekap unit responsif.
- Saat memilih Pencairan Dana di halaman SPJ, sistem otomatis menyiapkan draft baris SPJ dari kegiatan pencairan yang dipilih.
- Tabel SPJ dua level dengan kalkulasi otomatis `Belum SPJ`.
- Tandai/undo pengembalian dana per detail dan bulk per induk.
- Rekap unit kerja otomatis.
- Preview laporan serapan dana dan tombol cetak via browser.
- Audit log untuk perubahan data utama.

## Catatan implementasi

Ini adalah MVP lokal tanpa backend agar dapat langsung dicoba. Untuk produksi sesuai PRD, langkah berikutnya adalah migrasi ke Next.js App Router, Supabase Auth/Database/Storage, RLS policy, dan PDF renderer (`@react-pdf/renderer` atau Puppeteer).
