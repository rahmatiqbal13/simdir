# 🗄️ SQL Database

Folder ini berisi semua file SQL terkait database SIMDIR.

## Struktur Folder

```
sql/
├── schema/          # Skema database (struktur tabel)
├── seed/            # Script backup data
└── fixes/           # Script perbaikan
```

Migrasi database ada di `supabase/migrations/`.

## Penjelasan

### 📐 schema/
Berisi definisi struktur database, tabel, dan relasi.
- `supabase-schema.sql` - Skema lengkap database Supabase
- `create-spj-tables.sql` - Tabel SPJ
- `integrasi-spj-program.sql` - Integrasi SPJ dengan program kerja

### 🌱 seed/
Berisi script pendukung data.
- `backup-simdir-data.sql` - Query untuk membackup data penting sebelum cleanup

### 🔧 fixes/
Berisi script perbaikan untuk masalah tertentu.
- `fix-pengaturan-rls.sql` - Perbaikan RLS pengaturan
- `fix-integrasi-spj-program.sql` - Perbaikan perhitungan integrasi SPJ per program

## Cara Penggunaan

### Setup Database Baru
Jalankan file di `schema/` terlebih dahulu.

### Troubleshooting
Jika ada masalah, cek folder `fixes/` untuk script perbaikan.
