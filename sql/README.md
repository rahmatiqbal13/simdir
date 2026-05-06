# 🗄️ SQL Database

Folder ini berisi semua file SQL terkait database SIMDIR.

## Struktur Folder

```
sql/
├── schema/          # Skema database (struktur tabel)
├── seed/            # Data awal/seed
├── fixes/           # Script perbaikan
└── archive/         # Arsip script lama
```

## Penjelasan

### 📐 schema/
Berisi definisi struktur database, tabel, dan relasi.
- `supabase-schema.sql` - Skema lengkap database Supabase

### 🌱 seed/
Berisi data awal untuk populate database.
- `seed-pengaturan.sql` - Data pengaturan default
- `backup-simdir-data.sql` - Backup data lengkap

### 🔧 fixes/
Berisi script perbaikan untuk masalah tertentu.
- `fix-pengaturan-rls.sql` - Perbaikan RLS pengaturan

### 📦 archive/
Berisi arsip script SQL yang sudah tidak aktif tapi disimpan untuk referensi.
- Berbagai script fix, check, dan migrasi lama

## Cara Penggunaan

### Setup Database Baru
1. Jalankan file di `schema/` terlebih dahulu
2. Kemudian jalankan file di `seed/` untuk data awal

### Troubleshooting
Jika ada masalah, cek folder `fixes/` untuk script perbaikan.

### Arsip
Script lama yang sudah tidak digunakan tapi mungkin berguna untuk referensi.
